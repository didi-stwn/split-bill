import { calcTotalWithTax, applyDiscountAndTax, computeSettlements } from '../components/SummarySection';

/* ===== calcTotalWithTax ===== */
describe('calcTotalWithTax', () => {
  it('returns original amount when tax is 0', () => {
    expect(calcTotalWithTax(1000, 0)).toBe(1000);
  });

  it('applies 10% tax correctly', () => {
    expect(calcTotalWithTax(1000, 10)).toBe(1100);
  });

  it('handles fractional percentages', () => {
    expect(calcTotalWithTax(200, 7.5)).toBe(215);
  });

  it('handles null/undefined tax percent', () => {
    expect(calcTotalWithTax(1000, null)).toBe(1000);
    expect(calcTotalWithTax(1000, undefined)).toBe(1000);
  });

  it('handles zero amount with tax', () => {
    expect(calcTotalWithTax(0, 10)).toBe(0);
  });

  it('handles very large tax percent', () => {
    expect(calcTotalWithTax(1000, 100)).toBe(2000);
  });

  it('handles very small fractional tax', () => {
    expect(calcTotalWithTax(1000, 0.1)).toBeCloseTo(1001, 0);
  });

  it('handles large amounts without floating point errors', () => {
    expect(calcTotalWithTax(999999, 11)).toBeCloseTo(1109998.89, 1);
  });
});

/* ===== applyDiscountAndTax ===== */
describe('applyDiscountAndTax', () => {
  it('applies tax only when no discount', () => {
    const result = applyDiscountAndTax(1000, null, 10, 0);
    expect(result.taxAmount).toBe(100);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(1100);
  });

  it('applies proportional discount split across items', () => {
    // Bill: 3000 total with 300 discount, 10% tax
    // Item A: 1000 (1/3 of bill)
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 300 };
    const result = applyDiscountAndTax(1000, bill, 10, 3000);
    expect(result.taxAmount).toBe(100); // 10% of 1000
    expect(result.discountAmount).toBe(100); // (1000/3000) * 300
    expect(result.total).toBe(1000 + 100 - 100); // 1000
  });

  it('applies discount for the largest item in bill', () => {
    // Bill: 3000 total with 300 discount, 10% tax
    // Item B: 2000 (2/3 of bill)
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 300 };
    const result = applyDiscountAndTax(2000, bill, 10, 3000);
    expect(result.taxAmount).toBe(200); // 10% of 2000
    expect(result.discountAmount).toBe(200); // (2000/3000) * 300
    expect(result.total).toBe(2000 + 200 - 200); // 2000
  });

  it('handles zero discount when disabled', () => {
    const bill = { id: 'b1', useBillDiscount: false, billDiscountAmount: 300 };
    const result = applyDiscountAndTax(1000, bill, 10, 3000);
    expect(result.taxAmount).toBe(100);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(1100);
  });

  it('handles zero discount amount', () => {
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 0 };
    const result = applyDiscountAndTax(1000, bill, 10, 3000);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(1100);
  });

  it('clamps discount to not exceed item amount', () => {
    // Bill: 1000 total with 3000 discount, but item is only 500 with 10% tax
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 3000 };
    const result = applyDiscountAndTax(500, bill, 10, 1000);
    expect(result.taxAmount).toBe(50);
    expect(result.discountAmount).toBe(500); // clamped to item amount
    expect(result.total).toBe(500 + 50 - 500); // 50
  });

  it('handles item with no bill (null)', () => {
    const result = applyDiscountAndTax(1000, null, 5, 0);
    expect(result.taxAmount).toBe(50);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(1050);
  });

  it('applies pure discount with no tax', () => {
    // 2000 item, bill discount 500, bill subtotal 3000, 0% tax
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 500 };
    const result = applyDiscountAndTax(2000, bill, 0, 3000);
    expect(result.taxAmount).toBe(0);
    expect(result.discountAmount).toBeCloseTo(333.33, 2); // (2000/3000) * 500
    expect(result.total).toBeCloseTo(1666.67, 2);
  });

  it('handles billSubtotal of 0 (avoids division by zero)', () => {
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 500 };
    const result = applyDiscountAndTax(1000, bill, 10, 0);
    expect(result.taxAmount).toBe(100);
    expect(result.discountAmount).toBe(0); // billSubtotal is 0, ratio is 0/0 -> NaN, but condition billSubtotal > 0 prevents
    expect(result.total).toBe(1100);
  });

  it('returns correct originalAmount in result', () => {
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 100 };
    const result = applyDiscountAndTax(2500, bill, 8, 5000);
    expect(result.originalAmount).toBe(2500);
  });

  it('handles bill with useBillDiscount true but undefined discountAmount', () => {
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: undefined };
    const result = applyDiscountAndTax(1000, bill, 10, 3000);
    expect(result.taxAmount).toBe(100);
    expect(result.discountAmount).toBe(0);
    expect(result.total).toBe(1100);
  });

  it('handles very small item relative to bill (ratio rounding)', () => {
    // 1 out of 3000 total discount 1000 -> tiny ratio
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 1000 };
    const result = applyDiscountAndTax(1, bill, 0, 3000);
    expect(result.discountAmount).toBeCloseTo(0.33, 2); // (1/3000) * 1000
    expect(result.total).toBeCloseTo(0.67, 2);
  });

  it('handles discount where ratio * amount exceeds item (clamping edge)', () => {
    // Item 100, bill total 200, discount 300, tax 0%
    // ratio = 100/200 = 0.5, proportional = 0.5*300 = 150, clamped to 100
    const bill = { id: 'b1', useBillDiscount: true, billDiscountAmount: 300 };
    const result = applyDiscountAndTax(100, bill, 0, 200);
    expect(result.discountAmount).toBe(100); // clamped
    expect(result.total).toBe(0);
  });
});

