# SplitBill

A frontend-only **SplitBill** application for splitting expenses among friends. Built with React and Tesseract.js for OCR receipt scanning — no backend, no database, everything runs entirely in the browser. Supports a **hybrid tax system**: a default global tax percentage for all items, with optional per-item tax overrides.

## Features

- **📷 Receipt Scanner** — Upload a receipt image and automatically parse item names & amounts using Tesseract.js (browser-based OCR)
- **📝 Items Management** — Add, edit, and delete items with description, amount, payer, and split assignment
- **👥 People Management** — Smart inline CRUD dropdown for creating, editing, or removing people directly in `Paid by` and `Split among` fields
- **🧾 Hybrid Tax** — Set a global default tax percentage applied to all items, with optional **per-item tax override** (checkbox + custom %). Items with custom tax are excluded from global tax automatically
- **📊 Settlement Summary** — Automatically computes who owes whom with greedy debtor→creditor matching; shows subtotal, global tax, other tax (custom), and grand total. Each settlement item has a checkbox to mark as done (checked items move to bottom, sorted by name)

## Sections

The app is organized into three main sections:

1. **Receipt Scanner** — Upload image → OCR → Edit parsed items (description, amount, payer, split) → Add all to items
2. **Items** — Add new items manually, view/edit/delete existing items; global tax input at the bottom; per-item tax override via checkbox + custom %; subtotal/global tax/other tax/grand-total breakdown
3. **Summary** — Stats (items, people, subtotal, global tax, other tax, total) and settlement transfer list (sortable by name, checkbox to mark done)

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [React 19](https://react.dev/) | UI framework |
| [Tesseract.js](https://tesseract.projectnaptha.com/) | Browser-based OCR (WebAssembly) |
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
│   ├── ItemsSection.js     # Items list + add form + global tax section + per-item tax override
│   ├── ItemRow.js          # Single item display & inline editing (supports custom tax override)
│   ├── OcrScanner.js       # Receipt image upload, OCR, parsed-items table
│   ├── PersonSelect.js     # Smart dropdown: select/create/edit/delete people
│   └── SummarySection.js   # Stats cards + tax-aware settlement list + checkboxes for done
public/
├── index.html              # Updated meta tags, favicon, Inter font
├── manifest.json           # PWA manifest (SplitBill, blue theme)
├── favicon.svg             # Receipt SVG icon
└── robots.txt
```

## Data Flow

1. **People** are stored in [`App.js`](src/App.js) state as `[{ id, name }]` and shared via `personProps`
2. **Items** are stored as `[{ id, description, amount, paidBy, splitAmong, useCustomTax, customTaxPercent }]` — items can optionally override the global tax
3. **Hybrid Tax** — [`App.js`](src/App.js) holds a global `globalTaxPercent` state. Each item has `useCustomTax` (boolean) and `customTaxPercent` (number). When `useCustomTax` is `true`, the global tax is **not** applied to that item; instead its `customTaxPercent` is used. Items with `useCustomTax: false` use the global tax. This allows mixed scenarios (e.g., some items taxed at 10%, others at 0% or 15%).
4. **OCR** parses receipt lines with regex, returns items with default payer & split, then merged into items via `handleOcrItems`
5. **Settlements** are computed in `SummarySection` using greedy matching: each item's total with effective tax (global or custom) is divided equally among the split group

## Usage

1. **Add people** — Click `Paid by` dropdown → `+ Add person` → type name, or use the `New name…` input next to `Split among`
2. **Add items** — Click `Add Item` → fill description, amount, paid by, split → submit
3. **Per-item tax override** — While adding/editing an item, check **Override tax** and enter a custom % (e.g., 0% for tax-free items). The global tax will not apply to items with custom override
4. **Scan receipt** — Drop or click to upload image → wait for OCR → edit parsed items in the table → `Add All to Items`
5. **Set global tax** — At the bottom of Items section, enter a default tax percentage; grand total updates automatically. Items with custom override are excluded from global tax
6. **View settlements** — The Summary section shows who owes whom, including tax. Check off settlements as they're completed — checked items move to the bottom

## License

MIT
