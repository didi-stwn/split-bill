# SplitBill

A frontend-only **SplitBill** application for splitting expenses among friends. Built with React and Tesseract.js for OCR receipt scanning — no backend, no database, everything runs entirely in the browser. Supports **multiple bills** with a **per-bill tax** (required) and **per-item tax override**, plus **per-bill fixed discount**.

## Features

- **📷 Receipt Scanner** — Upload a receipt image and automatically parse item names & amounts using Tesseract.js (browser-based OCR). Configure bill name, bill paid by, bill tax, and discount before adding items
- **📝 Items Management** — Add, edit, and delete items with description, amount, payer, and split assignment
- **👥 People Management** — Smart inline CRUD dropdown for creating, editing, or removing people directly in `Paid by` and `Split among` fields
- **🧾 Multi-Bill Support** — Organize items into separate bills with custom names and individual paid-by assignments
- **💵 Per-Bill Tax (Required)** — Each bill has a mandatory tax percentage input (no checkbox toggle). This is the default tax for all items in the bill
- **🏷️ Per-Bill Discount** — Each bill supports a fixed Rp discount amount (checkbox + number input). Discount is split proportionally across items in the bill and displayed in the Tax & Discount breakdown
- **📊 Settlement Summary** — Automatically computes who owes whom with greedy debtor→creditor matching; shows subtotal, tax breakdown, discount, and grand total. Each settlement item has a checkbox to mark as done (checked items move to bottom, sorted by name)
- **⚖️ Balance Detail** — Per-person net position breakdown showing who gets back (green), who owes (red), and who is settled (grey), with per-bill share breakdown
- **🖼️ Export to PNG** — Export the Bills and Summary sections as a PNG image with clean text (removes inputs, buttons, and interactive elements)

## Sections

The app is organized into three main sections:

1. **Receipt Scanner** — Upload image → OCR → Edit parsed items (description, amount, bill name, bill paid by, bill tax, discount) → Add all to items
2. **Bills** — Multiple bill cards, each containing:
   - **Bill Header**: Bill name, Paid By (PersonSelect), Bill Tax (% input, always active), Discount (checkbox + Rp input)
   - **Items**: List of items belonging to the bill with split assignment
   - **Add Item**: Inline form to add new items to the specific bill
   - **Tax & Discount Section** at the bottom: Subtotal → per-bill taxes → per-bill discounts → Grand Total
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
├── App.js                  # Main orchestrator — state, callbacks, layout
├── App.css                 # All component styles (light theme)
├── components/
│   ├── ItemsSection.js     # Multi-bill cards, items list, add forms, tax + discount section
│   ├── ItemRow.js          # Single item display & inline editing (supports custom tax override)
│   ├── OcrScanner.js       # Receipt image upload, OCR, parsed-item cards with bill assignment
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
2. **Bills** are stored as `[{ id, name, paidBy, billTaxPercent, useBillDiscount, billDiscountAmount }]` — each bill has a required tax percentage and optional discount
3. **Items** are stored as `[{ id, description, amount, paidBy, splitAmong, useCustomTax, customTaxPercent, billId }]` — items are linked to a bill via `billId` and can optionally override the bill tax with a custom tax
4. **Tax Priority Chain** — `Item custom tax override` → `Bill tax` (required). Each item uses the first available tax in this chain
5. **Discount** — Each bill has a fixed `billDiscountAmount` (in Rp). When enabled, the discount is split proportionally across items in that bill based on each item's share of the bill subtotal
6. **Tax is calculated on the original item amount** (before discount). Discount is applied as a separate reduction after tax
7. **Settlements** are computed in [`SummarySection.js`](src/components/SummarySection.js) using greedy matching: each item's total (amount + tax - discount) is added to the payer's balance and divided equally among the split group
8. **OCR** parses receipt lines with regex, returns items with configurable payer, split, bill tax, and discount, then merged into items via `handleOcrItems`
9. **Export** clones the DOM nodes, replaces PersonSelect/person-select/inputs/buttons with plain text, then renders to PNG via html2canvas at 2× scale

## Usage

1. **Add people** — Click `Paid by` dropdown → `+ Add person` → type name, or use the `New name…` input next to `Split among`
2. **Add bills** — Click `Add Bill` to create a new bill card. Name it, assign a paid-by person, and set the bill tax percentage
3. **Add items** — Inside each bill card, click `Add item to this bill` → fill description, amount, split → submit
4. **Bill Tax** — Each bill has a built-in tax percentage input (always active). This is the default tax applied to all items in that bill
5. **Per-bill discount** — In the bill header, check **Discount** and enter a fixed Rp amount. The discount is split proportionally across items in the bill and displayed as a green line in the Tax & Discount section
6. **Per-item tax override** — While adding/editing an item, check **Override tax** and enter a custom % (e.g., 0% for tax-free items). This takes highest priority in the tax chain
7. **Scan receipt** — Drop or click to upload image → wait for OCR → edit parsed items → configure bill name, paid by, bill tax, and discount → `Add All to Items`
8. **View settlements** — The Summary section shows who owes whom, including tax and discount adjustments. Check off settlements as they're completed — checked items move to the bottom
9. **View Balance Detail** — Below settlements, see each person's net position (gets back in green, owes in red, settled in grey) with per-bill breakdown
10. **Export as PNG** — Click `Export as PNG` to download a clean image of the Bills and Summary sections

## License

MIT
