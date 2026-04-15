'use client';

import { useEffect, useState, useCallback } from 'react';

type Budget = {
  id: string;
  name: string;
  amount: number;
  spent: number;
  currency: string;
  period: string;
  startDate: string;
  endDate: string | null;
  category: string;
  environmentId: string;
  environment: { id: string; name: string };
  createdAt: string;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  vendor: string | null;
  date: string;
  status: string;
  notes: string | null;
  budgetId: string | null;
  budget: { id: string; name: string } | null;
  createdAt: string;
};

type Invoice = {
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
  environmentId: string;
  createdAt: string;
};

type Environment = { id: string; name: string; slug: string };

type LineItem = {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};

const BUDGET_CATEGORIES = ['general', 'marketing', 'engineering', 'design', 'operations', 'sales'];
const EXPENSE_CATEGORIES = ['software', 'hardware', 'services', 'travel', 'marketing', 'payroll', 'other'];
const BUDGET_PERIODS = ['monthly', 'quarterly', 'yearly', 'project'];

function fmt(amount: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

function statusColor(status: string): { bg: string; border: string; text: string } {
  const map: Record<string, { bg: string; border: string; text: string }> = {
    pending: { bg: 'rgba(247,199,0,0.08)', border: 'rgba(247,199,0,0.2)', text: '#F7C700' },
    approved: { bg: 'rgba(21,173,112,0.08)', border: 'rgba(21,173,112,0.2)', text: '#15AD70' },
    rejected: { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)', text: '#FF6B6B' },
    paid: { bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.2)', text: '#7193ED' },
    draft: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.4)' },
    sent: { bg: 'rgba(113,147,237,0.08)', border: 'rgba(113,147,237,0.2)', text: '#7193ED' },
    overdue: { bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)', text: '#FF6B6B' },
    cancelled: { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.3)' },
  };
  return map[status] ?? map.draft;
}

function utilizationColor(pct: number): string {
  if (pct >= 90) return '#FF6B6B';
  if (pct >= 70) return '#F7C700';
  return '#15AD70';
}

