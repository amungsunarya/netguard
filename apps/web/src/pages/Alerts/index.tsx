import { useEffect, useState } from 'react';
import { useAlerts } from '../../features/alerts/useAlerts';
import { apiCRUDAuth } from '../../lib/api/client';
import type { Alert } from '../../lib/api/client';
import { useToast } from '../../components/ui/Toast';
import { useWebSocket } from '../../hooks/useWebSocket';

export default function AlertsPage() {
  const { alerts, loading, error, filter, fetch, setFilter, addAlert, updateAlert } = useAlerts();
  const { show } = useToast();
  const [selected, setSelected] = useState<Alert | null>(null);
  const [processing, setProcessing] = useState(false);

  const { connected } = useWebSocket((msg) => {
    if (msg.type === 'alert_created') {
      addAlert(msg.data);
      show(`🚨 Alert baru: ${msg.data.title}`, msg.data.severity === 'critical' ? 'error' : 'info');
    }
    if (msg.type === 'alert_acked') updateAlert(msg.data.id, { status: 'acked' });
    if (msg.type === 'alert_blocked') updateAlert(msg.data.id, { status: 'resolved' });
  });

  useEffect(() => { fetch(); }, []);

  const counts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };

  async function handleAck(a: Alert) {
    setProcessing(true);
    try {
      await apiCRUDAuth.ackAlert(a.id);
      show(`Alert ${a.id} acknowledged`, 'success');
      setSelected(null);
      await fetch();
    } catch (err: any) {
      show(`Gagal ack: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleBlock(a: Alert) {
    if (!confirm(`Block source IP ${a.source}?`)) return;
    setProcessing(true);
    try {
      const res = await apiCRUDAuth.blockAlert(a.id);
      show(`IP ${res.blocked_ip} berhasil diblokir`, 'success');
      setSelected(null);
      await fetch();
    } catch (err: any) {
      show(`Gagal block: ${err.message}`, 'error');
    } finally {
      setProcessing(false);
    }
  }

  if (error) {
    return (
      <div style={{ padding: 16, background: 'rgba(239,68,68,.1)', border: '1px solid #EF4444', borderRadius: 8, color: '#EF4444' }}>
        ❌ {error}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>🚨 Alerts</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
            background: connected ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
            border: `1px solid ${connected ? '#22C55E' : '#EF4444'}`,
            color: connected ? '#22C55E' : '#EF4444',
          }}>
            {connected ? '🟢 LIVE' : '🔴 OFFLINE'}
          </span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>
            {loading ? '🔄' : `${alerts.length} alerts`}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={filter.severity || ''} onChange={(e) => setFilter({ ...filter, severity: e.target.value || undefined })} style={selectStyle}>
          <option value="">All Severity</option>
          <option value="critical">Critical ({counts.critical})</option>
          <option value="warning">Warning ({counts.warning})</option>
          <option value="info">Info ({counts.info})</option>
        </select>
        <select value={filter.status || ''} onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })} style={selectStyle}>
          <option value="">All Status</option>
          <option value="open">Open</option>
          <option value="acked">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 16 }}>
        <div>
          {alerts.map((a) => (
            <div
              key={a.id}
              onClick={() => setSelected(a)}
              style={{
                background: '#1E293B',
                border: '1px solid #334155',
                borderLeftWidth: 3,
                borderLeftColor: a.severity === 'critical' ? '#EF4444' : a.severity === 'warning' ? '#F59E0B' : '#06B6D4',
                borderRadius: 8,
                padding: 14,
                marginBottom: 12,
                cursor: 'pointer',
                boxShadow: selected?.id === a.id ? '0 0 0 1px #3B82F6' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <span style={severityBadge(a.severity)}>{a.severity.toUpperCase()}</span>
                <span style={{ fontWeight: 600, fontSize: 14 }}>{a.title}</span>
                <span style={{ marginLeft: 'auto', color: '#94A3B8', fontSize: 12 }}>{a.id}</span>
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
                Source: <span style={{ fontFamily: 'monospace' }}>{a.source}</span> • Status: <strong>{a.status}</strong>
              </div>
              <div style={{ fontSize: 13, color: '#CBD5E1' }}>{a.description}</div>
              {a.status === 'open' && (
                <div style={{ marginTop: 12, display: 'flex', gap: 8 }} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleAck(a)} disabled={processing} style={btnSmall}>✅ Ack</button>
                  <button onClick={() => handleBlock(a)} disabled={processing} style={btnSmallDanger}>🔒 Block</button>
                </div>
              )}
            </div>
          ))}
          {alerts.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', ...cardStyle }}>
              Tidak ada alert
            </div>
          )}
        </div>

        {selected && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selected.id}</h2>
              <button onClick={() => setSelected(null)} style={closeBtn}>✕</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={severityBadge(selected.severity)}>{selected.severity.toUpperCase()}</span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{selected.title}</div>
            <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 16, lineHeight: 1.6 }}>{selected.description}</div>
            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <Row label="Source" value={selected.source} mono />
              <Row label="Status" value={selected.status} />
              <Row label="Created" value={selected.created_at} />
            </div>
            {selected.status === 'open' ? (
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button onClick={() => handleAck(selected)} disabled={processing} style={{ ...btnPrimary, opacity: processing ? 0.6 : 1 }}>✅ Acknowledge</button>
                <button onClick={() => handleBlock(selected)} disabled={processing} style={{ ...btnDanger, opacity: processing ? 0.6 : 1 }}>🔒 Block Source IP</button>
              </div>
            ) : (
              <div style={{ marginTop: 20, padding: 12, background: 'rgba(34,197,94,.1)', border: '1px solid #22C55E', borderRadius: 4, color: '#22C55E', fontSize: 12, textAlign: 'center' }}>
                ✓ Alert sudah di-{selected.status}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function severityBadge(sev: string): React.CSSProperties {
  return {
    display: 'inline-block', padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
    background: sev === 'critical' ? 'rgba(239,68,68,.15)' : sev === 'warning' ? 'rgba(245,158,11,.15)' : 'rgba(6,182,212,.15)',
    color: sev === 'critical' ? '#EF4444' : sev === 'warning' ? '#F59E0B' : '#06B6D4',
  };
}
function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <span style={{ color: '#94A3B8' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16 };
const selectStyle: React.CSSProperties = { background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', padding: '7px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#94A3B8', fontSize: 18, cursor: 'pointer' };
const btnPrimary: React.CSSProperties = { background: '#3B82F6', border: '1px solid #3B82F6', color: 'white', padding: '10px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnDanger: React.CSSProperties = { background: '#EF4444', border: '1px solid #EF4444', color: 'white', padding: '10px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSmall: React.CSSProperties = { background: 'rgba(59,130,246,.15)', border: '1px solid #3B82F6', color: '#3B82F6', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 };
const btnSmallDanger: React.CSSProperties = { background: 'rgba(239,68,68,.15)', border: '1px solid #EF4444', color: '#EF4444', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 };