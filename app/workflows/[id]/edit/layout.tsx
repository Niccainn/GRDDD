// The visual builder needs to own the full viewport —
// override the root layout's overflow/margin for this route only.
export default function EditLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        left: 220, // respect sidebar width
        zIndex: 50,
        background: '#09090b',
      }}
    >
      {children}
    </div>
  );
}
