export default function WorkflowsLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: 180, height: 32, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 120, height: 14, borderRadius: 6 }} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 'var(--radius-pill)' }} />
          <div className="skeleton" style={{ width: 140, height: 36, borderRadius: 'var(--radius-pill)' }} />
        </div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '2rem' }}>
        <div className="skeleton" style={{ width: 240, height: 40, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ width: 280, height: 40, borderRadius: 'var(--radius-pill)' }} />
      </div>

      {/* Workflow cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="skeleton" style={{ height: 200, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
  );
}
