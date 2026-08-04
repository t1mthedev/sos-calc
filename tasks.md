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

## Backlog

- [ ] Add FA-1 Specter data under Aircraft section (https://state-of-survival.fandom.com/wiki/FA-1_Specter)
- [ ] Add Vehicles section — purple vehicles (Gen 1 & Gen 2), mechs levels & skills (https://state-of-survival.fandom.com/wiki/War_Vehicles_-_Infantry, /wiki/Mechs)
- [ ] Add MK V data
- [ ] Add Hero Appointment section (https://state-of-survival.fandom.com/wiki/Hero_Appointment)

## Future: Tile-based category pages

- [x] Behemoth page — MK/section card flow (`BehemothPage`, `BehemothSelector`)
- [x] Spacecraft page — type tiles (Spacecraft / Enterprise) → detail (`SpacecraftPage`, `SpacecraftSelector`)
- [x] Aircraft page — type tiles (Aircraft / Carrier) → detail (`AircraftPage`, `AircraftSelector`)

## Carrier (FHS Ark CV-1)

- [x] Import LEVEL STATISTICS & COST — 35 levels, cost in Specialized Steel, bonus Health/Damage %. Scraper `scripts/scrape-carrier.mjs` → `src/data/excel/carrier.xlsx` → `parseCarrier` in `convert-excel.js`; aircraft category is now grouped (Aircraft / Carrier)
- [ ] Import SKILL DESCRIPTIONS & COST — skills: Joint Strike (incl. 6-star table), Firestorm, Tidal Assault, Shatter Defenses. Costs in Specialized Steel + Carbon-Based Composite; descriptions are the benefit text
- [ ] Decide/verify modeling: wiki shows "Total Per Component"=119 and "Total For All Components"=714 (×6 components); we currently use per-level costs as shown (scraper sum=118, wiki's own summary is off by 1 on the 26-35 range)
