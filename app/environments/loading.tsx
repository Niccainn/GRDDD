export default function EnvironmentsLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: 200, height: 32, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 280, height: 14, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: 160, height: 36, borderRadius: 'var(--radius-pill)' }} />
      </div>

      {/* Environment cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 180, borderRadius: 'var(--radius-lg)' }} />
        ))}
      </div>
    </div>
  );
}
