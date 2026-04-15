export default function NovaLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: 900, margin: '0 auto' }}>
      {/* Nova header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: '2rem' }}>
        <div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} />
        <div>
          <div className="skeleton" style={{ width: 80, height: 24, borderRadius: 8, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 200, height: 14, borderRadius: 6 }} />
        </div>
      </div>

      {/* Chat area */}
      <div
        className="skeleton"
        style={{
          height: 160,
          borderRadius: 'var(--radius-lg)',
          marginBottom: '2rem',
        }}
      />

      {/* Interaction log header */}
      <div className="skeleton" style={{ width: 200, height: 18, borderRadius: 6, marginBottom: 16 }} />

      {/* Log items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="skeleton" style={{ height: 72, borderRadius: 'var(--radius-md)' }} />
        ))}
      </div>
    </div>
  );
}
