import { useState, useRef, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  Legend,
} from "recharts";

// ═══════════════════════════════════════════════════════════════
//  ANTHROPIC API
// ═══════════════════════════════════════════════════════════════
async function callClaude(messages, system = "", maxTokens = 1500) {
  const response = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, system, maxTokens }),
  });
  if (!response.ok) {
    const e = await response.json().catch(() => ({}));
    throw new Error(e?.error?.message || `API error ${response.status}`);
  }
  const data = await response.json();
  return data.text || "";
}

async function generateQuestions(resumeText, jobRole = "", count = 7) {
  const raw = await callClaude(
    [
      {
        role: "user",
        content: `Resume:\n${resumeText}\n\nGenerate ${count} tailored interview questions${jobRole ? ` for ${jobRole}` : ""}. Mix: 2 behavioural, 2 technical, 2 experience-specific (reference real resume items), 1 situational.\n\nReturn ONLY JSON:\n{"candidateName":"<name>","suggestedRole":"<role>","skills":["..."],"questions":[{"id":1,"type":"behavioural|technical|experience|situational","question":"...","hint":"<what strong answer covers>"}]}`,
      },
    ],
    "Senior technical interviewer. Return ONLY valid JSON, no markdown.",
    1800,
  );
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("Failed to parse questions.");
  }
}

async function analyseAnswer(question, answer, resumeText) {
  const raw = await callClaude(
    [
      {
        role: "user",
        content: `Question: ${question.question}\nExpected: ${question.hint}\nAnswer: ${answer}\nResume (context): ${resumeText.slice(0, 800)}\n\nReturn ONLY JSON:\n{"score":<0-10>,"rating":"Excellent|Good|Fair|Needs Improvement","strengths":["..."],"improvements":["..."],"modelAnswer":"<ideal 2-3 sentence answer>"}`,
      },
    ],
    "Expert interviewer. Return ONLY valid JSON.",
    800,
  );
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    return {
      score: 5,
      rating: "Fair",
      strengths: [],
      improvements: ["Analysis unavailable"],
      modelAnswer: "",
    };
  }
}

