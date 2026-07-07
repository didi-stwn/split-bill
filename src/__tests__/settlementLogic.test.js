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
    expect(calcTotalWithTax(1000, 0.1)).toBe(1001);
  });

  it('handles large amounts without floating point errors', () => {
    expect(calcTotalWithTax(999999, 11)).toBe(1109998.89);
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
      useBillTax: false,
      billTaxPercent: 0,
      useBillDiscount: false,
      billDiscountAmount: 0,
      ...overrides,
    };
  }

  it('simple split: Alice pays 1000, splits with Bob equally', () => {
    const items = [item()];
    const billsList = [bill()];
    const result = computeSettlements(items, people, 0, billsList);
    // After settlement:
    //   Alice: +1000 (paid) - 500 (her share) = +500
    //   Bob: -500 (his share)
    // So Bob owes Alice 500
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2'); // Bob
    expect(result[0].to).toBe('p1'); // Alice
    expect(result[0].amount).toBe(500);
  });

  it('applies global tax correctly', () => {
    // 1000 with 10% tax = 1100 total
    // Split between Alice, Bob (550 each)
    // Alice: +1100 - 550 = +550
    // Bob: -550
    const items = [item()];
    const billsList = [bill()];
    const result = computeSettlements(items, people, 10, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(550);
  });

  it('applies bill tax override (Item > Bill > Global)', () => {
    // Global tax 10%, Bill tax override 5%
    // 1000 with 5% tax = 1050 total
    // Each: 1050 / 3 = 350
    const items = [item({ splitAmong: ['p1', 'p2', 'p3'] })];
    const billsList = [bill({ useBillTax: true, billTaxPercent: 5 })];
    const result = computeSettlements(items, people, 10, billsList);
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
    const billsList = [bill({ useBillTax: true, billTaxPercent: 5 })];
    const result = computeSettlements(items, people, 10, billsList);
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
    // Global tax: 10%
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
    const billsList = [bill({ useBillDiscount: true, billDiscountAmount: 400 })];
    const result = computeSettlements(items, people, 10, billsList);
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
      { id: 'b1', name: 'Food', paidBy: 'p1', useBillTax: false, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Transport', paidBy: 'p2', useBillTax: false, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, 0, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p1'); // Alice owes Bob
    expect(result[0].to).toBe('p2');
    expect(result[0].amount).toBe(500);
  });

  it('skips items with no effective paidBy', () => {
    const items = [item({ paidBy: '', billId: 'b1' })];
    const billsList = [bill({ paidBy: '' })];
    const result = computeSettlements(items, people, 0, billsList);
    expect(result).toHaveLength(0);
  });

  it('returns empty array when no items', () => {
    const result = computeSettlements([], people, 0, []);
    expect(result).toHaveLength(0);
  });

  it('handles three-way split', () => {
    // Alice pays 3000, splits 3 ways (Alice, Bob, Charlie), 10% tax
    // 3000 * 1.1 = 3300, each pays 1100
    // Alice: +3300 - 1100 = +2200
    // Bob: -1100
    // Charlie: -1100
    const items = [item({ amount: 3000, splitAmong: ['p1', 'p2', 'p3'] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, 10, billsList);
    expect(result).toHaveLength(2);
    // Bob owes Alice 1100, Charlie owes Alice 1100
    expect(result[0].amount).toBe(1100);
    expect(result[1].amount).toBe(1100);
  });

  it('resolves via the payer when bill paidBy is set (item has no own paidBy)', () => {
    // Item has no paidBy, but bill has paidBy = Alice
    const items = [item({ paidBy: '', billId: 'b1' })];
    const billsList = [bill({ paidBy: 'p1' })];
    const result = computeSettlements(items, people, 0, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].from).toBe('p2');
    expect(result[0].to).toBe('p1');
    expect(result[0].amount).toBe(500);
  });

  it('handles payer paying for themselves only (no split with others)', () => {
    // Alice pays 1000, splits only with herself -> no one else owes anything
    const items = [item({ paidBy: 'p1', splitAmong: ['p1'] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, 0, billsList);
    expect(result).toHaveLength(0);
  });

  it('handles person paying for item they are NOT part of the split', () => {
    // Alice pays 1000, split between Bob and Charlie only (500 each)
    // Alice: +1000 (paid) - 0 (not in split) = +1000
    // Bob: -500
    // Charlie: -500
    const items = [item({ paidBy: 'p1', splitAmong: ['p2', 'p3'] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, 0, billsList);
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
    const result = computeSettlements(items, people, 0, billsList);
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
      { id: 'b1', name: 'Bill 1', paidBy: 'p2', useBillTax: false, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p1', useBillTax: false, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b3', name: 'Bill 3', paidBy: 'p2', useBillTax: false, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, 0, billsList);
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
    const result = computeSettlements(items, people, 0, billsList);
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
    const billsList = [bill({ useBillTax: true, billTaxPercent: 8, useBillDiscount: true, billDiscountAmount: 500 })];
    const result = computeSettlements(items, people, 0, billsList);
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
      { id: 'b1', name: 'Bill 1', paidBy: 'p1', useBillTax: false, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
      { id: 'b2', name: 'Bill 2', paidBy: 'p2', useBillTax: false, billTaxPercent: 0, useBillDiscount: false, billDiscountAmount: 0 },
    ];
    const result = computeSettlements(items, people, 0, billsList);
    expect(result).toHaveLength(0);
  });

  it('handles items not associated with any bill', () => {
    // Items with no billId should not crash
    const items = [item({ billId: '' })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, 0, billsList);
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
    const result = computeSettlements(items, people, 0, billsList);
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
    const billsList = [bill()];
    const result = computeSettlements(items, people, 10, billsList);
    expect(result).toHaveLength(2);
    // Amounts should be rounded to 2 decimal places
    result.forEach(r => {
      expect(r.amount).toBe(Math.round(r.amount * 100) / 100);
    });
  });

  it('handles very large amounts', () => {
    const items = [item({ amount: 10000000, splitAmong: ['p1', 'p2'] })];
    const billsList = [bill()];
    const result = computeSettlements(items, people, 0, billsList);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(5000000);
  });

  it('handles bills list being empty while items reference bills', () => {
    const items = [item()];
    const result = computeSettlements(items, people, 0, []);
    // No bill found, falls back to global tax (0%), then 1000 split 2 ways
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(500);
  });
});
