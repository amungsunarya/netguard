import { useEffect } from 'react';
import { useLogs } from '../../features/logs/useLogs';

export default function LogsPage() {
  const { logs, loading, error, search, filterLevel, fetch, setSearch, setFilterLevel } = useLogs();

  useEffect(() => {
    fetch();
    const t = setInterval(fetch, 5000);
    return () => clearInterval(t);
  }, []);

  const filtered = logs.filter((l) => {
    if (filterLevel && l.level !== filterLevel) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        l.message.toLowerCase().includes(q) ||
        l.source.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (error) return <ErrorBox error={error} />;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>🔍 Log Explorer</h1>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>
          {loading ? '🔄' : `🟢 ${filtered.length} / ${logs.length} logs`}
        </span>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)} style={selectStyle}>
          <option value="">All Levels</option>
          <option value="critical">Critical</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
        <input
          type="text"
          placeholder="Cari message, source, atau type..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 200 }}
        />
      </div>

      <div style={cardStyle}>
        {filtered.map((l) => (
          <div
            key={l.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '100px 90px 100px 140px 1fr',
              gap: 12,
              padding: '10px 12px',
              borderBottom: '1px solid #334155',
              fontSize: 12,
              fontFamily: 'monospace',
              alignItems: 'center',
            }}
          >
            <span style={{ color: '#94A3B8' }}>{l.timestamp}</span>
            <span style={levelBadge(l.level)}>{l.level}</span>
            <span>{l.type}</span>
            <span>{l.source}</span>
            <span style={{ color: '#CBD5E1', fontFamily: 'inherit' }}>{l.message}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
            Tidak ada log yang cocok
          </div>
        )}
      </div>
    </div>
  );
}

function levelBadge(level: string): React.CSSProperties {
  return {
    display: 'inline-block',
    padding: '2px 6px',
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 600,
    textAlign: 'center',
    background: level === 'critical' ? 'rgba(239,68,68,.15)' : level === 'warning' ? 'rgba(245,158,11,.15)' : 'rgba(6,182,212,.15)',
    color: level === 'critical' ? '#EF4444' : level === 'warning' ? '#F59E0B' : '#06B6D4',
  };
}

function ErrorBox({ error }: { error: string }) {
  return (
    <div style={{ padding: 16, background: 'rgba(239,68,68,.1)', border: '1px solid #EF4444', borderRadius: 8, color: '#EF4444' }}>
      ❌ {error}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 0, overflow: 'auto',
};
const selectStyle: React.CSSProperties = {
  background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9',
  padding: '7px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit',
};