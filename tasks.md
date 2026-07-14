# State of Survival Upgrade Calculator — Task List

## Phase 0 — Scaffold & Convert Data

- [x] Scaffold Vite + React + TypeScript project
- [x] Install dependencies (MUI, TanStack Table, React Hook Form, Zod, Recharts, xlsx)
- [x] Create folder structure per spec (`src/data/`, `src/features/`, etc.)
- [x] Copy Excel files from `examples/` to `src/data/excel/`
- [x] Write `scripts/convert-excel.js` (handles all 3 file formats)
- [x] Run conversion → generate `src/data/json/game-data.json`
- [x] Define TypeScript types in `src/types/index.ts`
- [x] Create Zod schemas & `src/services/dataService.ts`

## Phase 1 — Calculation Engine

- [x] Implement `getItemById`, `getLevelData`, `sumCosts` pure functions
- [x] Implement `getStatsAtLevel`, `computeNetGain`, `buildUpgradePath`
- [x] Write unit tests (Vitest) — 11 tests passing

## Phase 2 — State (React Context)

- [x] Create `CalculatorContext` with state & actions (useReducer)
- [x] Create `useCalculator` hook with memoized derived results

## Phase 3 — UI Components

- [x] UpgradeSelector (category → item dropdown)
- [x] LevelRangeInputs (current & target level with validation)
- [x] SummaryCard (totals overview)
- [x] ResourcesTable (per-upgrade breakdown)
- [x] BonusesTable (current → final → net gain)
- [x] UpgradePathTable (every intermediate step)
- [x] AppShell (responsive layout, MUI theme, CssBaseline)

## Phase 4 — Error Handling & Polish

- [x] Handle missing levels, invalid JSON, missing resources, out-of-bounds
- [x] MUI Alert for user-friendly messages (info, warning, error)
- [x] Responsive pass (Stack direction changes on breakpoints)
- [x] Memoization (useMemo/useCallback)

## Phase 5 — Future: Excel Re-import

- [x] Document re-import workflow in README
- [x] Graceful handling of unknown sheets/files in converter (skipped with warning)
- [x] Warn on structural changes in Excel files

## Backpack

- [x] Backpack page with materials and crates inventory
- [x] Dashboard "have vs need" comparison — reads `sos-calc-backpack` from localStorage, displays Have and Remaining columns per material, shows crate contributions as grey captions, includes crate summary card when no upgrades exist
