# SplitBill

A frontend-only **SplitBill** application for splitting expenses among friends. Built with React and Tesseract.js for OCR receipt scanning — no backend, no database, everything runs entirely in the browser. Supports **multiple bills** with a **hybrid tax system** (default global tax + per-bill override + per-item override) and **per-bill fixed discount**.

## Features

- **📷 Receipt Scanner** — Upload a receipt image and automatically parse item names & amounts using Tesseract.js (browser-based OCR)
- **📝 Items Management** — Add, edit, and delete items with description, amount, payer, and split assignment
- **👥 People Management** — Smart inline CRUD dropdown for creating, editing, or removing people directly in `Paid by` and `Split among` fields
- **🧾 Multi-Bill Support** — Organize items into separate bills with custom names, colored headers, and individual paid-by assignments
- **💵 Per-Bill Tax Override** — Each bill can override the global tax with its own tax percentage (priority: Item override > Bill override > Global)
- **🏷️ Per-Bill Discount** — Each bill supports a fixed Rp discount amount (checkbox + number input). Discount is split proportionally across items in the bill and displayed in the Tax & Discount breakdown
- **🧾 Hybrid Tax (Global + Override)** — Set a global default tax percentage applied to all items, with optional per-bill and per-item tax overrides
- **📊 Settlement Summary** — Automatically computes who owes whom with greedy debtor→creditor matching; shows subtotal, tax breakdown, discount, and grand total. Each settlement item has a checkbox to mark as done (checked items move to bottom, sorted by name)
- **⚖️ Balance Detail** — Per-person net position breakdown showing who gets back (green), who owes (red), and who is settled (grey)
- **🖼️ Export to PNG** — Export the Bills and Summary sections as a PNG image with clean text (removes inputs, buttons, and interactive elements)

## Sections

The app is organized into three main sections:

1. **Receipt Scanner** — Upload image → OCR → Edit parsed items (description, amount, payer, split, bill assignment) → Add all to items
2. **Bills** — Multiple bill cards, each containing:
   - **Bill Header**: Bill name, Paid By (PersonSelect), Override Bill Tax (checkbox + % input), Discount (checkbox + Rp input)
   - **Items**: List of items belonging to the bill with split assignment
   - **Add Item**: Inline form to add new items to the specific bill
   - **Tax & Discount Section** at the bottom: Subtotal → Global Tax → per-bill taxes → per-bill discounts → Grand Total
3. **Summary** — Stats (items, people, subtotal, tax, discount, total), settlement transfer list (sortable by name, checkbox to mark done), and Balance Detail breakdown

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework |
| [Tesseract.js](https://tesseract.projectnaptha.com/) | Browser-based OCR (WebAssembly) |
| [html2canvas](https://html2canvas.hertzen.com/) | DOM-to-PNG export |
| [lucide-react](https://lucide.dev/) | Icon library |

## Getting Started

### Prerequisites

- Node.js 16+
- npm

### Install

```bash
npm install
```

### Run (development)

```bash
npm start
```

Opens [http://localhost:3000](http://localhost:3000) in your browser. The page reloads on changes.

### Build (production)

```bash
npm run build
```

Produces an optimised bundle in the `build/` folder. Ready for static deployment.

## Project Structure

```
src/
├── App.js                  # Main orchestrator — state, callbacks, layout, global tax percent
├── App.css                 # All component styles (light theme)
├── components/
│   ├── ItemsSection.js     # Multi-bill cards, items list, add forms, global tax + discount section
│   ├── ItemRow.js          # Single item display & inline editing (supports custom tax override)
│   ├── OcrScanner.js       # Receipt image upload, OCR, parsed-items table with bill assignment
│   ├── PersonSelect.js     # Smart dropdown: select/create/edit/delete people
│   ├── SummarySection.js   # Stats cards + tax/discount-aware settlement list + checkboxes + Balance Detail
│   └── ExportButton.js     # PNG export using DOM cloning + html2canvas
public/
├── index.html              # Updated meta tags, favicon, Inter font
├── manifest.json           # PWA manifest (SplitBill, blue theme)
├── favicon.svg             # Receipt SVG icon
└── robots.txt
```

## Data Flow

1. **People** are stored in [`App.js`](src/App.js) state as `[{ id, name }]` and shared via `personProps`
2. **Bills** are stored as `[{ id, name, paidBy, useBillTax, billTaxPercent, useBillDiscount, billDiscountAmount }]` — each bill can optionally override global tax and/or apply a fixed discount
3. **Items** are stored as `[{ id, description, amount, paidBy, splitAmong, useCustomTax, customTaxPercent, billId }]` — items are linked to a bill via `billId` and can optionally override the bill/global tax
4. **Tax Priority Chain** — `Item custom tax override` → `Bill tax override` → `Global tax`. Each item uses the first available tax in this chain
5. **Discount** — Each bill has a fixed `billDiscountAmount` (in Rp). When enabled, the discount is split proportionally across items in that bill based on each item's share of the bill subtotal
6. **Tax is calculated on the original item amount** (before discount). Discount is applied as a separate reduction after tax
7. **Settlements** are computed in [`SummarySection.js`](src/components/SummarySection.js) using greedy matching: each item's total (amount + tax - discount) is added to the payer's balance and divided equally among the split group
8. **OCR** parses receipt lines with regex, returns items with default payer & split, then merged into items via `handleOcrItems`
9. **Export** clones the DOM nodes, replaces PersonSelect/person-select/inputs/buttons with plain text, then renders to PNG via html2canvas at 2× scale

## Usage

1. **Add people** — Click `Paid by` dropdown → `+ Add person` → type name, or use the `New name…` input next to `Split among`
2. **Add bills** — Click `Add Bill` to create a new bill card. Name it and assign a paid-by person
3. **Add items** — Inside each bill card, click `Add item to this bill` → fill description, amount, split → submit
4. **Per-bill tax override** — In the bill header, check **Override Bill Tax** and enter a custom % (e.g., 5%). This overrides the global tax for all items in that bill (unless an item has its own custom tax override)
5. **Per-bill discount** — In the bill header, check **Discount** and enter a fixed Rp amount. The discount is split proportionally across items in the bill and displayed as a green line in the Tax & Discount section
6. **Per-item tax override** — While adding/editing an item, check **Override tax** and enter a custom % (e.g., 0% for tax-free items). This takes highest priority in the tax chain
7. **Scan receipt** — Drop or click to upload image → wait for OCR → edit parsed items in the table → assign to a bill → `Add All to Items`
8. **Set global tax** — At the bottom of Bills section, enter a default tax percentage in the Global Tax row; grand total updates automatically
9. **View settlements** — The Summary section shows who owes whom, including tax and discount adjustments. Check off settlements as they're completed — checked items move to the bottom
10. **View Balance Detail** — Below settlements, see each person's net position (gets back in green, owes in red)
11. **Export as PNG** — Click `Export as PNG` to download a clean image of the Bills and Summary sections

## License

MIT
