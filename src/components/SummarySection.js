import { useMemo, useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, Percent, CheckSquare, Square } from 'lucide-react';

function calcTotalWithTax(amount, taxPercent) {
  return amount * (1 + (taxPercent || 0) / 100);
}

function computeSettlements(items, people, globalTaxPercent, bills) {
  const balances = {};
  people.forEach((p) => (balances[p.id] = 0));

  items.forEach((item) => {
    // Tax priority: Item override > Bill override > Global
    const bill = bills?.find((b) => b.id === item.billId);
    let effectiveTax;
    if (item.useCustomTax) {
      effectiveTax = item.customTaxPercent ?? 0;
    } else if (bill?.useBillTax) {
      effectiveTax = bill.billTaxPercent ?? 0;
    } else {
      effectiveTax = globalTaxPercent;
    }
    const total = calcTotalWithTax(item.amount, effectiveTax);
    const share = total / item.splitAmong.length;
    // Effective paidBy: item override → bill's paidBy → fallback
    const effectivePaidBy = item.paidBy || bill?.paidBy || '';
    if (!effectivePaidBy) return; // skip items with no payer
    balances[effectivePaidBy] = (balances[effectivePaidBy] || 0) + total;
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

export default function SummarySection({ items, people, taxPercent = 0, bills = [] }) {
  const settlements = useMemo(() => computeSettlements(items, people, taxPercent, bills), [items, people, taxPercent, bills]);
  const [checkedSettlements, setCheckedSettlements] = useState(() => ({}));


  const getPersonName = (id) => people.find((p) => p.id === id)?.name || 'Unknown';

  // Compute per-person balances for the detail breakdown
  const balances = useMemo(() => {
    const bal = {};
    people.forEach((p) => (bal[p.id] = 0));
    items.forEach((item) => {
      const bill = bills?.find((b) => b.id === item.billId);
      let effectiveTax;
      if (item.useCustomTax) {
        effectiveTax = item.customTaxPercent ?? 0;
      } else if (bill?.useBillTax) {
        effectiveTax = bill.billTaxPercent ?? 0;
      } else {
        effectiveTax = taxPercent;
      }
      const total = calcTotalWithTax(item.amount, effectiveTax);
      const share = total / item.splitAmong.length;
      const effectivePaidBy = item.paidBy || bill?.paidBy || '';
      if (effectivePaidBy) {
        bal[effectivePaidBy] = (bal[effectivePaidBy] || 0) + total;
      }
      item.splitAmong.forEach((id) => {
        bal[id] -= share;
      });
    });
    return Object.entries(bal).map(([id, balance]) => ({
      id,
      name: getPersonName(id),
      balance: Math.round(balance * 100) / 100,
    })).sort((a, b) => b.balance - a.balance);
  }, [items, people, taxPercent, bills]);

  const toggleSettlementCheck = (idx) => {
    setCheckedSettlements((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const sortedSettlements = useMemo(() => {
    if (!settlements.length) return settlements;
    const getName = (id) => people.find((p) => p.id === id)?.name || 'Unknown';
    return [...settlements].sort((a, b) => {
      const aIdx = settlements.indexOf(a);
      const bIdx = settlements.indexOf(b);
      const aChecked = checkedSettlements[aIdx] ?? false;
      const bChecked = checkedSettlements[bIdx] ?? false;
      if (aChecked !== bChecked) return aChecked ? 1 : -1;
      return getName(a.from).localeCompare(getName(b.from));
    });
  }, [settlements, checkedSettlements, people]);

  const totals = useMemo(() => {
    let subtotal = 0;
    let globalTaxAmount = 0;
    let customTaxAmount = 0;
    let billTaxAmount = 0;
    items.forEach((item) => {
      subtotal += item.amount;
      if (item.useCustomTax) {
        customTaxAmount += calcTotalWithTax(item.amount, item.customTaxPercent ?? 0) - item.amount;
      } else {
        const bill = bills.find((b) => b.id === item.billId);
        if (bill?.useBillTax && (bill.billTaxPercent ?? 0) > 0) {
          billTaxAmount += calcTotalWithTax(item.amount, bill.billTaxPercent) - item.amount;
        } else {
          globalTaxAmount += calcTotalWithTax(item.amount, taxPercent) - item.amount;
        }
      }
    });
    return {
      subtotal,
      globalTaxAmount,
      customTaxAmount,
      billTaxAmount,
      totalTax: globalTaxAmount + customTaxAmount + billTaxAmount,
      grandTotal: subtotal + globalTaxAmount + customTaxAmount + billTaxAmount,
    };
  }, [items, taxPercent, bills]);

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
      </div>

      <div className="settlements-section">
        <div className="settlements-header">
          <ArrowRight size={16} /> Settlements {settlements.length > 0 && `(${settlements.length})`}
        </div>

        {settlements.length > 0 ? (
          <ul className="settlement-list">
            {sortedSettlements.map((s, idx) => {
              const originalIdx = settlements.indexOf(s);
              const isChecked = checkedSettlements[originalIdx] ?? false;
              return (
                <li key={originalIdx} className={`settlement-item${isChecked ? ' checked' : ''}`}>
                  <button
                    className="settlement-check"
                    onClick={() => toggleSettlementCheck(originalIdx)}
                    title={isChecked ? 'Mark as pending' : 'Mark as settled'}
                  >
                    {isChecked ? <CheckSquare size={18} /> : <Square size={18} />}
                  </button>
                  <span className="settlement-from">{getPersonName(s.from)}</span>
                  <ArrowRight size={14} className="settlement-arrow" />
                  <span className="settlement-to">{getPersonName(s.to)}</span>
                  <span className="settlement-amount">Rp {s.amount.toLocaleString('id-ID')}</span>
                </li>
              );
            })}
          </ul>
        ) : items.length > 0 ? (
          <div className="settlement-settled">
            <CheckCircle2 size={24} />
            <span>All settled up!</span>
          </div>
        ) : null}

        {/* ── Balance Detail ── */}
        {
          balances.filter(b => b.balance !== 0).length > 0 && (
            <div className="balance-section">
              <div className="settlements-header">
                <DollarSign size={16} /> Balance Detail
              </div>
              <div className="balance-list">
                {balances.filter(b => b.balance !== 0).map((b) => {
                  const isPositive = b.balance > 0;
                  const isNegative = b.balance < 0;
                  return (
                    <div key={b.id} className={`balance-item ${isPositive ? 'positive' : isNegative ? 'negative' : 'zero'}`}>
                      <span className="balance-name">{b.name}</span>
                      <span className="balance-value">
                        {isPositive ? '+' : ''}Rp {Math.abs(b.balance).toLocaleString('id-ID')}
                      </span>
                      <span className="balance-label">
                        {isPositive ? 'gets back' : isNegative ? 'owes' : 'settled'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        }

      </div>
    </div>
  );
}
