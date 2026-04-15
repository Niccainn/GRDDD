export default function DashboardLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: 260, height: 36, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 160, height: 16, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: 140, height: 34, borderRadius: 'var(--radius-pill)' }} />
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: '2rem' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 100, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>

      {/* Main content area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div>
          <div className="skeleton" style={{ height: 300, borderRadius: 'var(--radius-md)', marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
        </div>
        <div>
          <div className="skeleton" style={{ height: 400, borderRadius: 'var(--radius-md)' }} />
        </div>
      </div>
    </div>
  );
}
