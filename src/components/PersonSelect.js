import { useState, useRef, useEffect } from 'react';
import { Plus, Pencil, Trash2, Check, X, ChevronDown, Users } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export default function PersonSelect({ value, onChange, people, onAddPerson, onEditPerson, onRemovePerson, placeholder = '— Select —' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef(null);
  const addInputRef = useRef(null);
  const editInputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setAdding(false);
        setEditingId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (adding && addInputRef.current) addInputRef.current.focus();
  }, [adding]);

  useEffect(() => {
    if (editingId && editInputRef.current) editInputRef.current.focus();
  }, [editingId]);

  const selectedPerson = people.find((p) => p.id === value);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) return;
    const newPerson = { id: uuidv4(), name: trimmed };
    onAddPerson(newPerson);
    onChange(newPerson.id);
    setNewName('');
    setAdding(false);
  };

  const handleAddKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd();
    if (e.key === 'Escape') { setAdding(false); setNewName(''); }
  };

  const startEdit = (person) => {
    setEditingId(person.id);
    setEditName(person.name);
  };

  const saveEdit = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    if (people.some((p) => p.id !== editingId && p.name.toLowerCase() === trimmed.toLowerCase())) return;
    onEditPerson(editingId, trimmed);
    setEditingId(null);
    setEditName('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') { setEditingId(null); setEditName(''); }
  };

  const handleRemove = (id) => {
    onRemovePerson(id);
    if (value === id) onChange('');
  };

  return (
    <div className="person-select" ref={dropdownRef}>
      <button
        type="button"
        className="person-select-trigger"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Users size={15} />
        <span>{selectedPerson ? selectedPerson.name : placeholder}</span>
        <ChevronDown size={14} className={`chevron ${isOpen ? 'open' : ''}`} />
      </button>

      {isOpen && (
        <div className="person-select-dropdown">
          {/* Add new row */}
          {adding ? (
            <div className="person-select-add-row">
              <input
                ref={addInputRef}
                type="text"
                placeholder="Name…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={handleAddKeyDown}
              />
              <button className="btn btn-sm btn-primary" onClick={handleAdd} disabled={!newName.trim()}>
                <Check size={13} />
              </button>
              <button className="btn btn-sm btn-outline" onClick={() => { setAdding(false); setNewName(''); }}>
                <X size={13} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="person-select-add-btn"
              onClick={() => setAdding(true)}
            >
              <Plus size={14} /> Add person
            </button>
          )}

          {/* Person list */}
          {people.length === 0 && !adding && (
            <div className="person-select-empty">No people yet</div>
          )}

          <ul className="person-select-list">
            {people.map((p) => {
              const isEditing = editingId === p.id;
              return (
                <li
                  key={p.id}
                  className={`person-select-item ${value === p.id ? 'selected' : ''}`}
                >
                  {isEditing ? (
                    <div className="person-select-edit-row">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={handleEditKeyDown}
                      />
                      <button className="btn-icon" onClick={saveEdit} title="Save">
                        <Check size={12} />
                      </button>
                      <button className="btn-icon" onClick={() => { setEditingId(null); setEditName(''); }} title="Cancel">
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span
                        className="person-select-name"
                        onClick={() => { onChange(p.id); setIsOpen(false); }}
                      >
                        {p.name}
                      </span>
                      <div className="person-select-item-actions">
                        <button className="btn-icon" onClick={() => startEdit(p)} title="Edit">
                          <Pencil size={11} />
                        </button>
                        <button className="btn-icon danger" onClick={() => handleRemove(p.id)} title="Delete">
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
