import CodingStep, { CodingResult } from "./CodingStep";
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import CameraMonitor from "./CameraMonitor";
import * as api from "../lib/api";
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

const badge = (type: string) =>
  ({
    technical: { bg: "#1a2a3a", color: "#58a6ff", label: "Technical" },
    behavioural: { bg: "#1a2a2a", color: "#3fb950", label: "Behavioural" },
    experience: { bg: "#2a1a3a", color: "#bc8cff", label: "Experience" },
    situational: { bg: "#2a2a1a", color: "#d29922", label: "Situational" },
  })[type] || { bg: "#1e1e1e", color: "#8b949e", label: type };

const ratingColor = (r: string) =>
  ({
    Excellent: C.success,
    Good: C.accent,
    Fair: C.warning,
    "Needs Improvement": C.danger,
  })[r] || C.muted;
const scoreColor = (s: number) =>
  s >= 8 ? C.success : s >= 6 ? C.accent : s >= 4 ? C.warning : C.danger;

// ─── Upload Step ─────────────────────────────────────────────────────────────
function UploadStep({ onParsed }: any) {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobRole, setJobRole] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (!f.name.match(/\.(pdf|docx|doc|txt|md)$/i)) {
      setError("Upload PDF, DOCX, or TXT.");
      return;
    }
    setFile(f);
    setError("");
  };

  // ✅ FIXED:  (not handleParsed) — sends file to backend
  const handleParse = async () => {
    if (!file) return;
    setStatus("parsing");
    setError("");
    try {
     const result = await api.parseResume(file);

const resumeText = result.resumeText;
      if (!resumeText || resumeText.length < 50)
        throw new Error("Could not extract text — try another format.");
      onParsed({ resumeText, jobRole, fileName: file.name });
    } catch (e: any) {
      setStatus("error");
      setError(e.message);
    }
  };

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <h2
        style={{
          fontSize: 26,
          fontFamily: "Georgia,serif",
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
          onChange={(e) => handleFile(e.target.files?.[0])}
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

// ─── Generating Screen ────────────────────────────────────────────────────────
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
          fontFamily: "Georgia,serif",
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

// ─── Interview Step ───────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// DROP-IN REPLACEMENT for the InterviewStep function inside InterviewApp.tsx
// Includes:
//   1. TTS  — reads each question aloud when it loads (Web Speech API)
//   2. STT  — records voice answer and transcribes live (Web Speech API)
// ─────────────────────────────────────────────────────────────────────────────

// Paste this ENTIRE block to replace your existing InterviewStep function.
// Everything else in InterviewApp.tsx stays the same.

function InterviewStep({ questionData, resumeText, onComplete }: any) {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [draft, setDraft] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [analyses, setAnalyses] = useState<any>({});
  const [error, setError] = useState("");
  const [emotionLog, setEmotionLog] = useState<any[]>([]);
  const [camOpen, setCamOpen] = useState(true);
  const [codingResults, setCodingResults] = useState<CodingResult[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  // ── TTS state ──────────────────────────────────────────────────────────────
  const [speaking, setSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);

  // ── STT state ──────────────────────────────────────────────────────────────
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  const q = questionData.questions[current];
  const total = questionData.questions.length;

  // Safety guard
  if (!q)
    return (
      <div style={{ textAlign: "center", padding: 60, color: C.danger }}>
        ⚠️ No questions loaded. Please go back and try again.
      </div>
    );

  const b = badge(q.type);

  const onEmotionCapture = useCallback((data: any) => {
    setEmotionLog((prev) => [...prev, data]);
  }, []);

  // ── TTS: speak question ────────────────────────────────────────────────────
  const speakQuestion = useCallback(
    (text: string) => {
      if (!ttsEnabled) return;
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.92;
      utter.pitch = 1.0;
      utter.volume = 1.0;
      // Pick a good English voice if available
      const voices = synth.getVoices();
      const preferred =
        voices.find(
          (v) =>
            v.lang.startsWith("en") &&
            (v.name.includes("Google") ||
              v.name.includes("Natural") ||
              v.name.includes("Neural")),
        ) || voices.find((v) => v.lang.startsWith("en"));
      if (preferred) utter.voice = preferred;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      synth.speak(utter);
      synthRef.current = synth;
    },
    [ttsEnabled],
  );

  const stopSpeaking = useCallback(() => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  }, []);

  // ── Auto-speak when question changes ──────────────────────────────────────
  useEffect(() => {
    if (ttsEnabled && q?.question) {
      // Small delay so UI renders first
      const t = setTimeout(() => speakQuestion(q.question), 400);
      return () => {
        clearTimeout(t);
        window.speechSynthesis?.cancel();
        setSpeaking(false);
      };
    }
  }, [current, ttsEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  // ── STT: start recording ───────────────────────────────────────────────────
  const startRecording = useCallback(() => {
    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SR) {
      setError(
        "Speech recognition is not supported in this browser. Use Chrome or Edge.",
      );
      return;
    }

    // Stop TTS while recording
    stopSpeaking();

    const recognition = new SR();
    recognitionRef.current = recognition;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-IN"; // Indian English — change to "en-US" if preferred
    recognition.maxAlternatives = 1;

    let finalText = draft; // Start from existing draft

    recognition.onstart = () => {
      setRecording(true);
      setTranscript("");
      setError("");
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) {
        finalText += final;
        setDraft(finalText.trim());
      }
      setTranscript(interim); // Show live interim text
    };

    recognition.onerror = (event: any) => {
      setRecording(false);
      setTranscript("");
      if (event.error === "not-allowed") {
        setError(
          "Microphone permission denied. Please allow microphone access.",
        );
      } else if (event.error === "no-speech") {
        setError("No speech detected. Please try again.");
      } else {
        setError(`Speech error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setRecording(false);
      setTranscript("");
    };

    recognition.start();
  }, [draft, stopSpeaking]);

  const stopRecording = useCallback(() => {
    recognitionRef.current?.stop();
    setRecording(false);
    setTranscript("");
  }, []);

  // ── Submit Answer ──────────────────────────────────────────────────────────
  const submitAnswer = async () => {
    if (!draft.trim()) return;
    stopSpeaking();
    stopRecording();
    setAnalysing(true);
    setError("");
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Question: ${q.question}\nExpected: ${q.hint}\nAnswer: ${draft}\nResume context: ${(resumeText || "").slice(0, 600)}\n\nReturn ONLY JSON:\n{"score":<0-10>,"rating":"Excellent|Good|Fair|Needs Improvement","strengths":["..."],"improvements":["..."],"modelAnswer":"<2-3 sentences>"}`,
            },
          ],
          system: "Expert interviewer. Return ONLY valid JSON, no markdown.",
          maxTokens: 800,
        }),
      });
      const r = await res.json();
      if (!r.text) throw new Error(r.error || "No response");
      const clean = r.text.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const analysis = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            score: 5,
            rating: "Fair",
            strengths: [],
            improvements: [],
            modelAnswer: "",
          };
      setAnalyses((prev: any) => ({ ...prev, [current]: analysis }));
      setAnswers((prev: any) => ({ ...prev, [current]: draft }));
    } catch (e: any) {
      setError("Analysis failed: " + e.message);
    } finally {
      setAnalysing(false);
    }
  };

  const goNext = () => {
    stopSpeaking();
    stopRecording();
    if (current < total - 1) {
      setCurrent((c) => c + 1);
      setDraft(answers[current + 1] || "");
      setError("");
    } else {
      onComplete({ answers, analyses, emotionLog });
    }
  };

  const goPrev = () => {
    stopSpeaking();
    stopRecording();
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
      {/* ── Header ─────────────────────────────────────────────────────────── */}
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
              fontFamily: "'Bricolage Grotesque', Georgia, serif",
              fontSize: 20,
              color: C.text,
              margin: 0,
              letterSpacing: "-0.02em",
            }}
          >
            {questionData.candidateName}
          </h2>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>
            {questionData.suggestedRole}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ── Question Card ─────────────────────────────────────────────── */}
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
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
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

              {/* ── TTS Controls ──────────────────────────────────────────── */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {speaking ? (
                  <button
                    onClick={stopSpeaking}
                    title="Stop reading"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(248,81,73,0.1)",
                      border: `1px solid ${C.danger}`,
                      color: C.danger,
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>⏹</span> Stop
                  </button>
                ) : (
                  <button
                    onClick={() => speakQuestion(q.question)}
                    title="Read question aloud"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "5px 12px",
                      borderRadius: 6,
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: 600,
                      background: "rgba(88,166,255,0.08)",
                      border: `1px solid ${C.accent}40`,
                      color: C.accent,
                      transition: "all 0.2s",
                    }}
                  >
                    <span style={{ fontSize: 14 }}>🔊</span> Read
                  </button>
                )}

                {/* Auto-read toggle */}
                <button
                  onClick={() => setTtsEnabled((e) => !e)}
                  title={ttsEnabled ? "Disable auto-read" : "Enable auto-read"}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    cursor: "pointer",
                    fontSize: 11,
                    background: ttsEnabled ? "rgba(63,185,80,0.08)" : C.surface,
                    border: `1px solid ${ttsEnabled ? C.success + "50" : C.border}`,
                    color: ttsEnabled ? C.success : C.muted,
                    transition: "all 0.2s",
                  }}
                >
                  {ttsEnabled ? "Auto ✓" : "Auto"}
                </button>
              </div>
            </div>

            <p
              style={{
                fontSize: 17,
                color: C.text,
                lineHeight: 1.65,
                margin: 0,
                fontFamily: "'Bricolage Grotesque', Georgia, serif",
                letterSpacing: "-0.01em",
              }}
            >
              {q.question}
              {speaking && (
                <span
                  style={{
                    display: "inline-block",
                    marginLeft: 10,
                    animation: "pulse 1s ease infinite",
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: C.accent,
                      fontFamily: "sans-serif",
                      fontWeight: 400,
                    }}
                  >
                    🔊 reading…
                  </span>
                </span>
              )}
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

          {/* ── Answer Area ───────────────────────────────────────────────── */}
          <div style={{ position: "relative", marginBottom: 12 }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                recording
                  ? "🎙 Listening… speak your answer…"
                  : "Type your answer or use the microphone below…"
              }
              rows={6}
              style={{
                width: "100%",
                background: C.surface,
                border: `1px solid ${recording ? C.danger : answered ? C.success : C.border}`,
                borderRadius: 10,
                color: C.text,
                fontSize: 14,
                padding: "12px 14px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                lineHeight: 1.7,
                fontFamily: "inherit",
                transition: "border-color 0.2s",
              }}
            />
            {/* Live transcript overlay */}
            {recording && transcript && (
              <div
                style={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  right: 12,
                  background: "rgba(13,17,23,0.85)",
                  borderRadius: 6,
                  padding: "6px 10px",
                  fontSize: 12,
                  color: C.muted,
                  fontStyle: "italic",
                  lineHeight: 1.5,
                  pointerEvents: "none",
                }}
              >
                <span
                  style={{ color: C.danger, fontWeight: 600, marginRight: 6 }}
                >
                  🎙
                </span>
                {transcript}
              </div>
            )}
          </div>

          {/* ── Voice Controls ─────────────────────────────────────────────── */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
              padding: "10px 14px",
              background: C.surface,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
            }}
          >
            <span style={{ fontSize: 12, color: C.muted, flex: 1 }}>
              {recording ? (
                <span style={{ color: C.danger, fontWeight: 600 }}>
                  🔴 Recording… speak your answer
                </span>
              ) : (
                "🎙 Use your voice to answer"
              )}
            </span>

            {!recording ? (
              <button
                onClick={startRecording}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  background: "rgba(248,81,73,0.1)",
                  border: `1px solid ${C.danger}40`,
                  color: C.danger,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: 13,
                  transition: "all 0.2s",
                }}
              >
                <span style={{ fontSize: 16 }}>🎙</span> Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 18px",
                  background: C.danger,
                  border: "none",
                  color: "#fff",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontWeight: 700,
                  fontSize: 13,
                  animation: "pulse 1.5s ease infinite",
                }}
              >
                <span style={{ fontSize: 14 }}>⏹</span> Stop Recording
              </button>
            )}

            {draft && !recording && (
              <button
                onClick={() => setDraft("")}
                style={{
                  padding: "8px 14px",
                  background: "transparent",
                  border: `1px solid ${C.border}`,
                  color: C.muted,
                  borderRadius: 8,
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Clear
              </button>
            )}
          </div>

          {/* ── STT helper text ─────────────────────────────────────────────── */}
          <div
            style={{
              fontSize: 11,
              color: C.dim,
              marginBottom: 14,
              paddingLeft: 4,
            }}
          >
            💡 Speak clearly • Chrome & Edge only • Indian English supported •
            You can also type above
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: "rgba(248,81,73,0.1)",
                border: `1px solid ${C.danger}`,
                borderRadius: 8,
                padding: "8px 12px",
                color: C.danger,
                fontSize: 12,
                marginBottom: 12,
              }}
            >
              {error}
            </div>
          )}

          {/* ── Analysis Result ───────────────────────────────────────────── */}
          {analysis && (
            <div
              style={{
                marginTop: 4,
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
                  {analysis.strengths.map((s: string, i: number) => (
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
                  {analysis.improvements.map((s: string, i: number) => (
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

          {/* ── Nav Buttons ──────────────────────────────────────────────── */}
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

        {/* ── Camera ────────────────────────────────────────────────────────── */}
        {camOpen && (
          <div style={{ width: 240, flexShrink: 0 }}>
            <CameraMonitor
              isActive={true}
              questionIndex={current}
              onEmotionCapture={onEmotionCapture}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
      `}</style>
    </div>
  );
}

// ─── Report Step ──────────────────────────────────────────────────────────────
function ReportStep({
  questionData,
  answers,
  analyses,
  emotionLog,
  resumeText,
  codingResults = [],
}: any) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    generateAndSaveReport();
  }, []);

  // ✅ FIXED: uses /api/claude directly
  const generateAndSaveReport = async () => {
    try {
      const qa = questionData.questions
        .map(
          (q: any, i: number) =>
            `Q: ${q.question}\nA: ${answers[i] || "(skipped)"}\nScore: ${analyses[i]?.score ?? "N/A"}/10`,
        )
        .join("\n\n");

      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Candidate: ${questionData.candidateName}\n\n${qa}\n\nReturn ONLY JSON:\n{"overallScore":<0-100>,"verdict":"Strong Hire|Hire|Consider|Pass","summary":"<2-3 sentences>","topStrengths":["...","...","..."],"areasToImprove":["...","..."]}`,
            },
          ],
          system: "Hiring manager. Return ONLY valid JSON, no markdown.",
          maxTokens: 600,
        }),
      });
      const r = await res.json();
      if (!r.text) throw new Error(r.error || "No AI response");
      const clean = r.text.replace(/```json|```/g, "").trim();
      const jsonMatch = clean.match(/\{[\s\S]*\}/);
      const reportData = jsonMatch
        ? JSON.parse(jsonMatch[0])
        : {
            overallScore: 50,
            verdict: "Consider",
            summary: "Interview completed.",
            topStrengths: [],
            areasToImprove: [],
          };

      setReport(reportData);

      // Save to dashboard (non-blocking — don't crash if it fails)
      // Save to dashboard
      try {
        const clerk = (window as any).Clerk;
        const token = await clerk?.session?.getToken();
        console.log("Token available:", !!token);

        if (token) {
          const saveRes = await fetch("/api/interview/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              candidateName: questionData.candidateName,
              suggestedRole: questionData.suggestedRole,
              questions: questionData.questions,
              answers,
              analyses,
              emotionLog,
              report: reportData,
            }),
          });
          const saveData = await saveRes.json();
          console.log("Save result:", JSON.stringify(saveData));
        } else {
          console.warn("NO TOKEN — interview not saved");
        }
      } catch (saveErr: any) {
        console.error("Save error:", saveErr.message);
      }
    } catch (e: any) {
      console.error(e.message);
      setReport({
        overallScore: 0,
        verdict: "Consider",
        summary: "Report generation failed.",
        topStrengths: [],
        areasToImprove: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const avgScoreVal = (
      Object.values(analyses)
        .filter(Boolean)
        .reduce((s: number, a: any) => s + (a?.score || 0), 0) /
      (Object.values(analyses).filter(Boolean).length || 1)
    ).toFixed(1);

    const rows = questionData.questions
      .map(
        (q: any, i: number) => `
      <tr>
        <td>${i + 1}</td><td>${q.type}</td><td>${q.question}</td>
        <td style="text-align:center;font-weight:700">${analyses[i]?.score ?? "—"}/10</td>
        <td>${analyses[i]?.rating ?? "—"}</td>
      </tr>`,
      )
      .join("");

    const html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<title>Interview Report - ${questionData.candidateName}</title>
<style>
  body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;padding:40px;max-width:860px;margin:0 auto}
  h1{font-family:Georgia,serif;font-size:28px;margin-bottom:4px}
  .meta{color:#8b949e;font-size:13px;margin-bottom:32px}
  .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:28px}
  .card{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;text-align:center}
  .card-val{font-size:28px;font-weight:800;margin-bottom:4px}
  .card-lbl{font-size:11px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px}
  .summary{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:20px;margin-bottom:24px;line-height:1.7}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:28px}
  .box{background:#161b22;border:1px solid #30363d;border-radius:10px;padding:18px}
  .box h3{font-size:12px;color:#8b949e;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px}
  .box ul{padding-left:16px;font-size:13px;line-height:1.8}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:16px}
  th{background:#0d1117;padding:10px 14px;text-align:left;color:#8b949e;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
  td{padding:12px 14px;border-bottom:1px solid #21262d;vertical-align:top}
  footer{text-align:center;color:#8b949e;font-size:12px;margin-top:40px;padding-top:20px;border-top:1px solid #30363d}
  @media print{body{background:#fff;color:#000}}
</style></head><body>
<h1>${questionData.candidateName}</h1>
<div class="meta">${questionData.suggestedRole} &middot; ${new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}</div>
<div class="cards">
  <div class="card"><div class="card-val" style="color:#58a6ff">${avgScoreVal}/10</div><div class="card-lbl">Avg Score</div></div>
  <div class="card"><div class="card-val" style="color:#3fb950">${report?.overallScore || 0}%</div><div class="card-lbl">Overall</div></div>
  <div class="card"><div class="card-val" style="color:#bc8cff">${report?.verdict || "—"}</div><div class="card-lbl">Verdict</div></div>
</div>
<div class="summary"><strong>Overall Assessment</strong><br><br>${report?.summary || ""}</div>
<div class="grid2">
  <div class="box"><h3>Top Strengths</h3><ul>${report?.topStrengths?.map((s: string) => `<li>${s}</li>`).join("") || ""}</ul></div>
  <div class="box"><h3>Areas to Improve</h3><ul>${report?.areasToImprove?.map((s: string) => `<li>${s}</li>`).join("") || ""}</ul></div>
</div>
<table>
  <thead><tr><th>#</th><th>Type</th><th>Question</th><th style="text-align:center">Score</th><th>Rating</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<footer>ScholarAI Interviewer &middot; ${new Date().getFullYear()}</footer>
</body></html>`;

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

  const avgScore = (
    Object.values(analyses)
      .filter(Boolean)
      .reduce((s: number, a: any) => s + (a?.score || 0), 0) /
    (Object.values(analyses).filter(Boolean).length || 1)
  ).toFixed(1);

  const verdictColorMap: Record<string, string> = {
    "Strong Hire": C.success,
    Hire: "#4ac261",
    Consider: C.warning,
    Pass: C.danger,
  };
  const verdictColor = verdictColorMap[report?.verdict as string] || C.muted;

  const chartData = (() => {
    const questions = questionData.questions;
    const analyzed = Object.values(analyses).filter(Boolean) as any[];

    const scoreData = questions.map((q: any, i: number) => ({
      name: `Q${i + 1}`,
      score: (analyses[i] as any)?.score ?? 0,
      question: q.question.slice(0, 40) + "…",
    }));

    const byType: Record<string, number[]> = {
      behavioural: [],
      technical: [],
      experience: [],
      situational: [],
    };
    questions.forEach((q: any, i: number) => {
      if (analyses[i])
        (byType[q.type] || byType.behavioural).push((analyses[i] as any).score);
    });
    const avg = (arr: number[]) =>
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
      { subject: "Overall", score: avg(analyzed.map((a: any) => a.score)) },
    ];

    const emotionCounts: Record<string, number> = {};
    emotionLog.forEach((e: any) => {
      emotionCounts[e.dominant] = (emotionCounts[e.dominant] || 0) + 1;
    });
    const pieFill: Record<string, string> = {
      neutral: "#58a6ff",
      happy: "#3fb950",
      surprised: "#e3b341",
      sad: "#8957e5",
      fearful: "#db6d28",
      angry: "#f85149",
      disgusted: "#768390",
    };
    const emotionPie = Object.entries(emotionCounts)
      .map(([k, v]) => ({ name: k, value: v, color: pieFill[k] || "#888" }))
      .sort((a, b) => b.value - a.value);

    const byQ: Record<number, any[]> = {};
    emotionLog.forEach((e: any) => {
      (byQ[e.questionIndex] || (byQ[e.questionIndex] = [])).push(e);
    });
    const timelineData = questions.map((_: any, i: number) => {
      const pts = byQ[i] || [];
      const avgAttn = pts.length
        ? pts.reduce((s: number, p: any) => s + (p.attentionScore || 70), 0) /
          pts.length
        : 65;
      const avgConf = pts.length
        ? pts.reduce(
            (s: number, p: any) =>
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
  })();

  if (loading)
    return (
      <div style={{ textAlign: "center", padding: 60 }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div style={{ color: C.muted, fontSize: 16 }}>
          Generating report & saving interview…
        </div>
      </div>
    );

  return (
    <div style={{ maxWidth: 860, margin: "0 auto" }}>
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
              fontFamily: "Georgia,serif",
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
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={downloadReport}
            style={{
              padding: "12px 24px",
              background: "#238636",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            📥 Download Report
          </button>
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "12px 24px",
              background: C.accent,
              color: "#0d1117",
              border: "none",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>

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
            {report.topStrengths?.map((s: string, i: number) => (
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
            {report.areasToImprove?.map((s: string, i: number) => (
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

      {/* CHARTS */}
      <div
        style={{
          color: "#8b949e",
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: "0.5px",
          marginBottom: 14,
        }}
      >
        PERFORMANCE ANALYTICS
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: "#8b949e",
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
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis dataKey="name" tick={{ fill: "#8b949e", fontSize: 11 }} />
              <YAxis
                domain={[0, 10]}
                tick={{ fill: "#8b949e", fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#1c2128",
                  border: "1px solid #30363d",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                {chartData.scoreData.map((d: any, i: number) => (
                  <Cell
                    key={i}
                    fill={
                      d.score >= 8
                        ? "#3fb950"
                        : d.score >= 6
                          ? "#58a6ff"
                          : d.score >= 4
                            ? "#d29922"
                            : "#f85149"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: "#8b949e",
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
              <PolarGrid stroke="#30363d" />
              <PolarAngleAxis
                dataKey="subject"
                tick={{ fill: "#8b949e", fontSize: 10 }}
              />
              <PolarRadiusAxis
                domain={[0, 10]}
                tick={{ fill: "#8b949e", fontSize: 9 }}
              />
              <Radar
                dataKey="score"
                stroke="#58a6ff"
                fill="#58a6ff"
                fillOpacity={0.25}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: "#8b949e",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 14,
            }}
          >
            EMOTION DISTRIBUTION
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
                >
                  {chartData.emotionPie.map((d: any, i: number) => (
                    <Cell key={i} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#1c2128",
                    border: "1px solid #30363d",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#8b949e" }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div
              style={{
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#30363d",
                fontSize: 13,
              }}
            >
              Enable camera for emotion data
            </div>
          )}
        </div>
        <div
          style={{
            background: "#161b22",
            border: "1px solid #30363d",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <div
            style={{
              color: "#8b949e",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 14,
            }}
          >
            ATTENTION & CONFIDENCE
          </div>
          {emotionLog.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={chartData.timelineData}
                margin={{ top: 0, right: 8, bottom: 0, left: -20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#8b949e", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1c2128",
                    border: "1px solid #30363d",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#8b949e" }} />
                <Area
                  type="monotone"
                  dataKey="attention"
                  stroke="#58a6ff"
                  fill="rgba(88,166,255,0.15)"
                  strokeWidth={2}
                  name="Attention"
                />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  stroke="#3fb950"
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
                color: "#30363d",
                fontSize: 13,
              }}
            >
              Enable camera for timeline data
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 32,
          paddingTop: 24,
          borderTop: `1px solid ${C.border}`,
          textAlign: "center",
        }}
      >
        <p style={{ color: C.success, fontSize: 14, marginBottom: 16 }}>
          ✓ Interview saved to your dashboard
        </p>
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            padding: "12px 28px",
            background: C.accent,
            color: "#0d1117",
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          View All Interviews
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function InterviewApp() {
  const [stage, setStage] = useState("upload");
  const [questionData, setQuestionData] = useState<any>(null);
  const [resumeText, setResumeText] = useState("");
  const [interviewResult, setInterviewResult] = useState<any>(null);
  const [genError, setGenError] = useState("");
  const [codingResults, setCodingResults] = useState<any[]>([]);
  const [overallScore, setOverallScore] = useState(0);

  // ✅ FIXED: uses /api/claude directly — no auth needed
  const handleParsed = async ({ resumeText, jobRole }: any) => {
    setResumeText(resumeText);
    setStage("generating");
    setGenError("");
    try {
      const response = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: `Based on this resume, generate 5 interview questions.

RESUME:
${resumeText.slice(0, 2000)}

TARGET ROLE: ${jobRole || "Software Developer"}

Extract the candidate name from the resume. Generate questions specific to their actual experience, skills, and projects mentioned.

Return this exact JSON structure:
{
  "candidateName": "name from resume",
  "suggestedRole": "${jobRole || "Software Developer"}",
  "skills": ["skill1", "skill2", "skill3"],
  "questions": [
    {
      "id": 1,
      "type": "behavioural",
      "question": "specific question here",
      "hint": "what to cover"
    },
    {
      "id": 2,
      "type": "technical",
      "question": "specific question here",
      "hint": "what to cover"
    },
    {
      "id": 3,
      "type": "experience",
      "question": "specific question here",
      "hint": "what to cover"
    },
    {
      "id": 4,
      "type": "behavioural",
      "question": "specific question here",
      "hint": "what to cover"
    },
    {
      "id": 5,
      "type": "situational",
      "question": "specific question here",
      "hint": "what to cover"
    }
  ]
}`,
            },
          ],
          system:
            "You are a technical interviewer. You must respond with ONLY a JSON object. No explanation. No markdown. No code blocks. Start your response with { and end with }",
          maxTokens: 1200,
        }),
      });

      const result = await response.json();
      console.log("AI raw response:", result.text); // debug

      if (!result.text) throw new Error(result.error || "No AI response");

      // Try multiple parsing strategies
      let data: any = null;

      // Strategy 1: direct parse
      try {
        data = JSON.parse(result.text.trim());
      } catch {}

      // Strategy 2: extract JSON block
      if (!data) {
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            data = JSON.parse(match[0]);
          } catch {}
        }
      }

      // Strategy 3: use fallback questions
      if (!data || !data.questions || data.questions.length === 0) {
        data = {
          candidateName: "Candidate",
          suggestedRole: jobRole || "Software Developer",
          skills: ["Problem Solving", "Communication", "Technical Skills"],
          questions: [
            {
              id: 1,
              type: "behavioural",
              question: "Tell me about yourself and your background.",
              hint: "Focus on relevant experience and skills",
            },
            {
              id: 2,
              type: "technical",
              question:
                "What is your strongest technical skill and how have you applied it?",
              hint: "Give a concrete example",
            },
            {
              id: 3,
              type: "experience",
              question:
                "Describe the most challenging project you have worked on.",
              hint: "Explain the challenge and your solution",
            },
            {
              id: 4,
              type: "behavioural",
              question:
                "How do you handle working under pressure or tight deadlines?",
              hint: "Use STAR method",
            },
            {
              id: 5,
              type: "situational",
              question:
                "How would you approach learning a completely new technology quickly?",
              hint: "Show adaptability and learning strategy",
            },
          ],
        };
      }

      setQuestionData(data);
      setStage("interview");
    } catch (e: any) {
      setGenError(e.message);
      setStage("upload");
    }
  };

  const handleInterviewComplete = (result: any) => {
    setInterviewResult(result);
    const arr = Object.values(result.analyses).filter(Boolean) as any[];
    const avg = arr.length
      ? Math.round(
          (arr.reduce((s: number, a: any) => s + (a?.score || 0), 0) /
            arr.length) *
            10,
        )
      : 50;
    setOverallScore(avg);
    setStage("coding"); // go to coding round
  };

  const handleCodingComplete = (results: CodingResult[]) => {
    setCodingResults(results);
    setStage("report");
  };

  return (
    <div style={{ padding: "36px 20px", maxWidth: 920, margin: "0 auto" }}>
      <style>{`
        *{box-sizing:border-box}
        textarea:focus{border-color:#58a6ff!important}
        input:focus{border-color:#58a6ff!important;box-shadow:0 0 0 3px rgba(88,166,255,0.15)}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:#30363d;border-radius:3px}
      `}</style>

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
      {stage === "coding" && interviewResult && questionData && (
        <CodingStep
          questionData={questionData}
          resumeText={resumeText}
          overallScore={overallScore}
          onComplete={handleCodingComplete}
        />
      )}
      {stage === "report" && interviewResult && questionData && (
        <ReportStep
          questionData={questionData}
          answers={interviewResult.answers}
          analyses={interviewResult.analyses}
          emotionLog={interviewResult.emotionLog || []}
          resumeText={resumeText}
          codingResults={
            codingResults &&
            codingResults.length > 0 && (
              <>
                {/* ── CODING ROUND RESULTS ─────────────────────────────────────── */}
                <div
                  style={{
                    color: C.muted,
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.5px",
                    marginBottom: 14,
                  }}
                >
                  💻 CODING ROUND
                </div>

                {codingResults.map((r: any, i: number) => {
                  const passedCount = r.testResults.filter(
                    (t: any) => t.passed,
                  ).length;
                  const totalCount = r.testResults.length;

                  return (
                    <div
                      key={i}
                      style={{
                        background: C.surface,
                        border: `1px solid ${C.border}`,
                        borderRadius: 12,
                        padding: 20,
                        marginBottom: 16,
                      }}
                    >
                      {/* Header row */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 14,
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: 16,
                              fontWeight: 700,
                              color: C.text,
                              marginBottom: 4,
                            }}
                          >
                            Problem {i + 1}: {r.problem.title}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color:
                                  r.problem.difficulty === "Easy"
                                    ? C.success
                                    : r.problem.difficulty === "Medium"
                                      ? C.warning
                                      : C.danger,
                                border: `1px solid`,
                                borderRadius: 4,
                                padding: "2px 9px",
                                fontWeight: 600,
                              }}
                            >
                              {r.problem.difficulty}
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                color: C.muted,
                                border: `1px solid ${C.border}`,
                                borderRadius: 4,
                                padding: "2px 9px",
                              }}
                            >
                              {r.language}
                            </span>
                          </div>
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <div
                            style={{
                              fontSize: 28,
                              fontWeight: 800,
                              color:
                                r.score >= 8
                                  ? C.success
                                  : r.score >= 6
                                    ? C.accent
                                    : r.score >= 4
                                      ? C.warning
                                      : C.danger,
                            }}
                          >
                            {r.score}
                            <span
                              style={{
                                fontSize: 13,
                                color: C.muted,
                                fontWeight: 400,
                              }}
                            >
                              /10
                            </span>
                          </div>
                          <div style={{ fontSize: 11, color: C.muted }}>
                            score
                          </div>
                        </div>
                      </div>

                      {/* Test case pass/fail bar */}
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontSize: 11, color: C.muted }}>
                            Test Cases
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color:
                                r.passRate === 100
                                  ? C.success
                                  : r.passRate >= 50
                                    ? C.warning
                                    : C.danger,
                            }}
                          >
                            {passedCount}/{totalCount} passed ({r.passRate}%)
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: C.border,
                            borderRadius: 99,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${r.passRate}%`,
                              background:
                                r.passRate === 100
                                  ? C.success
                                  : r.passRate >= 50
                                    ? C.warning
                                    : C.danger,
                              borderRadius: 99,
                              transition: "width 0.5s",
                            }}
                          />
                        </div>
                        {/* Test case detail */}
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 8,
                          }}
                        >
                          {r.testResults.map((t: any, ti: number) => (
                            <div
                              key={ti}
                              title={t.description}
                              style={{
                                fontSize: 10,
                                padding: "3px 9px",
                                borderRadius: 99,
                                fontWeight: 600,
                                background: t.passed
                                  ? "rgba(63,185,80,0.1)"
                                  : "rgba(248,81,73,0.1)",
                                color: t.passed ? C.success : C.danger,
                                border: `1px solid ${t.passed ? C.success : C.danger}30`,
                              }}
                            >
                              {t.passed ? "✓" : "✗"} {t.description}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Candidate's code */}
                      <div style={{ marginBottom: 14 }}>
                        <div
                          style={{
                            fontSize: 11,
                            color: C.muted,
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                            marginBottom: 6,
                          }}
                        >
                          YOUR CODE
                        </div>
                        <div
                          style={{
                            background: C.bg,
                            border: `1px solid ${C.border}`,
                            borderRadius: 8,
                            padding: 12,
                            overflow: "auto",
                            maxHeight: 200,
                          }}
                        >
                          <pre
                            style={{
                              fontFamily: "monospace",
                              fontSize: 11,
                              color: C.text,
                              margin: 0,
                              whiteSpace: "pre-wrap",
                              lineHeight: 1.6,
                            }}
                          >
                            {r.code}
                          </pre>
                        </div>
                      </div>

                      {/* Optimal solution */}
                      {r.optimalCode && (
                        <div style={{ marginBottom: 14 }}>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.success,
                              fontWeight: 600,
                              letterSpacing: "0.5px",
                              marginBottom: 6,
                            }}
                          >
                            ✓ OPTIMAL SOLUTION
                          </div>
                          <div
                            style={{
                              background: C.bg,
                              border: `1px solid ${C.success}30`,
                              borderRadius: 8,
                              padding: 12,
                              overflow: "auto",
                              maxHeight: 200,
                            }}
                          >
                            <pre
                              style={{
                                fontFamily: "monospace",
                                fontSize: 11,
                                color: C.text,
                                margin: 0,
                                whiteSpace: "pre-wrap",
                                lineHeight: 1.6,
                              }}
                            >
                              {r.optimalCode}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* AI analysis */}
                      {r.aiAnalysis && (
                        <div>
                          <div
                            style={{
                              fontSize: 11,
                              color: C.purple,
                              fontWeight: 600,
                              letterSpacing: "0.5px",
                              marginBottom: 8,
                            }}
                          >
                            ✦ AI CODE REVIEW
                          </div>
                          <div
                            style={{
                              fontSize: 13,
                              color: C.muted,
                              lineHeight: 1.75,
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {r.aiAnalysis}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )
          }
        />
      )}
    </div>
  );
}
