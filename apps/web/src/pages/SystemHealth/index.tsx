import { useEffect, useState } from 'react';
import { apiAdmin } from '../../lib/api/client';

export default function SystemHealthPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res = await apiAdmin.health();
      setData(res);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) return <div style={{ padding: 40, color: '#94A3B8' }}>Loading...</div>;
  if (error) return <div style={{ padding: 16, background: 'rgba(239,68,68,.1)', border: '1px solid #EF4444', borderRadius: 8, color: '#EF4444' }}>❌ {error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>🟢 System Health</h1>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          {loading ? '🔄' : '🟢 v' + data.version + ' • Uptime ' + data.uptime}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <StatCard label="Memory" value={data.system.memory_mb.toFixed(1) + ' MB'} color="#3B82F6" />
        <StatCard label="Goroutines" value={data.system.goroutines} color="#06B6D4" />
        <StatCard label="CPUs" value={data.system.cpus} color="#8B5CF6" />
        <StatCard label="Latency" value={data.latency_ms + ' ms'} color="#22C55E" />
      </div>

      <div style={cardStyle}>
        <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', color: '#94A3B8' }}>Services</h2>
        {data.services.map((s: any) => (
          <div key={s.name} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: 12, borderBottom: '1px solid #334155',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.status === 'up' ? '#22C55E' : '#EF4444' }} />
              <strong>{s.name}</strong>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94A3B8' }}>
              {s.latency_ms > 0 && <span>{s.latency_ms}ms</span>}
              <span style={{ color: s.status === 'up' ? '#22C55E' : '#EF4444', fontWeight: 600 }}>
                {s.status.toUpperCase()}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 11, color: '#64748B', marginTop: 16, textAlign: 'center' }}>
        Auto-refresh setiap 10 detik • {data.timestamp}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16 };