export default function TasksLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 140, height: 14, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 'var(--radius-pill)' }} />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '2rem' }}>
        <div className="skeleton" style={{ width: 200, height: 40, borderRadius: 'var(--radius-md)' }} />
        <div className="skeleton" style={{ width: 240, height: 40, borderRadius: 'var(--radius-pill)' }} />
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="skeleton" style={{ height: 64, borderRadius: 'var(--radius-sm)' }} />
        ))}
      </div>
    </div>
  );
}
