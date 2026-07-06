import { useState, useCallback } from 'react';
import { Split } from 'lucide-react';
import './App.css';
import ItemsSection from './components/ItemsSection';
import OcrScanner from './components/OcrScanner';
import SummarySection from './components/SummarySection';

export default function App() {
  const [people, setPeople] = useState([]);
  const [items, setItems] = useState([]);
  const [globalTaxPercent, setGlobalTaxPercent] = useState(0);

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

  // ---- Items ----
  const addItem = useCallback((item) => {
    setItems((prev) => [...prev, { ...item, id: crypto.randomUUID() }]);
  }, []);

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
    (parsed) => {
      const newItems = parsed.map((item) => ({
        id: crypto.randomUUID(),
        description: item.description,
        amount: item.amount,
        paidBy: item.paidBy,
        splitAmong: item.splitAmong,
      }));
      setItems((prev) => [...prev, ...newItems]);
    },
    []
  );

  const personProps = { people, onAddPerson: addPerson, onEditPerson: editPerson, onRemovePerson: removePerson };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-inner">
          <Split size={26} />
          <div>
            <h1>SplitBill</h1>
            <p className="header-sub">Split items fairly with friends</p>
          </div>
        </div>
      </header>

      <main className="app-main">
        <OcrScanner {...personProps} onAddItems={handleOcrItems} />
        <ItemsSection {...personProps} items={items} onAdd={addItem} onDelete={deleteItem} onUpdate={updateItem} taxPercent={globalTaxPercent} onTaxPercentChange={setGlobalTaxPercent} />
        <SummarySection items={items} people={people} taxPercent={globalTaxPercent} />
      </main>
    </div>
  );
}
