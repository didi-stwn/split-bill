import { useMemo } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, Percent } from 'lucide-react';

function calcTotalWithTax(amount, taxPercent) {
  return amount * (1 + (taxPercent || 0) / 100);
}

function computeSettlements(items, people, taxPercent) {
  const balances = {};
  people.forEach((p) => (balances[p.id] = 0));

  items.forEach((item) => {
    const total = calcTotalWithTax(item.amount, taxPercent);
    const share = total / item.splitAmong.length;
    balances[item.paidBy] += total;
    item.splitAmong.forEach((id) => {
      balances[id] -= share;
    });
  });

  const creditors = [];
  const debtors = [];

  Object.entries(balances).forEach(([id, balance]) => {
    if (balance > 0.01) creditors.push({ id, balance });
    else if (balance < -0.01) debtors.push({ id, balance: -balance });
  });

  creditors.sort((a, b) => b.balance - a.balance);
  debtors.sort((a, b) => b.balance - a.balance);

  const settlements = [];
  let i = 0, j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].balance, creditors[j].balance);
    settlements.push({
      from: debtors[i].id,
      to: creditors[j].id,
      amount: Math.round(amount * 100) / 100,
    });
    debtors[i].balance -= amount;
    creditors[j].balance -= amount;
    if (debtors[i].balance < 0.01) i++;
    if (creditors[j].balance < 0.01) j++;
  }

  return settlements;
}

export default function SummarySection({ items, people, taxPercent = 0 }) {
  const settlements = useMemo(() => computeSettlements(items, people, taxPercent), [items, people, taxPercent]);

  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.amount, 0);
    const grandTotal = calcTotalWithTax(subtotal, taxPercent);
    const totalTax = grandTotal - subtotal;
    return { subtotal, totalTax, grandTotal };
  }, [items, taxPercent]);

  const getPersonName = (id) => people.find((p) => p.id === id)?.name || 'Unknown';

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title"><DollarSign size={20} /> Summary</h2>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Items</div>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">People</div>
          <div className="stat-value">{people.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Subtotal</div>
          <div className="stat-value">Rp {totals.subtotal.toLocaleString('id-ID')}</div>
        </div>
        {totals.totalTax > 0 && (
          <div className="stat-card">
            <div className="stat-label">
              <Percent size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
              Tax
            </div>
            <div className="stat-value">Rp {totals.totalTax.toLocaleString('id-ID')}</div>
          </div>
        )}
        <div className="stat-card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary)' }}>
          <div className="stat-label">Total</div>
          <div className="stat-value" style={{ color: 'var(--primary)' }}>
            Rp {totals.grandTotal.toLocaleString('id-ID')}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Settlements</div>
          <div className="stat-value">{settlements.length}</div>
        </div>
      </div>

      {settlements.length > 0 ? (
        <ul className="settlement-list">
          {settlements.map((s, idx) => (
            <li key={idx} className="settlement-item">
              <span className="settlement-from">{getPersonName(s.from)}</span>
              <ArrowRight size={16} className="settlement-arrow" />
              <span className="settlement-to">{getPersonName(s.to)}</span>
              <span className="settlement-amount">Rp {s.amount.toLocaleString('id-ID')}</span>
            </li>
          ))}
        </ul>
      ) : items.length > 0 ? (
        <div className="settlement-settled">
          <CheckCircle2 size={28} />
          <span>All settled up!</span>
        </div>
      ) : null}
    </div>
  );
}
