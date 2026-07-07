# State of Survival Upgrade Calculator

## Project Overview

A web application for calculating upgrade costs in **State of Survival**.

Users can select items, choose current and target levels, and see:
- total resources required (per-item and combined)
- all stat bonuses gained between the selected levels
- per-upgrade resource breakdown
- upgrade path steps

Data comes from Excel spreadsheets converted to JSON.

---

## Tech Stack

- React + TypeScript
- Vite (bundler)
- Material UI v9 (components + theming with dark mode support)
- React Context + useReducer (state management)
- Zod (JSON validation)
- Recharts (if charts are needed later)
- xlsx (Excel parsing in the conversion script)

No backend. No TanStack Query (no remote data yet).

---

## Categories

There are 4 categories, each can be either **flat** (items directly on category) or **grouped** (items nested within groups):

| Category | Structure | Items |
|----------|-----------|-------|
| Formation System | 3 groups | 20 items across Plasma Wings (6), Plasma Fuselage (7), Plasma Engine (7) |
| Behemoth Enhancement | flat | MK III (98 levels), MK IV (131 levels) |
| Spacecraft | 2 groups | Spacecraft group (3 capsules), Enterprise group (5 capsules) |
| Aircraft | flat | AC04 (1 item) |

### Data Model

```ts
interface Bonus {
  type: string;
  value: number;
  unit: string;
}

interface UpgradeLevel {
  level: number;
  name?: string;
  costs: Record<string, number>;
  bonuses: Bonus[];
  benefit?: string;
  skillsUnlocked?: string[];
}

interface UpgradeItem {
  id: string;
  name: string;
  maxLevel: number;
  levels: UpgradeLevel[];
}

interface Group {
  name: string;
  items: UpgradeItem[];
}

interface Category {
  id: string;
  name: string;
  groups?: Group[];
  items?: UpgradeItem[];
}

interface CrateOption {
  materialKey: string;
  materialName: string;
  amount: number;
}

interface Crate {
  id: string;
  name: string;
  categoryId: string;
  options: CrateOption[];
}

interface GameData {
  version: string;
  lastUpdated: string;
  categories: Category[];
}
```

### Cost Keys (Resource Types)

Each category uses different resource keys, stored as full in-game material names:

- **Formation System**: `Tactical Analysis`
- **Behemoth Enhancement**: `MK III Fragment`, `MK IV Fragment` (per-item)
- **Spacecraft**: `Optical Storage Boards` / `Nuclear Fuel Rod` (depending on Capsule vs Enterprise), `Luminous Fiber`
- **Aircraft**: `Antimatter Coating`, `Reinforced Alloy`

---

## State Management

React Context + `useReducer`, persisted to `localStorage`.

### State Shape

```ts
interface CategoryState {
  selectedGroupName: string | null;
  selectedUpgrades: SelectedUpgrade[];
}

interface CalculatorState {
  categories: Category[];
  activeCategoryId: string | null;
  activeGroupName: string | null;
  activeUpgrades: SelectedUpgrade[];
  savedStates: Record<string, CategoryState>;
}
```

### Persistence

- localStorage key: `sos-calc-state`
- Written on every state change (via `useEffect`)
- Skipped when `activeCategoryId` is null (prevents overwriting saved data with empty initial state)
- Each category's state is stored separately under `savedStates[categoryId]`
- Switching categories preserves the previous category's state and restores the target category's state

### Actions

| Action | Effect |
|--------|--------|
| `SELECT_CATEGORY` | Saves current state to `savedStates`, switches to target category, restores its saved state or empty |
| `SELECT_GROUP` | Sets `activeGroupName`, saves to `savedStates` |
| `ADD_UPGRADE` | Appends item with `currentLevel=1, targetLevel=2`, saves |
| `REMOVE_UPGRADE` | Removes item, saves |
| `SET_UPGRADE_CURRENT` | Updates `currentLevel` for one item, saves |
| `SET_UPGRADE_TARGET` | Updates `targetLevel` for one item, saves |
| `HYDRATE` | Restores state from localStorage on mount (handles both old single-category and new multi-category format) |
| `RESET` | Clears everything including `savedStates` |

