# State of Survival Upgrade Calculator

A web application for calculating upgrade costs in **State of Survival**.

## Tech Stack

- React + TypeScript
- Vite
- Material UI
- TanStack Table
- React Hook Form + Zod
- Recharts

## Getting Started

```
npm install
npm run dev
```

## Build

```
npm run build            # standard build (requires a server: npm run preview)
npm run build:offline    # single self-contained HTML file, opens in any browser
```

After `npm run build:offline`, share `dist/calculator.html` — just double-click to open.

## Test

```
npm test
```

## Data Source

Game data is stored in `src/data/excel/` as `.xlsx` files.

### Adding or Updating Data

1. Place `.xlsx` files in `src/data/excel/`
2. Run `node scripts/convert-excel.js`
3. The script reads all Excel files and generates `src/data/json/game-data.json`
4. Commit both the Excel files and the updated JSON

### Supported Excel Formats

- **Formation System**: sheets named per component (Flight Cabin Expansion, etc.) with columns Level, Effect, Manuals
- **Behemoth Enhancement**: sheets MK III, MK IV with stat columns and Fragments Required
- **Spacecraft**: sheets Capsule_1, Capsule_2, Capsule_3, AC04, Enterprise Capsule_1–5

Unknown sheets or unsupported file formats are skipped with a warning.
