import { useEffect, useState } from 'react';
import { apiAdmin, type Rule } from '../../lib/api/client';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';

const EMPTY_RULE = {
  name: '',
  category: 'security',
  schedule: 'every 1m',
  description: '',
  yaml: 'name: "New Rule"\ncategory: security\nschedule: "every 1m"\ndescription: "..."\nquery: |\n  SELECT * FROM logs\n  WHERE ...\naction:\n  severity: warning\n  message: "..."',
  enabled: true,
};

export default function RulesPage() {
  const { show } = useToast();
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>(EMPTY_RULE);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiAdmin.rules();
      setRules(res.data);
    } catch (e: any) {
      show('Gagal load rules: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiAdmin.createRule(form);
      show('Rule ' + form.name + ' disimpan', 'success');
      setModalOpen(false);
      await load();
    } catch (e: any) {
      show('Gagal: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(r: Rule) {
    if (!confirm('Hapus rule ' + r.name + '?')) return;
    try {
      await apiAdmin.deleteRule(r.category, r.name);
      show('Rule ' + r.name + ' dihapus', 'success');
      await load();
    } catch (e: any) {
      show('Gagal: ' + e.message, 'error');
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>⚙️ Detection Rules</h1>
        <button onClick={() => { setForm(EMPTY_RULE); setModalOpen(true); }} style={btnPrimary}>+ New Rule</button>
      </div>

      {loading ? (
        <div style={{ color: '#94A3B8' }}>Loading...</div>
      ) : rules.length === 0 ? (
        <div style={cardStyle}>
          <div style={{ color: '#94A3B8', textAlign: 'center', padding: 40 }}>
            Belum ada rule. Klik "+ New Rule" untuk menambah.
          </div>
        </div>
      ) : (
        rules.map((r) => (
          <div key={r.category + '/' + r.name} style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={categoryBadge(r.category)}>{r.category}</span>
                <strong>{r.name}</strong>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setForm(r); setModalOpen(true); }} style={btnSmall}>✏️ Edit</button>
                <button onClick={() => handleDelete(r)} style={btnSmallDanger}>🗑️ Hapus</button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>
              Schedule: <code>{r.schedule}</code> • {r.description}
            </div>
            <pre style={{
              fontSize: 11, background: '#0F172A', padding: 12,
              borderRadius: 4, overflow: 'auto', maxHeight: 200,
              color: '#CBD5E1', margin: 0,
            }}>{r.yaml}</pre>
          </div>
        ))
      )}

      <Modal isOpen={modalOpen} title="Rule Editor" onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={inputStyle}>
              <option value="security">Security</option>
              <option value="network">Network</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Schedule</label>
            <input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>YAML Content</label>
            <textarea value={form.yaml} onChange={(e) => setForm({ ...form, yaml: e.target.value })}
              style={{ ...inputStyle, minHeight: 200, fontFamily: 'monospace', fontSize: 12 }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, flex: 1 }}>
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button type="button" onClick={() => setModalOpen(false)} style={btnSecondary}>Batal</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function categoryBadge(cat: string): React.CSSProperties {
  return {
    padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600,
    background: cat === 'security' ? 'rgba(239,68,68,.15)' : 'rgba(59,130,246,.15)',
    color: cat === 'security' ? '#EF4444' : '#3B82F6',
  };
}

const cardStyle: React.CSSProperties = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16, marginBottom: 12 };
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', padding: '8px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' };
const btnPrimary: React.CSSProperties = { background: '#3B82F6', border: '1px solid #3B82F6', color: 'white', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSecondary: React.CSSProperties = { background: '#334155', border: '1px solid #334155', color: '#F1F5F9', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnSmall: React.CSSProperties = { background: 'rgba(59,130,246,.15)', border: '1px solid #3B82F6', color: '#3B82F6', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 };
const btnSmallDanger: React.CSSProperties = { background: 'rgba(239,68,68,.15)', border: '1px solid #EF4444', color: '#EF4444', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 };