---

## UI Layout

Two-column responsive layout (MUI Grid):

- **Left sidebar** (4/12 on md+): Category selector, group selector (if grouped), per-item Add buttons
- **Right content** (8/12 on md+): Upgrade list, summary card, per-item tables

### Upgrade Selector (Left Sidebar)

- **Category dropdown** — always visible. Switching preserves other categories' state
- **Group dropdown** — only for grouped categories (Formation System, Spacecraft)
- **Add upgrades** section — shows all items in the current group (or all items for flat categories) with Add buttons. Already-added items show "Added" (disabled)
- **Clear saved data** — small trash icon (MUI `<DeleteIcon />`) with tooltip and confirmation dialog. Only visible when there are saved upgrades in any category (`hasSavedData`). Positioned left-aligned below the Add section.

### Upgrade List (Right Content)

Each selected item renders a card with:
- Item name
- **From** dropdown (Autocomplete) — shows all levels, always enabled
- **To** dropdown (Autocomplete) — shows only levels above the selected From, disabled (with dashed border + gray background) until From has a valid value
- Delete button (trash icon)

Default values when added: `currentLevel=1, targetLevel=2`.

### Results

Shown only when at least one upgrade has valid From/To values:

- **Summary Card** — combined total costs across all selected upgrades, plus upgrade count and component count
- **Welcome Card** — centered card with instructions shown when no category is selected (fresh start). Disappears once a category is chosen.
- **Per-item accordions** (collapsible, default closed, grouped per item):
  - Summary label shows item name + upgrade count (e.g. "MK III · 5 upgrades")
  - Expanded content includes:
    - **Stat Bonuses** — current stats, final stats, net gain per stat type
    - **Resources Per Upgrade** — per-step cost breakdown
    - **Upgrade Step** — intermediate levels

---

## Calculation Engine

Pure functions in `src/features/calculator/utils/calculator.ts`:

- `sumCosts(item, from, to)` — sums costs from `from+1` through `to`
- `getStatsAtLevel(item, level)` — returns bonuses at a given level
- `computeNetGain(currentBonuses, targetBonuses)` — difference per stat type
- `calculate(item, from, to)` — full result with totalCosts, currentBonuses, targetBonuses, netGain, upgradePath, upgradesCount

Rules:
- Never include current level costs
- Always include target level costs
- Upgrade path includes every step from `from+1` to `to`
- If `from >= to`, returns empty costs and zero gain

---

## Data Source

Excel files in `src/data/excel/` are the source of truth.

### Conversion Script

`scripts/convert-excel.js` is re-runnable:

- Reads all `.xlsx` files from `src/data/excel/`
- Detects format by sheet names:
  - **Formation**: has a "Summary" sheet → groups into 3 groups by sheet index order
  - **Behemoth**: has "MK III" or "MK IV" sheets → flat items with per-item fragment cost keys
  - **Spacecraft**: sheets starting with `Capsule_`, `Enterprise Capsule_`, or `AC04` → splits into Spacecraft and Enterprise groups
- Maps short cost column names from Excel to full in-game material names via `COST_KEY_MAP`:
  - `manuals` → `Tactical Analysis`
  - `boards` → `Optical Storage Boards`
  - `fiber` → `Luminous Fiber`
  - `fuel` → `Nuclear Fuel Rod`
  - `coating` → `Antimatter Coating`
  - `alloy` → `Reinforced Alloy`
- Writes `src/data/json/game-data.json`
- Run with: `node scripts/convert-excel.js`

### Re-import Flow

1. Update `.xlsx` files in `src/data/excel/`
2. Run `node scripts/convert-excel.js`
3. Refresh the browser

---

## Crate Conversion

Converts material requirements into crate counts. Located below the Summary Card in the right panel when results are shown.

### Data Source

Crate definitions live in `src/data/json/crates.json` (manually edited, not derived from Excel). Each crate has a category association and a list of material options (the "OR" choices from in-game crates).

