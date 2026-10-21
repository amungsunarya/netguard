import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', icon: '📊', label: 'Overview' },
  { to: '/logs', icon: '🔍', label: 'Log Explorer' },
  { to: '/devices', icon: '🖥️', label: 'Devices' },
  { to: '/topology', icon: '🗺️', label: 'Topology' },
  { to: '/metrics', icon: '📈', label: 'Metrics' },
  { to: '/alerts', icon: '🚨', label: 'Alerts' },
  { to: '/rules', icon: '⚙️', label: 'Rules' },
  { to: '/users', icon: '👥', label: 'Users' },
  { to: '/settings', icon: '🔧', label: 'Settings' },
  { to: '/health', icon: '🟢', label: 'System Health' },
];

export function Sidebar() {
  return (
    <aside style={{
      width: 240,
      background: '#1E293B',
      borderRight: '1px solid #334155',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflowY: 'auto',
    }}>
      <div style={{
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontWeight: 700,
        fontSize: 16,
        borderBottom: '1px solid #334155',
      }}>
        <div style={{
          width: 28,
          height: 28,
          background: 'linear-gradient(135deg, #3B82F6, #06B6D4)',
          borderRadius: 6,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
        }}>🛡️</div>
        <span>NetGuard</span>
      </div>

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 4,
              color: isActive ? '#3B82F6' : '#94A3B8',
              background: isActive ? 'rgba(59,130,246,.15)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              textDecoration: 'none',
              fontSize: 13,
              marginBottom: 2,
            })}
          >
            <span style={{ width: 18, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #334155',
        fontSize: 11,
        color: '#94A3B8',
      }}>
        <div style={{ marginBottom: 6 }}>🟢 System Health</div>
        <div style={{ marginBottom: 3 }}>CPU 23%</div>
        <div style={{ marginBottom: 3 }}>MEM 41%</div>
        <div>DISK 67%</div>
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid #334155',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontSize: 13,
      }}>
        <div style={{
          width: 28,
          height: 28,
          background: '#3B82F6',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 600,
          fontSize: 12,
        }}>A</div>
        <span>admin</span>
      </div>
    </aside>
  );
}