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
});