```json
{
  "id": "ac-04-thunderbold-custom",
  "name": "AC 04 Thunderbold Custom Crate",
  "categoryId": "aircraft",
  "options": [
    { "materialKey": "Reinforced Alloy", "materialName": "Reinforced Alloy", "amount": 100 },
    { "materialKey": "Antimatter Coating", "materialName": "Antimatter Coating", "amount": 30 },
    { "materialKey": "Superconductive Rail", "materialName": "Superconductive Rail", "amount": 1 }
  ]
}
```

### Behavior

- **Category filtering** — only crates matching the current page's category are shown
- **Auto-detect** — when upgrades have costs, only crates with at least one matching material option appear. Irrelevant crates are hidden (e.g. MK III Crate hidden on MK IV page)
- **Table view** — all matching crates are shown simultaneously, each with its own table:
  | Material | Per crate | Total needed | Crates |
  |---|---|---|---|
  | Antimatter Coating | 30 | 270 | 9 |
  | Reinforced Alloy | 100 | 930 | 10 |
- **Crate count** — `Math.ceil(totalNeeded / perCrateAmount)` per row
- **Auto-preselect** — if only one crate exists for the category, it's auto-selected
- **Manual fallback** — when no upgrade costs match any crate option (e.g. no upgrades selected), a crate selector + material dropdown + amount field + single result line are shown for manual input
- **No backup** — crates.json is excluded from the backup system (static data)

### Services

- `getCrates()` — returns all crates
- `getCratesByCategory(categoryId)` — filter by category
- `getCrateById(id)` — single crate lookup

### Crate Option Matching

The `materialKey` field in each crate option must match the cost key in `game-data.json`. The conversion script uses `COST_KEY_MAP` to output full material names as cost keys, ensuring auto-matching works (e.g. `"Tactical Analysis"` from the script matches the Formation System Crate's `"Tactical Analysis"` option).

## Backup System

Visible only with `?mode=dev` query parameter:

- **Export to JSON** — downloads the full `localStorage` state as a `.json` file (all categories preserved)
- **Import from JSON** — validates file shape (accepts old single-category and new multi-category format), writes to `localStorage`, auto-reloads the page

---

## Version System

The app version is defined in `package.json` and imported via `src/version.ts`:

```ts
import { version } from '../../package.json';
export const APP_VERSION = version;
```

### Footer

A footer bar at the bottom of the right column shows:
- **Left**: version number (e.g. `v0.1.0-beta`)
- **Right**: "What's new" button with a red dot badge on first visit to a new version

### What's New Dialog

Opens when clicking "What's new" in the footer. Shows the latest entry from `CHANGELOG.md` (imported as raw text via Vite's `?raw` suffix). A "Got it" button stores the current version to `localStorage` (`sos-calc-last-version`), which dismisses the badge dot until the next version update.

### Changelog

`CHANGELOG.md` in the project root uses Keep a Changelog format with user-facing language (features and behavior changes, not technical details).

## Error Handling

- Invalid game data JSON → Zod validation error with descriptive message
- Invalid backup file on import → alert with message
- Corrupted localStorage → silently removed on next load
- Stale item IDs (removed from game data) → filtered out during HYDRATE
- Missing levels → skipped in calculation

---

## Testing

Run with: `npm test` (vitest)

### Current Coverage

- `src/features/calculator/utils/__tests__/calculator.test.ts` — 11 tests for `sumCosts`, `getStatsAtLevel`, `computeNetGain`, `calculate`

### Test Requirements

- Calculation logic must be pure functions independent of React
- Reducer logic can be tested by exporting the reducer function
- Component tests require `@testing-library/react`

---

## Build & Dev

```
npm install
npm run dev             # dev server
npm run build           # standard build (needs server: npm run preview)
npm run build:offline   # single self-contained HTML file, opens in any browser
npm run preview         # preview the standard build
npm test                # run tests
```

### Offline Distribution

After `npm run build:offline`, share `dist/calculator.html` with anyone. No install, no server — just double-click to open in any browser. The file is ~750KB and contains all code, styles, and assets inlined.
