import { useEffect, useState } from 'react';
import { apiAdmin, type User } from '../../lib/api/client';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { useAuth } from '../../features/auth/useAuth';

export default function UsersPage() {
  const { show } = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ username: '', password: '', role: 'viewer' });
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await apiAdmin.users();
      setUsers(res.data);
    } catch (e: any) {
      show('Gagal load: ' + e.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditUser(null);
    setForm({ username: '', password: '', role: 'viewer' });
    setModalOpen(true);
  }

  function openEdit(u: User) {
    setEditUser(u);
    setForm({ username: u.username, password: '', role: u.role });
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editUser) {
        const patch: any = { role: form.role };
        if (form.password) patch.password = form.password;
        await apiAdmin.updateUser(editUser.id, patch);
        show('User diupdate', 'success');
      } else {
        await apiAdmin.createUser(form);
        show('User dibuat', 'success');
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      show('Gagal: ' + e.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(u: User) {
    if (u.username === me?.username) {
      show('Tidak bisa hapus diri sendiri', 'error');
      return;
    }
    if (!confirm('Hapus user ' + u.username + '?')) return;
    try {
      await apiAdmin.deleteUser(u.id);
      show('User dihapus', 'success');
      await load();
    } catch (e: any) {
      show('Gagal: ' + e.message, 'error');
    }
  }

  if (me?.role !== 'admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>
        🔒 Halaman ini hanya untuk admin.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>👥 Users</h1>
        <button onClick={openAdd} style={btnPrimary}>+ Add User</button>
      </div>

      <div style={cardStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>{['Username', 'Role', 'Created', 'Actions'].map((h) => <th key={h} style={thStyle}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td style={tdStyle}>{u.username} {u.username === me?.username && <span style={{ color: '#3B82F6', fontSize: 11 }}>(you)</span>}</td>
                <td style={tdStyle}><span style={roleBadge(u.role)}>{u.role}</span></td>
                <td style={tdStyle}>{u.created_at || '-'}</td>
                <td style={tdStyle}>
                  <button onClick={() => openEdit(u)} style={btnSmall}>✏️ Edit</button>
                  <button onClick={() => handleDelete(u)} style={btnSmallDanger}>🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} title={editUser ? 'Edit User' : 'Tambah User'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={labelStyle}>Username</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              disabled={!!editUser} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>{editUser ? 'Password Baru (opsional)' : 'Password'}</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={inputStyle} placeholder={editUser ? 'Biarkan kosong jika tidak diubah' : ''} required={!editUser} />
          </div>
          <div>
            <label style={labelStyle}>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} style={inputStyle}>
              <option value="viewer">Viewer</option>
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
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

function roleBadge(role: string): React.CSSProperties {
  const colors: any = {
    admin: { bg: 'rgba(239,68,68,.15)', c: '#EF4444' },
    analyst: { bg: 'rgba(245,158,11,.15)', c: '#F59E0B' },
    viewer: { bg: 'rgba(6,182,212,.15)', c: '#06B6D4' },
  };
  const col = colors[role] || colors.viewer;
  return { padding: '3px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: col.bg, color: col.c };
}

const cardStyle: React.CSSProperties = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16 };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', color: '#94A3B8', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #334155' };
const tdStyle: React.CSSProperties = { padding: '10px 12px', borderBottom: '1px solid #334155' };
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 4, textTransform: 'uppercase', fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', padding: '8px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' };
const btnPrimary: React.CSSProperties = { background: '#3B82F6', border: '1px solid #3B82F6', color: 'white', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSecondary: React.CSSProperties = { background: '#334155', border: '1px solid #334155', color: '#F1F5F9', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13 };
const btnSmall: React.CSSProperties = { background: 'rgba(59,130,246,.15)', border: '1px solid #3B82F6', color: '#3B82F6', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, marginRight: 4 };
const btnSmallDanger: React.CSSProperties = { background: 'rgba(239,68,68,.15)', border: '1px solid #EF4444', color: '#EF4444', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600 };