import { useState, useEffect } from 'react';
import { Package, Plus, Percent, Receipt, Trash2 } from 'lucide-react';
import ItemRow from './ItemRow';
import PersonSelect from './PersonSelect';

// All bill cards use the same grey style like settlement cards
const BILL_STYLE = { bg: 'var(--gray-50)', border: 'var(--gray-200)', header: 'var(--gray-100)' };

export default function ItemsSection({ people, items, onAdd, onDelete, onUpdate, onAddPerson, onEditPerson, onRemovePerson, taxPercent, onTaxPercentChange, globalTaxPercent, bills, onAddBill, onUpdateBill, onDeleteBill }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitAmong, setSplitAmong] = useState([]);
  const [useCustomTax, setUseCustomTax] = useState(false);
  const [customTaxPercent, setCustomTaxPercent] = useState('');
  const [useCustomPaidBy, setUseCustomPaidBy] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [activeBillId, setActiveBillId] = useState(bills[0]?.id || '');

  // When active bill changes, default paidBy to the bill's paidBy
  const activeBill = bills.find((b) => b.id === activeBillId);
  useEffect(() => {
    setUseCustomPaidBy(false);
    setPaidBy('');
  }, [activeBillId]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePerson = (id) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectAllForSplit = () => {
    if (splitAmong.length === people.length) {
      setSplitAmong([]);
    } else {
      setSplitAmong(people.map((p) => p.id));
    }
  };

  const handleAddQuickPerson = () => {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    const newPerson = { id: crypto.randomUUID(), name: trimmed };
    onAddPerson(newPerson);
    setNewPersonName('');
    setSplitAmong((prev) => [...prev, newPerson.id]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!desc.trim() || isNaN(amt) || amt <= 0 || splitAmong.length === 0) return;
    // paidBy override is optional — only store paidBy when override is enabled
    const effectivePaidBy = useCustomPaidBy ? paidBy : (activeBill?.paidBy || '');
    if (!effectivePaidBy) return; // need someone to have paid
    onAdd({
      description: desc.trim(),
      amount: amt,
      // When override is off, store empty string so settlement resolves from bill dynamically
      paidBy: useCustomPaidBy ? paidBy : '',
      splitAmong,
      useCustomTax,
      customTaxPercent: useCustomTax ? (parseFloat(customTaxPercent) || 0) : 0,
      useCustomPaidBy,
      billId: activeBillId,
    });
    setDesc('');
    setAmount('');
    setPaidBy('');
    setSplitAmong([]);
    setUseCustomTax(false);
    setCustomTaxPercent('');
    setUseCustomPaidBy(false);
  };

  // paidBy override is optional — don't require it for validation
  const isValid = desc.trim() && parseFloat(amount) > 0 && splitAmong.length > 0;

  // Calculate totals across all items — priority: Item Tax > Bill Tax > Global Tax
  const calcTotalWithTax = (amt, pct) => amt * (1 + (pct || 0) / 100);
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  let globalTaxAmount = 0;
  // Per-bill tax tracking: { billId: { billTax: 0, customTax: 0 } }
  const billTaxDetail = {};
  bills.forEach((b) => { billTaxDetail[b.id] = { billTax: 0, customTax: 0 }; });
  items.forEach((item) => {
    const bill = bills.find((b) => b.id === item.billId);
    if (item.useCustomTax) {
      // Custom item tax — attribute to its bill
      const tax = calcTotalWithTax(item.amount, item.customTaxPercent ?? 0) - item.amount;
      if (bill) {
        billTaxDetail[bill.id].customTax += tax;
      }
    } else if (bill?.useBillTax && (bill.billTaxPercent ?? 0) > 0) {
      billTaxDetail[bill.id].billTax += calcTotalWithTax(item.amount, bill.billTaxPercent) - item.amount;
    } else {
      globalTaxAmount += calcTotalWithTax(item.amount, taxPercent) - item.amount;
    }
  });
  const billTaxTotal = bills.reduce((s, b) => s + billTaxDetail[b.id].billTax + billTaxDetail[b.id].customTax, 0);
  const totalTaxAmount = globalTaxAmount + billTaxTotal;
  const grandTotal = subtotal + totalTaxAmount;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <Package size={20} /> Bills
        </h2>
        <span className="card-badge">
          {items.length} item{items.length !== 1 && 's'}
          · Rp {subtotal.toLocaleString('id-ID')}
        </span>
      </div>

      {/* ── Bills Loop ── */}
      {bills.map((bill, index) => {
        const billItems = items.filter((i) => i.billId === bill.id);
        const billTotal = billItems.reduce((s, i) => s + i.amount, 0);

        return (
          <div
            key={bill.id}
            className="bill-card"
            style={{
              background: BILL_STYLE.bg,
              borderColor: BILL_STYLE.border,
            }}
          >
            {/* Bill Header */}
            <div className="bill-header" style={{ background: BILL_STYLE.header, borderBottom: `1px solid ${BILL_STYLE.border}` }}>
              <div className="bill-title-row">
                <Receipt size={16} />
                <input
                  className="bill-name-input"
                  type="text"
                  value={bill.name}
                  onChange={(e) => onUpdateBill(bill.id, { name: e.target.value })}
                  placeholder="Bill name"
                />
                <span className="bill-total">Rp {billTotal.toLocaleString('id-ID')}</span>
              </div>

              <div className="bill-meta-row">
                <label className="bill-paidby-label">Paid by</label>
                <PersonSelect
                  value={bill.paidBy}
                  onChange={(paidBy) => onUpdateBill(bill.id, { paidBy })}
                  people={people}
                  onAddPerson={onAddPerson}
                  onEditPerson={onEditPerson}
                  onRemovePerson={onRemovePerson}
                />
                <div className="bill-actions">
                  {bills.length > 1 && (
                    <button
                      className="btn-icon danger"
                      onClick={() => onDeleteBill(bill.id)}
                      title="Delete bill"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Bill-level tax override */}
              <div className="bill-meta-row">
                <label className="bill-paidby-label">Override Bill Tax</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={bill.useBillTax ?? false}
                    onChange={(e) => onUpdateBill(bill.id, { useBillTax: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--gray-300)', borderRadius: 6, overflow: 'hidden', opacity: (bill.useBillTax ?? false) ? 1 : 0.35, transition: 'opacity 0.15s' }}>
                    <input
                      type="number"
                      value={bill.billTaxPercent ?? 0}
                      onChange={(e) => onUpdateBill(bill.id, { billTaxPercent: parseFloat(e.target.value) || 0 })}
                      min="0"
                      max="100"
                      step="0.5"
                      disabled={!bill.useBillTax}
                      style={{ width: 48, border: 'none', borderRadius: 0, textAlign: 'center', padding: '9px 0', background: (bill.useBillTax ?? false) ? 'white' : 'var(--gray-50)' }}
                    />
                    <span style={{ padding: '0 6px', fontSize: '0.78rem', color: 'var(--gray-500)', background: 'var(--gray-50)' }}>%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Items in this bill */}
            {billItems.length === 0 ? (
              <div className="empty-state" style={{ padding: '16px 0' }}>
                <Package size={24} />
                <p>No items in this bill.</p>
              </div>
            ) : (
              <div style={{ padding: '4px 0' }}>
                {billItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    people={people}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onAddPerson={onAddPerson}
                    onEditPerson={onEditPerson}
                    onRemovePerson={onRemovePerson}
                    globalTaxPercent={globalTaxPercent}
                    billPaidBy={bill.paidBy}
                    billTaxPercent={bill.billTaxPercent ?? 0}
                    useBillTax={bill.useBillTax ?? false}
                  />
                ))}
              </div>
            )}

            {/* ── Add Item to this Bill ── */}
            <details className="add-item-details" style={{ border: activeBillId === bill.id ? `1.5px solid ${BILL_STYLE.border}` : undefined }}>
              <summary
                className="add-item-summary"
                onClick={() => setActiveBillId(bill.id)}
                style={{ borderRadius: 6 }}
              >
                <Plus size={16} /> Add item to this bill
              </summary>
              {activeBillId === bill.id && (
                <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Description</label>
                      <input
                        type="text"
                        placeholder="e.g. Pizza, Taxi…"
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ maxWidth: 130 }}>
                      <label>Amount (Rp)</label>
                      <input
                        type="number"
                        placeholder="0"
                        min="0"
                        step="100"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 10 }}>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        Split among
                        {people.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-sm btn-outline"
                            onClick={selectAllForSplit}
                            style={{ padding: '1px 8px', fontSize: '0.7rem' }}
                          >
                            {splitAmong.length === people.length ? 'Deselect All' : 'Select All'}
                          </button>
                        )}
                      </label>
                      <div className="split-checkboxes">
                        {people.map((p) => (
                          <label
                            key={p.id}
                            className={`split-checkbox ${splitAmong.includes(p.id) ? 'selected' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={splitAmong.includes(p.id)}
                              onChange={() => togglePerson(p.id)}
                            />
                            {p.name}
                          </label>
                        ))}
                        <div className="quick-person-row">
                          <input
                            type="text"
                            placeholder="New name…"
                            value={newPersonName}
                            onChange={(e) => setNewPersonName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuickPerson(); }}
                          />
                          <button
                            type="button"
                            className="btn btn-sm btn-primary"
                            onClick={handleAddQuickPerson}
                            disabled={!newPersonName.trim()}
                            title="Add person"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Override paid by</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={useCustomPaidBy}
                          onChange={(e) => {
                            setUseCustomPaidBy(e.target.checked);
                            if (!e.target.checked) setPaidBy('');
                          }}
                          style={{ width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, opacity: useCustomPaidBy ? 1 : 0.35, transition: 'opacity 0.15s' }}>
                          <PersonSelect
                            value={useCustomPaidBy ? paidBy : ''}
                            onChange={setPaidBy}
                            people={people}
                            onAddPerson={onAddPerson}
                            onEditPerson={onEditPerson}
                            onRemovePerson={onRemovePerson}
                            placeholder="—"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="form-group" style={{ maxWidth: 130 }}>
                      <label>Override tax</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="checkbox"
                          checked={useCustomTax}
                          onChange={(e) => setUseCustomTax(e.target.checked)}
                          style={{ width: 16, height: 16, accentColor: 'var(--primary)', flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--gray-300)', borderRadius: 6, overflow: 'hidden', opacity: useCustomTax ? 1 : 0.35, transition: 'opacity 0.15s' }}>
                          <input
                            type="number"
                            value={customTaxPercent}
                            onChange={(e) => setCustomTaxPercent(e.target.value)}
                            min="0"
                            max="100"
                            step="0.5"
                            disabled={!useCustomTax}
                            style={{ width: 48, border: 'none', borderRadius: 0, textAlign: 'center', padding: '9px 0', background: useCustomTax ? 'white' : 'var(--gray-50)' }}
                          />
                          <span style={{ padding: '0 6px', fontSize: '0.78rem', color: 'var(--gray-500)', background: 'var(--gray-50)' }}>%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary btn-block" disabled={!isValid}>
                    <Plus size={16} /> Add Item
                  </button>
                </form>
              )}
            </details>
          </div>
        );
      })}

      {/* ── Add Bill Button ── */}
      <button className="btn btn-outline btn-block" onClick={onAddBill} style={{ marginTop: 12 }}>
        <Plus size={16} /> Add Bill
      </button>

      {/* ── Global Tax Section ── */}
      <div className="tax-section">
        <div className="tax-header">
          <Percent size={16} /> Tax
        </div>
        <div className="tax-row">
          <span>Subtotal</span>
          <span>Rp {subtotal.toLocaleString('id-ID')}</span>
        </div>
        <div className="tax-row">
          <span>Global Tax ({taxPercent}%)</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--gray-300)', borderRadius: 6, overflow: 'hidden' }}>
              <input
                type="number"
                className="tax-input"
                value={taxPercent}
                onChange={(e) => onTaxPercentChange(parseFloat(e.target.value) || 0)}
                min="0"
                max="100"
                step="0.5"
                style={{ width: 50, border: 'none', borderRadius: 0, textAlign: 'center', padding: "9px 0px" }}
              />
              <span style={{ padding: '0 6px', fontSize: '0.82rem', color: 'var(--gray-500)', background: 'var(--gray-50)' }}>%</span>
            </div>
            <span>Rp {globalTaxAmount.toLocaleString('id-ID')}</span>
          </div>
        </div>
        {bills.map((bill) => {
          const detail = billTaxDetail[bill.id];
          const showBill = detail.billTax !== 0;
          const showCustom = detail.customTax !== 0;
          if (!showBill && !showCustom) return null;
          const pct = bill.billTaxPercent ?? 0;
          return (
            <div key={bill.id}>
              {showBill && (
                <div className="tax-row">
                  <span>{bill.name} Tax ({pct}%)</span>
                  <span>Rp {detail.billTax.toLocaleString('id-ID')}</span>
                </div>
              )}
              {showCustom && (
                <div className="tax-row">
                  <span>Other {bill.name} Tax</span>
                  <span>Rp {detail.customTax.toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>
          );
        })}
        <div className="tax-row tax-total">
          <span>Grand Total</span>
          <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
        </div>
      </div>
    </div>
  );
}