async function generateReport(candidateName, questions, answers, analyses) {
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
    "Hiring manager. Return ONLY valid JSON.",
    600,
  );
  try {
    return JSON.parse(raw.replace(/```json|```/g, "").trim());
  } catch {
    const avg =
      analyses.filter(Boolean).reduce((s, a) => s + (a?.score || 0), 0) /
      (analyses.filter(Boolean).length || 1);
    return {
      overallScore: Math.round(avg * 10),
      verdict: "Consider",
      summary: "Interview completed.",
      topStrengths: [],
      areasToImprove: [],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════════════════
const C = {
  bg: "#0d1117",
  surface: "#161b22",
  surface2: "#1c2128",
  border: "#30363d",
  accent: "#58a6ff",
  accentGlow: "rgba(88,166,255,0.15)",
  text: "#e6edf3",
  muted: "#8b949e",
  success: "#3fb950",
  warning: "#d29922",
  danger: "#f85149",
  purple: "#bc8cff",
  cyan: "#39d353",
  teal: "#2ea043",
};

const badge = (type) =>
  ({
    technical: { bg: "#1a2a3a", color: "#58a6ff", label: "Technical" },
    behavioural: { bg: "#1a2a2a", color: "#3fb950", label: "Behavioural" },
    experience: { bg: "#2a1a3a", color: "#bc8cff", label: "Experience" },
    situational: { bg: "#2a2a1a", color: "#d29922", label: "Situational" },
  })[type] || { bg: "#1e1e1e", color: "#8b949e", label: type };

const ratingColor = (r) =>
  ({
    Excellent: C.success,
    Good: C.accent,
    Fair: C.warning,
    "Needs Improvement": C.danger,
  })[r] || C.muted;
const scoreColor = (s) =>
  s >= 8 ? C.success : s >= 6 ? C.accent : s >= 4 ? C.warning : C.danger;

// ═══════════════════════════════════════════════════════════════
//  FACE DETECTION ENGINE  (face-api.js + TinyFaceDetector)
//  Equivalent to YOLO-style real-time face + emotion detection
// ═══════════════════════════════════════════════════════════════
const FACE_SCRIPT =
  "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/dist/face-api.min.js";
const MODELS_URL = "https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights";

const EMOTION_META = {
  neutral: { label: "Focused", emoji: "😐", color: "#58a6ff" },
  happy: { label: "Confident", emoji: "😊", color: "#3fb950" },
  surprised: { label: "Alert", emoji: "😲", color: "#e3b341" },
  sad: { label: "Nervous", emoji: "😔", color: "#8957e5" },
  angry: { label: "Stressed", emoji: "😤", color: "#f85149" },
  fearful: { label: "Anxious", emoji: "😨", color: "#db6d28" },
  disgusted: { label: "Uncertain", emoji: "😒", color: "#768390" },
};

let _apiLoaded = false,
  _modelsLoaded = false;

async function initFaceAPI() {
  if (_apiLoaded && _modelsLoaded) return true;
  if (!_apiLoaded) {
    if (!window.faceapi) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = FACE_SCRIPT;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
    }
    _apiLoaded = true;
  }
  if (!_modelsLoaded) {
    await Promise.all([
      window.faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
      window.faceapi.nets.faceExpressionNet.loadFromUri(MODELS_URL),
    ]);
    _modelsLoaded = true;
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  CAMERA MONITOR COMPONENT
// ═══════════════════════════════════════════════════════════════
function CameraMonitor({ isActive, questionIndex, onEmotionCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const tsRef = useRef(0);
  const cancelRef = useRef(false);

  const [camStatus, setCamStatus] = useState("init"); // init|loading|ready|no-cam|sim
  const [emotion, setEmotion] = useState(null);
  const [faceOn, setFaceOn] = useState(false);
  const [attn, setAttn] = useState(null);

  useEffect(() => {
    if (!isActive) return;
    cancelRef.current = false;
    boot();
    return () => {
      cancelRef.current = true;
      cleanup();
    };
  }, [isActive]);

  // restart detection loop when question changes (resets canvas)
  useEffect(() => {
    if (camStatus === "ready") startLoop();
  }, [questionIndex, camStatus]);

  const cleanup = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  };

  const boot = async () => {
    // 1. Camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });
      if (cancelRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      const v = videoRef.current;
      v.srcObject = stream;
      await new Promise((r) => {
        v.onloadedmetadata = r;
      });
      await v.play();
      setCamStatus("loading");
    } catch {
      setCamStatus("no-cam");
      return;
    }
    // 2. Models
    try {
      await initFaceAPI();
      if (cancelRef.current) return;
      setCamStatus("ready");
    } catch (e) {
      console.warn("face-api.js unavailable, using simulation:", e.message);
      setCamStatus("sim");
      startSim();
    }
  };

  // Simulation fallback — realistic emotion patterns
  const startSim = () => {
    const patterns = [
      "neutral",
      "neutral",
      "happy",
      "neutral",
      "fearful",
      "neutral",
      "surprised",
      "neutral",
      "happy",
    ];
    let tick = 0;
    const id = setInterval(() => {
      if (cancelRef.current) {
        clearInterval(id);
        return;
      }
      const dom = patterns[tick++ % patterns.length];
      const exprs = {
        neutral: 0.08,
        happy: 0.06,
        sad: 0.02,
        fearful: 0.03,
        surprised: 0.04,
        angry: 0.01,
        disgusted: 0.01,
      };
      exprs[dom] = 0.72 + Math.random() * 0.2;
      const score = 68 + Math.floor(Math.random() * 28);
      setEmotion({ dominant: dom, confidence: exprs[dom], expressions: exprs });
      setFaceOn(true);
      setAttn(score);
      onEmotionCapture?.({
        questionIndex,
        dominant: dom,
        expressions: exprs,
        attentionScore: score,
        simulated: true,
        timestamp: Date.now(),
      });
    }, 2200);
  };

  const startLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const INTERVAL = 700;
    const loop = (ts) => {
      rafRef.current = requestAnimationFrame(loop);
      if (ts - tsRef.current < INTERVAL) return;
      tsRef.current = ts;
      detect();
    };
    rafRef.current = requestAnimationFrame(loop);
  };

  const detect = async () => {
    const v = videoRef.current,
      cv = canvasRef.current;
    if (!v || !cv || v.readyState < 2 || !window.faceapi) return;
    const W = v.offsetWidth,
      H = v.offsetHeight;
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    try {
      const opts = new window.faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.45,
      });
      const dets = await window.faceapi
        .detectAllFaces(v, opts)
        .withFaceExpressions();
      if (!dets?.length) {
        setFaceOn(false);
        setAttn((p) => (p != null ? Math.max(0, p - 4) : 50));
        return;
      }
      setFaceOn(true);

      const det = dets[0];
      const sx = W / v.videoWidth,
        sy = H / v.videoHeight;
      const { x, y, width: bw, height: bh } = det.detection.box;
      const [bx, by, bdw, bdh] = [x * sx, y * sy, bw * sx, bh * sy];
      const cl = Math.min(bdw, bdh) * 0.18;

      // Dashed box
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = "rgba(88,166,255,0.5)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bdw, bdh);
      ctx.setLineDash([]);

      // Corner brackets
      ctx.strokeStyle = "#58a6ff";
      ctx.lineWidth = 2.8;
      [
        [bx, by, 1, 1],
        [bx + bdw, by, -1, 1],
        [bx, by + bdh, 1, -1],
        [bx + bdw, by + bdh, -1, -1],
      ].forEach(([cx, cy, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(cx, cy + dy * cl);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + dx * cl, cy);
        ctx.stroke();
      });

      // Top info bar
      const exprs = det.expressions;
      const [[dom, conf]] = Object.entries(exprs).sort((a, b) => b[1] - a[1]);
      const em = EMOTION_META[dom] || EMOTION_META.neutral;
      const label = `${em.emoji} ${em.label} ${(conf * 100).toFixed(0)}%`;
      ctx.font = "bold 11px monospace";
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = "rgba(13,17,23,0.88)";
      ctx.fillRect(bx, by - 26, tw + 14, 22);
      ctx.fillStyle = em.color;
      ctx.fillText(label, bx + 7, by - 9);

      // Attention
      const pos =
        (exprs.neutral || 0) + (exprs.happy || 0) + (exprs.surprised || 0);
      const neg =
        (exprs.sad || 0) +
        (exprs.fearful || 0) +
        (exprs.disgusted || 0) +
        (exprs.angry || 0);
      const score = Math.round((pos / Math.max(0.01, pos + neg)) * 100);

      setEmotion({ dominant: dom, confidence: conf, expressions: exprs });
      setAttn(score);
      onEmotionCapture?.({
        questionIndex,
        dominant: dom,
        confidence: conf,
        expressions: exprs,
        attentionScore: score,
        simulated: false,
        timestamp: Date.now(),
      });
    } catch {
      /* skip frame */
    }
  };

  const meta = emotion
    ? EMOTION_META[emotion.dominant] || EMOTION_META.neutral
    : null;
  const statusLabel =
    {
      init: "Starting…",
      loading: "Loading Model…",
      ready: "● LIVE",
      "no-cam": "Camera Off",
      sim: "⚡ Simulation",
    }[camStatus] || "…";
  const statusColor =
    { ready: C.danger, sim: C.warning, "no-cam": C.muted }[camStatus] ||
    C.muted;

  return (
    <div
      style={{
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 12px",
          borderBottom: `1px solid ${C.border}`,
          background: "#0d1117",
        }}
      >
        <span
          style={{
            color: C.muted,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "1px",
          }}
        >
          FACE MONITOR
        </span>
        <span
          style={{
            color: statusColor,
            fontSize: 11,
            fontWeight: 600,
            animation: camStatus === "ready" ? "blink 1.5s infinite" : "none",
          }}
        >
          {statusLabel}
        </span>
      </div>

      {/* Video */}
      <div
        style={{ position: "relative", background: "#000", aspectRatio: "4/3" }}
      >
        {camStatus === "no-cam" ? (
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32 }}>📷</span>
            <span style={{ color: C.muted, fontSize: 12 }}>
              Camera unavailable
            </span>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                transform: "scaleX(-1)",
                pointerEvents: "none",
              }}
            />
          </>
        )}
        {/* Scan line */}
        {(camStatus === "ready" || camStatus === "sim") && faceOn && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 2,
              background:
                "linear-gradient(90deg,transparent,#58a6ff80,transparent)",
              animation: "scanline 2.5s linear infinite",
            }}
          />
        )}
        {/* Corners overlay for style */}
        <div
          style={{
            position: "absolute",
            top: 6,
            left: 6,
            width: 16,
            height: 16,
            borderTop: `2px solid ${C.accent}`,
            borderLeft: `2px solid ${C.accent}`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 6,
            right: 6,
            width: 16,
            height: 16,
            borderTop: `2px solid ${C.accent}`,
            borderRight: `2px solid ${C.accent}`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 6,
            left: 6,
            width: 16,
            height: 16,
            borderBottom: `2px solid ${C.accent}`,
            borderLeft: `2px solid ${C.accent}`,
            opacity: 0.5,
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            width: 16,
            height: 16,
            borderBottom: `2px solid ${C.accent}`,
            borderRight: `2px solid ${C.accent}`,
            opacity: 0.5,
          }}
        />
      </div>

      {/* Stats panel */}
      <div style={{ padding: 12 }}>
        {/* Emotion */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <span style={{ fontSize: 22 }}>{meta?.emoji || "😐"}</span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: meta?.color || C.muted,
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {meta?.label || "—"}
            </div>
            <div style={{ color: C.muted, fontSize: 10 }}>
              {emotion
                ? `${(emotion.confidence * 100).toFixed(0)}% conf`
                : "No detection"}
            </div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: faceOn ? C.success : C.border,
                margin: "0 auto 2px",
              }}
            />
            <div style={{ color: C.muted, fontSize: 9 }}>FACE</div>
          </div>
        </div>

        {/* Attention */}
        {attn !== null && (
          <div style={{ marginBottom: 10 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 3,
              }}
            >
              <span
                style={{ color: C.muted, fontSize: 10, letterSpacing: "0.5px" }}
              >
                ATTENTION
              </span>
              <span
                style={{
                  color:
                    attn > 70 ? C.success : attn > 40 ? C.warning : C.danger,
                  fontSize: 10,
                  fontWeight: 700,
                }}
              >
                {attn}%
              </span>
            </div>
            <div style={{ height: 4, background: C.border, borderRadius: 99 }}>
              <div
                style={{
                  height: "100%",
                  width: `${attn}%`,
                  borderRadius: 99,
                  transition: "width 0.6s, background 0.3s",
                  background:
                    attn > 70 ? C.success : attn > 40 ? C.warning : C.danger,
                }}
              />
            </div>
          </div>
        )}

        {/* Micro emotion bars */}
        {emotion?.expressions &&
          Object.entries(emotion.expressions)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)
            .map(([k, v]) => {
              const em = EMOTION_META[k] || { label: k, color: C.muted };
              return (
                <div
                  key={k}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 3,
                  }}
                >
                  <span style={{ color: em.color, fontSize: 9, width: 52 }}>
                    {em.label}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 3,
                      background: C.border,
                      borderRadius: 99,
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${v * 100}%`,
                        background: em.color,
                        borderRadius: 99,
                        transition: "width 0.4s",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      color: C.muted,
                      fontSize: 9,
                      width: 24,
                      textAlign: "right",
                    }}
                  >
                    {(v * 100).toFixed(0)}%
                  </span>
                </div>
              );
            })}

        {camStatus === "sim" && (
          <div
            style={{
              marginTop: 8,
              padding: "4px 8px",
              background: "rgba(211,163,34,0.1)",
              borderRadius: 6,
              color: C.warning,
              fontSize: 10,
            }}
          >
            ⚡ Simulated — allow camera for real AI detection
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  UPLOAD STEP
// ═══════════════════════════════════════════════════════════════
function UploadStep({ onParsed }) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [jobRole, setJobRole] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(pdf|docx|doc|txt|md)$/i)) {
      setError("Upload PDF, DOCX, or TXT.");
      return;
    }
    setFile(f);
    setError("");
  };
  const handleParse = async () => {
    if (!file) return;
    setStatus("parsing");
    setError("");
    try {
      const formData = new FormData();
      formData.append("resume", file);
      const res = await fetch("/api/resume/parse", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Failed to parse resume");
      const result = await res.json();
      const resumeText = result.resumeText;
      if (!resumeText || resumeText.length < 50)
        throw new Error("Could not extract text — try another format.");
      onParsed({ resumeText, jobRole, fileName: file.name });
    } catch (e) {
      setStatus("error");
      setError(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <h2
        style={{
          fontSize: 26,
          fontFamily: "'Georgia',serif",
          color: C.text,
          marginBottom: 8,
        }}
      >
        Upload Your Resume
      </h2>
      <p
        style={{
          color: C.muted,
          marginBottom: 32,
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        Claude parses your resume and generates tailored questions. Camera
        monitoring activates during the interview session.
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragging ? C.accent : file ? C.success : C.border}`,
          borderRadius: 12,
          padding: "36px 24px",
          textAlign: "center",
          cursor: "pointer",
          background: dragging
            ? C.accentGlow
            : file
              ? "rgba(63,185,80,0.07)"
              : C.surface,
          transition: "all 0.2s",
          marginBottom: 18,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md"
          style={{ display: "none" }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
        <div style={{ fontSize: 36, marginBottom: 10 }}>
          {file ? "✅" : "📄"}
        </div>
        {file ? (
          <>
            <div style={{ color: C.success, fontWeight: 600 }}>{file.name}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              {(file.size / 1024).toFixed(1)} KB · click to change
            </div>
          </>
        ) : (
          <>
            <div style={{ color: C.text, fontWeight: 600 }}>
              Drop resume here or click to browse
            </div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>
              PDF · DOCX · TXT · max 5 MB
            </div>
          </>
        )}
      </div>

      <div style={{ marginBottom: 20 }}>
        <label
          style={{
            color: C.muted,
            fontSize: 12,
            display: "block",
            marginBottom: 6,
          }}
        >
          Target Role (optional)
        </label>
        <input
          value={jobRole}
          onChange={(e) => setJobRole(e.target.value)}
          placeholder="e.g. Senior Frontend Engineer, Data Scientist…"
          style={{
            width: "100%",
            padding: "10px 14px",
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 8,
            color: C.text,
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            background: "rgba(248,81,73,0.1)",
            border: `1px solid ${C.danger}`,
            borderRadius: 8,
            padding: "10px 14px",
            color: C.danger,
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleParse}
        disabled={!file || status === "parsing"}
        style={{
          width: "100%",
          padding: 14,
          background: !file || status === "parsing" ? C.border : C.accent,
          color: !file || status === "parsing" ? C.muted : "#0d1117",
          border: "none",
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
          cursor: !file || status === "parsing" ? "not-allowed" : "pointer",
          transition: "all 0.2s",
        }}
      >
        {status === "parsing"
          ? "⏳ Parsing with AI…"
          : "Parse Resume & Generate Questions →"}
      </button>

      {/* Feature pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 20,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {[
          "🎥 Camera Monitoring",
          "😊 Emotion Detection",
          "📊 Performance Charts",
          "📥 Download Report",
        ].map((f) => (
          <span
            key={f}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 20,
              padding: "4px 12px",
              color: C.muted,
              fontSize: 11,
            }}
          >
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  GENERATING SCREEN
// ═══════════════════════════════════════════════════════════════
function GeneratingScreen() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(
      () => setDots((d) => (d.length >= 3 ? "." : d + ".")),
      500,
    );
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{ textAlign: "center", padding: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 20 }}>🤖</div>
      <h3
        style={{
          color: C.text,
          fontFamily: "'Georgia',serif",
          fontSize: 22,
          margin: 0,
        }}
      >
        Analysing resume{dots}
      </h3>
      <p style={{ color: C.muted, marginTop: 10 }}>
        Extracting skills & experience · Crafting tailored questions
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  INTERVIEW STEP — with camera panel
// ═══════════════════════════════════════════════════════════════
function InterviewStep({ questionData, resumeText, onComplete }) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analyses, setAnalyses] = useState({});
  const [error, setError] = useState("");
  const [emotionLog, setEmotionLog] = useState([]);
  const [camOpen, setCamOpen] = useState(true);

  const q = questionData.questions[current];
  const total = questionData.questions.length;
  const b = badge(q.type);

  const onEmotionCapture = useCallback((data) => {
    setEmotionLog((prev) => [...prev, data]);
  }, []);

  const submitAnswer = async () => {
    if (!draft.trim()) return;
    setAnalysing(true);
    setError("");
    try {
      const analysis = await analyseAnswer(q, draft, resumeText);
      setAnalyses((prev) => ({ ...prev, [current]: analysis }));
      setAnswers((prev) => ({ ...prev, [current]: draft }));
    } catch (e) {
      setError("Analysis failed: " + e.message);
    } finally {
      setAnalysing(false);
    }
  };

  const goNext = () => {
    if (current < total - 1) {
      setCurrent((c) => c + 1);
      setDraft(answers[current + 1] || "");
      setError("");
    } else onComplete({ answers, analyses, emotionLog });
  };
  const goPrev = () => {
    if (current > 0) {
      setCurrent((c) => c - 1);
      setDraft(answers[current - 1] || "");
      setError("");
    }
  };

  const analysis = analyses[current];
  const answered = !!answers[current];

  return (
    <div>
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Georgia',serif",
              fontSize: 20,
              color: C.text,
              margin: 0,
            }}
          >
            {questionData.candidateName}
          </h2>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            {questionData.suggestedRole}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ color: C.muted, fontSize: 12 }}>
            Q {current + 1} / {total}
          </div>
          <div
            style={{
              height: 4,
              width: 100,
              background: C.border,
              borderRadius: 99,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${((current + 1) / total) * 100}%`,
                background: C.accent,
                borderRadius: 99,
                transition: "width 0.3s",
              }}
            />
          </div>
          <button
            onClick={() => setCamOpen((o) => !o)}
            style={{
              padding: "5px 12px",
              background: C.surface,
              border: `1px solid ${C.border}`,
              color: C.muted,
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            {camOpen ? "Hide Cam" : "Show Cam"}
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        {/* Left: question panel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Question card */}
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: 24,
              marginBottom: 16,
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  background: b.bg,
                  color: b.color,
                  borderRadius: 6,
                  padding: "3px 10px",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {b.label}
              </span>
            </div>
            <p
              style={{
                fontSize: 17,
                color: C.text,
                lineHeight: 1.65,
                margin: 0,
                fontFamily: "'Georgia',serif",
              }}
            >
              {q.question}
            </p>
            <div
              style={{
                marginTop: 16,
                padding: "10px 14px",
                background: C.bg,
                borderRadius: 8,
                borderLeft: `3px solid ${C.border}`,
              }}
            >
              <div
                style={{
                  color: C.muted,
                  fontSize: 11,
                  marginBottom: 4,
                  letterSpacing: "0.5px",
                }}
              >
                💡 STRONG ANSWERS COVER
              </div>
              <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
                {q.hint}
              </div>
            </div>
          </div>

          {/* Answer textarea */}
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type your answer… Use STAR method for behavioural questions."
            rows={6}
            style={{
              width: "100%",
              background: C.surface,
              border: `1px solid ${answered ? C.success : C.border}`,
              borderRadius: 10,
              color: C.text,
              fontSize: 14,
              padding: "12px 14px",
              resize: "vertical",
              outline: "none",
              boxSizing: "border-box",
              lineHeight: 1.7,
              fontFamily: "inherit",
            }}
          />

          {error && (
            <div
              style={{
                background: "rgba(248,81,73,0.1)",
                border: `1px solid ${C.danger}`,
                borderRadius: 8,
                padding: "8px 12px",
                color: C.danger,
                fontSize: 12,
                marginTop: 8,
              }}
            >
              {error}
            </div>
          )}

          {/* Analysis */}
          {analysis && (
            <div
              style={{
                marginTop: 14,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
                padding: 18,
                animation: "fadeIn 0.3s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <span
                  style={{
                    color: ratingColor(analysis.rating),
                    fontWeight: 700,
                    fontSize: 15,
                  }}
                >
                  {analysis.rating}
                </span>
                <span
                  style={{
                    fontSize: 24,
                    fontWeight: 800,
                    color: scoreColor(analysis.score),
                  }}
                >
                  {analysis.score}
                  <span
                    style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}
                  >
                    /10
                  </span>
                </span>
              </div>
              {analysis.strengths?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      color: C.success,
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 5,
                      letterSpacing: "0.5px",
                    }}
                  >
                    ✓ STRENGTHS
                  </div>
                  {analysis.strengths.map((s, i) => (
                    <div
                      key={i}
                      style={{ color: C.text, fontSize: 12, marginBottom: 2 }}
                    >
                      • {s}
                    </div>
                  ))}
                </div>
              )}
              {analysis.improvements?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <div
                    style={{
                      color: C.warning,
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 5,
                      letterSpacing: "0.5px",
                    }}
                  >
                    ↑ IMPROVEMENTS
                  </div>
                  {analysis.improvements.map((s, i) => (
                    <div
                      key={i}
                      style={{ color: C.text, fontSize: 12, marginBottom: 2 }}
                    >
                      • {s}
                    </div>
                  ))}
                </div>
              )}
              {analysis.modelAnswer && (
                <div
                  style={{
                    padding: "10px 12px",
                    background: C.bg,
                    borderRadius: 8,
                    borderLeft: `3px solid ${C.purple}`,
                  }}
                >
                  <div
                    style={{
                      color: C.purple,
                      fontSize: 11,
                      fontWeight: 600,
                      marginBottom: 3,
                    }}
                  >
                    ✦ MODEL ANSWER
                  </div>
                  <div
                    style={{ color: C.muted, fontSize: 12, lineHeight: 1.6 }}
                  >
                    {analysis.modelAnswer}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button
              onClick={goPrev}
              disabled={current === 0}
              style={{
                padding: "10px 18px",
                background: C.surface,
                border: `1px solid ${C.border}`,
                color: current === 0 ? C.border : C.text,
                borderRadius: 8,
                cursor: current === 0 ? "not-allowed" : "pointer",
                fontWeight: 600,
                fontSize: 13,
              }}
            >
              ← Prev
            </button>
            <div style={{ flex: 1 }} />
            {!analysis && (
              <button
                onClick={submitAnswer}
                disabled={!draft.trim() || analysing}
                style={{
                  padding: "10px 20px",
                  background: !draft.trim() || analysing ? C.border : "#238636",
                  color: !draft.trim() || analysing ? C.muted : "#fff",
                  border: "none",
                  borderRadius: 8,
                  cursor:
                    !draft.trim() || analysing ? "not-allowed" : "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {analysing ? "⏳ Analysing…" : "Submit & Analyse"}
              </button>
            )}
            <button
              onClick={goNext}
              style={{
                padding: "10px 20px",
                background: C.accent,
                color: "#0d1117",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13,
              }}
            >
              {current === total - 1 ? "Finish Interview →" : "Next →"}
            </button>
          </div>
        </div>

        {/* Right: camera */}
        {camOpen && (
          <div style={{ width: 240, flexShrink: 0 }}>
            <CameraMonitor
              isActive={true}
              questionIndex={current}
              onEmotionCapture={onEmotionCapture}
            />
            {/* Emotion log mini */}
            {emotionLog.length > 0 && (
              <div
                style={{
                  marginTop: 10,
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    color: C.muted,
                    fontSize: 10,
                    marginBottom: 6,
                    letterSpacing: "0.5px",
                  }}
                >
                  EMOTION HISTORY
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                  {emotionLog.slice(-18).map((e, i) => {
                    const em = EMOTION_META[e.dominant] || EMOTION_META.neutral;
                    return (
                      <span key={i} title={em.label} style={{ fontSize: 14 }}>
                        {em.emoji}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  REPORT HELPERS — derive chart data from emotion log + analyses
// ═══════════════════════════════════════════════════════════════
function buildChartData(questionData, analyses, emotionLog) {
  const questions = questionData.questions;
  const analyzed = Object.values(analyses).filter(Boolean);

  // 1. Per-question score bar chart
  const scoreData = questions.map((q, i) => ({
    name: `Q${i + 1}`,
    score: analyses[i]?.score ?? 0,
    fill: scoreColor(analyses[i]?.score ?? 0),
    question: q.question.slice(0, 40) + "…",
  }));

  // 2. Competency radar (derive from question types)
  const byType = {
    behavioural: [],
    technical: [],
    experience: [],
    situational: [],
  };
  questions.forEach((q, i) => {
    if (analyses[i])
      (byType[q.type] || byType.behavioural).push(analyses[i].score);
  });
  const avg = (arr) =>
    arr.length
      ? Math.round((arr.reduce((s, x) => s + x, 0) / arr.length) * 10) / 10
      : analyzed.length
        ? analyzed.reduce((s, a) => s + a.score, 0) / analyzed.length
        : 5;
  const radarData = [
    { subject: "Communication", score: avg(byType.behavioural) },
    { subject: "Technical", score: avg(byType.technical) },
    { subject: "Experience", score: avg(byType.experience) },
    { subject: "Problem Solving", score: avg(byType.situational) },
    { subject: "Overall", score: avg(analyzed.map((a) => a.score)) },
  ];

  // 3. Emotion distribution pie
  const emotionCounts = {};
  emotionLog.forEach((e) => {
    emotionCounts[e.dominant] = (emotionCounts[e.dominant] || 0) + 1;
  });
  const pieFill = {
    neutral: "#58a6ff",
    happy: "#3fb950",
    surprised: "#e3b341",
    sad: "#8957e5",
    fearful: "#db6d28",
    angry: "#f85149",
    disgusted: "#768390",
  };
  const emotionPie = Object.entries(emotionCounts)
    .map(([k, v]) => ({
      name: EMOTION_META[k]?.label || k,
      value: v,
      color: pieFill[k] || "#888",
    }))
    .sort((a, b) => b.value - a.value);

  // 4. Attention / confidence area chart per question
  const byQ = {};
  emotionLog.forEach((e) => {
    (byQ[e.questionIndex] || (byQ[e.questionIndex] = [])).push(e);
  });
  const timelineData = questions.map((_, i) => {
    const pts = byQ[i] || [];
    const avgAttn = pts.length
      ? pts.reduce((s, p) => s + (p.attentionScore || 70), 0) / pts.length
      : 65;
    const avgConf = pts.length
      ? pts.reduce(
          (s, p) =>
            s +
            ((p.expressions?.happy || 0) * 100 +
              (p.expressions?.neutral || 0) * 50),
          0,
        ) / pts.length
      : 50;
    return {
      name: `Q${i + 1}`,
      attention: Math.round(avgAttn),
      confidence: Math.round(Math.min(100, avgConf)),
    };
  });

  return { scoreData, radarData, emotionPie, timelineData };
}

// Custom tooltip for bar chart
const ScoreTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: C.surface2,
        border: `1px solid ${C.border}`,
        borderRadius: 8,
        padding: "10px 14px",
        maxWidth: 200,
      }}
    >
      <div style={{ color: C.muted, fontSize: 11, marginBottom: 4 }}>
        {d.question}
      </div>
      <div
        style={{ color: scoreColor(d.score), fontWeight: 700, fontSize: 18 }}
      >
        {d.score}
        <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}>
          /10
        </span>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
//  HTML REPORT GENERATOR (download)
// ═══════════════════════════════════════════════════════════════
function generateHTMLReport({
  candidateName,
  suggestedRole,
  skills,
  report,
  questions,
  answers,
  analyses,
  emotionLog,
  chartData,
}) {
  const scoreRows = questions
    .map((q, i) => {
      const a = analyses[i];
      return `<tr><td>Q${i + 1}</td><td>${q.type}</td><td style="max-width:300px">${q.question}</td><td style="text-align:center;font-weight:700;color:${a ? scoreColor(a.score) : "#888"}">${a ? `${a.score}/10` : "—"}</td><td>${a?.rating || "—"}</td></tr>`;
    })
    .join("");
  const emotionCounts = chartData.emotionPie
    .map((e) => `<li><b>${e.name}</b>: ${e.value} readings</li>`)
    .join("");
  const strengths =
    report?.topStrengths?.map((s) => `<li>${s}</li>`).join("") || "";
  const improvements =
    report?.areasToImprove?.map((s) => `<li>${s}</li>`).join("") || "";
  const avgScore = (
    Object.values(analyses)
      .filter(Boolean)
      .reduce((s, a) => s + (a?.score || 0), 0) /
    (Object.values(analyses).filter(Boolean).length || 1)
  ).toFixed(1);
  const scoreChartData = JSON.stringify(
    chartData.scoreData.map((d) => d.score),
  );
  const scoreLabels = JSON.stringify(chartData.scoreData.map((d) => d.name));
  const emoLabels = JSON.stringify(chartData.emotionPie.map((e) => e.name));
  const emoVals = JSON.stringify(chartData.emotionPie.map((e) => e.value));
  const emoColors = JSON.stringify(chartData.emotionPie.map((e) => e.color));
  const attnData = JSON.stringify(
    chartData.timelineData.map((d) => d.attention),
  );
  const confData = JSON.stringify(
    chartData.timelineData.map((d) => d.confidence),
  );
  const tlLabels = JSON.stringify(chartData.timelineData.map((d) => d.name));
  const verdictColor =
    {
      "Strong Hire": "#3fb950",
      Hire: "#4ac261",
      Consider: "#d29922",
      Pass: "#f85149",
    }[report?.verdict] || "#888";

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Interview Report — ${candidateName}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Georgia,sans-serif;background:#0d1117;color:#e6edf3;padding:40px 20px;max-width:900px;margin:0 auto}
  @media print{body{background:#fff;color:#000}}
  h1{font-family:Georgia,serif;font-size:28px;margin-bottom:4px}
  h2{font-family:Georgia,serif;font-size:18px;margin:28px 0 14px;border-bottom:1px solid #30363d;padding-bottom:8px}
  .meta{color:#8b949e;font-size:13px;margin-bottom:30px}
  .cards{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px}
  .card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:16px;text-align:center}
  .card-val{font-size:26px;font-weight:800;margin-bottom:4px}
  .card-lbl{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px}
  .summary{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:24px;line-height:1.7}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
  .box{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px}
  .box h3{font-size:13px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
  .box ul{padding-left:16px;font-size:13px;line-height:1.8}
  .charts{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
  .chart-box{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px}
  .chart-box h3{font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px}
  .chart-full{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px;margin-bottom:16px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{background:#0d1117;padding:8px 12px;text-align:left;color:#8b949e;font-weight:600;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:10px 12px;border-bottom:1px solid #21262d;vertical-align:top}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600}
  .skills{display:flex;flex-wrap:wrap;gap:6px}
  .skill{background:#1a2a3a;color:#58a6ff;border-radius:4px;padding:3px 10px;font-size:12px}
  footer{text-align:center;color:#8b949e;font-size:12px;margin-top:40px;padding-top:20px;border-top:1px solid #30363d}
</style></head><body>
<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
  <div><h1>${candidateName}</h1><div class="meta">${suggestedRole} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</div></div>
  <div style="text-align:right"><div style="font-size:13px;color:#8b949e;margin-bottom:4px">VERDICT</div><div style="font-size:22px;font-weight:800;color:${verdictColor}">${report?.verdict || "—"}</div></div>
</div>

<div class="skills" style="margin-bottom:24px">${(skills || []).map((s) => `<span class="skill">${s}</span>`).join("")}</div>

<div class="cards">
  <div class="card"><div class="card-val" style="color:#58a6ff">${avgScore}/10</div><div class="card-lbl">Avg Score</div></div>
  <div class="card"><div class="card-val" style="color:${verdictColor}">${report?.overallScore || "—"}%</div><div class="card-lbl">Overall</div></div>
  <div class="card"><div class="card-val" style="color:#bc8cff">${questions.length}</div><div class="card-lbl">Questions</div></div>
  <div class="card"><div class="card-val" style="color:#3fb950">${emotionLog.length}</div><div class="card-lbl">Emotion Samples</div></div>
</div>

${report?.summary ? `<div class="summary"><strong>Overall Assessment</strong><br><br>${report.summary}</div>` : ""}

<div class="grid2">
  <div class="box"><h3>✓ Top Strengths</h3><ul>${strengths || "<li>See detailed breakdown</li>"}</ul></div>
  <div class="box"><h3>↑ Areas to Improve</h3><ul>${improvements || "<li>See detailed breakdown</li>"}</ul></div>
</div>

<h2>Performance Analytics</h2>
<div class="charts">
  <div class="chart-box"><h3>Question Scores</h3><canvas id="scoresChart" height="200"></canvas></div>
  <div class="chart-box"><h3>Emotion Distribution</h3><canvas id="emoChart" height="200"></canvas></div>
</div>
<div class="chart-full"><h3>Attention & Confidence Timeline</h3><canvas id="timelineChart" height="120"></canvas></div>

${emotionLog.length ? `<h2>Emotion Analysis</h2><div class="box" style="margin-bottom:24px"><h3>Readings by State</h3><ul>${emotionCounts}</ul></div>` : ""}

<h2>Question Breakdown</h2>
<table><thead><tr><th>#</th><th>Type</th><th>Question</th><th>Score</th><th>Rating</th></tr></thead>
<tbody>${scoreRows}</tbody></table>

<footer>Resume AI Interviewer · Interview Report · ${new Date().getFullYear()}</footer>

<script>
Chart.defaults.color='#8b949e';Chart.defaults.borderColor='#30363d';
const sc=document.getElementById('scoresChart');
if(sc){new Chart(sc,{type:'bar',data:{labels:${scoreLabels},datasets:[{data:${scoreChartData},backgroundColor:${scoreChartData}.map(s=>s>=8?'#3fb950':s>=6?'#58a6ff':s>=4?'#d29922':'#f85149'),borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{y:{min:0,max:10,ticks:{stepSize:2}}}}})}
const ec=document.getElementById('emoChart');
if(ec){new Chart(ec,{type:'doughnut',data:{labels:${emoLabels},datasets:[{data:${emoVals},backgroundColor:${emoColors},borderWidth:2,borderColor:'#161b22'}]},options:{responsive:true,plugins:{legend:{position:'right',labels:{boxWidth:12,font:{size:11}}}}}})}
const tc=document.getElementById('timelineChart');
if(tc){new Chart(tc,{type:'line',data:{labels:${tlLabels},datasets:[{label:'Attention',data:${attnData},borderColor:'#58a6ff',backgroundColor:'rgba(88,166,255,0.1)',fill:true,tension:0.4},{label:'Confidence',data:${confData},borderColor:'#3fb950',backgroundColor:'rgba(63,185,80,0.1)',fill:true,tension:0.4}]},options:{responsive:true,plugins:{legend:{position:'top'}},scales:{y:{min:0,max:100}}}})}
</script></body></html>`;
}

// ═══════════════════════════════════════════════════════════════
//  REPORT STEP — charts + download
// ═══════════════════════════════════════════════════════════════
function ReportStep({
  questionData,
  answers,
  analyses,
  emotionLog,
  resumeText,
}) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const reportRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await generateReport(
          questionData.candidateName,
          questionData.questions,
          Object.values(answers),
          Object.values(analyses),
        );
        setReport(r);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const chartData = buildChartData(questionData, analyses, emotionLog);
  const avgScore = (
    Object.values(analyses)
      .filter(Boolean)
      .reduce((s, a) => s + (a?.score || 0), 0) /
    (Object.values(analyses).filter(Boolean).length || 1)
  ).toFixed(1);
  const verdictColor =
    {
      "Strong Hire": C.success,
      Hire: "#4ac261",
      Consider: C.warning,
      Pass: C.danger,
    }[report?.verdict] || C.muted;

  const downloadReport = () => {
    const html = generateHTMLReport({
      candidateName: questionData.candidateName,
      suggestedRole: questionData.suggestedRole,
      skills: questionData.skills,
      report,
      questions: questionData.questions,
      answers: Object.values(answers),
      analyses: Object.values(analyses),
      emotionLog,
      chartData,
    });
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Interview-Report-${questionData.candidateName.replace(/\s+/g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div style={{ color: C.muted, fontSize: 16 }}>Generating report…</div>
      </div>
    );

  return (
    <div ref={reportRef} style={{ maxWidth: 860, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 28,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "'Georgia',serif",
              fontSize: 26,
              color: C.text,
              margin: 0,
            }}
          >
            Interview Complete
          </h2>
          <div style={{ color: C.muted, marginTop: 4, fontSize: 14 }}>
            {questionData.candidateName} · {questionData.suggestedRole}
          </div>
        </div>
        <button
          onClick={downloadReport}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 20px",
            background: "#238636",
            color: "#fff",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
            flexShrink: 0,
          }}
        >
          📥 Download Report
        </button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 12,
          marginBottom: 24,
        }}
      >
        {[
          {
            label: "Avg Score",
            val: `${avgScore}/10`,
            color: scoreColor(parseFloat(avgScore)),
          },
          {
            label: "Overall",
            val: `${report?.overallScore || "—"}%`,
            color: C.accent,
          },
          {
            label: "Verdict",
            val: report?.verdict || "—",
            color: verdictColor,
          },
          { label: "Emotions", val: emotionLog.length, color: C.purple },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: "16px 12px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 24, fontWeight: 800, color: s.color }}>
              {s.val}
            </div>
            <div
              style={{
                color: C.muted,
                fontSize: 11,
                marginTop: 4,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Summary text */}
      {report?.summary && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            OVERALL ASSESSMENT
          </div>
          <p style={{ color: C.text, lineHeight: 1.7, margin: 0 }}>
            {report.summary}
          </p>
        </div>
      )}

      {/* Strengths / improvements */}
      {report && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 14,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div
              style={{
                color: C.success,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.5px",
                marginBottom: 10,
              }}
            >
              ✓ TOP STRENGTHS
            </div>
            {report.topStrengths?.map((s, i) => (
              <div
                key={i}
                style={{ color: C.text, fontSize: 13, marginBottom: 5 }}
              >
                • {s}
              </div>
            ))}
          </div>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 18,
            }}
          >
            <div
              style={{
                color: C.warning,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.5px",
                marginBottom: 10,
              }}
            >
              ↑ AREAS TO IMPROVE
            </div>
            {report.areasToImprove?.map((s, i) => (
              <div
                key={i}
                style={{ color: C.text, fontSize: 13, marginBottom: 5 }}
              >
                • {s}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ color: C.danger, fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── CHARTS ── */}
      <div
        style={{
          color: C.muted,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.5px",
          marginBottom: 14,
        }}
      >
        PERFORMANCE ANALYTICS
      </div>

      {/* Row 1: Score bar + Radar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        {/* Bar: per-question scores */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 14,
            }}
          >
            QUESTION SCORES
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={chartData.scoreData}
              margin={{ top: 0, right: 8, bottom: 0, left: -20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
              <YAxis domain={[0, 10]} tick={{ fill: C.muted, fontSize: 11 }} />
              <Tooltip content={<ScoreTooltip />} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.scoreData.map((d, i) => (
                  <Cell key={i} fill={scoreColor(d.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar: competencies */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 14,
            }}
          >
            COMPETENCY RADAR
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <RadarChart data={chartData.radarData}>
              <PolarGrid stroke={C.border} />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: C.muted, fontSize: 10 }}
              />
              <PolarRadiusAxis
                domain={[0, 10]}
                tick={{ fill: C.muted, fontSize: 9 }}
              />
              <Radar
                dataKey="score"
                stroke={C.accent}
                fill={C.accent}
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Emotion pie + Timeline */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 24,
        }}
      >
        {/* Emotion distribution */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 14,
            }}
          >
            EMOTION DISTRIBUTION{" "}
            {emotionLog.length === 0 && (
              <span style={{ color: C.border }}>(no data)</span>
            )}
          </div>
          {chartData.emotionPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={chartData.emotionPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                  style={{ fontSize: 10, fill: C.muted }}
                >
                  {chartData.emotionPie.map((d, i) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.border,
                fontSize: 13,
              }}
            >
              Enable camera for emotion data
            </div>
          )}
        </div>

        {/* Attention / confidence timeline */}
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 14,
            }}
          >
            ATTENTION & CONFIDENCE{" "}
            {emotionLog.length === 0 && (
              <span style={{ color: C.border }}>(no data)</span>
            )}
          </div>
          {emotionLog.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={chartData.timelineData}
                margin={{ top: 0, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                <XAxis dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: C.muted, fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: C.surface2,
                    border: `1px solid ${C.border}`,
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} />
                <Area
                  type="monotone"
                  dataKey="attention"
                  stroke={C.accent}
                  fill={C.accentGlow}
                  strokeWidth={2}
                  name="Attention"
                />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stroke={C.success}
                  fill="rgba(63,185,80,0.1)"
                  strokeWidth={2}
                  name="Confidence"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: C.border,
                fontSize: 13,
              }}
            >
              Enable camera for timeline data
            </div>
          )}
        </div>
      </div>

      {/* Q&A Breakdown */}
      <div
        style={{
          color: C.muted,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.5px",
          marginBottom: 12,
        }}
      >
        QUESTION-BY-QUESTION BREAKDOWN
      </div>
      {questionData.questions.map((q, i) => {
        const a = analyses[i];
        const ans = answers[i];
        const b = badge(q.type);
        return (
          <div
            key={i}
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 18,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>
                  Q{i + 1}
                </span>
                <span
                  style={{
                    background: b.bg,
                    color: b.color,
                    fontSize: 11,
                    padding: "2px 8px",
                    borderRadius: 5,
                    fontWeight: 600,
                  }}
                >
                  {b.label}
                </span>
              </div>
              {a && (
                <span
                  style={{
                    color: scoreColor(a.score),
                    fontWeight: 800,
                    fontSize: 18,
                  }}
                >
                  {a.score}
                  <span
                    style={{ color: C.muted, fontSize: 12, fontWeight: 400 }}
                  >
                    /10
                  </span>
                </span>
              )}
            </div>
            <div
              style={{
                color: C.text,
                fontSize: 14,
                marginBottom: 8,
                fontFamily: "'Georgia',serif",
              }}
            >
              {q.question}
            </div>
            {ans ? (
              <div
                style={{
                  color: C.muted,
                  fontSize: 12,
                  lineHeight: 1.6,
                  borderTop: `1px solid ${C.border}`,
                  paddingTop: 8,
                }}
              >
                <span
                  style={{ color: C.accent, fontSize: 10, fontWeight: 600 }}
                >
                  YOUR ANSWER:{" "}
                </span>
                {ans}
              </div>
            ) : (
              <div
                style={{ color: C.border, fontSize: 12, fontStyle: "italic" }}
              >
                Skipped
              </div>
            )}
            {a?.modelAnswer && (
              <div
                style={{
                  marginTop: 8,
                  padding: "8px 12px",
                  background: C.bg,
                  borderRadius: 8,
                  borderLeft: `3px solid ${C.purple}`,
                }}
              >
                <span
                  style={{ color: C.purple, fontSize: 10, fontWeight: 600 }}
                >
                  ✦ MODEL:{" "}
                </span>
                <span style={{ color: C.muted, fontSize: 12 }}>
                  {a.modelAnswer}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* Bottom download */}
      <div
        style={{
          textAlign: "center",
          marginTop: 32,
          paddingTop: 24,
          borderTop: `1px solid ${C.border}`,
        }}
      >
        <button
          onClick={downloadReport}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 32px",
            background: "#238636",
            color: "#fff",
            border: "none",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 16,
            marginBottom: 12,
          }}
        >
          📥 Download Full Report (HTML)
        </button>
        <div style={{ color: C.muted, fontSize: 12 }}>
          Opens as a printable page · Save as PDF from your browser's print menu
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [stage, setStage] = useState("upload");
  const [questionData, setQuestionData] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [interviewResult, setInterviewResult] = useState(null);
  const [genError, setGenError] = useState("");

  const handleParsed = async ({ resumeText, jobRole }) => {
    setResumeText(resumeText);
    setStage("generating");
    setGenError("");
    try {
      const data = await generateQuestions(resumeText, jobRole);
      setQuestionData(data);
      setStage("interview");
    } catch (e) {
      setGenError(e.message);
      setStage("upload");
    }
  };

  const handleInterviewComplete = (result) => {
    setInterviewResult(result);
    setStage("report");
  };

  const restart = () => {
    setStage("upload");
    setQuestionData(null);
    setResumeText("");
    setInterviewResult(null);
    setGenError("");
  };

  const stepIdx = ["upload", "interview", "report"].indexOf(
    stage === "generating" ? "interview" : stage,
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: C.bg,
        color: C.text,
        fontFamily: "'Segoe UI',system-ui,sans-serif",
      }}
    >
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        textarea:focus{border-color:#58a6ff!important}
        input:focus{border-color:#58a6ff!important;box-shadow:0 0 0 3px rgba(88,166,255,0.15)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes scanline{0%{top:0}100%{top:100%}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#30363d;border-radius:3px}
      `}</style>

      {/* Nav */}
      <div
        style={{
          borderBottom: `1px solid ${C.border}`,
          background: "rgba(13,17,23,0.95)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          style={{
            maxWidth: 920,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 52,
            padding: "0 20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 20 }}>🎓</span>
            <span
              style={{
                fontFamily: "'Georgia',serif",
                fontWeight: 700,
                fontSize: 17,
                color: C.text,
              }}
            >
              Resume AI Interviewer
            </span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {["Upload", "Interview", "Report"].map((s, i) => (
              <div
                key={s}
                style={{ display: "flex", alignItems: "center", gap: 4 }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 700,
                    background:
                      i < stepIdx
                        ? C.success
                        : i === stepIdx
                          ? C.accent
                          : C.border,
                    color: i <= stepIdx ? "#0d1117" : C.muted,
                  }}
                >
                  {i < stepIdx ? "✓" : i + 1}
                </div>
                <span
                  style={{
                    color: i === stepIdx ? C.text : C.muted,
                    fontSize: 12,
                  }}
                >
                  {s}
                </span>
                {i < 2 && (
                  <div
                    style={{
                      width: 18,
                      height: 1,
                      background: C.border,
                      margin: "0 2px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "36px 20px" }}>
        {genError && (
          <div
            style={{
              background: "rgba(248,81,73,0.1)",
              border: `1px solid ${C.danger}`,
              borderRadius: 10,
              padding: "10px 16px",
              color: C.danger,
              marginBottom: 24,
              fontSize: 13,
            }}
          >
            ⚠️ {genError}
          </div>
        )}

        {stage === "upload" && <UploadStep onParsed={handleParsed} />}
        {stage === "generating" && <GeneratingScreen />}
        {stage === "interview" && questionData && (
          <InterviewStep
            questionData={questionData}
            resumeText={resumeText}
            onComplete={handleInterviewComplete}
          />
        )}
        {stage === "report" && interviewResult && questionData && (
          <>
            <ReportStep
              questionData={questionData}
              answers={interviewResult.answers}
              analyses={interviewResult.analyses}
              emotionLog={interviewResult.emotionLog || []}
              resumeText={resumeText}
            />
            <div style={{ textAlign: "center", marginTop: 28 }}>
              <button
                onClick={restart}
                style={{
                  padding: "11px 28px",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  borderRadius: 10,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                ↩ Start New Interview
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
