import { useMemo } from 'react';
import { DollarSign, ArrowRight, CheckCircle2 } from 'lucide-react';

function computeSettlements(items, people) {
  const balances = {};
  people.forEach((p) => (balances[p.id] = 0));

  items.forEach((item) => {
    const share = item.amount / item.splitAmong.length;
    balances[item.paidBy] += item.amount;
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

export default function SummarySection({ items, people }) {
  const settlements = useMemo(() => computeSettlements(items, people), [items, people]);
  const total = items.reduce((s, i) => s + i.amount, 0);
  const getPersonName = (id) => people.find((p) => p.id === id)?.name || 'Unknown';

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title"><DollarSign size={20} /> Summary</h2>
      </div>

      <div className="summary-stats">
        <div className="stat-card">
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{items.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">People</div>
          <div className="stat-value">{people.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Cost</div>
          <div className="stat-value">Rp {total.toLocaleString('id-ID')}</div>
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
      ) : items.length > 0 && settlements.length <= 0 ? (
        <div className="settlement-settled">
          <CheckCircle2 size={28} />
          <span>All settled up!</span>
        </div>
      ) : null}
    </div>
  );
}
