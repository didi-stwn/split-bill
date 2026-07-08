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

export default function OcrScanner({ people, onAddItems, onAddPerson, onEditPerson, onRemovePerson, bills, onAddBill, onUpdateBill, globalTaxPercent = 0 }) {
  const [splitNewName, setSplitNewName] = useState({});
  const [ocrText, setOcrText] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [dragOver, setDragOver] = useState(false);
  const [parsedItems, setParsedItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [billName, setBillName] = useState('');
  const [billPaidBy, setBillPaidBy] = useState('');
  const [billUseTax, setBillUseTax] = useState(false);
  const [billTaxPercent, setBillTaxPercent] = useState(0);
  const [billUseDiscount, setBillUseDiscount] = useState(false);
  const [billDiscountAmount, setBillDiscountAmount] = useState(0);
  const fileRef = useRef(null);

  const handleImage = useCallback(async (file) => {
    if (!file) return;
    setStatus('scanning');
    setProgress(0);
    setOcrText('');

    // Auto-fill bill name from file name
    const nameFromFile = file.name.replace(/\.[^.]+$/, '').replace(/[_\-]/g, ' ').trim();
    setBillName(nameFromFile || 'Receipt');

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
        setBillPaidBy('');
        setParsedItems(
          items.map((item) => ({
            ...item,
            paidBy: '',
            splitAmong: [],
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
    const valid = parsedItems.filter((i) => i.splitAmong.length > 0);
    if (valid.length === 0) return;

    // Create a new bill for this scan
    const billId = crypto.randomUUID();
    const name = billName.trim() || `Bill ${bills.length + 1}`;

    // Add bill via callback with optional tax & discount overrides
    onAddBill({
      name,
      id: billId,
      paidBy: billPaidBy,
      useBillTax: billUseTax,
      billTaxPercent: billUseTax ? billTaxPercent : 0,
      useBillDiscount: billUseDiscount,
      billDiscountAmount: billUseDiscount ? billDiscountAmount : 0,
    });

    // Add items with this billId — use override paidBy if checked, else fall back to billPaidBy
    onAddItems(
      valid.map((item) => ({
        ...item,
        paidBy: (item.useCustomPaidBy && item.paidBy) ? item.paidBy : billPaidBy,
        useCustomPaidBy: item.useCustomPaidBy ?? false,
        splitAmong: item.splitAmong,
      })),
      billId
    );

    setParsedItems([]);
    setOcrText('');
    setStatus('idle');
    setProgress(0);
    setBillName('');
    setBillPaidBy('');
    setBillUseTax(false);
    setBillTaxPercent(0);
    setBillUseDiscount(false);
    setBillDiscountAmount(0);
  };

  const reset = () => {
    setParsedItems([]);
    setOcrText('');
    setStatus('idle');
    setProgress(0);
    setEditingId(null);
    setBillName('');
    setBillPaidBy('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const totalParsed = parsedItems.reduce((s, i) => s + i.amount, 0);

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">
          <Scan size={20} /> Receipt Scanner
        </h2>
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

      {/* Parsed items */}
      {status === 'done' && parsedItems.length > 0 && (
        <div style={{ marginTop: 12 }}>
          {/* Bill metadata section with tax & discount overrides */}
          <div className="ocr-bill-meta">
            {/* Row 1: Bill name + Bill paid by */}
            <div className="ocr-bill-meta-row">
              <div className="form-group">
                <label>Bill name</label>
                <input
                  type="text"
                  placeholder="e.g. Dinner at Pizza Place"
                  value={billName}
                  onChange={(e) => setBillName(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ maxWidth: 200, minWidth: 150 }}>
                <label>Bill paid by</label>
                <PersonSelect
                  value={billPaidBy}
                  onChange={setBillPaidBy}
                  people={people}
                  onAddPerson={onAddPerson}
                  onEditPerson={onEditPerson}
                  onRemovePerson={onRemovePerson}
                  placeholder="—"
                />
              </div>
            </div>

            {/* Row 2: Global Tax + Override Bill Tax + Discount (row on desktop, column on mobile) */}
            <div className="ocr-overrides-row">
              {/* Global Tax */}
              <div className="ocr-override-group">
                <span className="ocr-global-tax-hint" onClick={() => {
                  const el = document.getElementById('global-tax-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}>
                  Global Tax: <strong>{globalTaxPercent}%</strong>
                </span>
              </div>

              {/* Override Bill Tax */}
              <div className="ocr-override-group">
                <label className="ocr-override-check">
                  <input
                    type="checkbox"
                    checked={billUseTax}
                    onChange={(e) => { setBillUseTax(e.target.checked); if (!e.target.checked) setBillTaxPercent(0); }}
                  />
                  Override Bill Tax
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--gray-300)', borderRadius: 6, overflow: 'hidden', opacity: billUseTax ? 1 : 0.35, transition: 'opacity 0.15s' }}>
                  <input
                    type="number"
                    value={billTaxPercent || '0'}
                    onChange={(e) => setBillTaxPercent(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="100"
                    step="0.1"
                    style={{ width: 70, border: 'none', borderRadius: 0, textAlign: 'center', padding: '7px 0', background: billUseTax ? 'white' : 'var(--gray-50)' }}
                  />
                  <span style={{ padding: '0 6px', fontSize: '0.82rem', color: 'var(--gray-500)', background: 'var(--gray-50)' }}>%</span>
                </div>
              </div>

              {/* Discount */}
              <div className="ocr-override-group">
                <label className="ocr-override-check">
                  <input
                    type="checkbox"
                    checked={billUseDiscount}
                    onChange={(e) => { setBillUseDiscount(e.target.checked); if (!e.target.checked) setBillDiscountAmount(0); }}
                  />
                  Discount
                </label>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--gray-300)', borderRadius: 6, overflow: 'hidden', opacity: billUseDiscount ? 1 : 0.35, transition: 'opacity 0.15s' }}>
                  <input
                    type="number"
                    value={billDiscountAmount || ''}
                    onChange={(e) => setBillDiscountAmount(parseFloat(e.target.value) || 0)}
                    min="0"
                    step="100"
                    style={{ width: 120, border: 'none', borderRadius: 0, textAlign: 'center', padding: '7px 0', background: billUseDiscount ? 'white' : 'var(--gray-50)' }}
                  />
                  <span style={{ padding: '0 6px', fontSize: '0.82rem', color: 'var(--gray-500)', background: 'var(--gray-50)' }}>Rp</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: '0.95rem' }}>Parsed Items ({parsedItems.length})</strong>
            <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
              Total: <strong>Rp {totalParsed.toLocaleString('id-ID')}</strong>
            </span>
          </div>

          {parsedItems.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id} className="ocr-item-card">
                {/* Row 1: description + amount + actions */}
                <div className="ocr-item-header">
                  {isEditing ? (
                    <div className="ocr-item-edit-fields">
                      <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} onKeyDown={(e) => handleKey(e, item)} className="ocr-edit-input" style={{ flex: 1 }} autoFocus />
                      <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} onKeyDown={(e) => handleKey(e, item)} className="ocr-edit-input" style={{ width: 90, textAlign: 'right' }} min="0" step="100" />
                    </div>
                  ) : (
                    <div className="ocr-item-info">
                      <span className="ocr-item-desc" onClick={() => startEdit(item)}>{item.description}</span>
                      <span className="ocr-item-amt" onClick={() => startEdit(item)}>Rp {item.amount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="ocr-item-actions">
                    {isEditing ? (
                      <>
                        <button className="btn-icon" onClick={() => saveEdit(item)} style={{ color: 'var(--success)' }}><Check size={14} /></button>
                        <button className="btn-icon" onClick={cancelEdit}><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button className="btn-icon" onClick={() => startEdit(item)}><Pencil size={13} /></button>
                        <button className="btn-icon danger" onClick={() => removeParsed(item.id)}><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                </div>

                {/* Row 3: Split */}
                <div className="ocr-item-detail">
                  <span className="ocr-detail-label">Split</span>
                  <div className="ocr-detail-value ocr-split-row">
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
                </div>


                {/* Row 2: Override paid by */}
                <div className="ocr-item-detail">
                  <span className="ocr-detail-label">Override paid by</span>
                  <div className="ocr-detail-value">
                    <input
                      type="checkbox"
                      checked={item.useCustomPaidBy ?? false}
                      onChange={(e) => {
                        updateItem(item.id, 'useCustomPaidBy', e.target.checked);
                        if (!e.target.checked) updateItem(item.id, 'paidBy', '');
                      }}
                      style={{ width: 14, height: 14, accentColor: 'var(--primary)', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, opacity: (item.useCustomPaidBy ?? false) ? 1 : 0.35, transition: 'opacity 0.15s', minWidth: 0 }}>
                      <PersonSelect
                        value={(item.useCustomPaidBy ?? false) ? item.paidBy : ''}
                        onChange={(v) => updateItem(item.id, 'paidBy', v)}
                        people={people}
                        onAddPerson={onAddPerson}
                        onEditPerson={onEditPerson}
                        onRemovePerson={onRemovePerson}
                        placeholder="—"
                      />
                    </div>
                  </div>
                </div>

              </div>
            );
          })}

          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button className="btn btn-primary" onClick={addAll} disabled={!billPaidBy || !parsedItems.some((i) => i.splitAmong.length > 0)}>
              <Plus size={16} /> Add All to Items
            </button>
            <button className="btn btn-outline" onClick={reset}><RefreshCw size={16} /> Scan Another</button>
          </div>
        </div>
      )}

      {/* Raw text
      {status === 'done' && ocrText && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: '0.82rem', color: 'var(--gray-500)', cursor: 'pointer' }}>Raw OCR Text</summary>
          <div className="ocr-result" style={{ marginTop: 6, fontSize: '0.78rem' }}>{ocrText}</div>
        </details>
      )} */}

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
