import { SignIn } from "@clerk/react";
import { Link } from "react-router-dom";

const T = {
  bg: "#0a0a0b",
  surface: "#111113",
  border: "#1e1e22",
  accent: "#00c896",
  text: "#f2ede8",
  muted: "#8a8a95",
  dim: "#3d3d45",
};

export default function Login() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: T.bg,
        display: "flex",
        fontFamily: "'DM Sans', sans-serif",
        color: T.text,
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { -webkit-font-smoothing: antialiased; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Left — Info panel */}
      <div
        style={{
          width: "45%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px",
          borderRight: `1px solid ${T.border}`,
          background: T.surface,
          animation: "fadeIn 0.6s ease",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
            }}
          >
            🎓
          </div>
          <span
            style={{
              fontFamily: "'Bricolage Grotesque'",
              fontWeight: 700,
              fontSize: 16,
              color: T.text,
              letterSpacing: "-0.03em",
            }}
          >
            ScholarAI
          </span>
        </Link>

        <div>
          <div
            style={{
              fontSize: 11,
              color: T.accent,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            Welcome back
          </div>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque'",
              fontSize: "clamp(32px, 3.5vw, 52px)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 20,
              color: T.text,
            }}
          >
            Continue your
            <br />
            interview prep
          </h1>
          <p
            style={{
              fontSize: 15,
              color: T.muted,
              lineHeight: 1.7,
              fontWeight: 300,
              maxWidth: 360,
              marginBottom: 48,
            }}
          >
            Pick up where you left off. Your past interviews, scores, and
            reports are all saved.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { icon: "🧠", text: "Resume-tailored questions every session" },
              {
                icon: "👁",
                text: "MediaPipe attention and eye contact tracking",
              },
              { icon: "📊", text: "Full performance analytics and reports" },
            ].map((f) => (
              <div
                key={f.text}
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
              >
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                  {f.icon}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: T.muted,
                    fontWeight: 300,
                    lineHeight: 1.5,
                  }}
                >
                  {f.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 12, color: T.dim }}>
          Don't have an account?{" "}
          <Link
            to="/signup"
            style={{ color: T.accent, textDecoration: "none", fontWeight: 500 }}
          >
            Sign up free →
          </Link>
        </div>
      </div>

      {/* Right — Clerk */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "48px",
          animation: "fadeIn 0.6s 0.1s ease both",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <SignIn
            appearance={{
              elements: {
                rootBox: { width: "100%" },
                card: {
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  borderRadius: "4px",
                  boxShadow: "none",
                  padding: "32px",
                },
                headerTitle: {
                  fontFamily: "'Bricolage Grotesque'",
                  fontWeight: 700,
                  color: T.text,
                  fontSize: "22px",
                },
                headerSubtitle: { color: T.muted, fontSize: "13px" },
                socialButtonsBlockButton: {
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${T.border}`,
                  borderRadius: "3px",
                  color: T.text,
                  fontFamily: "'DM Sans'",
                },
                socialButtonsBlockButton__hover: {
                  background: "rgba(255,255,255,0.07)",
                },
                dividerLine: { background: T.border },
                dividerText: { color: T.dim, fontSize: "12px" },
                formFieldLabel: {
                  color: T.muted,
                  fontSize: "13px",
                  fontFamily: "'DM Sans'",
                },
                formFieldInput: {
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${T.border}`,
                  borderRadius: "3px",
                  color: T.text,
                  fontFamily: "'DM Sans'",
                  fontSize: "14px",
                },
                formButtonPrimary: {
                  background: T.accent,
                  border: "none",
                  borderRadius: "3px",
                  fontFamily: "'DM Sans'",
                  fontWeight: 600,
                  color: T.bg,
                  fontSize: "14px",
                  boxShadow: "none",
                },
                footerActionLink: { color: T.accent, fontFamily: "'DM Sans'" },
                identityPreviewText: { color: T.text },
                identityPreviewEditButtonIcon: { color: T.accent },
                formFieldInputShowPasswordButton: { color: T.muted },
                alertText: { color: T.muted },
              },
            }}
            fallbackRedirectUrl="/dashboard"
            signUpUrl="/signup"
          />
        </div>
      </div>
    </div>
  );
}
