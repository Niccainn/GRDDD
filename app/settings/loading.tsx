export default function SettingsLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 700, margin: '0 auto' }}>
      {/* Title */}
      <div className="skeleton" style={{ width: 120, height: 32, borderRadius: 8, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 280, height: 14, borderRadius: 6, marginBottom: 32 }} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 90, height: 20, borderRadius: 6 }} />
      </div>

      {/* Profile card */}
      <div className="skeleton" style={{ height: 360, borderRadius: 'var(--radius-lg)' }} />
    </div>
  );
}
