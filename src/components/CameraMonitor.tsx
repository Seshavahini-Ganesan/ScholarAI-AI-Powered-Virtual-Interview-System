import { useEffect, useRef, useState, useCallback } from "react";

const C = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  accent: "#58a6ff",
  success: "#3fb950",
  warning: "#d29922",
  danger: "#f85149",
  text: "#e6edf3",
  muted: "#8b949e",
};

interface EmotionData {
  dominant: string;
  attentionScore: number;
  eyeContactScore: number;
  headPose: { yaw: number; pitch: number; roll: number };
  expressions: Record<string, number>;
  questionIndex: number;
  timestamp: number;
}

interface Props {
  isActive: boolean;
  questionIndex: number;
  onEmotionCapture?: (data: EmotionData) => void;
}

// Load MediaPipe scripts dynamically
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

export default function CameraMonitor({
  isActive,
  questionIndex,
  onEmotionCapture,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const faceMeshRef = useRef<any>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const lastEmit = useRef<number>(0);

  const [status, setStatus] = useState<
    "loading" | "active" | "error" | "no-face"
  >("loading");
  const [metrics, setMetrics] = useState({
    attention: 0,
    eyeContact: 0,
    headYaw: 0,
    headPitch: 0,
    lookingAway: false,
    distracted: false,
  });
  const [log, setLog] = useState<string[]>([]);
  const [sessionStats, setSessionStats] = useState({
    totalFrames: 0,
    attentiveFrames: 0,
    distractedCount: 0,
  });

  const addLog = useCallback((msg: string) => {
    setLog((prev) => [msg, ...prev].slice(0, 5));
  }, []);

  // ── Compute metrics from MediaPipe landmarks ──────────────────────────────
  const computeMetrics = useCallback((landmarks: any[]) => {
    // Key landmark indices for MediaPipe FaceMesh (468 points)
    const nose = landmarks[1];
    const leftEye = {
      inner: landmarks[133],
      outer: landmarks[33],
      top: landmarks[159],
      bottom: landmarks[145],
    };
    const rightEye = {
      inner: landmarks[362],
      outer: landmarks[263],
      top: landmarks[386],
      bottom: landmarks[374],
    };
    const leftPupil = landmarks[468] || landmarks[468] || landmarks[473];
    const rightPupil = landmarks[473] || landmarks[468];
    const chin = landmarks[152];
    const forehead = landmarks[10];
    const leftCheek = landmarks[234];
    const rightCheek = landmarks[454];

    // ── Head Yaw (left/right turn) ──────────────────────────────────────────
    const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
    const noseMidX = (leftCheek.x + rightCheek.x) / 2;
    const yawRaw = (nose.x - noseMidX) / (faceWidth / 2);
    const headYaw = Math.round(yawRaw * 45); // degrees approx

    // ── Head Pitch (up/down tilt) ───────────────────────────────────────────
    const faceHeight = Math.abs(chin.y - forehead.y);
    const noseMidY = (chin.y + forehead.y) / 2;
    const pitchRaw = (nose.y - noseMidY) / (faceHeight / 2);
    const headPitch = Math.round(pitchRaw * 30);

    // ── Eye Openness (detect blink / looking down) ──────────────────────────
    const leftEAR =
      Math.abs(leftEye.top.y - leftEye.bottom.y) /
      Math.abs(leftEye.outer.x - leftEye.inner.x);
    const rightEAR =
      Math.abs(rightEye.top.y - rightEye.bottom.y) /
      Math.abs(rightEye.outer.x - rightEye.inner.x);
    const avgEAR = (leftEAR + rightEAR) / 2;
    const eyesOpen = avgEAR > 0.15;

    // ── Eye Contact Score ───────────────────────────────────────────────────
    // Based on how centred the gaze is (yaw + pitch close to 0)
    const yawFactor = Math.max(0, 1 - Math.abs(headYaw) / 30);
    const pitchFactor = Math.max(0, 1 - Math.abs(headPitch) / 20);
    const eyeContactScore = Math.round(
      yawFactor * pitchFactor * (eyesOpen ? 100 : 60),
    );

    // ── Attention Score ─────────────────────────────────────────────────────
    const lookingAway =
      Math.abs(headYaw) > 20 || Math.abs(headPitch) > 15 || !eyesOpen;
    const attentionScore = lookingAway
      ? Math.round(Math.random() * 30 + 20)
      : Math.round(eyeContactScore * 0.9 + 10);

    // ── Derive "emotion" labels from pose ──────────────────────────────────
    // Map head/eye metrics to interview-relevant states
    let dominant = "neutral";
    const expressions: Record<string, number> = {
      neutral: 0,
      focused: 0,
      distracted: 0,
      confident: 0,
      nervous: 0,
      thinking: 0,
    };

    if (!eyesOpen) {
      dominant = "distracted";
      expressions.distracted = 0.8;
      expressions.neutral = 0.2;
    } else if (Math.abs(headYaw) > 25) {
      dominant = "distracted";
      expressions.distracted = 0.7;
      expressions.neutral = 0.3;
    } else if (
      Math.abs(headPitch) < 8 &&
      Math.abs(headYaw) < 10 &&
      eyeContactScore > 70
    ) {
      dominant = "focused";
      expressions.focused = 0.8;
      expressions.neutral = 0.2;
    } else if (headPitch > 10) {
      dominant = "thinking";
      expressions.thinking = 0.6;
      expressions.neutral = 0.4;
    } else if (headPitch < -10) {
      dominant = "confident";
      expressions.confident = 0.6;
      expressions.neutral = 0.4;
    } else if (eyeContactScore < 40) {
      dominant = "nervous";
      expressions.nervous = 0.5;
      expressions.neutral = 0.5;
    } else {
      dominant = "neutral";
      expressions.neutral = 0.8;
      expressions.focused = 0.2;
    }

    return {
      headYaw,
      headPitch,
      eyeContactScore,
      attentionScore,
      lookingAway,
      eyesOpen,
      dominant,
      expressions,
    };
  }, []);

  // ── Draw overlay on canvas ────────────────────────────────────────────────
  const drawOverlay = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      landmarks: any[],
      w: number,
      h: number,
      m: ReturnType<typeof computeMetrics>,
    ) => {
      ctx.clearRect(0, 0, w, h);

      // Draw face mesh dots
      ctx.fillStyle = m.lookingAway
        ? "rgba(248,81,73,0.5)"
        : "rgba(88,166,255,0.4)";
      for (const pt of landmarks) {
        ctx.beginPath();
        ctx.arc(pt.x * w, pt.y * h, 1, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw key connections (eyes, nose, mouth outline)
      const drawLine = (a: any, b: any, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(a.x * w, a.y * h);
        ctx.lineTo(b.x * w, b.y * h);
        ctx.stroke();
      };

      // Left eye outline
      const leftEyePts = [33, 160, 159, 158, 133, 153, 145, 144];
      for (let i = 0; i < leftEyePts.length - 1; i++) {
        drawLine(
          landmarks[leftEyePts[i]],
          landmarks[leftEyePts[i + 1]],
          m.lookingAway ? "rgba(248,81,73,0.8)" : "rgba(88,166,255,0.8)",
        );
      }

      // Right eye outline
      const rightEyePts = [362, 387, 386, 385, 263, 380, 374, 373];
      for (let i = 0; i < rightEyePts.length - 1; i++) {
        drawLine(
          landmarks[rightEyePts[i]],
          landmarks[rightEyePts[i + 1]],
          m.lookingAway ? "rgba(248,81,73,0.8)" : "rgba(88,166,255,0.8)",
        );
      }

      // Nose bridge
      [168, 6, 197, 195, 5].reduce((prev, curr) => {
        drawLine(landmarks[prev], landmarks[curr], "rgba(63,185,80,0.5)");
        return curr;
      });

      // Status indicator corner brackets
      const bracketColor = m.lookingAway ? C.danger : C.success;
      const bSize = 20;
      ctx.strokeStyle = bracketColor;
      ctx.lineWidth = 2;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(8, 8 + bSize);
      ctx.lineTo(8, 8);
      ctx.lineTo(8 + bSize, 8);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(w - 8 - bSize, 8);
      ctx.lineTo(w - 8, 8);
      ctx.lineTo(w - 8, 8 + bSize);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(8, h - 8 - bSize);
      ctx.lineTo(8, h - 8);
      ctx.lineTo(8 + bSize, h - 8);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(w - 8 - bSize, h - 8);
      ctx.lineTo(w - 8, h - 8);
      ctx.lineTo(w - 8, h - 8 - bSize);
      ctx.stroke();

      // Attention label
      ctx.fillStyle = bracketColor;
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        m.lookingAway ? "⚠ LOOK AT SCREEN" : "● TRACKING",
        12,
        h - 12,
      );
    },
    [computeMetrics],
  );

  // ── Init MediaPipe FaceMesh ───────────────────────────────────────────────
  const initMediaPipe = useCallback(async () => {
    try {
      setStatus("loading");

      // Load MediaPipe scripts from CDN
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
      );
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
      );
      await loadScript(
        "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js",
      );

      const win = window as any;

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Init FaceMesh
      const faceMesh = new win.FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const w = (canvas.width = video.videoWidth || 320);
        const h = (canvas.height = video.videoHeight || 240);

        if (
          !results.multiFaceLandmarks ||
          results.multiFaceLandmarks.length === 0
        ) {
          setStatus("no-face");
          ctx.clearRect(0, 0, w, h);
          return;
        }

        setStatus("active");
        const landmarks = results.multiFaceLandmarks[0];
        const m = computeMetrics(landmarks);

        drawOverlay(ctx, landmarks, w, h, m);

        setMetrics({
          attention: m.attentionScore,
          eyeContact: m.eyeContactScore,
          headYaw: m.headYaw,
          headPitch: m.headPitch,
          lookingAway: m.lookingAway,
          distracted: m.lookingAway,
        });

        setSessionStats((prev) => ({
          totalFrames: prev.totalFrames + 1,
          attentiveFrames: prev.attentiveFrames + (m.lookingAway ? 0 : 1),
          distractedCount: prev.distractedCount + (m.lookingAway ? 1 : 0),
        }));

        if (m.lookingAway) addLog("⚠ Look at the screen");
        else if (m.eyeContactScore > 80) addLog("✓ Good eye contact");

        // Emit data every 3 seconds
        const now = Date.now();
        if (onEmotionCapture && now - lastEmit.current > 3000) {
          lastEmit.current = now;
          onEmotionCapture({
            dominant: m.dominant,
            attentionScore: m.attentionScore,
            eyeContactScore: m.eyeContactScore,
            headPose: { yaw: m.headYaw, pitch: m.headPitch, roll: 0 },
            expressions: m.expressions,
            questionIndex,
            timestamp: now,
          });
        }
      });

      faceMeshRef.current = faceMesh;

      // Use MediaPipe Camera util to feed frames
      const camera = new win.Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 320,
        height: 240,
      });
      camera.start();
    } catch (err: any) {
      console.error("MediaPipe init error:", err);
      setStatus("error");
      addLog("Camera error: " + err.message);
    }
  }, [computeMetrics, drawOverlay, onEmotionCapture, questionIndex, addLog]);

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (isActive) initMediaPipe();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close?.();
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [isActive]);

  const attentionPct =
    sessionStats.totalFrames > 0
      ? Math.round(
          (sessionStats.attentiveFrames / sessionStats.totalFrames) * 100,
        )
      : 0;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Camera Feed */}
      <div
        style={{
          position: "relative",
          borderRadius: 12,
          overflow: "hidden",
          border: `1px solid ${status === "active" ? C.success : status === "no-face" ? C.warning : C.border}`,
          background: C.bg,
        }}
      >
        <video
          ref={videoRef}
          muted
          playsInline
          style={{ width: "100%", display: "block", transform: "scaleX(-1)" }}
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
          }}
        />

        {/* Status Badge */}
        <div
          style={{
            position: "absolute",
            top: 8,
            left: 8,
            background:
              status === "active"
                ? "rgba(63,185,80,0.15)"
                : status === "no-face"
                  ? "rgba(210,153,34,0.15)"
                  : "rgba(248,81,73,0.15)",
            border: `1px solid ${status === "active" ? C.success : status === "no-face" ? C.warning : C.danger}`,
            borderRadius: 6,
            padding: "2px 8px",
            color:
              status === "active"
                ? C.success
                : status === "no-face"
                  ? C.warning
                  : C.danger,
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {status === "loading"
            ? "⏳ LOADING..."
            : status === "active"
              ? "● MEDIAPIPE"
              : status === "no-face"
                ? "⚠ NO FACE"
                : "✕ ERROR"}
        </div>

        {/* Attention score overlay */}
        {status === "active" && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "rgba(13,17,23,0.8)",
              borderRadius: 6,
              padding: "2px 8px",
              fontSize: 11,
              fontWeight: 700,
              color:
                metrics.attention > 70
                  ? C.success
                  : metrics.attention > 40
                    ? C.warning
                    : C.danger,
            }}
          >
            {metrics.attention}%
          </div>
        )}
      </div>

      {/* Live Metrics */}
      {status === "active" && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 10,
            }}
          >
            LIVE METRICS
          </div>

          {[
            { label: "Attention", val: metrics.attention, icon: "🎯" },
            { label: "Eye Contact", val: metrics.eyeContact, icon: "👁" },
          ].map(({ label, val, icon }) => (
            <div key={label} style={{ marginBottom: 8 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 3,
                }}
              >
                <span style={{ color: C.muted, fontSize: 10 }}>
                  {icon} {label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color:
                      val > 70 ? C.success : val > 40 ? C.warning : C.danger,
                  }}
                >
                  {val}%
                </span>
              </div>
              <div
                style={{
                  height: 4,
                  background: C.border,
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${val}%`,
                    background:
                      val > 70 ? C.success : val > 40 ? C.warning : C.danger,
                    borderRadius: 99,
                    transition: "width 0.5s",
                  }}
                />
              </div>
            </div>
          ))}

          {/* Head Pose */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              marginTop: 8,
            }}
          >
            <div
              style={{
                background: "#0d1117",
                borderRadius: 6,
                padding: "6px 8px",
              }}
            >
              <div style={{ color: C.muted, fontSize: 9 }}>HEAD YAW</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: Math.abs(metrics.headYaw) > 20 ? C.danger : C.success,
                }}
              >
                {metrics.headYaw > 0 ? "→" : "←"} {Math.abs(metrics.headYaw)}°
              </div>
            </div>
            <div
              style={{
                background: "#0d1117",
                borderRadius: 6,
                padding: "6px 8px",
              }}
            >
              <div style={{ color: C.muted, fontSize: 9 }}>HEAD PITCH</div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color:
                    Math.abs(metrics.headPitch) > 15 ? C.warning : C.success,
                }}
              >
                {metrics.headPitch > 0 ? "↓" : "↑"}{" "}
                {Math.abs(metrics.headPitch)}°
              </div>
            </div>
          </div>

          {/* Status label */}
          <div
            style={{
              marginTop: 8,
              padding: "4px 8px",
              borderRadius: 6,
              textAlign: "center",
              background: metrics.lookingAway
                ? "rgba(248,81,73,0.1)"
                : "rgba(63,185,80,0.1)",
              border: `1px solid ${metrics.lookingAway ? C.danger : C.success}`,
              color: metrics.lookingAway ? C.danger : C.success,
              fontSize: 10,
              fontWeight: 700,
            }}
          >
            {metrics.lookingAway ? "⚠ LOOK AT SCREEN" : "✓ GOOD EYE CONTACT"}
          </div>
        </div>
      )}

      {/* Session Stats */}
      {sessionStats.totalFrames > 10 && (
        <div
          style={{
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 12,
          }}
        >
          <div
            style={{
              color: C.muted,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            SESSION STATS
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color:
                    attentionPct > 70
                      ? C.success
                      : attentionPct > 40
                        ? C.warning
                        : C.danger,
                }}
              >
                {attentionPct}%
              </div>
              <div style={{ color: C.muted, fontSize: 9 }}>ATTENTIVE</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.accent }}>
                {sessionStats.distractedCount}
              </div>
              <div style={{ color: C.muted, fontSize: 9 }}>DISTRACTIONS</div>
            </div>
          </div>
        </div>
      )}

      {/* Live Log */}
      {log.length > 0 && (
        <div
          style={{
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
              fontWeight: 600,
              letterSpacing: "0.5px",
              marginBottom: 6,
            }}
          >
            LIVE FEEDBACK
          </div>
          {log.map((l, i) => (
            <div
              key={i}
              style={{
                color: l.startsWith("⚠") ? C.warning : C.success,
                fontSize: 10,
                marginBottom: 2,
                opacity: 1 - i * 0.2,
              }}
            >
              {l}
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div
          style={{
            background: "rgba(248,81,73,0.1)",
            border: `1px solid ${C.danger}`,
            borderRadius: 10,
            padding: 12,
            textAlign: "center",
          }}
        >
          <div style={{ color: C.danger, fontSize: 12, marginBottom: 8 }}>
            Camera unavailable
          </div>
          <div style={{ color: C.muted, fontSize: 11 }}>
            Allow camera permission and refresh
          </div>
        </div>
      )}

      {/* No face detected */}
      {status === "no-face" && (
        <div
          style={{
            background: "rgba(210,153,34,0.1)",
            border: `1px solid ${C.warning}`,
            borderRadius: 10,
            padding: 10,
            textAlign: "center",
          }}
        >
          <div style={{ color: C.warning, fontSize: 11 }}>
            Position your face in the camera
          </div>
        </div>
      )}
    </div>
  );
}
