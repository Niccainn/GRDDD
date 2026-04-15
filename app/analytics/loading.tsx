export default function AnalyticsLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div className="skeleton" style={{ width: 140, height: 32, borderRadius: 8, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 240, height: 14, borderRadius: 6, marginBottom: 32 }} />

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 24, marginBottom: 32 }}>
        <div className="skeleton" style={{ width: 70, height: 20, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 60, height: 20, borderRadius: 6 }} />
      </div>

      {/* Chart area */}
      <div className="skeleton" style={{ height: 320, borderRadius: 'var(--radius-lg)', marginBottom: 24 }} />

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
  );
}
