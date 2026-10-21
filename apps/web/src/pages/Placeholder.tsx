export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>{title}</h1>
      <div style={{
        background: '#1E293B',
        border: '1px solid #334155',
        borderRadius: 8,
        padding: 40,
        textAlign: 'center',
        color: '#94A3B8',
      }}>
        🚧 Halaman <strong>{title}</strong> sedang dikembangkan.
        <br />
        <small>Fokus dulu di Overview — sudah terhubung ke API.</small>
      </div>
    </div>
  );
}