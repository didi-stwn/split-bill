import { useState } from 'react';
import { Trash2, Pencil, Check, X, ReceiptText, Plus } from 'lucide-react';
import PersonSelect from './PersonSelect';

export default function ItemRow({ item, people, onDelete, onUpdate, onAddPerson, onEditPerson, onRemovePerson, billPaidBy = '', billTaxPercent = 0 }) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [amount, setAmount] = useState(String(item.amount));
  const [paidBy, setPaidBy] = useState(item.paidBy);
  const [splitAmong, setSplitAmong] = useState([...item.splitAmong]);
  const [useCustomTax, setUseCustomTax] = useState(item.useCustomTax ?? false);
  const [customTaxPercent, setCustomTaxPercent] = useState(String(item.customTaxPercent ?? 0));
  const [useCustomPaidBy, setUseCustomPaidBy] = useState(item.useCustomPaidBy ?? false);
  const [newPersonName, setNewPersonName] = useState('');

  const calcTaxAmount = (amt, pct) => amt * (pct || 0) / 100;

  const getPersonName = (id) => people.find((p) => p.id === id)?.name || 'Unknown';

  const toggleSplit = (id) => {
    setSplitAmong((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleAddQuickPerson = () => {
    const trimmed = newPersonName.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    const newPerson = { id: crypto.randomUUID(), name: trimmed };
    onAddPerson(newPerson);
    setNewPersonName('');
    setSplitAmong((prev) => [...prev, newPerson.id]);
    if (!paidBy) setPaidBy(newPerson.id);
  };

  const save = () => {
    const amt = parseFloat(amount);
    const taxPct = parseFloat(customTaxPercent) || 0;
    if (!desc.trim() || isNaN(amt) || amt <= 0 || splitAmong.length === 0) return;
    // paidBy override is optional — only store paidBy when override is enabled
    // When disabled, paidBy is empty so settlement resolves dynamically from bill
    onUpdate(item.id, {
      ...item,
      description: desc.trim(),
      amount: amt,
      paidBy: useCustomPaidBy ? paidBy : '',
      splitAmong,
      useCustomTax,
      customTaxPercent: useCustomTax ? taxPct : 0,
      useCustomPaidBy,
    });
    setEditing(false);
  };

  const cancel = () => {
    setDesc(item.description);
    setAmount(String(item.amount));
    setPaidBy(item.paidBy);
    setSplitAmong([...item.splitAmong]);
    setUseCustomTax(item.useCustomTax ?? false);
    setCustomTaxPercent(String(item.customTaxPercent ?? 0));
    setUseCustomPaidBy(item.useCustomPaidBy ?? false);
    setEditing(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') save();
    if (e.key === 'Escape') cancel();
  };

  const splitLabel =
    item.splitAmong.length > 2
      ? `${item.splitAmong.length} people`
      : item.splitAmong.map((id) => getPersonName(id)).join(' & ');

  return (
    <div className="item-row">
      <div className={`item-icon ${editing ? 'top' : ''}`}>
        <ReceiptText size={16} />
      </div>
      <div className="item-body">
        {editing ? (
          <div className="item-edit-full">
            {/* Row 1: Description, Amount */}
            <div className="form-row" style={{ marginBottom: 6 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Description</label>
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={handleKey} autoFocus />
              </div>
              <div className="form-group" style={{ maxWidth: 110 }}>
                <label>Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={handleKey} min="0" step="1" />
              </div>
            </div>

            {/* Row 3: Split among + quick-add */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label>Split among</label>
                <div className="split-checkboxes">
                  {people.map((p) => (
                    <label key={p.id} className={`split-checkbox ${splitAmong.includes(p.id) ? 'selected' : ''}`}>
                      <input type="checkbox" checked={splitAmong.includes(p.id)} onChange={() => toggleSplit(p.id)} />
                      {p.name}
                    </label>
                  ))}
                  <div className="quick-person-row">
                    <input type="text" placeholder="New name…" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuickPerson(); }} />
                    <button type="button" className="btn btn-sm btn-primary" onClick={handleAddQuickPerson} disabled={!newPersonName.trim()}><Plus size={14} /></button>
                  </div>
                </div>
              </div>
            </div>

            {/* Row 2: Override paid by (checkbox + PersonSelect) */}
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 8 }}>
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
                      disabledIds={billPaidBy ? [billPaidBy] : []}
                    />
                  </div>
                </div>
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
                      onKeyDown={handleKey}
                      min="0"
                      max="100"
                      step="0.5"
                      disabled={!useCustomTax}
                      style={{ width: 48, border: 'none', borderRadius: 0, textAlign: 'center', padding: '7px 0', background: useCustomTax ? 'white' : 'var(--gray-50)' }}
                    />
                    <span style={{ padding: '0 6px', fontSize: '0.78rem', color: 'var(--gray-500)', background: 'var(--gray-50)' }}>%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save / Cancel */}
            <div style={{ marginTop: 12, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-outline" onClick={cancel}><X size={14} /> Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={save}><Check size={14} /> Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="item-desc">{item.description}</div>
            <div className="item-meta">
              {(item.useCustomPaidBy ?? false)
                ? `Override paid by ${getPersonName(item.paidBy)}`
                : `Paid by ${getPersonName(billPaidBy)}`
              } &middot; {splitLabel}
              {(item.useCustomTax && item.customTaxPercent === 0) && ` · No tax`}
              {(item.useCustomTax && item.customTaxPercent > 0) && ` · Override ${item.customTaxPercent}% tax`}
              {(!item.useCustomTax && billTaxPercent > 0) && ` · ${billTaxPercent}% tax`}
            </div>
          </>
        )}
      </div>

      {!editing && (
        <div className="item-amount" style={{ textAlign: 'right' }}>
          <div>Rp {item.amount.toLocaleString('id-ID')}</div>
          {(item.useCustomTax && item.customTaxPercent > 0) && (
            <div className="item-tax-note">tax +{calcTaxAmount(item.amount, item.customTaxPercent).toLocaleString('id-ID')}</div>
          )}
          {(!item.useCustomTax && billTaxPercent > 0) && (
            <div className="item-tax-note">tax +{calcTaxAmount(item.amount, billTaxPercent).toLocaleString('id-ID')}</div>
          )}
        </div>
      )}

      <div className="item-actions">
        {editing ? null : (
          <>
            <button className="btn-icon" onClick={() => setEditing(true)} title="Edit"><Pencil size={14} /></button>
            <button className="btn-icon danger" onClick={() => onDelete(item.id)} title="Delete"><Trash2 size={14} /></button>
          </>
        )}
      </div>
    </div>
  );
}
