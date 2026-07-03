import { useState } from 'react';
import { Package, Plus } from 'lucide-react';
import ItemRow from './ItemRow';
import PersonSelect from './PersonSelect';

export default function ItemsSection({ people, items, onAdd, onDelete, onUpdate, onAddPerson, onEditPerson, onRemovePerson }) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitAmong, setSplitAmong] = useState([]);
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
    onAdd({ description: desc.trim(), amount: amt, paidBy, splitAmong });
    setDesc('');
    setAmount('');
    setPaidBy('');
    setSplitAmong([]);
  };

  const isValid = desc.trim() && parseFloat(amount) > 0 && paidBy && splitAmong.length > 0;
  const totalItems = items.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <Package size={20} /> Items
        </h2>
        <span className="card-badge">
          {items.length} item{items.length !== 1 && 's'} &middot; Rp {totalItems.toLocaleString('id-ID')}
        </span>
      </div>

      {/* ── Add Item Form ── */}
      <details className="add-item-details">
        <summary className="add-item-summary">
          <Plus size={16} /> Add Item
        </summary>
        <form onSubmit={handleSubmit} style={{ marginTop: 12 }}>
          <div className="form-row">
            <div className="form-group">
              <label>Description</label>
              <input
                type="text"
                placeholder="e.g. Pizza, Taxi…"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ maxWidth: 140 }}>
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
            {/* Quick-add person next to Split Among */}
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
