import { useEffect } from 'react';
import { useMetrics } from '../../features/metrics/useMetrics';

export default function MetricsPage() {
  const { metrics, loading, error, fetch } = useMetrics();

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, []);

  if (error) return <ErrorBox error={error} />;

  const maxValue = Math.max(...metrics.map((m) => m.value), 1);
  const avg = metrics.length ? metrics.reduce((s, m) => s + m.value, 0) / metrics.length : 0;
  const min = metrics.length ? Math.min(...metrics.map((m) => m.value)) : 0;
  const max = metrics.length ? Math.max(...metrics.map((m) => m.value)) : 0;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>📈 Metrics</h1>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          {loading ? '🔄' : `🟢 ${metrics.length} data points`}
        </span>
      </div>

      <div style={cardStyle}>
        <div style={sectionTitleStyle}>traffic_in (24 jam terakhir)</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 200, paddingTop: 8 }}>
          {metrics.map((m, i) => (
            <div
              key={i}
              title={`${m.timestamp}: ${m.value.toFixed(0)}`}
              style={{
                flex: 1,
                height: `${(m.value / maxValue) * 100}%`,
                background: 'linear-gradient(to top, #3B82F6, #06B6D4)',
                borderRadius: '2px 2px 0 0',
                minHeight: 4,
                transition: 'all .2s',
                cursor: 'pointer',
              }}
            />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 10, color: '#94A3B8' }}>
          {metrics.filter((_, i) => i % 6 === 0).map((m, i) => (
            <span key={i}>{m.timestamp}</span>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginTop: 16 }}>
        <StatCard label="Min" value={min.toFixed(0)} />
        <StatCard label="Max" value={max.toFixed(0)} />
        <StatCard label="Average" value={avg.toFixed(0)} />
        <StatCard label="Current" value={(metrics[metrics.length - 1]?.value || 0).toFixed(0)} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div style={{ padding: 16, background: 'rgba(239,68,68,.1)', border: '1px solid #EF4444', borderRadius: 8, color: '#EF4444' }}>
      ❌ {error}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16,
};
const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12,
};