# SplitBill

A frontend-only **SplitBill** application for splitting expenses among friends. Built with React and Tesseract.js for OCR receipt scanning — no backend, no database, everything runs entirely in the browser.

![SplitBill Screenshot](./public/favicon.svg)

## Features

- **📷 Receipt Scanner** — Upload a receipt image and automatically parse item names & amounts using Tesseract.js (browser-based OCR)
- **📝 Items Management** — Add, edit, and delete items with description, amount, payer, and split assignment
- **👥 People Management** — Smart inline CRUD dropdown for creating, editing, or removing people directly in `Paid by` and `Split among` fields
- **💰 Global Tax** — Set a single tax percentage applied to all items; shows subtotal, tax amount, and grand total
- **📊 Settlement Summary** — Automatically computes who owes whom with greedy debtor→creditor matching; shows per-item amounts with tax breakdown

## Sections

The app is organized into three main sections:

1. **Receipt Scanner** — Upload image → OCR → Edit parsed items (description, amount, payer, split) → Add all to items
2. **Items** — Add new items manually, view/edit/delete existing items; global tax input at the bottom with subtotal/tax/grand-total
3. **Summary** — Stats (items, people, subtotal, tax, total, settlements) and settlement transfer list showing who pays whom

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
├── App.js                  # Main orchestrator — state, callbacks, layout
├── App.css                 # All component styles (light theme)
├── components/
│   ├── ItemsSection.js     # Items list + add form + global tax section
│   ├── ItemRow.js          # Single item display & inline editing
│   ├── OcrScanner.js       # Receipt image upload, OCR, parsed-items table
│   ├── PersonSelect.js     # Smart dropdown: select/create/edit/delete people
│   └── SummarySection.js   # Stats cards + settlement list (tax-aware)
public/
├── index.html              # Updated meta tags, favicon, Inter font
├── manifest.json           # PWA manifest (SplitBill, blue theme)
├── favicon.svg             # Receipt SVG icon
└── robots.txt
```

## Data Flow

1. **People** are stored in [`App.js`](src/App.js) state as `[{ id, name }]` and shared via `personProps`
2. **Items** are stored as `[{ id, description, amount, paidBy, splitAmong }]` — no per-item tax (tax is global)
3. **Global Tax** is a single `taxPercent` number in [`App.js`](src/App.js) state, passed down to `ItemsSection` and `SummarySection`
4. **OCR** parses receipt lines with regex, returns items with default payer & split, then merged into items via `handleOcrItems`
5. **Settlements** are computed in `SummarySection` using greedy matching: each item's total with tax is divided equally among the split group

## Usage

1. **Add people** — Click `Paid by` dropdown → `+ Add person` → type name, or use the `New name…` input next to `Split among`
2. **Add items** — Click `Add Item` → fill description, amount, paid by, split → submit
3. **Scan receipt** — Drop or click to upload image → wait for OCR → edit parsed items in the table → `Add All to Items`
4. **Set tax** — At the bottom of Items section, enter a tax percentage; grand total updates automatically
5. **View settlements** — The Summary section shows who owes whom, including tax in the calculations

## License

MIT
