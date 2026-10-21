import { useEffect, useState } from 'react';
import { useDevices } from '../../features/devices/useDevices';
import { apiCRUDAuth } from '../../lib/api/client';
import type { Device } from '../../lib/api/client';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { useWebSocket } from '../../hooks/useWebSocket';

const EMPTY_DEVICE: Partial<Device> = {
  name: '',
  ip: '',
  type: 'switch',
  site: 'DC-1',
  status: 'up',
  cpu: 0,
  memory: 0,
  uptime: '-',
  last_seen: '-',
};

export default function DevicesPage() {
  const { devices, loading, error, fetch, addDevice, updateDevice, removeDevice } = useDevices();
  const { show } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Device | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Device | null>(null);
  const [form, setForm] = useState<Partial<Device>>(EMPTY_DEVICE);
  const [submitting, setSubmitting] = useState(false);

  // WebSocket — real-time updates
  const { connected } = useWebSocket((msg) => {
    if (msg.type === 'device_created') {
      addDevice(msg.data);
      show('Device baru: ' + msg.data.name, 'success');
    }
    if (msg.type === 'device_updated') {
      updateDevice(msg.data.id, msg.data);
      show('Device diupdate: ' + msg.data.name, 'info');
    }
    if (msg.type === 'device_deleted') {
      removeDevice(msg.data.id);
      show('Device dihapus (ID ' + msg.data.id + ')', 'info');
    }
  });

  useEffect(() => {
    fetch();
    // HAPUS polling — WebSocket handles updates
  }, []);

  const filtered = devices.filter((d) => {
    if (statusFilter && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        d.name.toLowerCase().includes(q) ||
        d.ip.toLowerCase().includes(q) ||
        d.site.toLowerCase().includes(q)
      );
    }
    return true;
  });

  function openAdd() {
    setEditing(null);
    setForm(EMPTY_DEVICE);
    setModalOpen(true);
  }

  function openEdit(d: Device) {
    setEditing(d);
    setForm(d);
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await apiCRUDAuth.updateDevice(editing.id, form);
        show('Device ' + form.name + ' diupdate', 'success');
      } else {
        await apiCRUDAuth.createDevice(form);
        show('Device ' + form.name + ' ditambahkan', 'success');
      }
      setModalOpen(false);
      setSelected(null);
      await fetch();
    } catch (err: any) {
      show('Gagal: ' + err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(d: Device) {
    if (!confirm('Hapus device ' + d.name + '?')) return;
    try {
      await apiCRUDAuth.deleteDevice(d.id);
      show('Device ' + d.name + ' dihapus', 'success');
      setSelected(null);
      await fetch();
    } catch (err: any) {
      show('Gagal hapus: ' + err.message, 'error');
    }
  }

  function updateForm(field: keyof Device, value: any) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>🖥️ Network Devices</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 4,
            background: connected ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)',
            border: '1px solid ' + (connected ? '#22C55E' : '#EF4444'),
            color: connected ? '#22C55E' : '#EF4444',
          }}>
            {connected ? '🟢 LIVE' : '🔴 OFFLINE'}
          </span>
          <span style={{ fontSize: 12, color: '#94A3B8' }}>
            {loading ? '🔄' : devices.length + ' devices'}
          </span>
          <button onClick={openAdd} style={btnPrimary}>+ Add Device</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">All Status</option>
          <option value="up">Up</option>
          <option value="down">Down</option>
          <option value="warning">Warning</option>
        </select>
        <input
          type="text"
          placeholder="Cari nama, IP, atau site..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...selectStyle, flex: 1, minWidth: 200 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 400px' : '1fr', gap: 16 }}>
        <div style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Device', 'IP', 'Type', 'Site', 'Status', 'CPU', 'Mem', 'Actions'].map((h) => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => setSelected(d)}
                  style={{
                    cursor: 'pointer',
                    background: selected?.id === d.id ? 'rgba(59,130,246,.15)' : 'transparent',
                  }}
                >
                  <td style={tdStyle}>{d.name}</td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace' }}>{d.ip}</td>
                  <td style={tdStyle}>{d.type}</td>
                  <td style={tdStyle}>{d.site}</td>
                  <td style={tdStyle}><StatusDot status={d.status} /></td>
                  <td style={tdStyle}>{d.cpu}%</td>
                  <td style={tdStyle}>{d.memory}%</td>
                  <td style={tdStyle} onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openEdit(d)} style={btnIcon} title="Edit">✏️</button>
                    <button onClick={() => handleDelete(d)} style={btnIcon} title="Hapus">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
              Tidak ada device yang cocok
            </div>
          )}
        </div>

        {selected && (
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>{selected.name}</h2>
              <button onClick={() => setSelected(null)} style={closeBtn}>✕</button>
            </div>

            <div style={{ fontSize: 13, lineHeight: 2 }}>
              <Row label="IP" value={selected.ip} mono />
              <Row label="Type" value={selected.type} />
              <Row label="Site" value={selected.site} />
              <Row label="Status" value={<StatusDot status={selected.status} />} />
              <Row label="Uptime" value={selected.uptime} />
              <Row label="Last Seen" value={selected.last_seen} />
            </div>

            <div style={{ marginTop: 20 }}>
              <div style={sectionTitleStyle}>Resource Usage</div>
              <ProgressBar label="CPU" value={selected.cpu} />
              <ProgressBar label="Memory" value={selected.memory} />
            </div>

            <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
              <button onClick={() => openEdit(selected)} style={{ ...btnPrimary, flex: 1 }}>✏️ Edit</button>
              <button onClick={() => handleDelete(selected)} style={{ ...btnDanger, flex: 1 }}>🗑️ Hapus</button>
            </div>
          </div>
        )}
      </div>

      <Modal
        isOpen={modalOpen}
        title={editing ? 'Edit Device: ' + editing.name : 'Tambah Device Baru'}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <FormField label="Name">
            <input required value={form.name || ''} onChange={(e) => updateForm('name', e.target.value)} style={inputStyle} placeholder="sw-core-01" />
          </FormField>
          <FormField label="IP Address">
            <input required value={form.ip || ''} onChange={(e) => updateForm('ip', e.target.value)} style={inputStyle} placeholder="10.0.0.1" />
          </FormField>
          <FormField label="Type">
            <select value={form.type} onChange={(e) => updateForm('type', e.target.value)} style={inputStyle}>
              <option value="switch">Switch</option>
              <option value="router">Router</option>
              <option value="firewall">Firewall</option>
              <option value="server">Server</option>
              <option value="ap">Access Point</option>
            </select>
          </FormField>
          <FormField label="Site">
            <input value={form.site || ''} onChange={(e) => updateForm('site', e.target.value)} style={inputStyle} placeholder="DC-1" />
          </FormField>
          <FormField label="Status">
            <select value={form.status} onChange={(e) => updateForm('status', e.target.value)} style={inputStyle}>
              <option value="up">Up</option>
              <option value="down">Down</option>
              <option value="warning">Warning</option>
            </select>
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="CPU (%)">
              <input type="number" min="0" max="100" value={form.cpu || 0} onChange={(e) => updateForm('cpu', parseFloat(e.target.value) || 0)} style={inputStyle} />
            </FormField>
            <FormField label="Memory (%)">
              <input type="number" min="0" max="100" value={form.memory || 0} onChange={(e) => updateForm('memory', parseFloat(e.target.value) || 0)} style={inputStyle} />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, flex: 1, opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Menyimpan...' : editing ? 'Update' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} style={{ ...btnSecondary, flex: 1 }}>Batal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 }}>{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#94A3B8' }}>{label}</span>
      <span style={{ fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</span>
    </div>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const color = value > 80 ? '#EF4444' : value > 60 ? '#F59E0B' : '#22C55E';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: '#94A3B8' }}>{label}</span>
        <span style={{ fontSize: 12, color }}>{value}%</span>
      </div>
      <div style={{ height: 6, background: '#334155', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: value + '%', height: '100%', background: color, transition: 'width .3s' }} />
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color = status === 'up' ? '#22C55E' : status === 'down' ? '#EF4444' : '#F59E0B';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      <span style={{ textTransform: 'capitalize' }}>{status}</span>
    </span>
  );
}

const cardStyle: React.CSSProperties = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #334155' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #334155' };
const selectStyle: React.CSSProperties = { background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', padding: '7px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', padding: '8px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' };
const btnPrimary: React.CSSProperties = { background: '#3B82F6', border: '1px solid #3B82F6', color: 'white', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSecondary: React.CSSProperties = { background: '#334155', border: '1px solid #334155', color: '#F1F5F9', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnDanger: React.CSSProperties = { background: '#EF4444', border: '1px solid #EF4444', color: 'white', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnIcon: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px 6px', borderRadius: 4 };
const closeBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#94A3B8', fontSize: 18, cursor: 'pointer' };
const sectionTitleStyle: React.CSSProperties = { fontSize: 12, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', marginBottom: 12 };