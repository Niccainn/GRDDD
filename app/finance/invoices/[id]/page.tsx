'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

type InvoiceData = {
  id: string;
  number: string;
  clientName: string;
  clientEmail: string | null;
  items: string;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: string;
  issueDate: string;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
};

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export default function InvoicePreviewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/finance/invoices/${id}`)
      .then(r => r.json())
      .then(d => { setInvoice(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  async function updateStatus(status: string) {
    const body: Record<string, string> = { status };
    if (status === 'paid') {
      body.paidAt = new Date().toISOString();
    }
    await fetch(`/api/finance/invoices/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const updated = await fetch(`/api/finance/invoices/${id}`).then(r => r.json());
    setInvoice(updated);
  }

  if (loading) {
    return (
      <div className="px-10 py-10 min-h-screen flex items-center justify-center">
        <div className="h-20 w-64 rounded-2xl animate-pulse" style={{ background: 'var(--glass)' }} />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="px-10 py-10 min-h-screen">
        <p className="text-sm font-light" style={{ color: 'var(--text-3)' }}>Invoice not found</p>
      </div>
    );
  }

  let items: LineItem[] = [];
  try { items = JSON.parse(invoice.items); } catch { items = []; }

  const isOverdue = invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.dueDate && new Date(invoice.dueDate) < new Date();

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Action bar - hidden in print */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <button
          onClick={() => router.push('/finance')}
          className="text-xs font-light px-3 py-1.5 rounded-full transition-all"
          style={{ color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          Back to Finance
        </button>
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <button
              onClick={() => updateStatus('sent')}
              className="text-xs font-light px-4 py-2 rounded-full transition-all"
              style={{ background: 'rgba(113,147,237,0.08)', border: '1px solid rgba(113,147,237,0.2)', color: '#7193ED' }}
            >
              Mark as sent
            </button>
          )}
          {(invoice.status === 'sent' || invoice.status === 'overdue') && (
            <button
              onClick={() => updateStatus('paid')}
              className="text-xs font-light px-4 py-2 rounded-full transition-all"
              style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.2)', color: '#15AD70' }}
            >
              Mark as paid
            </button>
          )}
          <button
            onClick={() => window.print()}
            className="text-xs font-light px-4 py-2 rounded-full transition-all"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-2)' }}
          >
            Print
          </button>
        </div>
      </div>

      {/* Invoice card */}
      <div
        className="max-w-2xl mx-auto rounded-2xl p-10 print:rounded-none print:shadow-none print:p-0"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <h1 className="text-3xl font-light tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>INVOICE</h1>
            <p className="text-sm font-light tabular-nums" style={{ color: 'var(--text-3)' }}>{invoice.number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-light" style={{ color: 'var(--text-2)' }}>Your Company Name</p>
            <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>123 Business Street</p>
            <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>City, State 12345</p>
            <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>billing@company.com</p>
          </div>
        </div>

        {/* Client + Dates */}
        <div className="grid grid-cols-2 gap-8 mb-10">
          <div>
            <p className="text-[10px] tracking-[0.12em] mb-2" style={{ color: 'var(--text-3)' }}>BILL TO</p>
            <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{invoice.clientName}</p>
            {invoice.clientEmail && (
              <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>{invoice.clientEmail}</p>
            )}
          </div>
          <div className="text-right">
            <div className="mb-2">
              <p className="text-[10px] tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>ISSUE DATE</p>
              <p className="text-xs font-light tabular-nums" style={{ color: 'var(--text-2)' }}>
                {new Date(invoice.issueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-[10px] tracking-[0.12em]" style={{ color: isOverdue ? '#FF6B6B' : 'var(--text-3)' }}>DUE DATE</p>
                <p className="text-xs font-light tabular-nums" style={{ color: isOverdue ? '#FF6B6B' : 'var(--text-2)' }}>
                  {new Date(invoice.dueDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  {isOverdue && ' (OVERDUE)'}
                </p>
              </div>
            )}
            {invoice.paidAt && (
              <div className="mt-2">
                <p className="text-[10px] tracking-[0.12em]" style={{ color: '#15AD70' }}>PAID</p>
                <p className="text-xs font-light tabular-nums" style={{ color: '#15AD70' }}>
                  {new Date(invoice.paidAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Line items table */}
        <div className="mb-8">
          <div
            className="grid grid-cols-[1fr_80px_100px_100px] gap-4 py-3 px-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}
          >
            <span className="text-[10px] tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>DESCRIPTION</span>
            <span className="text-[10px] tracking-[0.12em] text-right" style={{ color: 'var(--text-3)' }}>QTY</span>
            <span className="text-[10px] tracking-[0.12em] text-right" style={{ color: 'var(--text-3)' }}>UNIT PRICE</span>
            <span className="text-[10px] tracking-[0.12em] text-right" style={{ color: 'var(--text-3)' }}>AMOUNT</span>
          </div>
          {items.map((item, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[1fr_80px_100px_100px] gap-4 py-3 px-4"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{item.description || '-'}</span>
              <span className="text-xs font-light tabular-nums text-right" style={{ color: 'var(--text-3)' }}>{item.quantity}</span>
              <span className="text-xs font-light tabular-nums text-right" style={{ color: 'var(--text-3)' }}>{fmt(item.unitPrice, invoice.currency)}</span>
              <span className="text-xs font-light tabular-nums text-right" style={{ color: 'var(--text-2)' }}>{fmt(item.amount, invoice.currency)}</span>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-10">
          <div className="w-64 space-y-2">
            <div className="flex justify-between text-xs font-light">
              <span style={{ color: 'var(--text-3)' }}>Subtotal</span>
              <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>{fmt(invoice.subtotal, invoice.currency)}</span>
            </div>
            {invoice.tax > 0 && (
              <div className="flex justify-between text-xs font-light">
                <span style={{ color: 'var(--text-3)' }}>Tax</span>
                <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>{fmt(invoice.tax, invoice.currency)}</span>
              </div>
            )}
            <div
              className="flex justify-between text-sm font-light pt-3"
              style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}
            >
              <span style={{ color: 'var(--text-1)' }}>Total</span>
              <span className="tabular-nums" style={{ color: 'var(--text-1)' }}>{fmt(invoice.total, invoice.currency)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <p className="text-[10px] tracking-[0.12em] mb-2" style={{ color: 'var(--text-3)' }}>NOTES</p>
            <p className="text-xs font-light leading-relaxed" style={{ color: 'var(--text-3)' }}>{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}
