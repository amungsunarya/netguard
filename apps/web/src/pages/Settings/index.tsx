import { useState } from 'react';
import { useToast } from '../../components/ui/Toast';

export default function SettingsPage() {
  const { show } = useToast();
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('netguard_settings');
    return saved ? JSON.parse(saved) : {
      instanceName: 'NetGuard-Prod',
      timezone: 'Asia/Jakarta',
      language: 'id',
      theme: 'dark',
      logRetention: 30,
      metricRetention: 90,
      alertRetention: 180,
      slackEnabled: false,
      emailEnabled: true,
      slackWebhook: '',
    };
  });

  function save() {
    localStorage.setItem('netguard_settings', JSON.stringify(settings));
    show('Settings disimpan', 'success');
  }

  function update(key: string, value: any) {
    setSettings({ ...settings, [key]: value });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>🔧 Settings</h1>
        <button onClick={save} style={btnPrimary}>💾 Save Changes</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={cardStyle}>
          <h2 style={sectionTitle}>General</h2>
          <Field label="Instance Name">
            <input value={settings.instanceName} onChange={(e) => update('instanceName', e.target.value)} style={inputStyle} />
          </Field>
          <Field label="Timezone">
            <select value={settings.timezone} onChange={(e) => update('timezone', e.target.value)} style={inputStyle}>
              <option value="Asia/Jakarta">Asia/Jakarta</option>
              <option value="Asia/Singapore">Asia/Singapore</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
          <Field label="Language">
            <select value={settings.language} onChange={(e) => update('language', e.target.value)} style={inputStyle}>
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field label="Theme">
            <select value={settings.theme} onChange={(e) => update('theme', e.target.value)} style={inputStyle}>
              <option value="dark">Dark</option>
              <option value="light">Light (coming soon)</option>
            </select>
          </Field>
        </div>

        <div style={cardStyle}>
          <h2 style={sectionTitle}>Data Retention</h2>
          <Field label="Logs (hari)">
            <input type="number" value={settings.logRetention} onChange={(e) => update('logRetention', parseInt(e.target.value))} style={inputStyle} />
          </Field>
          <Field label="Metrics (hari)">
            <input type="number" value={settings.metricRetention} onChange={(e) => update('metricRetention', parseInt(e.target.value))} style={inputStyle} />
          </Field>
          <Field label="Alerts (hari)">
            <input type="number" value={settings.alertRetention} onChange={(e) => update('alertRetention', parseInt(e.target.value))} style={inputStyle} />
          </Field>
        </div>

        <div style={{ ...cardStyle, gridColumn: '1 / -1' }}>
          <h2 style={sectionTitle}>Notifications</h2>
          <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.slackEnabled} onChange={(e) => update('slackEnabled', e.target.checked)} />
              Slack
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.emailEnabled} onChange={(e) => update('emailEnabled', e.target.checked)} />
              Email
            </label>
          </div>
          {settings.slackEnabled && (
            <Field label="Slack Webhook URL">
              <input value={settings.slackWebhook} onChange={(e) => update('slackWebhook', e.target.value)}
                placeholder="https://hooks.slack.com/services/..." style={inputStyle} />
            </Field>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  );
}

const cardStyle: React.CSSProperties = { background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 20 };
const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 600, marginBottom: 16, textTransform: 'uppercase', color: '#94A3B8', letterSpacing: '.05em' };
const labelStyle: React.CSSProperties = { fontSize: 11, color: '#94A3B8', display: 'block', marginBottom: 6, textTransform: 'uppercase', fontWeight: 600 };
const inputStyle: React.CSSProperties = { width: '100%', background: '#0F172A', border: '1px solid #334155', color: '#F1F5F9', padding: '8px 12px', borderRadius: 4, fontSize: 13, fontFamily: 'inherit' };
const btnPrimary: React.CSSProperties = { background: '#3B82F6', border: '1px solid #3B82F6', color: 'white', padding: '8px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 13, fontWeight: 600 };