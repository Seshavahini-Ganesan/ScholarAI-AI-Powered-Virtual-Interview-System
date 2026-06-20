import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useUser, UserButton } from '@clerk/react';
import { getCredits } from '../lib/api';

const C = {
  bg: '#0d1117',
  surface: '#161b22',
  border: '#30363d',
  accent: '#58a6ff',
  text: '#e6edf3',
  muted: '#8b949e',
};

export default function Settings() {
  const { user } = useUser();
  const [credits, setCredits] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCredits();
  }, []);

  const loadCredits = async () => {
    try {
      const data = await getCredits();
      setCredits(data);
    } catch (error) {
      console.error('Failed to load credits:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text }}>
      <nav style={{ borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64, padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🎓</span>
            <span style={{ fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: 18 }}>ScholarAI</span>
          </div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <Link to="/dashboard" style={{ color: C.muted, fontSize: 14, textDecoration: 'none' }}>Dashboard</Link>
            <Link to="/interview" style={{ color: C.muted, fontSize: 14, textDecoration: 'none' }}>New Interview</Link>
            <Link to="/settings" style={{ color: C.accent, fontSize: 14, textDecoration: 'none', fontWeight: 600 }}>Settings</Link>
            <UserButton />
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: 48 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, marginBottom: 8 }}>Settings</h1>
        <p style={{ color: C.muted, fontSize: 14, marginBottom: 40 }}>Manage your account and preferences</p>

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Profile</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Full Name</label>
            <input
              type="text"
              value={user?.fullName || ''}
              disabled
              style={{ width: '100%', padding: '10px 14px', background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 14, cursor: 'not-allowed' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Email</label>
            <input
              type="email"
              value={user?.primaryEmailAddress?.emailAddress || ''}
              disabled
              style={{ width: '100%', padding: '10px 14px', background: '#0d1117', border: `1px solid ${C.border}`, borderRadius: 8, color: C.muted, fontSize: 14, cursor: 'not-allowed' }}
            />
          </div>
          <div style={{ color: C.muted, fontSize: 12, marginTop: 12 }}>
            To update your profile information, use the account menu above.
          </div>
        </div>

        {!loading && credits && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>Subscription & Credits</h2>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Current Plan</span>
                <span style={{ fontSize: 14, fontWeight: 600, textTransform: 'capitalize' }}>{credits.plan}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ color: C.muted, fontSize: 13 }}>Credits Used</span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{credits.used} / {credits.total}</span>
              </div>
            </div>
            <div style={{ height: 8, background: C.border, borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (credits.used / credits.total) * 100)}%`,
                background: credits.used >= credits.total ? '#f85149' : C.accent,
                transition: 'width 0.3s'
              }} />
            </div>
            {credits.plan === 'free' && (
              <div style={{ padding: '12px 16px', background: 'rgba(88,166,255,0.1)', borderRadius: 8, marginBottom: 16 }}>
                <div style={{ color: C.accent, fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Upgrade to Pro</div>
                <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.6, marginBottom: 12 }}>
                  Get 20 interviews per month, priority AI processing, and advanced analytics for $9/month.
                </div>
                <button style={{ padding: '8px 20px', background: C.accent, color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Upgrade Now
                </button>
              </div>
            )}
          </div>
        )}

        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24, marginBottom: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 20 }}>Preferences</h2>
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 6 }}>Default Question Count</label>
            <select style={{ width: '100%', padding: '10px 14px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 14, cursor: 'pointer' }}>
              <option value="5">5 questions</option>
              <option value="7" selected>7 questions (recommended)</option>
              <option value="10">10 questions</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ marginRight: 10 }} />
              <span style={{ fontSize: 14 }}>Enable camera monitoring by default</span>
            </label>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ marginRight: 10 }} />
              <span style={{ fontSize: 14 }}>Show emotion detection stats</span>
            </label>
          </div>
          <button style={{ padding: '10px 20px', background: C.accent, color: '#0d1117', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 12 }}>
            Save Preferences
          </button>
        </div>

        <div style={{ background: C.surface, border: `1px solid #3d1f1f`, borderRadius: 12, padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12, color: '#f85149' }}>Danger Zone</h2>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>
            Once you delete your account, there is no going back. All your interview data and history will be permanently removed.
          </p>
          <button style={{ padding: '10px 20px', background: 'transparent', color: '#f85149', border: '1px solid #f85149', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
