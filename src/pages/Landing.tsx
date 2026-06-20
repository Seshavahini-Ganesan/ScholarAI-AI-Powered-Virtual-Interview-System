import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const T = {
  bg: "#0a0a0b",
  surface: "#111113",
  border: "#1e1e22",
  border2: "#2a2a30",
  accent: "#00c896",
  text: "#f2ede8",
  muted: "#8a8a95",
  dim: "#3d3d45",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');`;

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const features = [
    {
      n: "01",
      title: "Resume Intelligence",
      body: "Our AI reads your PDF or DOCX and extracts every skill, project, and role — then builds questions from what it finds.",
      tag: "NLP",
    },
    {
      n: "02",
      title: "Tailored Question Sets",
      body: "7 questions per session: behavioural, technical, experience-specific, situational. All grounded in your actual resume.",
      tag: "AI",
    },
    {
      n: "03",
      title: "MediaPipe Tracking",
      body: "Google's FaceMesh runs in your browser. Tracks eye contact, head yaw, pitch and attention score frame by frame.",
      tag: "CV",
    },
    {
      n: "04",
      title: "Answer Scoring Engine",
      body: "Each answer gets a score, rating, strengths, areas to improve, and a model answer written by the AI.",
      tag: "LLM",
    },
    {
      n: "05",
      title: "Performance Analytics",
      body: "Bar, radar, area and pie charts visualise your scores, competency map, attention timeline, and emotion distribution.",
      tag: "DATA",
    },
    {
      n: "06",
      title: "Hiring Verdict",
      body: "The AI evaluates your full session and delivers: Strong Hire, Hire, Consider, or Pass — with a written summary.",
      tag: "EVAL",
    },
  ];

  const plans = [
    {
      name: "Free",
      price: "₹0",
      note: "forever",
      credits: "3 interviews / month",
      items: [
        "AI question generation",
        "Per-answer analysis",
        "Basic report",
        "Camera monitoring",
      ],
      accent: false,
    },
    {
      name: "Pro",
      price: "₹749",
      note: "/ month",
      credits: "20 interviews / month",
      items: [
        "Everything in Free",
        "Full analytics suite",
        "Downloadable reports",
        "Priority AI",
      ],
      accent: true,
    },
    {
      name: "Enterprise",
      price: "₹2,499",
      note: "/ month",
      credits: "Unlimited",
      items: [
        "Everything in Pro",
        "Team dashboard",
        "Custom branding",
        "Dedicated support",
      ],
      accent: false,
    },
  ];

  return (
    <div
      style={{
        background: T.bg,
        color: T.text,
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100vh",
      }}
    >
      <style>{`
        ${FONTS}
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .nav-link { color: ${T.muted}; text-decoration: none; font-size: 14px; transition: color 0.15s; }
        .nav-link:hover { color: ${T.text}; }
        .feat-card { border-top: 1px solid ${T.border}; padding: 28px 0; transition: border-color 0.2s; }
        .feat-card:hover { border-top-color: ${T.accent}; }
        .feat-card:hover .feat-n { color: ${T.accent}; }
        .plan-card { border: 1px solid ${T.border}; border-radius: 4px; padding: 36px; transition: border-color 0.2s, transform 0.2s; }
        .plan-card:hover { border-color: ${T.border2}; transform: translateY(-2px); }
        .plan-highlight { border-color: ${T.accent} !important; }
        .cta-p { display: inline-flex; align-items: center; gap: 8px; padding: 11px 26px; background: ${T.accent}; color: ${T.bg}; border-radius: 3px; font-family: 'DM Sans'; font-size: 14px; font-weight: 600; text-decoration: none; transition: opacity 0.15s, transform 0.15s; letter-spacing: -0.01em; }
        .cta-p:hover { opacity: 0.88; transform: translateY(-1px); }
        .cta-g { display: inline-flex; align-items: center; gap: 8px; padding: 11px 26px; background: transparent; color: ${T.text}; border: 1px solid ${T.border2}; border-radius: 3px; font-family: 'DM Sans'; font-size: 14px; text-decoration: none; transition: border-color 0.15s; }
        .cta-g:hover { border-color: ${T.muted}; }
        .step-row { display: flex; gap: 40px; padding: 28px 20px; border-top: 1px solid ${T.border}; transition: background 0.15s; }
        .step-row:hover { background: rgba(255,255,255,0.02); }
      `}</style>

      {/* NAV */}
      <header
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 48px",
          background: scrolled ? "rgba(10,10,11,0.9)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: `1px solid ${scrolled ? T.border : "transparent"}`,
          transition: "all 0.3s",
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
              width: 26,
              height: 26,
              borderRadius: 6,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
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
        <nav style={{ display: "flex", gap: 32 }}>
          {["Features", "How It Works", "Pricing"].map((l) => (
            <a
              key={l}
              href={`#${l.toLowerCase().replace(/\s/g, "-")}`}
              className="nav-link"
            >
              {l}
            </a>
          ))}
        </nav>
        <div style={{ display: "flex", gap: 10 }}>
          <Link to="/login" className="cta-g" style={{ padding: "8px 18px" }}>
            Sign in
          </Link>
          <Link to="/signup" className="cta-p" style={{ padding: "8px 18px" }}>
            Get started
          </Link>
        </div>
      </header>

      {/* HERO */}
      <section
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "120px 48px 80px",
          maxWidth: 1200,
          margin: "0 auto",
          animation: "fadeIn 0.7s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: T.accent,
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: T.muted,
              fontWeight: 500,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            AI-Powered Interview Preparation
          </span>
        </div>
        <h1
          style={{
            fontFamily: "'Bricolage Grotesque'",
            fontSize: "clamp(52px, 7.5vw, 96px)",
            fontWeight: 800,
            lineHeight: 1.0,
            letterSpacing: "-0.04em",
            color: T.text,
            maxWidth: 860,
            marginBottom: 32,
          }}
        >
          Interview prep
          <br />
          that{" "}
          <em style={{ fontStyle: "italic", color: T.accent }}>
            actually works.
          </em>
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 1.8vw, 19px)",
            color: T.muted,
            maxWidth: 500,
            lineHeight: 1.7,
            fontWeight: 300,
            marginBottom: 44,
            letterSpacing: "-0.01em",
          }}
        >
          Upload your resume. Get tailored questions. Answer with AI feedback in
          real-time. Camera tracks your attention using MediaPipe.
        </p>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Link to="/signup" className="cta-p">
            Start free — 3 interviews →
          </Link>
          <Link to="/login" className="cta-g">
            Sign in
          </Link>
          <span style={{ fontSize: 12, color: T.dim, marginLeft: 6 }}>
            No credit card required
          </span>
        </div>
        <div
          style={{
            marginTop: 72,
            borderTop: `1px solid ${T.border}`,
            paddingTop: 28,
            display: "flex",
            gap: 48,
          }}
        >
          {[
            ["3", "Free interviews"],
            ["7", "Metrics tracked"],
            ["4", "Chart types"],
            ["Real-time", "AI feedback"],
          ].map(([v, l]) => (
            <div key={l}>
              <div
                style={{
                  fontFamily: "'Bricolage Grotesque'",
                  fontSize: 24,
                  fontWeight: 700,
                  color: T.text,
                  letterSpacing: "-0.03em",
                }}
              >
                {v}
              </div>
              <div style={{ fontSize: 12, color: T.dim, marginTop: 3 }}>
                {l}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TICKER */}
      <div
        style={{
          overflow: "hidden",
          borderTop: `1px solid ${T.border}`,
          borderBottom: `1px solid ${T.border}`,
          padding: "13px 0",
          background: T.surface,
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 48,
            animation: "ticker 22s linear infinite",
            whiteSpace: "nowrap",
          }}
        >
          {[...Array(2)]
            .flatMap(() => [
              "AI Resume Parsing",
              "Real-time Feedback",
              "MediaPipe Tracking",
              "Competency Analysis",
              "Tailored Questions",
              "Downloadable Reports",
              "Eye Contact Scoring",
              "Head Pose Detection",
            ])
            .map((item, i) => (
              <span
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 11,
                  color: T.muted,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                <span style={{ color: T.accent, fontSize: 7 }}>◆</span> {item}
              </span>
            ))}
        </div>
      </div>

      {/* FEATURES */}
      <section
        id="features"
        style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 48px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 48,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: T.accent,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Features
            </div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque'",
                fontSize: "clamp(28px, 4vw, 48px)",
                fontWeight: 700,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
              }}
            >
              Built for serious candidates
            </h2>
          </div>
          <Link to="/signup" className="cta-g">
            Try it free →
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "0 40px",
          }}
        >
          {features.map((f) => (
            <div key={f.n} className="feat-card">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}
              >
                <span
                  className="feat-n"
                  style={{
                    fontFamily: "'Bricolage Grotesque'",
                    fontSize: 12,
                    fontWeight: 700,
                    color: T.dim,
                    transition: "color 0.2s",
                  }}
                >
                  {f.n}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: T.muted,
                    border: `1px solid ${T.border}`,
                    borderRadius: 3,
                    padding: "2px 7px",
                    letterSpacing: "0.08em",
                  }}
                >
                  {f.tag}
                </span>
              </div>
              <h3
                style={{
                  fontFamily: "'Bricolage Grotesque'",
                  fontSize: 17,
                  fontWeight: 700,
                  letterSpacing: "-0.02em",
                  marginBottom: 8,
                  color: T.text,
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: T.muted,
                  lineHeight: 1.65,
                  fontWeight: 300,
                }}
              >
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        style={{
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 48px" }}>
          <div
            style={{
              fontSize: 11,
              color: T.accent,
              fontWeight: 600,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Process
          </div>
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque'",
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
              marginBottom: 48,
            }}
          >
            Four steps to interview mastery
          </h2>
          {[
            {
              n: "01",
              title: "Upload your resume",
              body: "PDF, DOCX, or plain text. Our server parses it and extracts your full work history, skills, and experience.",
              time: "~5 sec",
            },
            {
              n: "02",
              title: "Camera activates",
              body: "MediaPipe FaceMesh loads in your browser. No data sent to servers — all tracking happens locally on device.",
              time: "~2 sec",
            },
            {
              n: "03",
              title: "Answer 7 questions",
              body: "Each question references something real from your resume. Submit your answer and get instant AI analysis.",
              time: "~15 min",
            },
            {
              n: "04",
              title: "View your report",
              body: "Full breakdown: scores, radar chart, attention timeline, hiring verdict, and downloadable HTML report.",
              time: "Instant",
            },
          ].map((s) => (
            <div key={s.n} className="step-row">
              <span
                style={{
                  fontFamily: "'Bricolage Grotesque'",
                  fontSize: 12,
                  fontWeight: 700,
                  color: T.dim,
                  minWidth: 32,
                  paddingTop: 3,
                }}
              >
                {s.n}
              </span>
              <div style={{ flex: 1 }}>
                <h3
                  style={{
                    fontFamily: "'Bricolage Grotesque'",
                    fontSize: 19,
                    fontWeight: 700,
                    letterSpacing: "-0.02em",
                    marginBottom: 6,
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: T.muted,
                    lineHeight: 1.6,
                    fontWeight: 300,
                  }}
                >
                  {s.body}
                </p>
              </div>
              <span
                style={{
                  fontSize: 12,
                  color: T.accent,
                  fontWeight: 500,
                  border: `1px solid ${T.accent}35`,
                  borderRadius: 3,
                  padding: "4px 12px",
                  flexShrink: 0,
                  marginTop: 4,
                }}
              >
                {s.time}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section
        id="pricing"
        style={{ maxWidth: 1200, margin: "0 auto", padding: "96px 48px" }}
      >
        <div
          style={{
            fontSize: 11,
            color: T.accent,
            fontWeight: 600,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 10,
          }}
        >
          Pricing
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            marginBottom: 48,
          }}
        >
          <h2
            style={{
              fontFamily: "'Bricolage Grotesque'",
              fontSize: "clamp(28px, 4vw, 48px)",
              fontWeight: 700,
              letterSpacing: "-0.03em",
              lineHeight: 1.05,
            }}
          >
            Simple pricing.
            <br />
            No surprises.
          </h2>
          <p
            style={{
              fontSize: 14,
              color: T.muted,
              maxWidth: 240,
              fontWeight: 300,
              lineHeight: 1.6,
            }}
          >
            Start free. Upgrade when you need more interviews.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {plans.map((p) => (
            <div
              key={p.name}
              className={`plan-card${p.accent ? " plan-highlight" : ""}`}
            >
              {p.accent && (
                <div
                  style={{
                    fontSize: 10,
                    color: T.accent,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 16,
                  }}
                >
                  ◆ Most Popular
                </div>
              )}
              <div
                style={{
                  fontFamily: "'Bricolage Grotesque'",
                  fontSize: 15,
                  fontWeight: 600,
                  color: T.muted,
                  marginBottom: 8,
                }}
              >
                {p.name}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 4,
                  marginBottom: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: "'Bricolage Grotesque'",
                    fontSize: 42,
                    fontWeight: 800,
                    letterSpacing: "-0.03em",
                    color: T.text,
                  }}
                >
                  {p.price}
                </span>
                <span style={{ fontSize: 14, color: T.muted }}>{p.note}</span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: T.accent,
                  marginBottom: 24,
                  fontWeight: 400,
                }}
              >
                {p.credits}
              </div>
              <div
                style={{
                  borderTop: `1px solid ${T.border}`,
                  paddingTop: 22,
                  marginBottom: 26,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                {p.items.map((item) => (
                  <div
                    key={item}
                    style={{ display: "flex", gap: 10, alignItems: "center" }}
                  >
                    <span
                      style={{ color: T.accent, fontSize: 11, flexShrink: 0 }}
                    >
                      ✓
                    </span>
                    <span
                      style={{ fontSize: 13, color: T.muted, fontWeight: 300 }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                to="/signup"
                className={p.accent ? "cta-p" : "cta-g"}
                style={{
                  display: "block",
                  textAlign: "center",
                  padding: "11px",
                }}
              >
                {p.name === "Free"
                  ? "Start for free"
                  : p.name === "Enterprise"
                    ? "Contact sales"
                    : "Get Pro"}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section
        style={{ borderTop: `1px solid ${T.border}`, background: T.surface }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "96px 48px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 32,
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Bricolage Grotesque'",
                fontSize: "clamp(28px, 4vw, 56px)",
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.0,
                marginBottom: 14,
              }}
            >
              Ready to prepare
              <br />
              <em style={{ fontStyle: "italic", color: T.accent }}>
                the right way?
              </em>
            </h2>
            <p style={{ fontSize: 15, color: T.muted, fontWeight: 300 }}>
              Three free interviews. No credit card. Start in 60 seconds.
            </p>
          </div>
          <Link
            to="/signup"
            className="cta-p"
            style={{ fontSize: 15, padding: "15px 36px" }}
          >
            Get Started Free →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer
        style={{
          borderTop: `1px solid ${T.border}`,
          padding: "28px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 5,
              background: T.accent,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
            }}
          >
            🎓
          </div>
          <span
            style={{
              fontFamily: "'Bricolage Grotesque'",
              fontWeight: 700,
              fontSize: 14,
              letterSpacing: "-0.02em",
            }}
          >
            ScholarAI
          </span>
        </div>
        <span style={{ fontSize: 12, color: T.dim }}>
          © 2026 ScholarAI. All rights reserved.
        </span>
      </footer>
    </div>
  );
}
