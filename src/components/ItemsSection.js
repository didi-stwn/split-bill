import { useState } from 'react';
import { Package, Plus, Percent } from 'lucide-react';
import ItemRow from './ItemRow';
import PersonSelect from './PersonSelect';

export default function ItemsSection({ people, items, onAdd, onDelete, onUpdate, onAddPerson, onEditPerson, onRemovePerson, taxPercent, onTaxPercentChange, globalTaxPercent }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitAmong, setSplitAmong] = useState([]);
  const [useCustomTax, setUseCustomTax] = useState(false);
  const [customTaxPercent, setCustomTaxPercent] = useState('');
  const [newPersonName, setNewPersonName] = useState('');

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
    if (!desc.trim() || isNaN(amt) || amt <= 0 || !paidBy || splitAmong.length === 0) return;
    onAdd({
      description: desc.trim(),
      amount: amt,
      paidBy,
      splitAmong,
      useCustomTax,
      customTaxPercent: useCustomTax ? (parseFloat(customTaxPercent) || 0) : 0,
    });
    setDesc('');
    setAmount('');
    setPaidBy('');
    setSplitAmong([]);
    setUseCustomTax(false);
    setCustomTaxPercent('');
  };

  const isValid = desc.trim() && parseFloat(amount) > 0 && paidBy && splitAmong.length > 0;

  const calcTotalWithTax = (amt, pct) => amt * (1 + (pct || 0) / 100);
  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  let globalTaxAmount = 0;
  let customTaxAmount = 0;
  items.forEach((item) => {
    if (item.useCustomTax) {
      customTaxAmount += calcTotalWithTax(item.amount, item.customTaxPercent ?? 0) - item.amount;
    } else {
      globalTaxAmount += calcTotalWithTax(item.amount, taxPercent) - item.amount;
    }
  });
  const totalTaxAmount = globalTaxAmount + customTaxAmount;
  const grandTotal = subtotal + totalTaxAmount;

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <Package size={20} /> Items
        </h2>
        <span className="card-badge">
          {items.length} item{items.length !== 1 && 's'}
          · Rp {subtotal.toLocaleString('id-ID')}
        </span>
      </div>

      {/* ── Add Item Form ── */}
      <details className="add-item-details">
        <summary className="add-item-summary">
          <Plus size={16} /> Add Item
        </summary>
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
            {/* Custom tax checkbox + input */}
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

          <div className="form-group" style={{ marginBottom: 10 }}>
            <label>Paid by</label>
            <PersonSelect
              value={paidBy}
              onChange={setPaidBy}
              people={people}
              onAddPerson={onAddPerson}
              onEditPerson={onEditPerson}
              onRemovePerson={onRemovePerson}
            />
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
                {people.length === 0 && <span className="muted">Add people first</span>}
              </div>
            </div>
            <div className="form-group" style={{ maxWidth: 160, flexShrink: 0 }}>
              <label>&nbsp;</label>
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

          <button type="submit" className="btn btn-primary btn-block" disabled={!isValid}>
            <Plus size={16} /> Add Item
          </button>
        </form>
      </details>

      {/* ── Items List ── */}
      {items.length === 0 ? (
        <div className="empty-state" style={{ marginTop: 12 }}>
          <Package size={36} />
          <p>No items yet. Add one above or scan a receipt.</p>
        </div>
      ) : (
        <div style={{ marginTop: 16 }}>
          {items.map((item) => (
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
            />
          ))}

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
            {customTaxAmount !== 0 && (
              <div className="tax-row">
                <span>Other Tax (custom overrides)</span>
                <span>Rp {customTaxAmount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="tax-row tax-total">
              <span>Grand Total</span>
              <span>Rp {grandTotal.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
