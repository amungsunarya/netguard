import { useEffect } from 'react';
import { useOverview } from '../../features/overview/useOverview';

export default function OverviewPage() {
  const { overview, devices, logs, metrics, loading, error, fetchAll } = useOverview();

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !overview) return <div style={{ padding: 40 }}>Loading...</div>;
  if (error) return (
    <div style={{
      padding: 16,
      background: 'rgba(239,68,68,.1)',
      border: '1px solid #EF4444',
      borderRadius: 8,
      color: '#EF4444',
    }}>
      ❌ Gagal konek ke API: {error}
      <br />
      <small>Pastikan backend jalan: cd apps\api &amp;&amp; go run main.go</small>
    </div>
  );

  const maxMetric = Math.max(...metrics.map(m => m.value), 1);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Overview</h1>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          {loading ? '🔄 Refreshing...' : '🟢 Live (auto-refresh 5s)'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
        <Kpi label="🚨 Alerts" value={overview?.alerts.total ?? 0} />
        <Kpi label="🖥️ Devices" value={`${overview?.devices.up ?? 0}/${overview?.devices.total ?? 0}`} />
        <Kpi label="📊 Events/s" value={overview?.events_per_second?.toLocaleString() ?? 0} color="#22C55E" />
        <Kpi label="⚠️ Critical" value={overview?.alerts.critical ?? 0} color="#EF4444" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <Card title="Traffic Jaringan (24 jam)">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120, paddingTop: 8 }}>
            {metrics.map((m, i) => (
              <div
                key={i}
                title={`${m.timestamp}: ${m.value}`}
                style={{
                  flex: 1,
                  height: `${(m.value / maxMetric) * 100}%`,
                  background: 'linear-gradient(to top, #3B82F6, #06B6D4)',
                  borderRadius: '2px 2px 0 0',
                  minHeight: 4,
                }}
              />
            ))}
          </div>
        </Card>

        <Card title="Alert Terbaru">
          {overview?.recent_alerts.map((a) => (
            <div
              key={a.id}
              style={{
                padding: 12,
                borderLeft: `3px solid ${
                  a.severity === 'critical' ? '#EF4444' :
                  a.severity === 'warning' ? '#F59E0B' : '#06B6D4'
                }`,
                background: '#0F172A',
                borderRadius: 4,
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
                <span style={{
                  padding: '3px 8px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 600,
                  marginRight: 8,
                  background: a.severity === 'critical' ? 'rgba(239,68,68,.15)' :
                             a.severity === 'warning' ? 'rgba(245,158,11,.15)' : 'rgba(6,182,212,.15)',
                  color: a.severity === 'critical' ? '#EF4444' :
                        a.severity === 'warning' ? '#F59E0B' : '#06B6D4',
                }}>
                  {a.severity.toUpperCase()}
                </span>
                {a.title}
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>{a.description}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card title="Network Devices" style={{ marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              {['Device', 'IP', 'Status', 'CPU', 'Mem', 'Uptime'].map(h => (
                <th key={h} style={{
                  textAlign: 'left',
                  padding: '10px 12px',
                  color: '#94A3B8',
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  borderBottom: '1px solid #334155',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => (
              <tr key={d.id}>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #334155' }}>{d.name}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #334155', fontFamily: 'monospace' }}>{d.ip}</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #334155' }}>
                  <span style={{
                    display: 'inline-block',
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    marginRight: 6,
                    background: d.status === 'up' ? '#22C55E' : d.status === 'down' ? '#EF4444' : '#F59E0B',
                  }} />
                  {d.status}
                </td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #334155' }}>{d.cpu}%</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #334155' }}>{d.memory}%</td>
                <td style={{ padding: '10px 12px', borderBottom: '1px solid #334155' }}>{d.uptime}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Logs (Live dari API)">
        {logs.map((l) => (
          <div key={l.id} style={{
            padding: '8px 12px',
            borderBottom: '1px solid #334155',
            fontSize: 12,
            fontFamily: 'monospace',
            display: 'grid',
            gridTemplateColumns: '80px 100px 130px 1fr',
            gap: 8,
          }}>
            <span style={{ color: '#94A3B8' }}>{l.timestamp}</span>
            <span style={{
              color: l.level === 'critical' ? '#EF4444' : l.level === 'warning' ? '#F59E0B' : '#06B6D4',
            }}>{l.level}</span>
            <span>{l.source}</span>
            <span style={{ color: '#94A3B8' }}>{l.message}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function Kpi({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16, ...style }}>
      <div style={{
        fontSize: 13,
        fontWeight: 600,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '.05em',
        marginBottom: 12,
      }}>{title}</div>
      {children}
    </div>
  );
}