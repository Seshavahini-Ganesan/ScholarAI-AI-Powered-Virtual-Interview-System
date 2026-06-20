import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useUser, UserButton, useAuth } from "@clerk/react";

const T = {
  bg: "#0a0a0b",
  surface: "#111113",
  border: "#1e1e22",
  border2: "#2a2a30",
  accent: "#00c896",
  text: "#f2ede8",
  muted: "#8a8a95",
  dim: "#3d3d45",
  success: "#00c896",
  warning: "#f59e0b",
  danger: "#ff4d4d",
};

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');`;

function StatCard({ label, value, sub, accent = false }: any) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        border: `1px solid ${h ? T.border2 : T.border}`,
        borderRadius: 4,
        padding: "24px 24px 20px",
        background: h ? T.surface : "transparent",
        transition: "all 0.2s",
        cursor: "default",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: T.muted,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Bricolage Grotesque'",
          fontSize: 38,
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: accent ? T.accent : T.text,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{ fontSize: 12, color: T.dim, marginTop: 6, fontWeight: 300 }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [credits, setCredits] = useState({ used: 0, total: 3, plan: "free" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadData();
  }, [user]);
  useEffect(() => {
    const fn = () => {
      if (user) loadData();
    };
    window.addEventListener("focus", fn);
    return () => window.removeEventListener("focus", fn);
  }, [user]);

  const loadData = async () => {
    try {
      const token = await getToken();
      if (!token) {
        setLoading(false);
        return;
      }
      const [ir, cr] = await Promise.all([
        fetch("/api/interviews", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/user/credits", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const id = await ir.json();
      const cd = await cr.json();
      setInterviews(Array.isArray(id) ? id : []);
      setCredits(
        cd?.used !== undefined ? cd : { used: 0, total: 3, plan: "free" },
      );
    } catch {
      setInterviews([]);
    } finally {
      setLoading(false);
    }
  };

  const avg = interviews.length
    ? (
        interviews.reduce((s, i) => s + (i.overall_score || 0), 0) /
        interviews.length
      ).toFixed(0)
    : "—";
  const best = interviews.length
    ? Math.max(...interviews.map((i) => i.overall_score || 0))
    : "—";

  const vColor = (v: string) =>
    ({
      "Strong Hire": T.success,
      Hire: T.success,
      Consider: T.warning,
      Pass: T.danger,
    })[v] || T.muted;

  if (loading)
    return (
      <div
        style={{
          minHeight: "100vh",
          background: T.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <style>{`${FONTS} @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 32,
              height: 32,
              border: `2px solid ${T.border2}`,
              borderTop: `2px solid ${T.accent}`,
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 14px",
            }}
          />
          <div style={{ fontSize: 13, color: T.muted }}>Loading…</div>
        </div>
      </div>
    );

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
        body { -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${T.border2}; border-radius: 4px; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .nav-link { color: ${T.muted}; text-decoration: none; font-size: 13px; font-weight: 400; padding: 6px 12px; border-radius: 3px; transition: color 0.15s, background 0.15s; }
        .nav-link:hover { color: ${T.text}; background: rgba(255,255,255,0.04); }
        .nav-link.active { color: ${T.text}; background: rgba(255,255,255,0.05); }
        .cta-p { display: inline-flex; align-items: center; gap: 8px; padding: 10px 22px; background: ${T.accent}; color: ${T.bg}; border-radius: 3px; font-family: 'DM Sans'; font-size: 14px; font-weight: 600; text-decoration: none; transition: opacity 0.15s; }
        .cta-p:hover { opacity: 0.88; }
        .table-row { display: grid; grid-template-columns: 140px 1fr 160px 80px 120px 80px; gap: 0; border-top: 1px solid ${T.border}; transition: background 0.15s; }
        .table-row:hover { background: rgba(255,255,255,0.02); }
        .table-row td, .table-cell { padding: 14px 20px; font-size: 13px; display: flex; align-items: center; }
      `}</style>

      {/* NAV */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          background: "rgba(10,10,11,0.92)",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textDecoration: "none",
            }}
          >
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 5,
                background: T.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}
            >
              🎓
            </div>
            <span
              style={{
                fontFamily: "'Bricolage Grotesque'",
                fontWeight: 700,
                fontSize: 15,
                color: T.text,
                letterSpacing: "-0.03em",
              }}
            >
              ScholarAI
            </span>
          </Link>
          <div style={{ width: 1, height: 20, background: T.border }} />
          <nav style={{ display: "flex", gap: 2 }}>
            <Link to="/dashboard" className="nav-link active">
              Dashboard
            </Link>
            <Link to="/interview" className="nav-link">
              New Interview
            </Link>
            <Link to="/settings" className="nav-link">
              Settings
            </Link>
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 12, color: T.muted, fontWeight: 400 }}>
            <span style={{ color: T.accent, fontWeight: 600 }}>
              {credits.total - credits.used}
            </span>{" "}
            credits left
          </div>
          <UserButton />
        </div>
      </header>

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "48px 40px",
          animation: "fadeIn 0.5s ease",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              fontSize: 11,
              color: T.muted,
              fontWeight: 500,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Dashboard
          </div>
          <h1
            style={{
              fontFamily: "'Bricolage Grotesque'",
              fontSize: 36,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              marginBottom: 6,
            }}
          >
            Good to see you, {user?.firstName || "there"}
          </h1>
          <p style={{ fontSize: 14, color: T.muted, fontWeight: 300 }}>
            Track your progress and continue preparing for interviews.
          </p>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 16,
            marginBottom: 40,
          }}
        >
          <StatCard
            label="Total Interviews"
            value={interviews.length}
            sub="sessions completed"
          />
          <StatCard
            label="Average Score"
            value={avg === "—" ? "—" : `${avg}%`}
            sub="across all sessions"
          />
          <StatCard
            label="Best Score"
            value={best === "—" ? "—" : `${best}%`}
            sub="personal record"
          />
          <StatCard
            label="Credits Left"
            value={credits.total - credits.used}
            sub={`of ${credits.total} this month`}
            accent
          />
        </div>

        {/* CTA + Credits row */}
        <div
          style={{
            display: "flex",
            gap: 20,
            marginBottom: 40,
            alignItems: "stretch",
          }}
        >
          <Link
            to="/interview"
            className="cta-p"
            style={{ fontSize: 15, padding: "14px 28px", borderRadius: 4 }}
          >
            + New Interview
          </Link>
          <div
            style={{
              flex: 1,
              border: `1px solid ${T.border}`,
              borderRadius: 4,
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  color: T.muted,
                  marginBottom: 6,
                  fontWeight: 400,
                }}
              >
                Credits — {credits.used} / {credits.total} used this month
              </div>
              <div
                style={{
                  height: 4,
                  width: 240,
                  background: T.border,
                  borderRadius: 99,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, (credits.used / credits.total) * 100)}%`,
                    background:
                      credits.used >= credits.total ? T.danger : T.accent,
                    borderRadius: 99,
                    transition: "width 0.5s",
                  }}
                />
              </div>
            </div>
            <div
              style={{
                fontSize: 11,
                color: T.muted,
                border: `1px solid ${T.border}`,
                borderRadius: 3,
                padding: "3px 10px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              {credits.plan}
            </div>
          </div>
        </div>

        {/* Interviews Table */}
        <div
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: 4,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 160px 80px 120px 80px",
              background: T.surface,
              borderBottom: `1px solid ${T.border}`,
            }}
          >
            {["Date", "Candidate", "Role", "Score", "Verdict", ""].map((h) => (
              <div
                key={h}
                style={{
                  padding: "10px 20px",
                  fontSize: 11,
                  color: T.dim,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {h}
              </div>
            ))}
          </div>

          {interviews.length === 0 ? (
            <div style={{ padding: "72px 40px", textAlign: "center" }}>
              <div style={{ fontSize: 14, color: T.dim, marginBottom: 6 }}>
                No interviews yet
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: T.dim,
                  marginBottom: 24,
                  fontWeight: 300,
                }}
              >
                Upload your resume and start your first AI interview session.
              </div>
              <Link
                to="/interview"
                className="cta-p"
                style={{ display: "inline-flex" }}
              >
                Start First Interview
              </Link>
            </div>
          ) : (
            interviews.map((iv: any) => (
              <div
                key={iv.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr 160px 80px 120px 80px",
                  borderTop: `1px solid ${T.border}`,
                  transition: "background 0.15s",
                  cursor: "default",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.02)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  style={{
                    padding: "14px 20px",
                    fontSize: 12,
                    color: T.muted,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {new Date(iv.created_at).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "2-digit",
                  })}
                </div>
                <div
                  style={{
                    padding: "14px 20px",
                    fontSize: 13,
                    fontWeight: 500,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {iv.candidate_name}
                </div>
                <div
                  style={{
                    padding: "14px 20px",
                    fontSize: 13,
                    color: T.muted,
                    display: "flex",
                    alignItems: "center",
                    fontWeight: 300,
                  }}
                >
                  {iv.suggested_role || "—"}
                </div>
                <div
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Bricolage Grotesque'",
                      fontSize: 16,
                      fontWeight: 700,
                      color:
                        iv.overall_score >= 70
                          ? T.accent
                          : iv.overall_score >= 50
                            ? T.warning
                            : T.muted,
                    }}
                  >
                    {iv.overall_score}%
                  </span>
                </div>
                <div
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: vColor(iv.verdict),
                      border: `1px solid ${vColor(iv.verdict)}40`,
                      borderRadius: 3,
                      padding: "3px 10px",
                      fontWeight: 500,
                    }}
                  >
                    {iv.verdict}
                  </span>
                </div>
                <div
                  style={{
                    padding: "14px 20px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Link
                    to={`/reports/${iv.id}`}
                    style={{
                      fontSize: 12,
                      color: T.accent,
                      textDecoration: "none",
                      fontWeight: 500,
                    }}
                  >
                    View →
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
