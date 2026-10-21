import { useEffect } from 'react';
import { useDevices } from '../../features/devices/useDevices';
import type { Device } from '../../lib/api/client';

interface Node {
  id: string;
  label: string;
  x: number;
  y: number;
  type: string;
  status: string;
  device?: Device;
}

interface Edge {
  from: string;
  to: string;
}

export default function TopologyPage() {
  const { devices, loading, fetch } = useDevices();

  useEffect(() => {
    fetch();
  }, []);

  // Layout manual — sederhana tapi kelihatan profesional
  // Level 0: Internet (atas), Level 1: Firewall, Level 2: Router, Level 3: Core, Level 4: Access
  const layout: Record<string, { x: number; y: number; level: number }> = {
    'Internet':     { x: 400, y: 40,  level: 0 },
    'fw-perimeter': { x: 400, y: 120, level: 1 },
    'router-edge':  { x: 400, y: 200, level: 2 },
    'sw-core-01':   { x: 250, y: 290, level: 3 },
    'sw-core-02':   { x: 400, y: 290, level: 3 },
    'srv-db':       { x: 550, y: 290, level: 3 },
    'sw-access-03': { x: 180, y: 380, level: 4 },
    'ap-lobby':     { x: 320, y: 380, level: 4 },
    'srv-web':      { x: 460, y: 380, level: 4 },
  };

  const edges: Edge[] = [
    { from: 'Internet', to: 'fw-perimeter' },
    { from: 'fw-perimeter', to: 'router-edge' },
    { from: 'router-edge', to: 'sw-core-01' },
    { from: 'router-edge', to: 'sw-core-02' },
    { from: 'router-edge', to: 'srv-db' },
    { from: 'sw-core-01', to: 'sw-access-03' },
    { from: 'sw-core-01', to: 'ap-lobby' },
    { from: 'sw-core-02', to: 'srv-web' },
  ];

  const nodes: Node[] = Object.entries(layout).map(([id, pos]) => {
    const dev = devices.find((d) => d.name === id);
    return {
      id,
      label: id,
      x: pos.x,
      y: pos.y,
      type: dev?.type || (id === 'Internet' ? 'cloud' : 'unknown'),
      status: dev?.status || 'up',
      device: dev,
    };
  });

  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  if (loading && devices.length === 0) {
    return <div style={{ padding: 40, color: '#94A3B8' }}>Loading topology...</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>🗺️ Network Topology</h1>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#94A3B8' }}>
          <span><span style={dotStyle('#22C55E')} /> Up</span>
          <span><span style={dotStyle('#EF4444')} /> Down</span>
          <span><span style={dotStyle('#F59E0B')} /> Warning</span>
        </div>
      </div>

      <div style={cardStyle}>
        <svg
          width="100%"
          viewBox="0 0 700 460"
          style={{ maxHeight: 600, background: '#0F172A', borderRadius: 8 }}
        >
          {/* Edges */}
          {edges.map((e, i) => {
            const from = nodeMap[e.from];
            const to = nodeMap[e.to];
            if (!from || !to) return null;
            return (
              <line
                key={i}
                x1={from.x}
                y1={from.y + 25}
                x2={to.x}
                y2={to.y - 25}
                stroke="#334155"
                strokeWidth={2}
                strokeDasharray={to.status === 'down' ? '5,5' : '0'}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const color = n.status === 'up' ? '#22C55E' : n.status === 'down' ? '#EF4444' : '#F59E0B';
            const icon = getIcon(n.type);
            return (
              <g key={n.id}>
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={25}
                  fill="#1E293B"
                  stroke={color}
                  strokeWidth={2}
                  style={{ filter: `drop-shadow(0 0 8px ${color}66)` }}
                />
                <text
                  x={n.x}
                  y={n.y + 5}
                  textAnchor="middle"
                  fontSize={16}
                  fill="#F1F5F9"
                >
                  {icon}
                </text>
                <text
                  x={n.x}
                  y={n.y + 42}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#94A3B8"
                  fontFamily="monospace"
                >
                  {n.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={cardStyle}>
        <div style={sectionTitle}>Device List</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
          {nodes.filter((n) => n.device).map((n) => (
            <div
              key={n.id}
              style={{
                padding: 12,
                background: '#0F172A',
                borderLeft: `3px solid ${n.status === 'up' ? '#22C55E' : n.status === 'down' ? '#EF4444' : '#F59E0B'}`,
                borderRadius: 4,
                fontSize: 12,
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{n.label}</div>
              <div style={{ color: '#94A3B8' }}>{n.device?.ip}</div>
              <div style={{ color: '#94A3B8' }}>{n.device?.type} • {n.device?.site}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getIcon(type: string): string {
  if (type === 'cloud') return '☁️';
  if (type === 'firewall') return '🔥';
  if (type === 'router') return '📡';
  if (type === 'switch') return '🔀';
  if (type === 'server') return '🖥️';
  if (type === 'ap') return '📶';
  return '⚪';
}

function dotStyle(color: string): React.CSSProperties {
  return { display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: color, marginRight: 4 };
}

const cardStyle: React.CSSProperties = {
  background: '#1E293B', border: '1px solid #334155', borderRadius: 8, padding: 16, marginBottom: 16,
};
const sectionTitle: React.CSSProperties = {
  fontSize: 13, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 12,
};