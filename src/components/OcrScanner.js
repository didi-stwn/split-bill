import { useState, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { Scan, Upload, Loader2, Plus, Trash2, RefreshCw, Pencil, Check, X } from 'lucide-react';
import PersonSelect from './PersonSelect';

function parseReceiptLines(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const parsed = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s*[:\-]?\s*(?:Rp\s*)?([\d,.]+)\s*$/i);
    if (match) {
      const desc = match[1].trim();
      const rawAmt = match[2].replace(/\./g, '').replace(/,/g, '');
      const amount = parseFloat(rawAmt);
      if (desc && !isNaN(amount) && amount > 0) {
        parsed.push({ id: crypto.randomUUID(), description: desc, amount });
      }
    }
  }
  return parsed;
}

export default function OcrScanner({ people, onAddItems, onAddPerson, onEditPerson, onRemovePerson }) {
  const [splitNewName, setSplitNewName] = useState({}); // { [itemId]: string }
  const [ocrText, setOcrText] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [dragOver, setDragOver] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const fileRef = useRef(null);

  const handleImage = useCallback(async (file) => {
    if (!file) return;
    setStatus('scanning');
    setProgress(0);
    setOcrText('');

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100));
        },
      });
      const { data } = await worker.recognize(file);
      setOcrText(data.text);
      setStatus('done');

      const items = parseReceiptLines(data.text);
      if (items.length > 0) {
        const defaultPayer = people.length > 0 ? people[0].id : '';
        setParsedItems(
          items.map((item) => ({
            ...item,
            paidBy: defaultPayer,
            splitAmong: people.map((p) => p.id),
          }))
        );
      } else {
        setParsedItems([]);
      }
      await worker.terminate();
    } catch (err) {
      console.error(err);
      setStatus('error');
      setOcrText('OCR failed. Try a clearer image.');
    }
  }, [people]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImage(file);
  };

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (file && file.type.startsWith('image/')) handleImage(file);
    },
    [handleImage]
  );

  const updateItem = (id, field, value) => {
    setParsedItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const toggleSplit = (itemId, personId) => {
    setParsedItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const split = item.splitAmong.includes(personId)
          ? item.splitAmong.filter((id) => id !== personId)
          : [...item.splitAmong, personId];
        return { ...item, splitAmong: split };
      })
    );
  };

  const removeParsed = (id) => setParsedItems((prev) => prev.filter((i) => i.id !== id));

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditDesc(item.description);
    setEditAmount(String(item.amount));
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDesc('');
    setEditAmount('');
  };
  const saveEdit = (item) => {
    const amt = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amt) || amt <= 0) return;
    updateItem(item.id, 'description', editDesc.trim());
    updateItem(item.id, 'amount', amt);
    cancelEdit();
  };
  const handleKey = (e, item) => {
    if (e.key === 'Enter') saveEdit(item);
    if (e.key === 'Escape') cancelEdit();
  };

  const addAll = () => {
    const valid = parsedItems.filter((i) => i.paidBy && i.splitAmong.length > 0);
    if (valid.length === 0) return;
    onAddItems(valid);
    setParsedItems([]);
    setOcrText('');
    setStatus('idle');
    setProgress(0);
  };

  const reset = () => {
    setParsedItems([]);
    setOcrText('');
    setStatus('idle');
    setProgress(0);
    setEditingId(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const totalParsed = parsedItems.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <Scan size={20} /> Receipt Scanner
        </h2>
        {/* <span className="card-badge">Tesseract.js OCR</span> */}
      </div>

      {/* Dropzone */}
      {status !== 'scanning' && (
        <div
          className={`ocr-dropzone ${dragOver ? 'dragging' : ''}`}
          onClick={() => fileRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          <Upload size={28} style={{ color: 'var(--gray-300)' }} />
          <p>Drop a receipt image or click to browse</p>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>
      )}

      {/* Scanning */}
      {status === 'scanning' && (
        <div className="ocr-progress">
          <div style={{ textAlign: 'center', marginBottom: 8 }}>
            <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary)' }} />
            <p style={{ marginTop: 4, fontSize: '0.9rem', color: 'var(--gray-500)' }}>Processing receipt…</p>
          </div>
          <div className="ocr-progress-bar">
            <div className="ocr-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', textAlign: 'center', marginTop: 4 }}>{progress}%</p>
        </div>
      )}

      {/* Error */}
      {status === 'error' && (
        <div className="ocr-result" style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          {ocrText}
        </div>
      )}

      {/* Parsed table */}
      {status === 'done' && parsedItems.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: '0.95rem' }}>Parsed Items ({parsedItems.length})</strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Total: <strong>Rp {totalParsed.toLocaleString('id-ID')}</strong>
            </span>
          </div>

          {/* Header */}
          <div className="ocr-grid header">
            <span>Item</span>
            <span style={{ textAlign: 'right' }}>Amount</span>
            <span>Payer</span>
            <span>Split</span>
            <span></span>
          </div>

          {parsedItems.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id} className="ocr-grid row">
                {isEditing ? (
                  <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} onKeyDown={(e) => handleKey(e, item)} className="ocr-edit-input" autoFocus />
                ) : (
                  <span className="ocr-cell-clickable" onClick={() => startEdit(item)}>{item.description}</span>
                )}

                {isEditing ? (
                  <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} onKeyDown={(e) => handleKey(e, item)} className="ocr-edit-input" style={{ textAlign: 'right' }} min="0" step="100" />
                ) : (
                  <span className="ocr-cell-clickable" style={{ textAlign: 'right', fontWeight: 600 }} onClick={() => startEdit(item)}>
                    Rp {item.amount.toLocaleString('id-ID')}
                  </span>
                )}

                {/* Paid by: use PersonSelect */}
                <PersonSelect
                  value={item.paidBy}
                  onChange={(v) => updateItem(item.id, 'paidBy', v)}
                  people={people}
                  onAddPerson={onAddPerson}
                  onEditPerson={onEditPerson}
                  onRemovePerson={onRemovePerson}
                  placeholder="—"
                />

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                  {people.map((p) => {
                    const sel = item.splitAmong.includes(p.id);
                    return (
                      <label key={p.id} className={`ocr-chip ${sel ? 'sel' : ''}`}>
                        <input type="checkbox" checked={sel} onChange={() => toggleSplit(item.id, p.id)} style={{ display: 'none' }} />
                        {p.name}
                      </label>
                    );
                  })}
                  <div style={{ position: 'relative' }}>
                    {splitNewName[item.id] !== undefined ? (
                      <div style={{ display: 'flex', gap: 2 }}>
                        <input
                          type="text"
                          value={splitNewName[item.id] || ''}
                          onChange={(e) => setSplitNewName((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = (splitNewName[item.id] || '').trim();
                              if (trimmed && !people.some((p) => p.name.toLowerCase() === trimmed.toLowerCase())) {
                                const newP = { id: crypto.randomUUID(), name: trimmed };
                                onAddPerson(newP);
                                toggleSplit(item.id, newP.id);
                              }
                              setSplitNewName((prev) => ({ ...prev, [item.id]: undefined }));
                            }
                            if (e.key === 'Escape') {
                              setSplitNewName((prev) => ({ ...prev, [item.id]: undefined }));
                            }
                          }}
                          style={{ width: 70, padding: '2px 6px', border: '1.5px solid var(--primary)', borderRadius: 4, fontSize: '0.75rem' }}
                          autoFocus
                        />
                        <button className="btn-icon" style={{ width: 20, height: 20 }} onClick={() => setSplitNewName((prev) => ({ ...prev, [item.id]: undefined }))}><X size={11} /></button>
                      </div>
                    ) : (
                      <button
                        className="btn-icon"
                        style={{ width: 22, height: 22, background: 'var(--gray-100)', borderRadius: '50%' }}
                        onClick={() => setSplitNewName((prev) => ({ ...prev, [item.id]: '' }))}
                        title="Add person"
                      >
                        <Plus size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 2 }}>
                  {isEditing ? (
                    <>
                      <button className="btn btn-sm btn-primary" onClick={() => saveEdit(item)} style={{ padding: 4 }}><Check size={14} /></button>
                      <button className="btn btn-sm btn-outline" onClick={cancelEdit} style={{ padding: 4 }}><X size={14} /></button>
                    </>
                  ) : (
                    <>
                      <button className="btn-icon" onClick={() => startEdit(item)}><Pencil size={13} /></button>
                      <button className="btn-icon danger" onClick={() => removeParsed(item.id)}><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" onClick={addAll} disabled={!parsedItems.some((i) => i.paidBy && i.splitAmong.length > 0)}>
              <Plus size={16} /> Add All to Items
            </button>
            <button className="btn btn-outline" onClick={reset}><RefreshCw size={16} /> Scan Another</button>
          </div>
        </div>
      )}

      {/* Raw text */}
      {status === 'done' && ocrText && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: '0.82rem', color: 'var(--gray-500)', cursor: 'pointer' }}>Raw OCR Text</summary>
          <div className="ocr-result" style={{ marginTop: 6, fontSize: '0.78rem' }}>{ocrText}</div>
        </details>
      )}

      {/* No items parsed */}
      {status === 'done' && parsedItems.length === 0 && (
        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: 8 }}>No items could be parsed.</p>
          <button className="btn btn-outline btn-sm" onClick={reset}><RefreshCw size={14} /> Try Again</button>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