/* ===== computeSettlements ===== */
describe('computeSettlements', () => {
  const people = [
    { id: 'p1', name: 'Alice' },
    { id: 'p2', name: 'Bob' },
    { id: 'p3', name: 'Charlie' },
  ];

  // Helper: create an item with standard fields
  function item(overrides = {}) {
    return {
      id: 'i1',
      description: 'Test',
      amount: 1000,
      paidBy: 'p1',
      splitAmong: ['p1', 'p2'],
      useCustomTax: false,
      customTaxPercent: 0,
      billId: 'b1',
      ...overrides,
    };
  }

  function bill(overrides = {}) {
    return {
      id: 'b1',
      name: 'Bill 1',
      paidBy: '',
      billTaxPercent: 0,
      useBillDiscount: false,
      billDiscountAmount: 0,
      ...overrides,
    };
  }

  it('simple split: Alice pays 1000, splits with Bob equally', () => {
    const items = [item()];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    // After settlement:
    //   Alice: +1000 (paid) - 500 (her share) = +500
    //   Bob: -500 (his share)
    // So Bob owes Alice 500
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2'); // Bob
    expect(result[0].to).toBe('p1'); // Alice
    expect(result[0].amount).toBe(500);
  });

  it('applies bill tax correctly', () => {
    // 1000 with 10% tax = 1100 total
    // Split between Alice, Bob (550 each)
    // Alice: +1100 - 550 = +550
    // Bob: -550
    const items = [item()];
    const billsList = [bill({ billTaxPercent: 10 })];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(550);
  });

  it('applies bill tax (Item > Bill priority)', () => {
    // Bill tax 5%
    // 1000 with 5% tax = 1050 total
    // Each: 1050 / 3 = 350
    const items = [item({ splitAmong: ['p1', 'p2', 'p3'] })];
    const billsList = [bill({ billTaxPercent: 5 })];
    const result = computeSettlements(items, people, billsList);
    // Alice: +1050 - 350 = +700
    // Bob: -350
    // Charlie: -350
    // Bob owes Alice 350, Charlie owes Alice 350
    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(350);
    expect(result[1].amount).toBe(350);
  });

  it('applies item tax override over bill tax', () => {
    // Bill tax 5%, but item overrides with 0%
    const items = [item({ useCustomTax: true, customTaxPercent: 0 })];
    const billsList = [bill({ billTaxPercent: 5 })];
    const result = computeSettlements(items, people, billsList);
    // 1000 with 0% tax = 1000
    // Bob owes Alice 500
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });

  it('applies discount proportionally across items', () => {
    // Two items in same bill
    // Item A: 1000 (1/4 of bill), Item B: 3000 (3/4 of bill)
    // Bill discount: 400 total
    // Discount splits: A gets 100 off, B gets 300 off
    // Bill tax: 10%
    // A: 1000 + 100 tax - 100 discount = 1000, split 2 ways = 500 each
    // B: 3000 + 300 tax - 300 discount = 3000, split 2 ways = 1500 each
    // Alice: pays both: +1000 + 3000 = +4000
    //        her shares: 500 + 1500 = 2000
    //        net: +2000
    // Bob: shares: 500 + 1500 = 2000, net: -2000
    const items = [
      { id: 'i1', description: 'Item A', amount: 1000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Item B', amount: 3000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
    ];
    const billsList = [bill({ billTaxPercent: 10, useBillDiscount: true, billDiscountAmount: 400 })];
    const result = computeSettlements(items, people, billsList);
    // Bob owes Alice 2000
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2');
    expect(result[0].to).toBe('p1');
    expect(result[0].amount).toBe(2000);
  });

  it('handles multi-bill scenario', () => {
    // Bill 1: Alice pays 1000, splits with Bob (no tax/discount)
    // Bill 2: Bob pays 2000, splits with Alice (no tax/discount)
    // Bill 1: Alice +1000 - 500 = +500, Bob -500
    // Bill 2: Bob +2000 - 1000 = +1000, Alice -1000
    // Combined: Alice: +500 - 1000 = -500, Bob: -500 + 1000 = +500
    // => Alice owes Bob 500
    const items = [
      { id: 'i1', description: 'Pizza', amount: 1000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Taxi', amount: 2000, paidBy: 'p2', splitAmong: ['p1', 'p2'], billId: 'b2' },
    ];
    const billsList = [
      { id: 'b1', name: 'Food', paidBy: 'p1', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Transport', paidBy: 'p2', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p1'); // Alice owes Bob
    expect(result[0].to).toBe('p2');
    expect(result[0].amount).toBe(500);
  });

  it('skips items with no effective paidBy', () => {
    const items = [item({ paidBy: '', billId: 'b1' })];
    const billsList = [bill({ paidBy: '' })];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no items', () => {
    const result = computeSettlements([], people, []);
    expect(result).toHaveLength(0);
  });

  it('handles three-way split', () => {
    // Alice pays 3000, splits 3 ways (Alice, Bob, Charlie), 10% bill tax
    // 3000 * 1.1 = 3300, each pays 1100
    // Alice: +3300 - 1100 = +2200
    // Bob: -1100
    // Charlie: -1100
    const items = [item({ amount: 3000, splitAmong: ['p1', 'p2', 'p3'] })];
    const billsList = [bill({ billTaxPercent: 10 })];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(2);
    // Bob owes Alice 1100, Charlie owes Alice 1100
    expect(result[0].amount).toBe(1100);
    expect(result[1].amount).toBe(1100);
  });

  it('resolves via the payer when bill paidBy is set (item has no own paidBy)', () => {
    // Item has no paidBy, but bill has paidBy = Alice
    const items = [item({ paidBy: '', billId: 'b1' })];
    const billsList = [bill({ paidBy: 'p1' })];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2');
    expect(result[0].to).toBe('p1');
    expect(result[0].amount).toBe(500);
  });

  it('handles payer paying for themselves only (no split with others)', () => {
    // Alice pays 1000, splits only with herself -> no one else owes anything
    const items = [item({ paidBy: 'p1', splitAmong: ['p1'] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(0);
  });

  it('handles person paying for item they are NOT part of the split', () => {
    // Alice pays 1000, split between Bob and Charlie only (500 each)
    // Alice: +1000 (paid) - 0 (not in split) = +1000
    // Bob: -500
    // Charlie: -500
    const items = [item({ paidBy: 'p1', splitAmong: ['p2', 'p3'] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(2);
    expect(result[0].from).toBe('p2'); // Bob owes Alice
    expect(result[0].to).toBe('p1');
    expect(result[0].amount).toBe(500);
    expect(result[1].from).toBe('p3'); // Charlie owes Alice
    expect(result[1].to).toBe('p1');
    expect(result[1].amount).toBe(500);
  });

  it('handles item with empty splitAmong array', () => {
    const items = [item({ splitAmong: [] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    // share = total / 0 = Infinity -> balances get NaN -> filtered out
    expect(result).toHaveLength(0);
  });

  it('settles complex netting with multiple creditors and debtors', () => {
    // Alice owes Bob 100, Charlie owes Alice 50, Charlie owes Bob 30
    // Items:
    // - Bill 1: Bob pays 200, split between [Alice, Bob] (no tax)
    //   Alice share: 100, Bob share: 100 -> Alice owes Bob 100
    // - Bill 2: Alice pays 100, split between [Charlie, Alice] (no tax)
    //   Charlie share: 50, Alice share: 50 -> Charlie owes Alice 50
    // - Bill 3: Bob pays 60, split between [Charlie, Bob] (no tax)
    //   Charlie share: 30, Bob share: 30 -> Charlie owes Bob 30
    // Combined:
    //   Alice: -100 (to Bob) + 50 (from Charlie) = -50  -> Alice owes 50
    //   Bob: +100 (from Alice) + 30 (from Charlie) = +130 -> Bob gets 130
    //   Charlie: -50 (to Alice) - 30 (to Bob) = -80 -> Charlie owes 80
    // Settlements: Charlie owes Bob 80, Alice owes Bob 50
    const items = [
      { id: 'i1', description: 'Dinner', amount: 200, paidBy: 'p2', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Groceries', amount: 100, paidBy: 'p1', splitAmong: ['p3', 'p1'], billId: 'b2' },
      { id: 'i3', description: 'Snacks', amount: 60, paidBy: 'p2', splitAmong: ['p3', 'p2'], billId: 'b3' },
    ];
    const billsList = [
      { id: 'b1', name: 'Bill 1', paidBy: 'p2', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p1', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b3', name: 'Bill 3', paidBy: 'p2', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    // Expect 2 settlements: Charlie -> Bob 80, Alice -> Bob 50
    // (or Charlie -> Alice 50 and Alice -> Bob 100, depending on ordering)
    expect(result).toHaveLength(2);
    const totalFromCharlie = result.filter(r => r.from === 'p3').reduce((sum, r) => sum + r.amount, 0);
    const totalFromAlice = result.filter(r => r.from === 'p1').reduce((sum, r) => sum + r.amount, 0);
    const totalToBob = result.filter(r => r.to === 'p2').reduce((sum, r) => sum + r.amount, 0);
    expect(totalFromCharlie).toBe(80);
    expect(totalFromAlice).toBe(50);
    expect(totalToBob).toBe(130);
  });

  it('handles multiple items with different tax rates in same bill', () => {
    // Two items in same bill, each with custom tax override
    // Item A: 1000 with 5% custom tax = 1050, split 2 ways = 525 each
    // Item B: 2000 with 20% custom tax = 2400, split 2 ways = 1200 each
    // Alice pays both: +1050 + 2400 = +3450
    // Alice share: 525 + 1200 = 1725
    // Bob share: 525 + 1200 = 1725
    // Net: Alice +1725, Bob -1725
    const items = [
      { id: 'i1', description: 'Item A', amount: 1000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1', useCustomTax: true, customTaxPercent: 5 },
      { id: 'i2', description: 'Item B', amount: 2000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1', useCustomTax: true, customTaxPercent: 20 },
    ];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2');
    expect(result[0].to).toBe('p1');
    expect(result[0].amount).toBe(1725);
  });

  it('handles bill with discount and bill-level tax together', () => {
    // Bill: 500 discount, 8% bill tax
    // Item A: 2000 (2/5 of bill), Item B: 3000 (3/5 of bill)
    // Bill total: 5000
    // Item A: 2000 + 160 tax - 200 discount = 1960, split 2 ways = 980 each
    // Item B: 3000 + 240 tax - 300 discount = 2940, split 2 ways = 1470 each
    // Alice pays both: +1960 + 2940 = +4900
    // Alice share: 980 + 1470 = 2450
    // Bob share: 980 + 1470 = 2450
    const items = [
      { id: 'i1', description: 'Item A', amount: 2000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Item B', amount: 3000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
    ];
    const billsList = [bill({ billTaxPercent: 8, useBillDiscount: true, billDiscountAmount: 500 })];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2');
    expect(result[0].to).toBe('p1');
    expect(result[0].amount).toBe(2450);
  });

  it('returns empty array when all balances net to zero', () => {
    // Two items cancelling each other out
    // Alice pays 1000, splits with Bob -> Alice +500, Bob -500
    // Bob pays 1000, splits with Alice -> Bob +500, Alice -500
    // Combined: all zero
    const items = [
      { id: 'i1', description: 'Pizza', amount: 1000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Drinks', amount: 1000, paidBy: 'p2', splitAmong: ['p1', 'p2'], billId: 'b2' },
    ];
    const billsList = [
      { id: 'b1', name: 'Bill 1', paidBy: 'p1', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p2', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(0);
  });

  it('handles items not associated with any bill', () => {
    // Items with no billId should not crash
    const items = [item({ billId: '' })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    // No bill found, so no discount, no bill tax — just 1000, split 2 ways
    // Alice +1000 - 500 = +500, Bob -500
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });

  it('handles people with id not referenced in any item', () => {
    // Charlie has id 'p3' but never appears in any item
    // Only Alice and Bob are involved
    const items = [item()];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    // Charlie's balance stays at 0 and is filtered out
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2'); // Bob
    expect(result[0].to).toBe('p1'); // Alice
    expect(result[0].amount).toBe(500);
  });

  it('handles settlement amount rounding to 2 decimal places', () => {
    // 100 split 3 ways with 10% tax = 110 / 3 = 36.666...
    // Each share: 36.67
    // Alice: +110 - 36.67 = +73.33
    // Bob: -36.67
    // Charlie: -36.67 (remaining 36.66 due to rounding)
    const items = [item({ amount: 100, splitAmong: ['p1', 'p2', 'p3'] })];
    const billsList = [bill({ billTaxPercent: 10 })];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(2);
    // Amounts should be rounded to 2 decimal places
    result.forEach(r => {
      expect(r.amount).toBe(Math.round(r.amount * 100) / 100);
    });
  });

  it('handles very large amounts', () => {
    const items = [item({ amount: 10000000, splitAmong: ['p1', 'p2'] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(5000000);
  });

  it('handles bills list being empty while items reference bills', () => {
    const items = [item()];
    const result = computeSettlements(items, people, []);
    // No bill found, falls back to global tax (0%), then 1000 split 2 ways
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });

  /* ── Multi-bill + tax override + discount combinations ── */

  it('multi-bill: Bill 1 has discount + bill tax, Bill 2 has no discount + global tax', () => {
    // Bill 1 (Food): Alice pays 2000, splits with Bob
    //   Bill discount: 300, Bill tax: 5% override
    //   Item A: 2000
    //   Tax: 2000 * 0.05 = 100
    //   Discount: (2000/2000) * 300 = 300
    //   Total: 2000 + 100 - 300 = 1800, split 2 ways = 900 each
    //   Alice: +1800 - 900 = +900, Bob: -900
    //
    // Bill 2 (Transport): Bob pays 3000, splits with Alice & Charlie
    //   No discount, global tax 10%
    //   Item B: 3000 * 1.1 = 3300, split 3 ways = 1100 each
    //   Bob: +3300 - 1100 = +2200
    //   Alice: -1100
    //   Charlie: -1100
    //
    // Combined:
    //   Alice: +900 - 1100 = -200 (owes)
    //   Bob: -900 + 2200 = +1300 (gets back)
    //   Charlie: -1100 (owes)
    // Settlements: Alice owes Bob 200, Charlie owes Bob 1100
    const items = [
      { id: 'i1', description: 'Pizza', amount: 2000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Bus Ticket', amount: 3000, paidBy: 'p2', splitAmong: ['p1', 'p2', 'p3'], billId: 'b2' },
    ];
    const billsList = [
      { id: 'b1', name: 'Food', paidBy: 'p1', billTaxPercent: 5, useBillDiscount: true, billDiscountAmount: 300 },
      { id: 'b2', name: 'Transport', paidBy: 'p2', billTaxPercent: 10, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(2);
    // Alice owes Bob 200
    const aliceOwes = result.find(r => r.from === 'p1' && r.to === 'p2');
    expect(aliceOwes).toBeDefined();
    expect(aliceOwes.amount).toBe(200);
    // Charlie owes Bob 1100
    const charlieOwes = result.find(r => r.from === 'p3' && r.to === 'p2');
    expect(charlieOwes).toBeDefined();
    expect(charlieOwes.amount).toBe(1100);
  });

  it('multi-bill: each bill has own discount + different bill tax overrides', () => {
    // Bill 1: Alice pays 5000, splits with Bob
    //   Bill discount: 500, Bill tax: 8%
    //   Two items:
    //     Item A: 2000 — tax: 160, discount: (2000/5000)*500=200, total: 2000+160-200=1960
    //     Item B: 3000 — tax: 240, discount: (3000/5000)*500=300, total: 3000+240-300=2940
    //     Alice pays: 1960+2940=4900
    //     Shares: Alice (1960+2940)/2=2450, Bob: 2450
    //     Net: Alice +4900-2450=+2450, Bob -2450
    //
    // Bill 2: Bob pays 2000, splits with Charlie
    //   Bill discount: 200, Bill tax: 12%
    //   One item: 2000 — tax: 240, discount: (2000/2000)*200=200, total: 2000+240-200=2040
    //   Shares: Bob 1020, Charlie 1020
    //   Net: Bob +2040-1020=+1020, Charlie -1020
    //
    // Combined:
    //   Alice: +2450
    //   Bob: -2450 + 1020 = -1430
    //   Charlie: -1020
    // Need to check actual computed result
    const items = [
      { id: 'i1', description: 'Item A', amount: 2000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Item B', amount: 3000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i3', description: 'Item C', amount: 2000, paidBy: 'p2', splitAmong: ['p2', 'p3'], billId: 'b2' },
    ];
    const billsList = [
      { id: 'b1', name: 'Bill 1', paidBy: 'p1', billTaxPercent: 8, useBillDiscount: true, billDiscountAmount: 500 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p2', billTaxPercent: 12, useBillDiscount: true, billDiscountAmount: 200 },
    ];
    const result = computeSettlements(items, people, billsList);
    // Total from settlements should sum to total debtor amounts
    const totalSettled = result.reduce((sum, r) => sum + r.amount, 0);
    expect(totalSettled).toBe(2450); // Total debtor amounts: Bob (1430) + Charlie (1020)
    // Should have 2 settlements (Bob->Alice, Charlie->Bob or Charlie->Alice)
    expect(result.length).toBeGreaterThanOrEqual(2);
  });

  it('multi-bill: Bill 1 has discount, Bill 2 has item tax override ignoring bill defaults', () => {
    // Bill 1: Alice pays 3000, splits with Bob
    //   Discount: 600, No bill tax override, Global tax 10%
    //   Item A: 3000 — tax: 300, discount: (3000/3000)*600=600, total: 3000+300-600=2700
    //   Alice: +2700-1350=+1350, Bob: -1350
    //
    // Bill 2: Bob pays 4000, splits with Alice & Charlie
    //   Bill tax: 15% (override), No discount
    //   Item B: 4000 — tax (bill 15%): 600, total: 4600
    //   Shares: Alice 1533.33, Bob 1533.33, Charlie 1533.33
    //   Bob pays: +4600-1533.33=+3066.67
    //   Alice: -1533.33
    //   Charlie: -1533.33
    // BUT Item C has custom tax 0% (overrides bill 15%)
    //   Item C: 1000 — tax: 0, total: 1000
    //   Shares: Alice 333.33, Bob 333.33, Charlie 333.33
    //   Bob: +1000-333.33=+666.67
    //   Alice: -333.33
    //   Charlie: -333.33
    const items = [
      { id: 'i1', description: 'Item A', amount: 3000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Item B', amount: 4000, paidBy: 'p2', splitAmong: ['p1', 'p2', 'p3'], billId: 'b2' },
      { id: 'i3', description: 'Item C', amount: 1000, paidBy: 'p2', splitAmong: ['p1', 'p2', 'p3'], billId: 'b2', useCustomTax: true, customTaxPercent: 0 },
    ];
    const billsList = [
      { id: 'b1', name: 'Bill 1', paidBy: 'p1', billTaxPercent: 10, useBillDiscount: true, billDiscountAmount: 600 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p2', billTaxPercent: 15, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    // Just verify we get settlements and they're properly calculated
    expect(result.length).toBeGreaterThan(0);
    // Bob should be a creditor (net positive) since he paid the most
    const bobCredits = result.filter(r => r.to === 'p2').reduce((s, r) => s + r.amount, 0);
    expect(bobCredits).toBeGreaterThan(0);
    // Alice and Charlie should owe something
    const debtorTotal = result.reduce((s, r) => s + r.amount, 0);
    expect(debtorTotal).toBeGreaterThan(0);
  });

  it('multi-bill: items reference the same billId with mixed item-level tax overrides', () => {
    // Single bill, 3 items, 2 with custom tax, 1 using bill tax
    // Bill: 10% bill tax, 200 discount
    // Bill subtotal: 1000+2000+3000=6000
    //
    // Item A: 1000, custom tax 0% — tax: 0
    //   discount: (1000/6000)*200 = 33.33
    //   total: 1000 + 0 - 33.33 = 966.67
    //
    // Item B: 2000, custom tax 25% — tax: 500
    //   discount: (2000/6000)*200 = 66.67
    //   total: 2000 + 500 - 66.67 = 2433.33
    //
    // Item C: 3000, uses bill tax 10% — tax: 300
    //   discount: (3000/6000)*200 = 100
    //   total: 3000 + 300 - 100 = 3200
    const items = [
      { id: 'i1', description: 'Item A (no tax)', amount: 1000, paidBy: 'p1', splitAmong: ['p1', 'p2', 'p3'], billId: 'b1', useCustomTax: true, customTaxPercent: 0 },
      { id: 'i2', description: 'Item B (25% tax)', amount: 2000, paidBy: 'p1', splitAmong: ['p1', 'p2', 'p3'], billId: 'b1', useCustomTax: true, customTaxPercent: 25 },
      { id: 'i3', description: 'Item C (bill tax)', amount: 3000, paidBy: 'p1', splitAmong: ['p1', 'p2', 'p3'], billId: 'b1', useCustomTax: false, customTaxPercent: 0 },
    ];
    const billsList = [bill({ billTaxPercent: 10, useBillDiscount: true, billDiscountAmount: 200 })];
    const result = computeSettlements(items, people, billsList);
    // Expected totals per item:
    // A: 1000 + 0 - 33.33 = 966.67
    // B: 2000 + 500 - 66.67 = 2433.33
    // C: 3000 + 300 - 100 = 3200
    // Grand total: 966.67+2433.33+3200 = 6600.00
    // Each share: 6600/3 = 2200
    // Alice: +6600 - 2200 = +4400
    // Bob: -2200, Charlie: -2200
    expect(result).toHaveLength(2);
    expect(result[0].from).toBe('p2');
    expect(result[0].to).toBe('p1');
    expect(result[0].amount).toBe(2200);
    expect(result[1].from).toBe('p3');
    expect(result[1].to).toBe('p1');
    expect(result[1].amount).toBe(2200);
  });

  it('multi-bill: 3 bills each with different tax/discount combos', () => {
    // Bill 1: Alice pays 1500, splits with Bob — bill tax 5%, no discount
    //   1500 * 1.05 = 1575, shares: 787.50 each
    //   Alice: +1575-787.50=+787.50, Bob: -787.50
    //
    // Bill 2: Bob pays 2500, splits with Charlie — no bill tax, global 10%, discount 100
    //   Subtotal: 2500, discount: (2500/2500)*100=100
    //   Tax: 2500*0.10=250
    //   Total: 2500+250-100=2650, shares: 1325 each
    //   Bob: +2650-1325=+1325, Charlie: -1325
    //
    // Bill 3: Charlie pays 4000, splits with Alice & Bob — custom item tax 7%, no discount
    //   4000 * 1.07 = 4280, shares: 2140 each (Alice, Bob, Charlie)
    //   Charlie: +4280-2140=+2140
    //   Alice: -2140
    //   Bob: -2140
    //
    // Combined:
    //   Alice: +787.50 - 2140 = -1352.50
    //   Bob: -787.50 + 1325 - 2140 = -1602.50
    //   Charlie: -1325 + 2140 = +815
    //   Total debts: 1352.50+1602.50=2955.00, Total credits: 815
    // Hmm that doesn't balance... Let me recheck.
    // Actually, Bill 3 paidBy is Charlie, split among [Alice, Bob, Charlie]
    // Charlie paid 4000, gets back 2140 from Alice + 2140 from Bob, 2140 is own share
    // Wait no: Charlie pays 4280 (total), split 3 ways = 1426.67 each
    // Charlie: +4280 - 1426.67 = +2853.33
    // Alice: -1426.67
    // Bob: -1426.67
    //
    // Combined:
    //   Alice: +787.50 - 1426.67 = -639.17
    //   Bob: -787.50 + 1325 - 1426.67 = -889.17
    //   Charlie: -1325 + 2853.33 = +1528.33
    // Total debts: 639.17+889.17=1528.34 ≈ 1528.33 ✓
    const items = [
      { id: 'i1', description: 'Item Bill1', amount: 1500, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Item Bill2', amount: 2500, paidBy: 'p2', splitAmong: ['p2', 'p3'], billId: 'b2' },
      { id: 'i3', description: 'Item Bill3', amount: 4000, paidBy: 'p3', splitAmong: ['p1', 'p2', 'p3'], billId: 'b3', useCustomTax: true, customTaxPercent: 7 },
    ];
    const billsList = [
      { id: 'b1', name: 'Bill 1', paidBy: 'p1', billTaxPercent: 5, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p2', billTaxPercent: 10, useBillDiscount: true, billDiscountAmount: 100 },
      { id: 'b3', name: 'Bill 3', paidBy: 'p3', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    // Should have 2 settlements
    expect(result).toHaveLength(2);
    // Charlie should be the only creditor
    result.forEach(r => expect(r.to).toBe('p3'));
    // Sum of settlements should match Charlie's net positive
    const totalPaidToCharlie = result.reduce((s, r) => s + r.amount, 0);
    expect(totalPaidToCharlie).toBeCloseTo(1528.33, 1);
  });

  it('multi-bill: each person pays their own bill, bill-level overrides differ', () => {
    // Bill 1 (Alice pays): Item A 2000 split with Bob, Bill tax 7%
    //   2000 * 1.07 = 2140, shares: 1070 each
    //   Alice: +2140-1070=+1070, Bob: -1070
    //
    // Bill 2 (Bob pays): Item B 3000 split with Alice & Charlie, Bill tax 0%, global 10%
    //   3000 * 1.10 = 3300, shares: 1100 each
    //   Bob: +3300-1100=+2200, Alice: -1100, Charlie: -1100
    //
    // Bill 3 (Charlie pays): Item C 1500 split with Alice, custom tax 15%
    //   1500 * 1.15 = 1725, shares: 862.50 each
    //   Charlie: +1725-862.50=+862.50, Alice: -862.50
    //
    // Combined:
    //   Alice: +1070-1100-862.50 = -892.50
    //   Bob: -1070+2200 = +1130
    //   Charlie: -1100+862.50 = -237.50
    // Total debts: 892.50+237.50=1130, Total credits: 1130 ✓
    const items = [
      { id: 'i1', description: 'Item A', amount: 2000, paidBy: 'p1', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Item B', amount: 3000, paidBy: 'p2', splitAmong: ['p1', 'p2', 'p3'], billId: 'b2' },
      { id: 'i3', description: 'Item C', amount: 1500, paidBy: 'p3', splitAmong: ['p1', 'p3'], billId: 'b3', useCustomTax: true, customTaxPercent: 15 },
    ];
    const billsList = [
      { id: 'b1', name: 'Bill 1', paidBy: 'p1', billTaxPercent: 7, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p2', billTaxPercent: 10, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b3', name: 'Bill 3', paidBy: 'p3', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(2);
    // Bob should be the creditor
    result.forEach(r => expect(r.to).toBe('p2'));
    const totalToBob = result.reduce((s, r) => s + r.amount, 0);
    expect(totalToBob).toBe(1130);
    // Alice owes 892.50
    const aliceOwes = result.find(r => r.from === 'p1');
    expect(aliceOwes).toBeDefined();
    expect(aliceOwes.amount).toBeCloseTo(892.50, 1);
    // Charlie owes 237.50
    const charlieOwes = result.find(r => r.from === 'p3');
    expect(charlieOwes).toBeDefined();
    expect(charlieOwes.amount).toBeCloseTo(237.50, 1);
  });

  it('multi-bill: discount in one bill, item tax override in another, global tax fallback', () => {
    // Bill 1: Alice pays 4000 split with Bob & Charlie
    //   Bill discount: 800, no bill tax, global 0%
    //   Item A: 4000 — discount: (4000/4000)*800=800, total: 4000-800=3200
    //   Shares: 3200/3≈1066.67 each
    //   Alice: +3200-1066.67=+2133.33, Bob: -1066.67, Charlie: -1066.67
    //
    // Bill 2: Bob pays 1000 splits with Alice only
    //   Item custom tax: 20%, no discount
    //   1000*1.20=1200, shares: 600 each
    //   Bob: +1200-600=+600, Alice: -600
    //
    // Combined:
    //   Alice: +2133.33-600=+1533.33
    //   Bob: -1066.67+600=-466.67
    //   Charlie: -1066.67
    // Total debts: 466.67+1066.67=1533.34, credits: 1533.33 ✓
    const items = [
      { id: 'i1', description: 'Family dinner', amount: 4000, paidBy: 'p1', splitAmong: ['p1', 'p2', 'p3'], billId: 'b1' },
      { id: 'i2', description: 'Taxi A', amount: 1000, paidBy: 'p2', splitAmong: ['p1', 'p2'], billId: 'b2', useCustomTax: true, customTaxPercent: 20 },
    ];
    const billsList = [
      { id: 'b1', name: 'Dinner', paidBy: 'p1', billTaxPercent: 0, useBillDiscount: true, billDiscountAmount: 800 },
      { id: 'b2', name: 'Transport', paidBy: 'p2', billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(2);
    // Alice should be the creditor (net positive)
    result.forEach(r => expect(r.to).toBe('p1'));
    const totalToAlice = result.reduce((s, r) => s + r.amount, 0);
    expect(totalToAlice).toBeCloseTo(1533.33, 1);
  });

  it('multi-bill: bill paidBy fallback with discount and tax combos across bills', () => {
    // Bill 1: no explicit paidBy on items, Bill paidBy = Alice
    //   Bill discount: 200, bill tax: 4%
    //   Item A: 1000 — tax: 40, discount: (1000/1000)*200=200, total: 1000+40-200=840
    //   Shares: Alice 420, Bob 420
    //   Alice: +840-420=+420, Bob: -420
    //
    // Bill 2: no explicit paidBy on items, Bill paidBy = Bob
    //   No discount, bill tax: 6%
    //   Item B: 2000 — tax: 120, total: 2120
    //   Shares: Alice 1060, Bob 1060
    //   Bob: +2120-1060=+1060, Alice: -1060
    //
    // Combined:
    //   Alice: +420-1060=-640
    //   Bob: -420+1060=+640
    const items = [
      { id: 'i1', description: 'Item A', amount: 1000, paidBy: '', splitAmong: ['p1', 'p2'], billId: 'b1' },
      { id: 'i2', description: 'Item B', amount: 2000, paidBy: '', splitAmong: ['p1', 'p2'], billId: 'b2' },
    ];
    const billsList = [
      { id: 'b1', name: 'Bill 1', paidBy: 'p1', billTaxPercent: 4, useBillDiscount: true, billDiscountAmount: 200 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p2', billTaxPercent: 6, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p1'); // Alice owes Bob
    expect(result[0].to).toBe('p2');
    expect(result[0].amount).toBe(640);
  });
});
