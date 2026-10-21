import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../features/auth/useAuth';
import { useWebSocket } from '../../../hooks/useWebSocket';

export function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const { connected } = useWebSocket(() => {});

  function handleLogout() {
    if (confirm('Logout dari NetGuard?')) {
      logout();
      navigate('/login');
    }
  }

  return (
    <header style={{
      height: 56,
      background: '#1E293B',
      borderBottom: '1px solid #334155',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: 16,
    }}>
      <div style={{
        flex: 1,
        maxWidth: 480,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#0F172A',
        border: '1px solid #334155',
        borderRadius: 4,
        padding: '7px 12px',
        color: '#94A3B8',
        fontSize: 13,
      }}>
        <span>🔍</span>
        <span>Search global...</span>
        <kbd style={{
          marginLeft: 'auto',
          background: '#334155',
          padding: '2px 6px',
          borderRadius: 3,
          fontSize: 10,
          fontFamily: 'monospace',
        }}>Ctrl+K</kbd>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
        {/* WebSocket Live Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          fontWeight: 600,
          padding: '4px 10px',
          borderRadius: 4,
          background: connected ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
          border: `1px solid ${connected ? '#22C55E' : '#EF4444'}`,
          color: connected ? '#22C55E' : '#EF4444',
        }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: connected ? '#22C55E' : '#EF4444',
            boxShadow: connected ? '0 0 8px #22C55E' : 'none',
          }} />
          {connected ? 'LIVE' : 'OFFLINE'}
        </div>

        <button style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', fontSize: 16 }}>🔔</button>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(59,130,246,.15)',
              border: '1px solid #3B82F6',
              color: '#3B82F6',
              padding: '6px 12px',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            👤 {user?.username || 'user'} ({user?.role || 'viewer'})
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: 4,
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: 4,
              minWidth: 180,
              boxShadow: '0 4px 12px rgba(0,0,0,.3)',
              zIndex: 100,
            }}>
              <div style={{
                padding: '10px 14px',
                borderBottom: '1px solid #334155',
                fontSize: 12,
                color: '#94A3B8',
              }}>
                Signed in as<br />
                <strong style={{ color: '#F1F5F9' }}>{user?.username}</strong>
              </div>
              <button
                onClick={handleLogout}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  background: 'none',
                  border: 'none',
                  color: '#EF4444',
                  cursor: 'pointer',
                  fontSize: 13,
                  textAlign: 'left',
                }}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}