import { useMemo, useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, Percent, CheckSquare, Square, Tag } from 'lucide-react';

function calcTotalWithTax(amount, taxPercent) {
  return amount * (1 + (taxPercent || 0) / 100);
}

// Apply tax on the original amount, then apply discount separately (fixed amount, split proportionally)
function applyDiscountAndTax(itemAmount, bill, effectiveTax, billSubtotal) {
  // Tax is always calculated on the original item amount (not discounted)
  const totalWithTax = calcTotalWithTax(itemAmount, effectiveTax);
  const taxAmount = totalWithTax - itemAmount;
  // Discount is a separate reduction (fixed amount, split proportionally)
  let discountAmount = 0;
  if (bill?.useBillDiscount && (bill.billDiscountAmount ?? 0) > 0 && billSubtotal > 0) {
    const ratio = itemAmount / billSubtotal;
    discountAmount = Math.min(ratio * bill.billDiscountAmount, itemAmount);
  }
  // Total = original + tax - discount
  const total = itemAmount + taxAmount - discountAmount;
  return { originalAmount: itemAmount, taxAmount, discountAmount, total };
}

function computeSettlements(items, people, globalTaxPercent, bills) {
  const balances = {};
  people.forEach((p) => (balances[p.id] = 0));

  // Pre-compute bill subtotals for proportional discount splitting
  const billSubtotals = {};
  items.forEach((item) => {
    if (item.billId) {
      billSubtotals[item.billId] = (billSubtotals[item.billId] || 0) + item.amount;
    }
  });

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
    const { total } = applyDiscountAndTax(item.amount, bill, effectiveTax, billSubtotals[item.billId] || 0);
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
    // Pre-compute bill subtotals for proportional discount splitting
    const billSubtotals = {};
    items.forEach((item) => {
      if (item.billId) {
        billSubtotals[item.billId] = (billSubtotals[item.billId] || 0) + item.amount;
      }
    });
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
      const { total } = applyDiscountAndTax(item.amount, bill, effectiveTax, billSubtotals[item.billId] || 0);
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
    let discountAmount = 0;
    // Pre-compute bill subtotals for proportional discount splitting
    const billSubtotals = {};
    items.forEach((item) => {
      if (item.billId) {
        billSubtotals[item.billId] = (billSubtotals[item.billId] || 0) + item.amount;
      }
    });
    items.forEach((item) => {
      subtotal += item.amount;
      const bill = bills.find((b) => b.id === item.billId);
      let effectiveTax;
      if (item.useCustomTax) {
        effectiveTax = item.customTaxPercent ?? 0;
      } else if (bill?.useBillTax) {
        effectiveTax = bill.billTaxPercent ?? 0;
      } else {
        effectiveTax = taxPercent;
      }
      const { taxAmount, discountAmount: itemDisc } = applyDiscountAndTax(item.amount, bill, effectiveTax, billSubtotals[item.billId] || 0);
      discountAmount += itemDisc;
      if (item.useCustomTax) {
        customTaxAmount += taxAmount;
      } else if (bill?.useBillTax && (bill.billTaxPercent ?? 0) > 0) {
        billTaxAmount += taxAmount;
      } else {
        globalTaxAmount += taxAmount;
      }
    });
    return {
      subtotal,
      globalTaxAmount,
      customTaxAmount,
      billTaxAmount,
      totalTax: globalTaxAmount + customTaxAmount + billTaxAmount,
      discountAmount,
      grandTotal: subtotal + globalTaxAmount + customTaxAmount + billTaxAmount - discountAmount,
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
        <div className="stat-card" style={{ background: '#fef2f2', borderColor: 'var(--danger)' }}>
          <div className="stat-label">
            <Percent size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
            Tax
          </div>
          <div className="stat-value" style={{ color: 'var(--danger)' }}>Rp {totals.totalTax.toLocaleString('id-ID')}</div>
        </div>
        <div className="stat-card" style={{ background: '#f0fdf4', borderColor: '#22c55e' }}>
          <div className="stat-label">
            <Tag size={12} style={{ verticalAlign: 'middle', marginRight: 2 }} />
            Discount
          </div>
          <div className="stat-value" style={{ color: '#16a34a' }}>
            -Rp {totals.discountAmount.toLocaleString('id-ID')}
          </div>
        </div>
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
