import { useMemo, useState } from 'react';
import { DollarSign, ArrowRight, CheckCircle2, Percent, CheckSquare, Square, Tag } from 'lucide-react';

export function calcTotalWithTax(amount, taxPercent) {
  return amount * (1 + (taxPercent || 0) / 100);
}

// Apply tax on the original amount, then apply discount separately (fixed amount, split proportionally)
export function applyDiscountAndTax(itemAmount, bill, effectiveTax, billSubtotal) {
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

export function computeSettlements(items, people, bills) {
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
    // Tax priority: Item override > Bill (required)
    const bill = bills?.find((b) => b.id === item.billId);
    let effectiveTax;
    if (item.useCustomTax) {
      effectiveTax = item.customTaxPercent ?? 0;
    } else if (bill) {
      effectiveTax = bill.billTaxPercent ?? 0;
    } else {
      effectiveTax = 0;
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

export default function SummarySection({ items, people, bills = [] }) {
  const settlements = useMemo(() => computeSettlements(items, people, bills), [items, people, bills]);
  const [checkedSettlements, setCheckedSettlements] = useState(() => ({}));

  const getPersonName = (id) => people.find((p) => p.id === id)?.name || 'Unknown';


  // Compute per-person balances with per-bill breakdown
  const balanceDetails = useMemo(() => {
    // Pre-compute bill subtotals for proportional discount splitting
    const billSubtotals = {};
    items.forEach((item) => {
      if (item.billId) {
        billSubtotals[item.billId] = (billSubtotals[item.billId] || 0) + item.amount;
      }
    });

    // For each person: totalPaid (what they paid), totalAmount (their share of everything),
    // plus per-bill breakdown of their share amounts
    const personData = {};
    people.forEach((p) => {
      personData[p.id] = {
        totalPaid: 0,
        totalAmount: 0,
        billDetails: {}, // { billId: shareAmount }
      };
    });

    items.forEach((item) => {
      const bill = bills?.find((b) => b.id === item.billId);
      let effectiveTax;
      if (item.useCustomTax) {
        effectiveTax = item.customTaxPercent ?? 0;
      } else if (bill) {
        effectiveTax = bill.billTaxPercent ?? 0;
      } else {
        effectiveTax = 0;
      }
      const { total } = applyDiscountAndTax(item.amount, bill, effectiveTax, billSubtotals[item.billId] || 0);
      const share = total / item.splitAmong.length;
      const effectivePaidBy = item.paidBy || bill?.paidBy || '';

      // Track amount paid by the payer (full item total)
      if (effectivePaidBy) {
        personData[effectivePaidBy].totalPaid += total;
      }

      // Track each split member's share, broken down by bill
      item.splitAmong.forEach((id) => {
        personData[id].totalAmount += share;
        if (item.billId) {
          personData[id].billDetails[item.billId] = (personData[id].billDetails[item.billId] || 0) + share;
        }
      });
    });

    return Object.entries(personData).map(([id, data]) => {
      const totalAmount = Math.round(data.totalAmount * 100) / 100;
      const totalPaid = Math.round(data.totalPaid * 100) / 100;
      const balance = Math.round((data.totalPaid - data.totalAmount) * 100) / 100;

      // Attach bill names to the breakdown
      const billBreakdown = Object.entries(data.billDetails)
        .map(([billId, amount]) => ({
          billId,
          billName: bills.find((b) => b.id === billId)?.name || billId,
          amount: Math.round(amount * 100) / 100,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        id,
        name: getPersonName(id),
        totalAmount,
        totalPaid,
        balance,
        billBreakdown,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, people, bills]);

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
      } else if (bill) {
        effectiveTax = bill.billTaxPercent ?? 0;
      } else {
        effectiveTax = 0;
      }
      const { taxAmount, discountAmount: itemDisc } = applyDiscountAndTax(item.amount, bill, effectiveTax, billSubtotals[item.billId] || 0);
      discountAmount += itemDisc;
      if (item.useCustomTax) {
        customTaxAmount += taxAmount;
      } else {
        billTaxAmount += taxAmount;
      }
    });
    return {
      subtotal,
      customTaxAmount,
      billTaxAmount,
      totalTax: customTaxAmount + billTaxAmount,
      discountAmount,
      grandTotal: subtotal + customTaxAmount + billTaxAmount - discountAmount,
    };
  }, [items, bills]);

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
        {balanceDetails.length > 0 && (
          <div className="balance-section">
            <div className="settlements-header">
              <DollarSign size={16} /> Balance Detail
            </div>
            <div className="balance-detail-list">
              {balanceDetails.map((d) => {
                const isPositive = d.balance > 0;
                const isNegative = d.balance < 0;
                const isZero = d.balance === 0;
                let itemClass = 'balance-detail-item';
                if (isPositive) itemClass += ' positive';
                else if (isNegative) itemClass += ' negative';
                else itemClass += ' zero';
                return (
                  <div key={d.id} className={itemClass}>
                    {/* Summary row */}
                    <div className="balance-detail-summary">
                      <span className="balance-detail-name">{d.name}</span>
                      <div className="balance-detail-stats">
                        <span className="balance-detail-stat">
                          <span className="stat-label">Total Paid</span>
                          <span className="stat-value">Rp {d.totalPaid.toLocaleString('id-ID')}</span>
                        </span>
                        <div className='balance-detail-separator' />
                        <span className="balance-detail-stat">
                          <span className="stat-label">Total Amount</span>
                          <span className="stat-value">Rp {d.totalAmount.toLocaleString('id-ID')}</span>
                        </span>
                        <div className='balance-detail-separator' />
                        <span className="balance-detail-result">
                          {isZero ? (
                            <>
                              <span className="stat-value" style={{ color: 'var(--gray-400)' }}>
                                Rp 0
                              </span>
                              <span className="stat-label" style={{ color: 'var(--gray-400)' }}>
                                settled
                              </span>
                            </>
                          ) : (
                            <>
                              <span className={`stat-label ${isPositive ? 'green' : 'red'}`}>
                                {isPositive ? 'gets back' : 'owes'}
                              </span>
                              <span className={`stat-value ${isPositive ? 'green' : 'red'}`}>
                                Rp {Math.abs(d.balance).toLocaleString('id-ID')}
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                    {/* Per-bill breakdown */}
                    {d.billBreakdown.map((bill) => (
                      <div key={bill.billId} className="balance-detail-bill">
                        <span className="bill-name">{bill.billName}</span>
                        <span className="bill-amount">Rp {bill.amount.toLocaleString('id-ID')}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
