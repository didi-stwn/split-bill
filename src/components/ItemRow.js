import { useState } from 'react';
import { Trash2, Pencil, Check, X, ReceiptText, Plus } from 'lucide-react';
import PersonSelect from './PersonSelect';

export default function ItemRow({ item, people, onDelete, onUpdate, onAddPerson, onEditPerson, onRemovePerson }) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(item.description);
  const [amount, setAmount] = useState(String(item.amount));
  const [paidBy, setPaidBy] = useState(item.paidBy);
  const [splitAmong, setSplitAmong] = useState([...item.splitAmong]);
  const [newPersonName, setNewPersonName] = useState('');

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
    if (!desc.trim() || isNaN(amt) || amt <= 0 || !paidBy || splitAmong.length === 0) return;
    onUpdate(item.id, { ...item, description: desc.trim(), amount: amt, paidBy, splitAmong });
    setEditing(false);
  };

  const cancel = () => {
    setDesc(item.description);
    setAmount(String(item.amount));
    setPaidBy(item.paidBy);
    setSplitAmong([...item.splitAmong]);
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
      <div className="item-icon">
        <ReceiptText size={16} />
      </div>

      <div className="item-body">
        {editing ? (
          <div className="item-edit-full">
            {/* Row 1: Description & Amount */}
            <div className="form-row" style={{ marginBottom: 6 }}>
              <div className="form-group">
                <label>Description</label>
                <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} onKeyDown={handleKey} autoFocus />
              </div>
              <div className="form-group" style={{ maxWidth: 120 }}>
                <label>Amount</label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={handleKey} min="0" step="100" />
              </div>
            </div>

            {/* Row 2: Paid by */}
            <div className="form-group" style={{ marginBottom: 8 }}>
              <label>Paid by</label>
              <PersonSelect value={paidBy} onChange={setPaidBy} people={people} onAddPerson={onAddPerson} onEditPerson={onEditPerson} onRemovePerson={onRemovePerson} />
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
                </div>
              </div>
              <div className="form-group" style={{ maxWidth: 150, flexShrink: 0 }}>
                <label>&nbsp;</label>
                <div className="quick-person-row">
                  <input type="text" placeholder="New…" value={newPersonName} onChange={(e) => setNewPersonName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleAddQuickPerson(); }} />
                  <button type="button" className="btn btn-sm btn-primary" onClick={handleAddQuickPerson} disabled={!newPersonName.trim()}><Plus size={14} /></button>
                </div>
              </div>
            </div>

            {/* Save / Cancel */}
            <div style={{marginTop: 12, display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
              <button className="btn btn-sm btn-outline" onClick={cancel}><X size={14} /> Cancel</button>
              <button className="btn btn-sm btn-primary" onClick={save}><Check size={14} /> Save</button>
            </div>
          </div>
        ) : (
          <>
            <div className="item-desc">{item.description}</div>
            <div className="item-meta">{getPersonName(item.paidBy)} paid &middot; {splitLabel}</div>
          </>
        )}
      </div>

      {!editing && <div className="item-amount">Rp {item.amount.toLocaleString('id-ID')}</div>}

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
