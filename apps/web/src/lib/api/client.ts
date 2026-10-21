const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export interface Device {
  id: number;
  name: string;
  ip: string;
  type: string;
  site: string;
  status: 'up' | 'down' | 'warning';
  cpu: number;
  memory: number;
  uptime: string;
  last_seen: string;
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  source: string;
  status: 'open' | 'acked' | 'resolved';
  created_at: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'critical' | 'warning' | 'info' | 'error';
  type: string;
  source: string;
  message: string;
}

export interface Metric {
  name: string;
  value: number;
  timestamp: string;
}

export interface Overview {
  alerts: { total: number; critical: number };
  devices: { total: number; up: number; down: number };
  events_per_second: number;
  recent_alerts: Alert[];
}

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export const api = {
  health: () => fetchJSON<{ status: string; version: string; database: string }>('/health'),
  overview: () => fetchJSON<Overview>('/api/overview'),
  devices: () => fetchJSON<{ data: Device[]; total: number }>('/api/devices'),
  device: (id: number) => fetchJSON<Device>(`/api/devices/${id}`),
  alerts: (params?: { severity?: string; status?: string }) => {
    const query = new URLSearchParams(params as any).toString();
    return fetchJSON<{ data: Alert[]; total: number }>(`/api/alerts${query ? '?' + query : ''}`);
  },
  logs: () => fetchJSON<{ data: LogEntry[]; total: number }>('/api/logs'),
  metrics: () => fetchJSON<{ data: Metric[] }>('/api/metrics'),
};

// ============ CRUD Operations ============
export const apiCRUD = {
  createDevice: async (device: Partial<Device>): Promise<Device> => {
    const res = await fetch(`${API_BASE}/api/devices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  updateDevice: async (id: number, device: Partial<Device>): Promise<Device> => {
    const res = await fetch(`${API_BASE}/api/devices/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(device),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  deleteDevice: async (id: number): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/api/devices/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  ackAlert: async (id: string): Promise<{ message: string }> => {
    const res = await fetch(`${API_BASE}/api/alerts/${id}/ack`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },

  blockAlert: async (id: string): Promise<{ message: string; blocked_ip: string }> => {
    const res = await fetch(`${API_BASE}/api/alerts/${id}/block`, { method: 'POST' });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
  },
};


// ============ AUTH FETCH ============
async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('netguard_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

// API dengan auth (untuk endpoint protected)
export const apiAuth = {
  overview: async (): Promise<Overview> => {
    const r = await authFetch('/api/overview');
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    return r.json();
  },
  devices: async (): Promise<{ data: Device[]; total: number }> => {
    const r = await authFetch('/api/devices');
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    return r.json();
  },
  alerts: async (params?: { severity?: string; status?: string }): Promise<{ data: Alert[]; total: number }> => {
    const query = new URLSearchParams(params as any).toString();
    const r = await authFetch(`/api/alerts${query ? '?' + query : ''}`);
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    return r.json();
  },
  logs: async (): Promise<{ data: LogEntry[]; total: number }> => {
    const r = await authFetch('/api/logs');
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    return r.json();
  },
  metrics: async (): Promise<{ data: Metric[] }> => {
    const r = await authFetch('/api/metrics');
    if (r.status === 401) throw new Error('UNAUTHORIZED');
    return r.json();
  },
};

export const apiCRUDAuth = {
  createDevice: async (device: Partial<Device>): Promise<Device> => {
    const r = await authFetch('/api/devices', { method: 'POST', body: JSON.stringify(device) });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    return r.json();
  },
  updateDevice: async (id: number, device: Partial<Device>): Promise<Device> => {
    const r = await authFetch(`/api/devices/${id}`, { method: 'PUT', body: JSON.stringify(device) });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    return r.json();
  },
  deleteDevice: async (id: number): Promise<{ message: string }> => {
    const r = await authFetch(`/api/devices/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    return r.json();
  },
  ackAlert: async (id: string): Promise<{ message: string }> => {
    const r = await authFetch(`/api/alerts/${id}/ack`, { method: 'POST' });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    return r.json();
  },
  blockAlert: async (id: string): Promise<{ message: string; blocked_ip: string }> => {
    const r = await authFetch(`/api/alerts/${id}/block`, { method: 'POST' });
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${await r.text()}`);
    return r.json();
  },
};


// ============ RULES ============
export interface Rule {
  name: string;
  category: string;
  schedule: string;
  enabled: boolean;
  description: string;
  yaml: string;
}

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'analyst' | 'viewer';
  created_at: string;
}

export const apiAdmin = {
  // Rules
  rules: async (): Promise<{ data: Rule[]; total: number }> => {
    const r = await authFetch('/api/rules');
    return r.json();
  },
  createRule: async (rule: Partial<Rule>): Promise<Rule> => {
    const r = await authFetch('/api/rules', { method: 'POST', body: JSON.stringify(rule) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  deleteRule: async (category: string, name: string): Promise<{ message: string }> => {
    const r = await authFetch(`/api/rules/${category}/${name}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  // Users
  users: async (): Promise<{ data: User[]; total: number }> => {
    const r = await authFetch('/api/users');
    return r.json();
  },
  createUser: async (user: { username: string; password: string; role: string }): Promise<User> => {
    const r = await authFetch('/api/users', { method: 'POST', body: JSON.stringify(user) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  updateUser: async (id: number, patch: { role?: string; password?: string }): Promise<{ message: string }> => {
    const r = await authFetch(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(patch) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  deleteUser: async (id: number): Promise<{ message: string }> => {
    const r = await authFetch(`/api/users/${id}`, { method: 'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  // Health
  health: async (): Promise<any> => {
    const r = await authFetch('/api/health/detailed');
    return r.json();
  },
};
