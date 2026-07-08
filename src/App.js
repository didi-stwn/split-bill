import { useState, useCallback, useRef } from 'react';
import { Split } from 'lucide-react';
import './App.css';
import ItemsSection from './components/ItemsSection';
import ExportButton from './components/ExportButton';
import OcrScanner from './components/OcrScanner';
import SummarySection from './components/SummarySection';

function createBill(name, paidBy = '') {
  return { id: crypto.randomUUID(), name, paidBy, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 };
}

export default function App() {
  const [people, setPeople] = useState([]);
  const [bills, setBills] = useState(() => [createBill('Bill 1')]);
  const [items, setItems] = useState([]);
  const itemsSectionRef = useRef(null);
  const summarySectionRef = useRef(null);

  // ---- People ----
  const addPerson = useCallback((input) => {
    const name = typeof input === 'string' ? input : input?.name;
    const existingId = typeof input === 'object' ? input?.id : null;
    if (!name?.trim()) return;
    if (people.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) return;
    setPeople((prev) => [...prev, { id: existingId || crypto.randomUUID(), name: name.trim() }]);
  }, [people]);

  const editPerson = useCallback((id, newName) => {
    setPeople((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name: newName } : p))
    );
  }, []);

  const removePerson = useCallback((id) => {
    setPeople((prev) => prev.filter((p) => p.id !== id));
    setItems((prev) =>
      prev.filter((e) => e.paidBy !== id && !e.splitAmong.includes(id))
    );
  }, []);

  // ---- Bills ----
  const addBill = useCallback((billArg) => {
    if (billArg && billArg.id) {
      // Bill was pre-created (e.g. from OCR) — use as-is
      setBills((prev) => [...prev, {
        id: billArg.id,
        name: billArg.name || `Bill ${prev.length + 1}`,
        paidBy: billArg.paidBy || '',
        billTaxPercent: billArg.billTaxPercent ?? 0,
        useBillDiscount: billArg.useBillDiscount ?? false,
        billDiscountAmount: billArg.billDiscountAmount ?? 0,
      }]);
    } else {
      const num = bills.length + 1;
      setBills((prev) => [...prev, createBill(`Bill ${num}`)]);
    }
  }, [bills.length]);

  const updateBill = useCallback((id, updates) => {
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  }, []);

  const deleteBill = useCallback((id) => {
    setBills((prev) => {
      const filtered = prev.filter((b) => b.id !== id);
      // Don't allow deleting the last bill
      return filtered.length === 0 ? prev : filtered;
    });
    // Remove items belonging to this bill
    setItems((prev) => prev.filter((e) => e.billId !== id));
  }, []);

  // ---- Items ----
  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, {
      ...item,
      id: crypto.randomUUID(),
      useCustomTax: item.useCustomTax ?? false,
      customTaxPercent: item.customTaxPercent ?? 0,
      useCustomPaidBy: item.useCustomPaidBy ?? false,
      billId: item.billId || bills[0]?.id || '',
    }]);
  }, [bills]);

  const deleteItem = useCallback((id) => {
    setItems((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateItem = useCallback((id, updated) => {
    setItems((prev) =>
      prev.map((e) => (e.id === id ? { ...updated, id } : e))
    );
  }, []);

  // ---- OCR ----
  const handleOcrItems = useCallback(
    (parsed, billId) => {
      const newItems = parsed.map((item) => ({
        id: crypto.randomUUID(),
        description: item.description,
        amount: item.amount,
        paidBy: item.paidBy,
        splitAmong: item.splitAmong,
        billId: billId || bills[0]?.id || '',
      }));
      setItems((prev) => [...prev, ...newItems]);
    },
    [bills]
  );

  const personProps = { people, onAddPerson: addPerson, onEditPerson: editPerson, onRemovePerson: removePerson };
  const billProps = { bills, onAddBill: addBill, onUpdateBill: updateBill, onDeleteBill: deleteBill };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <Split size={26} />
          <div>
            <h1>Split Bill</h1>
            <p className="header-sub">Split items fairly with friends</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <OcrScanner {...personProps} {...billProps} onAddItems={handleOcrItems} />
        <div ref={itemsSectionRef}>
          <ItemsSection {...personProps} {...billProps} items={items} onAdd={addItem} onDelete={deleteItem} onUpdate={updateItem} />
        </div>
        <div ref={summarySectionRef}>
          <SummarySection items={items} people={people} bills={bills} />
        </div>
        <ExportButton itemsSectionRef={itemsSectionRef} summarySectionRef={summarySectionRef} />
      </main>
    </div>
  );
}
