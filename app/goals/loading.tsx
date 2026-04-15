export default function GoalsLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <div className="skeleton" style={{ width: 100, height: 32, borderRadius: 8, marginBottom: 8 }} />
          <div className="skeleton" style={{ width: 180, height: 14, borderRadius: 6 }} />
        </div>
        <div className="skeleton" style={{ width: 120, height: 36, borderRadius: 'var(--radius-pill)' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="skeleton" style={{ height: 160, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
  );
}
