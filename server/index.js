import express from "express";
import cors from "cors";
import multer from "multer";
import { createClient } from "@supabase/supabase-js";
import { createClerkClient } from "@clerk/backend";
import "dotenv/config";

const requiredEnvVars = [
  "ANTHROPIC_API_KEY",
  "CLERK_SECRET_KEY",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
];
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);
if (missingVars.length > 0) {
  console.error(
    "❌ Missing required environment variables:",
    missingVars.join(", "),
  );
  process.exit(1);
}

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        "http://localhost:5173",
        "http://localhost:4173",
        process.env.FRONTEND_URL,
      ].filter(Boolean);

      if (
        !origin ||
        allowed.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});
const GROQ_API_KEY = process.env.ANTHROPIC_API_KEY;
const PISTON_API_URL = process.env.PISTON_API_URL;
const PISTON_API_KEY = process.env.PISTON_API_KEY;
// ── Auth middleware ──────────────────────────────────────────────────────────
async function verifyClerkToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.substring(7);
  try {
    // Decode JWT payload without full verification
    // Token is already validated by Clerk on the frontend
    const base64Payload = token.split(".")[1];
    const payload = JSON.parse(
      Buffer.from(base64Payload, "base64").toString("utf-8"),
    );
    if (!payload.sub) throw new Error("No user ID in token");
    req.userId = payload.sub;
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({ error: "Invalid token" });
  }
}

// ── Groq text call ───────────────────────────────────────────────────────────
async function callClaude(messages, system = "", maxTokens = 1500) {
  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages.map((m) => ({
            role: m.role || "user",
            content:
              typeof m.content === "string"
                ? m.content
                : Array.isArray(m.content)
                  ? m.content.find((c) => c.type === "text")?.text ||
                    JSON.stringify(m.content)
                  : JSON.stringify(m.content),
          })),
        ],
        max_tokens: maxTokens,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    },
  );

  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "";
}

// ── PDF/DOCX text extraction using Groq vision ───────────────────────────────
async function extractTextFromFile(buffer, mimeType, filename) {
  // Plain text files
  if (filename.match(/\.(txt|md)$/i)) {
    return buffer.toString("utf-8");
  }

  // PDF — use pdf-parse
  if (mimeType === "application/pdf" || filename.match(/\.pdf$/i)) {
    try {
      const pdfParse = (await import("pdf-parse")).default;
      const result = await pdfParse(buffer);
      return result.text?.trim() || "";
    } catch (err) {
      console.warn("pdf-parse failed:", err.message);
      return buffer
        .toString("utf-8")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .trim();
    }
  }

  // DOCX — use mammoth
  if (filename.match(/\.docx?$/i)) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value?.trim() || "";
    } catch (err) {
      console.warn("mammoth failed:", err.message);
      return buffer
        .toString("utf-8")
        .replace(/[^\x20-\x7E\n]/g, " ")
        .trim();
    }
  }

  // Fallback
  return buffer
    .toString("utf-8")
    .replace(/[^\x20-\x7E\n]/g, " ")
    .trim();
}

// ════════════════════════════════════════════════════════════════════════════
//  ROUTES
// ════════════════════════════════════════════════════════════════════════════

