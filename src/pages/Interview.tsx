import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser, UserButton } from "@clerk/react";
import { ArrowLeft } from "lucide-react";
import InterviewApp from "../components/InterviewApp";
import { getCredits } from "../lib/api";

const C = {
  bg: "#0d1117",
  surface: "#161b22",
  border: "#30363d",
  accent: "#58a6ff",
  text: "#e6edf3",
  muted: "#8b949e",
  danger: "#f85149",
};

export default function Interview() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [credits, setCredits] = useState<any>({
    used: 0,
    total: 3,
    plan: "free",
  });
  const [loading, setLoading] = useState(true);
  const [showNoCreditsModal, setShowNoCreditsModal] = useState(false);

  useEffect(() => {
    loadCredits();
  }, [user]);

  const loadCredits = async () => {
    try {
      const data = await getCredits();
      setCredits(
        data?.total !== undefined ? data : { used: 0, total: 3, plan: "free" },
      );
      if (data.used >= data.total) {
        setShowNoCreditsModal(true);
      }
    } catch (error) {
      console.error("Failed to load credits:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ color: C.muted, fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  if (showNoCreditsModal) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
        <nav
          style={{
            borderBottom: `1px solid ${C.border}`,
            background: C.surface,
          }}
        >
          <div
            style={{
              maxWidth: 1200,
              margin: "0 auto",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              height: 64,
              padding: "0 24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎓</span>
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                  fontSize: 18,
                }}
              >
                ScholarAI
              </span>
            </div>
            <UserButton />
          </div>
        </nav>
        <div style={{ maxWidth: 500, margin: "100px auto", padding: 24 }}>
          <div
            style={{
              background: C.surface,
              border: `1px solid ${C.border}`,
              borderRadius: 12,
              padding: 40,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
            <h2
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 24,
                marginBottom: 12,
              }}
            >
              Out of Credits
            </h2>
            <p
              style={{
                color: C.muted,
                fontSize: 14,
                lineHeight: 1.6,
                marginBottom: 24,
              }}
            >
              You've used all {credits.total} interviews for your {credits.plan}{" "}
              plan this month. Upgrade to continue practicing.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <Link
                to="/dashboard"
                style={{
                  padding: "12px 24px",
                  background: C.surface,
                  border: `1px solid ${C.border}`,
                  color: C.text,
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Back to Dashboard
              </Link>
              <button
                style={{
                  padding: "12px 24px",
                  background: C.accent,
                  color: "#0d1117",
                  border: "none",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>
      <nav
        style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: 64,
            padding: "0 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              to="/dashboard"
              style={{
                color: C.muted,
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} />
              Dashboard
            </Link>
            <div style={{ width: 1, height: 20, background: C.border }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎓</span>
              <span
                style={{
                  fontFamily: "Georgia, serif",
                  fontWeight: 700,
                  fontSize: 16,
                }}
              >
                ScholarAI
              </span>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: C.muted }}>
              Credits:{" "}
              <span style={{ fontWeight: 700, color: C.text }}>
                {credits.total - credits.used}
              </span>{" "}
              / {credits.total}
            </div>
            <UserButton />
          </div>
        </div>
      </nav>

      <InterviewApp />
    </div>
  );
}