export default function FinancePage() {
  const [tab, setTab] = useState<'overview' | 'budgets' | 'expenses' | 'invoices'>('overview');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [envs, setEnvs] = useState<Environment[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Forms
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<string | null>(null);

  // Filters
  const [expenseStatusFilter, setExpenseStatusFilter] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('');

  // Invoice form state
  const [invoiceItems, setInvoiceItems] = useState<LineItem[]>([{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  const [invoiceTaxPct, setInvoiceTaxPct] = useState(0);

  const loadData = useCallback(async () => {
    const [bRes, eRes, iRes, envRes] = await Promise.all([
      fetch('/api/finance/budgets').then(r => r.json()),
      fetch('/api/finance/expenses').then(r => r.json()),
      fetch('/api/finance/invoices').then(r => r.json()),
      fetch('/api/environments').then(r => r.json()),
    ]);
    setBudgets(bRes);
    setExpenses(eRes);
    setInvoices(iRes);
    setEnvs(Array.isArray(envRes) ? envRes : []);
    setLoaded(true);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Computed stats
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0);
  const totalInvoiced = invoices.reduce((s, i) => s + i.total, 0);
  const outstanding = invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((s, i) => s + i.total, 0);
  const overdueInvoices = invoices.filter(i =>
    i.status !== 'paid' && i.status !== 'cancelled' && i.dueDate && new Date(i.dueDate) < new Date()
  );

  // Monthly expense data (last 6 months)
  const monthlyData = (() => {
    const months: { label: string; total: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = d.toLocaleString('default', { month: 'short' });
      const year = d.getFullYear();
      const month = d.getMonth();
      const total = expenses
        .filter(e => {
          const ed = new Date(e.date);
          return ed.getFullYear() === year && ed.getMonth() === month && (e.status === 'approved' || e.status === 'paid');
        })
        .reduce((s, e) => s + e.amount, 0);
      months.push({ label, total });
    }
    return months;
  })();
  const maxMonthly = Math.max(...monthlyData.map(m => m.total), 1);

  // Filtered expenses
  const filteredExpenses = expenses.filter(e => {
    if (expenseStatusFilter && e.status !== expenseStatusFilter) return false;
    if (expenseCategoryFilter && e.category !== expenseCategoryFilter) return false;
    return true;
  });

  // --- Form handlers ---

  async function createBudget(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/finance/budgets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fd.get('name'),
        amount: fd.get('amount'),
        currency: fd.get('currency') || 'USD',
        period: fd.get('period') || 'monthly',
        startDate: fd.get('startDate'),
        endDate: fd.get('endDate') || null,
        category: fd.get('category') || 'general',
        environmentId: fd.get('environmentId'),
      }),
    });
    setShowBudgetForm(false);
    loadData();
  }

  async function createExpense(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    await fetch('/api/finance/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: fd.get('description'),
        amount: fd.get('amount'),
        currency: 'USD',
        category: fd.get('category') || 'other',
        vendor: fd.get('vendor') || null,
        date: fd.get('date') || undefined,
        budgetId: fd.get('budgetId') || null,
        notes: fd.get('notes') || null,
      }),
    });
    setShowExpenseForm(false);
    loadData();
  }

  async function createInvoice(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const sub = invoiceItems.reduce((s, it) => s + it.amount, 0);
    const taxAmt = sub * (invoiceTaxPct / 100);
    await fetch('/api/finance/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName: fd.get('clientName'),
        clientEmail: fd.get('clientEmail') || null,
        items: JSON.stringify(invoiceItems),
        subtotal: sub,
        tax: taxAmt,
        total: sub + taxAmt,
        currency: 'USD',
        dueDate: fd.get('dueDate') || null,
        notes: fd.get('notes') || null,
        environmentId: fd.get('environmentId'),
      }),
    });
    setShowInvoiceForm(false);
    setInvoiceItems([{ description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
    setInvoiceTaxPct(0);
    loadData();
  }

  async function updateExpenseStatus(id: string, status: string) {
    await fetch(`/api/finance/expenses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    loadData();
  }

  async function deleteBudget(id: string) {
    await fetch(`/api/finance/budgets/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function deleteExpense(id: string) {
    await fetch(`/api/finance/expenses/${id}`, { method: 'DELETE' });
    loadData();
  }

  async function deleteInvoice(id: string) {
    await fetch(`/api/finance/invoices/${id}`, { method: 'DELETE' });
    loadData();
  }

  function updateLineItem(idx: number, field: keyof LineItem, value: string | number) {
    setInvoiceItems(prev => {
      const next = [...prev];
      const item = { ...next[idx] };
      if (field === 'description') item.description = value as string;
      if (field === 'quantity') item.quantity = Number(value) || 0;
      if (field === 'unitPrice') item.unitPrice = Number(value) || 0;
      item.amount = item.quantity * item.unitPrice;
      next[idx] = item;
      return next;
    });
  }

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--text-1)',
    fontSize: '13px',
    fontWeight: 300,
    outline: 'none',
    width: '100%',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    appearance: 'none' as const,
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'10\' height=\'6\' fill=\'none\'%3E%3Cpath d=\'M1 1l4 4 4-4\' stroke=\'rgba(255,255,255,0.3)\' stroke-width=\'1.5\' stroke-linecap=\'round\' stroke-linejoin=\'round\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: '32px',
  };

  const tabs = ['overview', 'budgets', 'expenses', 'invoices'] as const;

  return (
    <div className="px-10 py-10 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-tight mb-1" style={{ color: 'var(--text-1)' }}>Finance</h1>
          <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
            Budget tracking, expenses, and invoicing
          </p>
        </div>
      </div>

      {/* Tab nav */}
      <div className="flex items-center gap-1 mb-8">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="text-xs font-light px-4 py-2 rounded-full transition-all capitalize"
            style={{
              background: tab === t ? 'rgba(255,255,255,0.08)' : 'transparent',
              border: `1px solid ${tab === t ? 'rgba(255,255,255,0.15)' : 'transparent'}`,
              color: tab === t ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {!loaded && (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--glass)' }} />
          ))}
        </div>
      )}

      {/* ==================== OVERVIEW ==================== */}
      {loaded && tab === 'overview' && (
        <div>
          {/* Stat cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Budget', value: fmt(totalBudget), color: 'rgba(255,255,255,0.6)' },
              { label: 'Total Spent', value: fmt(totalSpent), color: totalSpent > totalBudget * 0.9 ? '#FF6B6B' : '#15AD70' },
              { label: 'Total Invoiced', value: fmt(totalInvoiced), color: '#7193ED' },
              { label: 'Outstanding', value: fmt(outstanding), color: outstanding > 0 ? '#F7C700' : 'rgba(255,255,255,0.3)' },
            ].map(stat => (
              <div key={stat.label} className="glass-deep px-5 py-5 rounded-2xl">
                <p className="text-xs font-light mb-2" style={{ color: 'var(--text-3)' }}>{stat.label}</p>
                <p className="text-2xl font-light tabular-nums" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Budget utilization bars */}
          <div className="glass-deep rounded-2xl p-6 mb-6">
            <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>BUDGET UTILIZATION</p>
            {budgets.length === 0 ? (
              <p className="text-xs font-light py-6 text-center" style={{ color: 'var(--text-3)' }}>No budgets created yet</p>
            ) : (
              <div className="space-y-3">
                {budgets.map(b => {
                  const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
                  return (
                    <div key={b.id}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{b.name}</span>
                        <span className="text-xs font-light tabular-nums" style={{ color: 'var(--text-3)' }}>
                          {fmt(b.spent)} / {fmt(b.amount)}
                        </span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: utilizationColor(pct),
                            opacity: 0.7,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Monthly expense trend */}
            <div className="glass-deep rounded-2xl p-6">
              <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>MONTHLY EXPENSES</p>
              <div className="flex items-end gap-2 h-32">
                {monthlyData.map(m => (
                  <div key={m.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-light tabular-nums" style={{ color: 'var(--text-3)' }}>
                      {m.total > 0 ? fmt(m.total) : ''}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                      <div
                        className="w-full max-w-[32px] rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max((m.total / maxMonthly) * 80, 2)}px`,
                          background: 'rgba(113,147,237,0.4)',
                          border: '1px solid rgba(113,147,237,0.2)',
                        }}
                      />
                    </div>
                    <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent expenses */}
            <div className="glass-deep rounded-2xl p-6">
              <p className="text-xs tracking-[0.12em] mb-4" style={{ color: 'var(--text-3)' }}>RECENT EXPENSES</p>
              {expenses.length === 0 ? (
                <p className="text-xs font-light py-4 text-center" style={{ color: 'var(--text-3)' }}>No expenses yet</p>
              ) : (
                <div className="space-y-2">
                  {expenses.slice(0, 10).map(e => (
                    <div key={e.id} className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>{e.description}</span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{
                            background: statusColor(e.status).bg,
                            border: `1px solid ${statusColor(e.status).border}`,
                            color: statusColor(e.status).text,
                          }}
                        >
                          {e.status}
                        </span>
                      </div>
                      <span className="text-xs font-light tabular-nums flex-shrink-0 ml-2" style={{ color: 'var(--text-2)' }}>
                        {fmt(e.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Overdue invoices */}
          {overdueInvoices.length > 0 && (
            <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(255,107,107,0.04)', border: '1px solid rgba(255,107,107,0.15)' }}>
              <p className="text-xs font-light mb-3" style={{ color: '#FF6B6B' }}>
                {overdueInvoices.length} overdue invoice{overdueInvoices.length !== 1 ? 's' : ''}
              </p>
              <div className="space-y-2">
                {overdueInvoices.map(inv => (
                  <div key={inv.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-light" style={{ color: 'var(--text-2)' }}>{inv.number}</span>
                      <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>{inv.clientName}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-light tabular-nums" style={{ color: '#FF6B6B' }}>{fmt(inv.total)}</span>
                      <span className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>
                        Due {new Date(inv.dueDate!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== BUDGETS ==================== */}
      {loaded && tab === 'budgets' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>BUDGETS</p>
            <button
              onClick={() => setShowBudgetForm(!showBudgetForm)}
              className="text-xs font-light px-4 py-2 rounded-full transition-all"
              style={{
                background: 'rgba(21,173,112,0.08)',
                border: '1px solid rgba(21,173,112,0.2)',
                color: '#15AD70',
              }}
            >
              {showBudgetForm ? 'Cancel' : 'Create budget'}
            </button>
          </div>

          {/* Budget create form */}
          {showBudgetForm && (
            <form onSubmit={createBudget} className="glass-deep rounded-2xl p-6 mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Name</label>
                  <input name="name" required style={inputStyle} placeholder="Q2 Marketing" />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Amount</label>
                  <input name="amount" type="number" step="0.01" required style={inputStyle} placeholder="10000" />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Category</label>
                  <select name="category" style={selectStyle}>
                    {BUDGET_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Period</label>
                  <select name="period" style={selectStyle}>
                    {BUDGET_PERIODS.map(p => <option key={p} value={p} className="bg-[#111]">{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Start date</label>
                  <input name="startDate" type="date" required style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>End date</label>
                  <input name="endDate" type="date" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Environment</label>
                  <select name="environmentId" required style={selectStyle}>
                    <option value="" className="bg-[#111]">Select...</option>
                    {envs.map(env => <option key={env.id} value={env.id} className="bg-[#111]">{env.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Currency</label>
                  <input name="currency" defaultValue="USD" style={inputStyle} />
                </div>
              </div>
              <button
                type="submit"
                className="text-xs font-light px-5 py-2 rounded-full transition-all"
                style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.3)', color: '#15AD70' }}
              >
                Create
              </button>
            </form>
          )}

          {/* Budget cards */}
          {budgets.length === 0 && !showBudgetForm ? (
            <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1px dashed var(--glass-border)' }}>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No budgets yet</p>
              <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Create a budget to start tracking spending</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {budgets.map(b => {
                const pct = b.amount > 0 ? Math.min((b.spent / b.amount) * 100, 100) : 0;
                const remaining = b.amount - b.spent;
                const isSelected = selectedBudget === b.id;
                return (
                  <div key={b.id}>
                    <button
                      onClick={() => setSelectedBudget(isSelected ? null : b.id)}
                      className="glass-deep rounded-2xl p-5 w-full text-left transition-all"
                      style={isSelected ? { border: '1px solid rgba(255,255,255,0.15)' } : {}}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="text-sm font-light" style={{ color: 'var(--text-1)' }}>{b.name}</p>
                          <p className="text-[10px] font-light mt-0.5" style={{ color: 'var(--text-3)' }}>
                            {b.category} / {b.period}
                          </p>
                        </div>
                        <button
                          onClick={(ev) => { ev.stopPropagation(); deleteBudget(b.id); }}
                          className="text-[10px] font-light px-2 py-1 rounded transition-all hover:bg-red-500/10"
                          style={{ color: 'var(--text-3)' }}
                        >
                          Delete
                        </button>
                      </div>
                      <div className="flex items-baseline gap-2 mb-3">
                        <span className="text-xl font-light tabular-nums" style={{ color: utilizationColor(pct) }}>
                          {fmt(b.spent)}
                        </span>
                        <span className="text-xs font-light" style={{ color: 'var(--text-3)' }}>
                          of {fmt(b.amount)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'rgba(255,255,255,0.05)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: utilizationColor(pct), opacity: 0.7 }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-light tabular-nums" style={{ color: 'var(--text-3)' }}>
                          {pct.toFixed(0)}% used
                        </span>
                        <span className="text-[10px] font-light tabular-nums" style={{ color: remaining >= 0 ? 'var(--text-3)' : '#FF6B6B' }}>
                          {remaining >= 0 ? `${fmt(remaining)} remaining` : `${fmt(Math.abs(remaining))} over budget`}
                        </span>
                      </div>
                    </button>

                    {/* Budget detail - expense list */}
                    {isSelected && (
                      <BudgetDetail budgetId={b.id} onClose={() => setSelectedBudget(null)} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== EXPENSES ==================== */}
      {loaded && tab === 'expenses' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <p className="text-xs tracking-[0.12em] mr-4" style={{ color: 'var(--text-3)' }}>EXPENSES</p>
              <select
                value={expenseStatusFilter}
                onChange={e => setExpenseStatusFilter(e.target.value)}
                className="text-[11px] font-light rounded-full px-3 py-1"
                style={{ ...selectStyle, width: 'auto', borderRadius: '9999px', padding: '4px 28px 4px 12px' }}
              >
                <option value="" className="bg-[#111]">All statuses</option>
                {['pending', 'approved', 'rejected', 'paid'].map(s => (
                  <option key={s} value={s} className="bg-[#111]">{s}</option>
                ))}
              </select>
              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="text-[11px] font-light rounded-full px-3 py-1"
                style={{ ...selectStyle, width: 'auto', borderRadius: '9999px', padding: '4px 28px 4px 12px' }}
              >
                <option value="" className="bg-[#111]">All categories</option>
                {EXPENSE_CATEGORIES.map(c => (
                  <option key={c} value={c} className="bg-[#111]">{c}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => setShowExpenseForm(!showExpenseForm)}
              className="text-xs font-light px-4 py-2 rounded-full transition-all"
              style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.2)', color: '#15AD70' }}
            >
              {showExpenseForm ? 'Cancel' : 'Add expense'}
            </button>
          </div>

          {/* Expense form */}
          {showExpenseForm && (
            <form onSubmit={createExpense} className="glass-deep rounded-2xl p-6 mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Description</label>
                  <input name="description" required style={inputStyle} placeholder="AWS hosting" />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Amount</label>
                  <input name="amount" type="number" step="0.01" required style={inputStyle} placeholder="299.99" />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Category</label>
                  <select name="category" style={selectStyle}>
                    {EXPENSE_CATEGORIES.map(c => <option key={c} value={c} className="bg-[#111]">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Vendor</label>
                  <input name="vendor" style={inputStyle} placeholder="Amazon Web Services" />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Date</label>
                  <input name="date" type="date" style={inputStyle} defaultValue={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Budget</label>
                  <select name="budgetId" style={selectStyle}>
                    <option value="" className="bg-[#111]">No budget</option>
                    {budgets.map(b => <option key={b.id} value={b.id} className="bg-[#111]">{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Notes</label>
                <input name="notes" style={inputStyle} placeholder="Optional notes" />
              </div>
              <button
                type="submit"
                className="text-xs font-light px-5 py-2 rounded-full transition-all"
                style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.3)', color: '#15AD70' }}
              >
                Add
              </button>
            </form>
          )}

          {/* Expenses table */}
          {filteredExpenses.length === 0 ? (
            <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1px dashed var(--glass-border)' }}>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No expenses</p>
              <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Add an expense to get started</p>
            </div>
          ) : (
            <div className="glass-deep rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-[100px_1fr_100px_100px_100px_100px_120px_120px] gap-2 px-5 py-3"
                style={{ borderBottom: '1px solid var(--glass-border)' }}>
                {['Date', 'Description', 'Amount', 'Category', 'Vendor', 'Status', 'Budget', 'Actions'].map(h => (
                  <span key={h} className="text-[10px] font-light tracking-wider" style={{ color: 'var(--text-3)' }}>{h}</span>
                ))}
              </div>
              {filteredExpenses.map(e => {
                const sc = statusColor(e.status);
                return (
                  <div
                    key={e.id}
                    className="grid grid-cols-[100px_1fr_100px_100px_100px_100px_120px_120px] gap-2 px-5 py-3 items-center transition-all hover:bg-white/[0.02]"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                  >
                    <span className="text-xs font-light tabular-nums" style={{ color: 'var(--text-3)' }}>
                      {new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>{e.description}</span>
                    <span className="text-xs font-light tabular-nums" style={{ color: 'var(--text-1)' }}>{fmt(e.amount)}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-center w-fit"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-3)' }}
                    >
                      {e.category}
                    </span>
                    <span className="text-xs font-light truncate" style={{ color: 'var(--text-3)' }}>{e.vendor || '-'}</span>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full text-center w-fit"
                      style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                    >
                      {e.status}
                    </span>
                    <span className="text-xs font-light truncate" style={{ color: 'var(--text-3)' }}>
                      {e.budget?.name || '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      {e.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateExpenseStatus(e.id, 'approved')}
                            className="text-[10px] font-light px-2 py-0.5 rounded-full transition-all"
                            style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.2)', color: '#15AD70' }}
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateExpenseStatus(e.id, 'rejected')}
                            className="text-[10px] font-light px-2 py-0.5 rounded-full transition-all"
                            style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.2)', color: '#FF6B6B' }}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteExpense(e.id)}
                        className="text-[10px] font-light px-2 py-0.5 rounded-full transition-all hover:bg-red-500/10"
                        style={{ color: 'var(--text-3)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ==================== INVOICES ==================== */}
      {loaded && tab === 'invoices' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <p className="text-xs tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>INVOICES</p>
            <button
              onClick={() => setShowInvoiceForm(!showInvoiceForm)}
              className="text-xs font-light px-4 py-2 rounded-full transition-all"
              style={{ background: 'rgba(21,173,112,0.08)', border: '1px solid rgba(21,173,112,0.2)', color: '#15AD70' }}
            >
              {showInvoiceForm ? 'Cancel' : 'Create invoice'}
            </button>
          </div>

          {/* Invoice form */}
          {showInvoiceForm && (
            <form onSubmit={createInvoice} className="glass-deep rounded-2xl p-6 mb-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Client name</label>
                  <input name="clientName" required style={inputStyle} placeholder="Acme Corp" />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Client email</label>
                  <input name="clientEmail" type="email" style={inputStyle} placeholder="billing@acme.com" />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Due date</label>
                  <input name="dueDate" type="date" style={inputStyle} />
                </div>
                <div>
                  <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Environment</label>
                  <select name="environmentId" required style={selectStyle}>
                    <option value="" className="bg-[#111]">Select...</option>
                    {envs.map(env => <option key={env.id} value={env.id} className="bg-[#111]">{env.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Line items */}
              <div>
                <label className="text-[11px] font-light mb-2 block" style={{ color: 'var(--text-3)' }}>Line items</label>
                <div className="space-y-2">
                  {invoiceItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_80px_100px_100px_32px] gap-2 items-center">
                      <input
                        value={item.description}
                        onChange={e => updateLineItem(idx, 'description', e.target.value)}
                        style={inputStyle}
                        placeholder="Description"
                      />
                      <input
                        type="number"
                        value={item.quantity || ''}
                        onChange={e => updateLineItem(idx, 'quantity', e.target.value)}
                        style={inputStyle}
                        placeholder="Qty"
                      />
                      <input
                        type="number"
                        step="0.01"
                        value={item.unitPrice || ''}
                        onChange={e => updateLineItem(idx, 'unitPrice', e.target.value)}
                        style={inputStyle}
                        placeholder="Unit price"
                      />
                      <span className="text-xs font-light tabular-nums text-right" style={{ color: 'var(--text-2)' }}>
                        {fmt(item.amount)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setInvoiceItems(prev => prev.filter((_, i) => i !== idx))}
                        className="text-xs font-light rounded transition-all hover:bg-red-500/10 h-8 w-8 flex items-center justify-center"
                        style={{ color: 'var(--text-3)' }}
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setInvoiceItems(prev => [...prev, { description: '', quantity: 1, unitPrice: 0, amount: 0 }])}
                  className="text-[11px] font-light mt-2 px-3 py-1 rounded-full transition-all"
                  style={{ color: 'var(--text-3)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  + Add line
                </button>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-xs font-light">
                    <span style={{ color: 'var(--text-3)' }}>Subtotal</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-2)' }}>
                      {fmt(invoiceItems.reduce((s, it) => s + it.amount, 0))}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-light gap-2">
                    <span style={{ color: 'var(--text-3)' }}>Tax %</span>
                    <input
                      type="number"
                      step="0.1"
                      value={invoiceTaxPct || ''}
                      onChange={e => setInvoiceTaxPct(Number(e.target.value) || 0)}
                      className="w-16 text-right"
                      style={{ ...inputStyle, width: '64px', padding: '4px 8px' }}
                    />
                  </div>
                  <div className="flex justify-between text-xs font-light pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <span style={{ color: 'var(--text-2)' }}>Total</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-1)' }}>
                      {fmt(invoiceItems.reduce((s, it) => s + it.amount, 0) * (1 + invoiceTaxPct / 100))}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-light mb-1 block" style={{ color: 'var(--text-3)' }}>Notes</label>
                <input name="notes" style={inputStyle} placeholder="Payment terms, thank you message, etc." />
              </div>

              <button
                type="submit"
                className="text-xs font-light px-5 py-2 rounded-full transition-all"
                style={{ background: 'rgba(21,173,112,0.1)', border: '1px solid rgba(21,173,112,0.3)', color: '#15AD70' }}
              >
                Create invoice
              </button>
            </form>
          )}

          {/* Invoice list */}
          {invoices.length === 0 && !showInvoiceForm ? (
            <div className="flex flex-col items-center py-16 rounded-2xl" style={{ border: '1px dashed var(--glass-border)' }}>
              <p className="text-sm font-light mb-1" style={{ color: 'var(--text-2)' }}>No invoices yet</p>
              <p className="text-xs font-light" style={{ color: 'var(--text-3)' }}>Create your first invoice</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map(inv => {
                const sc = statusColor(inv.status);
                const isOverdue = inv.status !== 'paid' && inv.status !== 'cancelled' && inv.dueDate && new Date(inv.dueDate) < new Date();
                return (
                  <div
                    key={inv.id}
                    className="glass flex items-center gap-4 px-5 py-4 rounded-2xl transition-all hover:bg-white/[0.02]"
                  >
                    <span className="text-sm font-light tabular-nums w-24" style={{ color: 'var(--text-1)' }}>
                      {inv.number}
                    </span>
                    <span className="text-xs font-light flex-1 truncate" style={{ color: 'var(--text-2)' }}>
                      {inv.clientName}
                    </span>
                    <span className="text-sm font-light tabular-nums" style={{ color: 'var(--text-1)' }}>
                      {fmt(inv.total)}
                    </span>
                    <span
                      className="text-[10px] px-2.5 py-0.5 rounded-full"
                      style={{
                        background: isOverdue ? statusColor('overdue').bg : sc.bg,
                        border: `1px solid ${isOverdue ? statusColor('overdue').border : sc.border}`,
                        color: isOverdue ? statusColor('overdue').text : sc.text,
                        textDecoration: inv.status === 'cancelled' ? 'line-through' : 'none',
                      }}
                    >
                      {isOverdue ? 'overdue' : inv.status}
                    </span>
                    <span className="text-[10px] font-light tabular-nums w-20 text-right" style={{ color: 'var(--text-3)' }}>
                      {new Date(inv.issueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    <span className="text-[10px] font-light tabular-nums w-20 text-right" style={{ color: isOverdue ? '#FF6B6B' : 'var(--text-3)' }}>
                      {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                    </span>
                    <div className="flex items-center gap-1">
                      <a
                        href={`/finance/invoices/${inv.id}`}
                        className="text-[10px] font-light px-2 py-0.5 rounded-full transition-all"
                        style={{ color: '#7193ED', border: '1px solid rgba(113,147,237,0.2)', background: 'rgba(113,147,237,0.06)' }}
                      >
                        View
                      </a>
                      <button
                        onClick={() => deleteInvoice(inv.id)}
                        className="text-[10px] font-light px-2 py-0.5 rounded-full transition-all hover:bg-red-500/10"
                        style={{ color: 'var(--text-3)' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- Budget detail sub-component ---- */
function BudgetDetail({ budgetId, onClose }: { budgetId: string; onClose: () => void }) {
  const [data, setData] = useState<{
    expenses: { id: string; description: string; amount: number; category: string; vendor: string | null; date: string; status: string }[];
  } | null>(null);

  useEffect(() => {
    fetch(`/api/finance/budgets/${budgetId}`)
      .then(r => r.json())
      .then(d => setData(d));
  }, [budgetId]);

  if (!data) {
    return <div className="py-4 text-center text-xs font-light" style={{ color: 'var(--text-3)' }}>Loading...</div>;
  }

  return (
    <div className="glass rounded-2xl p-4 mt-2 mb-2">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] tracking-[0.12em]" style={{ color: 'var(--text-3)' }}>EXPENSES</span>
        <button onClick={onClose} className="text-[10px] font-light" style={{ color: 'var(--text-3)' }}>Close</button>
      </div>
      {data.expenses.length === 0 ? (
        <p className="text-xs font-light py-3 text-center" style={{ color: 'var(--text-3)' }}>No expenses for this budget</p>
      ) : (
        <div className="space-y-1.5">
          {data.expenses.map(e => {
            const sc = statusColor(e.status);
            return (
              <div key={e.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-light truncate" style={{ color: 'var(--text-2)' }}>{e.description}</span>
                  <span
                    className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                    style={{ background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text }}
                  >
                    {e.status}
                  </span>
                </div>
                <span className="text-xs font-light tabular-nums flex-shrink-0 ml-2" style={{ color: 'var(--text-2)' }}>
                  {fmt(e.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