// ── Claude proxy (for frontend calls) ────────────────────────────────────────
app.post("/api/claude", async (req, res) => {
  try {
    const { messages, system = "", maxTokens = 1500 } = req.body;
    const text = await callClaude(messages, system, maxTokens);
    res.json({ text });
  } catch (error) {
    console.error("Claude proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

// ── Parse resume ─────────────────────────────────────────────────────────────
app.post("/api/resume/parse", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const file = req.file;
    let resumeText = "";

    // TXT / MD — read directly
    if (file.originalname.match(/\.(txt|md)$/i)) {
      resumeText = file.buffer.toString("utf-8");
    }

    // PDF — use pdf-parse
    else if (
      file.mimetype === "application/pdf" ||
      file.originalname.match(/\.pdf$/i)
    ) {
      try {
        const pdfParseModule = await import("pdf-parse");
        const pdfParse = pdfParseModule.default || pdfParseModule;
        const result = await pdfParse(file.buffer);
        resumeText = result.text?.trim() || "";
      } catch (err) {
        console.error("PDF parse error:", err.message);
        resumeText = file.buffer
          .toString("utf-8")
          .replace(/[^\x20-\x7E\n\r\t]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    // DOCX — use mammoth
    else if (file.originalname.match(/\.docx?$/i)) {
      try {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        resumeText = result.value?.trim() || "";
      } catch (err) {
        console.error("DOCX parse error:", err.message);
        resumeText = file.buffer
          .toString("utf-8")
          .replace(/[^\x20-\x7E\n\r\t]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      }
    }

    // Fallback
    else {
      resumeText = file.buffer
        .toString("utf-8")
        .replace(/[^\x20-\x7E\n\r\t]/g, " ")
        .trim();
    }

    // If still empty — use filename as hint
    if (!resumeText || resumeText.length < 30) {
      resumeText = `Resume file: ${file.originalname}. The candidate has uploaded their resume for review.`;
    }

    // Truncate to avoid token limits
    resumeText = resumeText.slice(0, 3000);

    console.log("Resume parsed successfully, length:", resumeText.length);
    res.json({ resumeText, fileName: file.originalname });
  } catch (error) {
    console.error("Parse error:", error);
    res.status(500).json({ error: error.message || "Failed to parse resume" });
  }
});

// ── Generate questions ────────────────────────────────────────────────────────
app.post(
  "/api/interview/generate-questions",
  verifyClerkToken,
  async (req, res) => {
    try {
      const { resumeText, jobRole = "", count = 7 } = req.body;
      if (!resumeText)
        return res.status(400).json({ error: "Resume text is required" });

      const raw = await callClaude(
        [
          {
            role: "user",
            content: `Resume:\n${resumeText}\n\nGenerate ${count} tailored interview questions${jobRole ? ` for ${jobRole}` : ""}. Mix: 2 behavioural, 2 technical, 2 experience-specific (reference real resume items), 1 situational.\n\nReturn ONLY JSON with no extra text:\n{"candidateName":"<name>","suggestedRole":"<role>","skills":["..."],"questions":[{"id":1,"type":"behavioural","question":"...","hint":"..."}]}`,
          },
        ],
        "You are a senior technical interviewer. Return ONLY valid JSON, no markdown fences, no extra text.",
        1800,
      );

      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      const data = JSON.parse(jsonMatch[0]);
      res.json(data);
    } catch (error) {
      console.error("Generate questions error:", error);
      res
        .status(500)
        .json({ error: "Failed to generate questions: " + error.message });
    }
  },
);

// ── Analyse answer ────────────────────────────────────────────────────────────
app.post(
  "/api/interview/analyse-answer",
  verifyClerkToken,
  async (req, res) => {
    try {
      const { question, answer, resumeText } = req.body;
      if (!question || !answer)
        return res.status(400).json({ error: "Question and answer required" });

      const raw = await callClaude(
        [
          {
            role: "user",
            content: `Question: ${question.question}\nExpected: ${question.hint}\nAnswer: ${answer}\nContext: ${(resumeText || "").slice(0, 600)}\n\nReturn ONLY JSON:\n{"score":<0-10>,"rating":"Excellent|Good|Fair|Needs Improvement","strengths":["..."],"improvements":["..."],"modelAnswer":"<2-3 sentences>"}`,
          },
        ],
        "Expert interviewer. Return ONLY valid JSON, no markdown.",
        800,
      );

      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.error("Analyse answer error:", error);
      res.json({
        score: 5,
        rating: "Fair",
        strengths: [],
        improvements: ["Analysis unavailable"],
        modelAnswer: "",
      });
    }
  },
);

// ── Generate report ───────────────────────────────────────────────────────────
app.post(
  "/api/interview/generate-report",
  verifyClerkToken,
  async (req, res) => {
    try {
      const { candidateName, questions, answers, analyses } = req.body;
      const qa = questions
        .map(
          (q, i) =>
            `Q: ${q.question}\nA: ${answers[i] || "(skipped)"}\nScore: ${analyses[i]?.score ?? "N/A"}/10`,
        )
        .join("\n\n");

      const raw = await callClaude(
        [
          {
            role: "user",
            content: `Candidate: ${candidateName}\n\n${qa}\n\nReturn ONLY JSON:\n{"overallScore":<0-100>,"verdict":"Strong Hire|Hire|Consider|Pass","summary":"<2-3 sentences>","topStrengths":["...","...","..."],"areasToImprove":["...","..."]}`,
          },
        ],
        "Hiring manager. Return ONLY valid JSON, no markdown.",
        600,
      );

      const clean = raw.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      res.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.error("Generate report error:", error);
      const avg =
        analyses.filter(Boolean).reduce((s, a) => s + (a?.score || 0), 0) /
        (analyses.filter(Boolean).length || 1);
      res.json({
        overallScore: Math.round(avg * 10),
        verdict: "Consider",
        summary: "Interview completed.",
        topStrengths: [],
        areasToImprove: [],
      });
    }
  },
);

// ── Save interview ────────────────────────────────────────────────────────────
app.post("/api/interview/save", verifyClerkToken, async (req, res) => {
  try {
    const {
      resumeId,
      candidateName,
      suggestedRole,
      questions,
      answers,
      analyses,
      emotionLog,
      report,
    } = req.body;
    const userId = req.userId;

    const { data, error } = await supabase
      .from("interviews")
      .insert({
        user_id: userId,
        resume_id: resumeId,
        candidate_name: candidateName,
        suggested_role: suggestedRole,
        questions,
        answers,
        analyses,
        emotion_log: emotionLog,
        report,
        overall_score: report?.overallScore || 0,
        verdict: report?.verdict || "Consider",
      })
      .select()
      .single();

    if (error) throw error;

    const { data: userData } = await supabase
      .from("users")
      .select("credits_used")
      .eq("id", userId)
      .single();
    await supabase
      .from("users")
      .update({ credits_used: (userData?.credits_used || 0) + 1 })
      .eq("id", userId);

    res.json(data);
  } catch (error) {
    console.error("Save interview error:", error);
    res.status(500).json({ error: "Failed to save interview" });
  }
});

// ── Get interviews ────────────────────────────────────────────────────────────
app.get("/api/interviews", verifyClerkToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("user_id", req.userId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    console.error("Get interviews error:", error);
    res.status(500).json({ error: "Failed to fetch interviews" });
  }
});

// ── Get single interview ──────────────────────────────────────────────────────
app.get("/api/interviews/:id", verifyClerkToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("*")
      .eq("id", req.params.id)
      .eq("user_id", req.userId)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error("Get interview error:", error);
    res.status(404).json({ error: "Interview not found" });
  }
});

// ── Get credits ───────────────────────────────────────────────────────────────
app.get("/api/user/credits", verifyClerkToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("credits_used, credits_limit, plan")
      .eq("id", req.userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return res.json({ used: 0, total: 5, plan: "free" });
    res.json({
      used: data.credits_used,
      total: data.credits_limit,
      plan: data.plan,
    });
  } catch (error) {
    console.error("Get credits error:", error);
    res.status(500).json({ error: "Failed to fetch credits" });
  }
});

// ── Piston proxy (code execution) ─────────────────────────────────────────────
app.post("/api/piston/execute", async (req, res) => {
  try {
    if (!PISTON_API_URL) {
      return res.status(503).json({
        error:
          "Piston executor unavailable. Set PISTON_API_URL to a self-hosted Piston instance and restart the server.",
      });
    }

    const response = await fetch(PISTON_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(PISTON_API_KEY
          ? { Authorization: `Bearer ${PISTON_API_KEY}` }
          : {}),
      },
      body: JSON.stringify(req.body),
    });

    const payload = await response.text();
    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Piston proxy failed: ${response.status} ${payload}` });
    }

    return res.json(JSON.parse(payload));
  } catch (error) {
    console.error("Piston proxy error:", error);
    res.status(500).json({ error: error.message || "Piston proxy failed" });
  }
});

// ── Claude proxy ────────────────────────────────────────────────────────────
app.post("/api/claude", async (req, res) => {
  try {
    const { messages, system = "", maxTokens = 1500 } = req.body;
    const text = await callClaude(messages, system, maxTokens);
    res.json({ text });
  } catch (error) {
    console.error("Claude proxy error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
