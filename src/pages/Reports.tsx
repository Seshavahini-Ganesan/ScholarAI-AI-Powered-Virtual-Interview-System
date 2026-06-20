import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/react';
import { ArrowLeft } from 'lucide-react';
import { getInterview } from '../lib/api';

const C = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  accent: '#58a6ff',
  text: '#e6edf3',
  muted: '#8b949e',
  success: '#3fb950',
  warning: '#d29922',
};

const badge = (type: string) => ({
  technical:   { bg: "#1a2a3a", color: "#58a6ff", label: "Technical" },
  behavioural: { bg: "#1a2a2a", color: "#3fb950", label: "Behavioural" },
  experience:  { bg: "#2a1a3a", color: "#bc8cff", label: "Experience" },
  situational: { bg: "#2a2a1a", color: "#d29922", label: "Situational" },
}[type] || { bg: "#1e1e1e", color: "#8b949e", label: type });

const scoreColor  = (s: number) => s >= 8 ? C.success : s >= 6 ? C.accent : s >= 4 ? C.warning : '#f85149';

export default function Reports() {
  const { id } = useParams();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInterview();
  }, [id]);

  const loadInterview = async () => {
    try {
      const data = await getInterview(id!);
      setInterview(data);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: C.muted, fontSize: 16 }}>Loading...</div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
        <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>🎓</span>
              <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18 }}>ScholarAI</span>
            </div>
            <UserButton />
          </div>
        </nav>
        <div style={{ maxWidth: 500, margin: '100px auto', padding: 24, textAlign: 'center' }}>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>⚠️</div>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 24, marginBottom: 12 }}>Interview Not Found</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 24 }}>
              The interview you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link to="/dashboard" style={{ display: 'inline-block', padding: '12px 24px', background: C.accent, color: '#0d1117', borderRadius: 8, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const verdictColorMap: Record<string, string> = {"Strong Hire":C.success,"Hire":"#4ac261","Consider":C.warning,"Pass":"#f85149"};
  const verdictColor = verdictColorMap[interview.verdict] || C.muted;
  const avgScore = interview.questions?.length > 0
    ? (Object.values(interview.analyses).filter(Boolean).reduce((s: number, a: any)=>s+(a?.score||0),0)/(Object.values(interview.analyses).filter(Boolean).length||1)).toFixed(1)
    : '0';

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link to="/dashboard" style={{ color: C.muted, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, textDecoration: 'none' }}>
              <ArrowLeft size={16} />
              Dashboard
            </Link>
            <div style={{ width: 1, height: 20, background: C.border }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🎓</span>
              <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 16 }}>ScholarAI</span>
            </div>
          </div>
          <UserButton />
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 8 }}>Interview Report</h1>
            <div style={{ color: C.muted, fontSize: 14 }}>
              {interview.candidate_name} · {interview.suggested_role} · {new Date(interview.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Avg Score', val: `${avgScore}/10`, color: scoreColor(parseFloat(avgScore)) },
            { label: 'Overall', val: `${interview.overall_score}%`, color: C.accent },
            { label: 'Verdict', val: interview.verdict, color: verdictColor },
            { label: 'Questions', val: interview.questions?.length || 0, color: C.muted },
          ].map((stat) => (
            <div key={stat.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.val}</div>
              <div style={{ color: C.muted, fontSize: 11, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {interview.report?.summary && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', marginBottom: 8 }}>OVERALL ASSESSMENT</div>
            <p style={{ color: C.text, lineHeight: 1.7, margin: 0 }}>{interview.report.summary}</p>
          </div>
        )}

        {interview.report && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ color: C.success, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', marginBottom: 10 }}>✓ TOP STRENGTHS</div>
              {interview.report.topStrengths?.length > 0 ? interview.report.topStrengths.map((s: string, i: number) => (
                <div key={i} style={{ color: C.text, fontSize: 13, marginBottom: 5 }}>• {s}</div>
              )) : <div style={{ color: C.muted, fontSize: 13 }}>No strengths recorded</div>}
            </div>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18 }}>
              <div style={{ color: C.warning, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', marginBottom: 10 }}>↑ AREAS TO IMPROVE</div>
              {interview.report.areasToImprove?.length > 0 ? interview.report.areasToImprove.map((s: string, i: number) => (
                <div key={i} style={{ color: C.text, fontSize: 13, marginBottom: 5 }}>• {s}</div>
              )) : <div style={{ color: C.muted, fontSize: 13 }}>No improvements suggested</div>}
            </div>
          </div>
        )}

        <div style={{ color: C.muted, fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', marginBottom: 12 }}>QUESTION-BY-QUESTION BREAKDOWN</div>
        {interview.questions?.map((q: any, i: number) => {
          const a = interview.analyses[i];
          const ans = interview.answers[i];
          const b = badge(q.type);
          return (
            <div key={i} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 18, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ color: C.muted, fontSize: 13, fontWeight: 700 }}>Q{i + 1}</span>
                  <span style={{ background: b.bg, color: b.color, fontSize: 11, padding: '2px 8px', borderRadius: 5, fontWeight: 600 }}>{b.label}</span>
                </div>
                {a && <span style={{ color: scoreColor(a.score), fontWeight: 800, fontSize: 18 }}>{a.score}<span style={{ color: C.muted, fontSize: 12, fontWeight: 400 }}>/10</span></span>}
              </div>
              <div style={{ color: C.text, fontSize: 14, marginBottom: 8, fontFamily: 'Georgia, serif' }}>{q.question}</div>
              {ans
                ? <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, borderTop: `1px solid ${C.border}`, paddingTop: 8 }}>
                    <span style={{ color: C.accent, fontSize: 10, fontWeight: 600 }}>YOUR ANSWER: </span>{ans}
                  </div>
                : <div style={{ color: C.border, fontSize: 12, fontStyle: 'italic' }}>Skipped</div>
              }
              {a?.modelAnswer && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: C.bg, borderRadius: 8, borderLeft: '3px solid #bc8cff' }}>
                  <span style={{ color: '#bc8cff', fontSize: 10, fontWeight: 600 }}>✦ MODEL: </span>
                  <span style={{ color: C.muted, fontSize: 12 }}>{a.modelAnswer}</span>
                </div>
              )}
            </div>
          );
        })}

        <div style={{ marginTop: 32, paddingTop: 24, borderTop: `1px solid ${C.border}`, textAlign: 'center' }}>
          <Link to="/dashboard" style={{ display: 'inline-block', padding: '12px 28px', background: C.accent, color: '#0d1117', borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
