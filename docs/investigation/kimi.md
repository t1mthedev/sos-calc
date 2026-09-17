# Kimi Independent Investigation

## 1. Independent Project Understanding

`sos-calc` is a client-only React + TypeScript SPA that calculates upgrade costs for *State of Survival*. There is no backend.

**High-level data flow:**

```
Fandom wiki → scripts/scrape-*.mjs → src/data/excel/*.xlsx
            → scripts/convert-excel.js → src/data/json/game-data.json
            → src/services/dataService.ts (Zod validation + accessors)
            → src/features/calculator/hooks/useCalculator.tsx (state + persistence)
            → React components
```

**State & persistence:**
- `CalculatorProvider` uses `useReducer` + React Context.
- Calculator plans are persisted to `localStorage` key `sos-calc-state` (only `activeCategoryId` and `savedStates`).
- Backpack inventory is persisted to `sos-calc-backpack`.
- Cross-tab sync listens to `storage` events and dispatches `SYNC_STORAGE`.
- `HYDRATE` migrates legacy `savedStates["__behemoth__"]` into `behemoth-skills`.

**Key categories in `game-data.json`:**
- `formation-system` (grouped)
- `behemoth-enhancement`, `behemoth-levels`, `behemoth-skills` (behemoth is exposed as a single tile page)
- `spacecraft`, `aircraft`, `vehicles` (grouped tile pages)
- `mech-enhancement`, `mech-skills` (nested under `/calculator/vehicles/mechs`)
- `hero-appointment` (grouped, generic `CalculatorPage`)

**Important execution paths:**
- Tile pages (`BehemothPage`, `SpacecraftPage`, `AircraftPage`, `VehiclesPage`, `MechPage`) dispatch `SYNC_BEHEMOTH`, `SYNC_MECH`, or `HYDRATE_FROM_URL` from URL params.
- `useCalculator` derives `visibleUpgrades`, `results`, and `combinedCosts`.
- `calculate()` in `utils/calculator.ts` does the pure math and is unit-tested.

---

## 2. Review of DeepSeek Findings

| Finding | DeepSeek Conclusion | Kimi Verdict | Evidence |
|---|---|---|---|
| Version mismatch breaks “What’s new” badge | Confirmed bug | **CONFIRMED** | `package.json` `0.4.0-beta`; `CHANGELOG.md` latest `0.5.1-beta`; `AppFooter` compares `APP_VERSION` with last-seen version saved from changelog; they can never match. |
| Behemoth MK I/II “levels” bonuses are garbage | Confirmed bug | **CONFIRMED** | `parseBehemothLevels` uses `Benefit` text as `type` and `BenefitPct` as value; for MK I/II `Benefit` contains strings like `"+230, +138, +1,382"` and `BenefitPct` is 0. `game-data.json` shows `mk-mk-i`/`mk-mk-ii` bonuses with `type: "+230, ...", value: 0`. |
| BundleConversion unit mismatch (crate-based branch) | Confirmed bug | **CONFIRMED** | `BundleConversion.tsx` line 86 sets `totalNeeded: cratesNeeded` (crate count) while `qtyPerBundle` is material quantity. Column header is generic “Needed”. |
| SummaryCard missing on all tile-based pages | Confirmed regression | **CONFIRMED** | `SummaryCard` is imported/rendered only in `CalculatorPage.tsx`. `BehemothPage`, `SpacecraftPage`, `AircraftPage`, `VehiclesPage`, `MechPage` all omit it. |
| Combined behemoth/mech selectors are dead code | High confidence | **CONFIRMED with nuance** | Top-level combined behemoth view (`/calculator/behemoth`) is a landing card page with no results. Per-MK combined view (`/calculator/behemoth/:mk`) exists but `SYNC_BEHEMOTH` with `section: null` clears `activeUpgrades`, so the combined-results branch in `useCalculator` never has inputs. `SYNC_MECH` with `section: null` does the same. |
| MK V data inconsistency | High confidence | **CONFIRMED** | `behemoth-mk-v-custom` crate offers Serum/Biobattery/fragments; MK V skills cost `Neuronal Medium`; MK V levels cost `Serum` with empty bonuses. No crate provides Neuronal Medium for MK V skills. |
| Group-scoped filtering omits grouped generic categories | Could be intentional | **PARTIALLY CONFIRMED / uncertain intent** | `GROUP_SCOPED_CATEGORIES = new Set(['aircraft','spacecraft','vehicles'])`; `formation-system` and `hero-appointment` are grouped but not in the set, so switching groups does not filter the upgrade list. This contradicts the group-selector UX but may be intentional. |
| MK I/II level bonus format needs investigation | Needs evidence | **CONFIRMED needs evidence** | Source Excel stores raw stat strings; correct mapping to Infantry/Rider/Hunter stats is unknown. |
| hero-appointment crate coverage | Needs investigation | **CONFIRMED issue** | Old positions use `Command Manual`/`Service Badge`/`Tactical Guide`; `hero-appointment-custom` crate only offers `Field Manual`/`Medal of Command` (new positions). |
| Cross-tab `SYNC_STORAGE` replaces `savedStates` wholesale and doesn’t migrate `__behemoth__` | Area needing investigation | **CONFIRMED behavior, classification uncertain** | `SYNC_STORAGE` only merges `savedStates`; it does not migrate legacy keys. If another tab writes a legacy shape, the receiving tab preserves `__behemoth__` separately. |
| Offline build staleness (`dist/`, `offline/`) | Suspicious | **INCORRECT** | `git ls-files` shows `dist/` and `offline/` are **gitignored and not tracked**. `bkp/`, `examples/`, and `debug_mk3.html` **are** tracked. |
| `getScreenName` regex `/^\/calculator\d*$/` redundant | Suspicious | **CONFIRMED harmless** | The pattern matches `/calculator` followed by digits, which never occurs; preceding patterns already handle `/calculator`. No runtime impact. |
| Behemoth “Other” bucket in Dashboard | Probably intentional | **CONFIRMED intentional** | Fallback for unmapped item IDs under Companion Behemoths. |
| Mechs nested under Vehicles | Intentional | **CONFIRMED intentional** | Routes and Dashboard grouping match; changelog 0.4.0 references it. |
| Behemoth enhancement level 1 cost 0 | Intentional | **CONFIRMED intentional** | Base unlock; `sumCosts` starts at `currentLevel + 1`. |
| CrateConversion fallback to all category crates | Intentional | **CONFIRMED intentional** | Code explicitly falls back when no option matches. |
| Cumulative bonus semantics | Correct | **CONFIRMED correct** | `computeNetGain` subtracts current from target; data verifies bonuses are cumulative. |
| Dead Vite template code under `src/src/` | Technical debt | **CONFIRMED** | `src/src/` contains unused `App.tsx`, `main.tsx`, `App.css`, assets. |
| Committed artifacts | Technical debt | **PARTIALLY CONFIRMED** | `bkp/sos-calc-backup-2026-07-04.json`, `examples/`, `debug_mk3.html` are tracked. `dist/`/`offline/` are **not** tracked. |
| Inconsistent item IDs (`mk-mk-*` vs `mk-*`) | Technical debt | **CONFIRMED** | `behemoth-levels` IDs are `mk-mk-*`; `behemoth-enhancement` IDs are `mk-*`. Matching relies on `endsWith`. |
| Duplicated hero-appointment parsers | Technical debt | **CONFIRMED** | `parseHeroAppointment` and `parseHeroAppointmentNew` differ only in cost columns and bonus-value splitting. |
| Accumulated one-off scraper scripts | Technical debt | **CONFIRMED** | Many similar scrapers/debug scripts exist. |
| Stale docs (`SPEC.md`, `AGENTS.md`, `tasks.md`) | Technical debt | **CONFIRMED** | `SPEC.md` lists 4 categories and old `Crate.categoryId` string; `AGENTS.md` omits mech/vehicles/hero-appointment; `tasks.md` has completed backlog items still unchecked. |
| Convoluted slug helpers | Technical debt | **CONFIRMED harmless** | `resolveCategoryId` normalizes dashes to spaces then back to dashes; works but pointless. |

---

## 3. Confirmed Bugs

### 3.1 Version badge never dismisses
- **Files:** `package.json`, `CHANGELOG.md`, `src/features/calculator/components/AppFooter.tsx`, `src/features/calculator/components/WhatsNewDialog.tsx`
- **Evidence:** `APP_VERSION = "0.4.0-beta"`; changelog latest entry is `0.5.1-beta`; clicking “Got it” saves `entry.version` (`0.5.1-beta`), which never equals `APP_VERSION`.

### 3.2 Behemoth MK I/II level bonuses are garbage
- **Files:** `scripts/convert-excel.js` (`parseBehemothLevels`, lines 562–596), `src/data/excel/behemoth_levels.xlsx`, `src/data/json/game-data.json`
- **Evidence:** Generated JSON for `mk-mk-i`/`mk-mk-ii` contains `bonuses: [{ type: "+230, +138, +1,382", value: 0, unit: "%" }]`.

### 3.3 BundleConversion “Needed” column uses crate count for crate-based bundles
- **Files:** `src/features/calculator/components/BundleConversion.tsx` lines 70–90
- **Evidence:** `totalNeeded: cratesNeeded` vs `qtyPerBundle: content.count * opt.amount`.

### 3.4 SummaryCard missing on all tile-based calculator pages
- **Files:** `src/features/calculator/components/CalculatorPage.tsx` (renders it); `BehemothPage.tsx`, `SpacecraftPage.tsx`, `AircraftPage.tsx`, `VehiclesPage.tsx`, `MechPage.tsx` (do not).

### 3.5 BonusesTable calls `useCalculator` conditionally
- **Files:** `src/features/calculator/components/BonusesTable.tsx` line 7
- **Evidence:** `if (hideBonuses) return null;` runs before `useCalculator()`. `MechPage` toggles `hideBonuses` between enhancement and skills. This violates React Rules of Hooks and can cause runtime errors.

### 3.6 CrateConversion effects use stale closures
- **Files:** `src/features/calculator/components/CrateConversion.tsx` lines 27–56
- **Evidence:** Effects depend on `[crates]`, `[selectedCrate]`, and `[selectedOption]` but read `selectedCrate`, `combinedCosts`, etc. Changing `combinedCosts` does not update `amountNeeded` or re-select the matching option.

### 3.7 Dashboard reads pre-migration localStorage and memoizes stale result
- **Files:** `src/features/dashboard/components/DashboardPage.tsx` line 235
- **Evidence:** `const { sections } = useMemo(() => loadAggregatedCosts(), []);` reads `localStorage` once. On the first render after an app update, this happens **before** the `HYDRATE` effect has migrated legacy `__behemoth__` data, and the empty-deps memo never recomputes after migration.

### 3.8 Floating-point artifacts displayed raw in the UI
- **Files:** `src/features/calculator/components/BonusesTable.tsx`, `src/features/calculator/components/SummaryCard.tsx`, `src/data/json/game-data.json`
- **Evidence:** JSON contains values like `1.8499999999999999` and `6.140000000000001`. BonusesTable renders them directly without rounding.

### 3.9 Legacy `__mech__` saved state is not migrated
- **Files:** `src/features/calculator/hooks/useCalculator.tsx` (HYDRATE), `src/features/dashboard/components/DashboardPage.tsx` (reads `__mech__`)
- **Evidence:** HYDRATE only migrates `__behemoth__`. Dashboard still reads `savedStates["__mech__"]`. If such data exists, Dashboard shows it but the Mech calculator pages never load it.

### 3.10 `useCalculator` return object is unstable due to always-new `groupItems`
- **Files:** `src/features/calculator/hooks/useCalculator.tsx` lines 428, 494–525
- **Evidence:** `const groupItems = selectedGroup?.items ?? []` creates a new array every render; the returned memoized object includes it, so the object identity changes every render, defeating memoization for consumers.

---

## 4. Bugs Missed by DeepSeek

1. **Conditional hook call in `BonusesTable`** — a genuine Rules of Hooks violation that can crash React when `hideBonuses` toggles.
2. **Stale closures in `CrateConversion`** — `amountNeeded` and selected option do not react to changes in `combinedCosts`.
3. **Dashboard `useMemo` reads localStorage before `HYDRATE`** — empty-deps memo caches pre-migration data.
4. **Floating-point display artifacts** — raw `1.8499999999999999` values shown to users.
5. **Legacy `__mech__` migration gap** — Dashboard reads a key the calculator state never migrates or uses.
6. **Unstable `useCalculator` return object** — `groupItems` always-new array breaks downstream memoization.
7. **BundleConversion crate-based rows compute bundles per material independently** — If a single crate bundle covers multiple materials, the table shows a different `Bundles needed` per material instead of a single bundle count for the whole purchase.
8. **CalculatorPage URL effect checks `selectedGroupName === undefined`** — `selectedGroupName` is typed `string | null`, so this guard is dead code (always true-ish). The second guard handles it, so it is harmless but incorrect.

---

## 5. Incorrect or Unsupported DeepSeek Findings

1. **`dist/` and `offline/` are checked-in build artifacts** — They are listed in `.gitignore` and are **not** tracked by git. (`bkp/`, `examples/`, `debug_mk3.html` are tracked.)
2. **Combined behemoth selectors are *entirely* dead code** — The per-MK combined route (`/calculator/behemoth/:mkSlug`) and the corresponding `isCombinedBehemoth` lookup branch are reachable in code. They are functionally empty because `SYNC_BEHEMOTH` clears `activeUpgrades` when `section` is null, but the code paths are not fully dead.
3. **Group-scoped filtering omission is a bug** — It is a UX inconsistency, but there is no evidence in code or changelog that `formation-system`/`hero-appointment` were intended to be group-scoped. It may be intentional.

---

## 6. Root Cause Analysis

### 6.1 Version badge never dismisses
- **Symptom:** Red dot persists; footer shows stale version.
- **Immediate cause:** `saveSeenVersion` stores changelog version `0.5.1-beta`, but `AppFooter` compares against `APP_VERSION` `0.4.0-beta`.
- **Underlying cause:** `package.json` was not bumped when `CHANGELOG.md` was advanced through `0.5.0`/`0.5.1`.
- **Architectural cause:** No single source of truth for version; two files are manually maintained and compared for equality.

### 6.2 MK I/II level bonuses are garbage
- **Symptom:** Bonuses table shows stats named like `+230, +138, +1,382` with 0%.
- **Immediate cause:** `parseBehemothLevels` blindly uses `Benefit` as `type` and `BenefitPct` as value.
- **Underlying cause:** MK 0/III/IV sheets store named stat + percentage in those columns; MK I/II sheets store raw comma-separated stat strings with no percentage.
- **Architectural cause:** Parser assumes a uniform column schema across all MK sheets.

### 6.3 BundleConversion unit mismatch
- **Symptom:** “Needed” number is not comparable to “Per bundle”.
- **Immediate cause:** `totalNeeded` is assigned `cratesNeeded` for crate-based bundles.
- **Underlying cause:** The row shape conflates two different things: a material-focused AND bundle row and a crate-focused OR bundle row.
- **Architectural cause:** No distinct data model for crate-based vs. material-based bundles.

### 6.4 SummaryCard missing on tile pages
- **Symptom:** No combined totals card on Behemoth/Spacecraft/Aircraft/Vehicles/Mech pages.
- **Immediate cause:** `SummaryCard` is not imported or rendered in those page components.
- **Underlying cause:** Tile-page refactor added per-page layouts without carrying over the summary component.
- **Architectural cause:** Summary UI is not part of a shared page shell.

### 6.5 BonusesTable conditional hook
- **Symptom:** Potential React runtime error or corrupt hook state when toggling between Mech Enhancement and Mech Skills.
- **Immediate cause:** Early `return null` before `useCalculator()`.
- **Underlying cause:** Author tried to avoid hook cost when bonuses are hidden.
- **Architectural cause:** Hook usage rule violation.

### 6.6 CrateConversion stale closures
- **Symptom:** Crate conversion UI shows stale amount/crate count after the user changes upgrade levels.
- **Immediate cause:** `useEffect` dependency arrays omit `combinedCosts`, `selectedCrate`, etc.
- **Underlying cause:** State is split between reducer-derived `combinedCosts` and local `useState`; effects were not fully wired to react to derived data.
- **Architectural cause:** Local component state duplicating derived data from context.

### 6.7 Dashboard pre-HYDRATE memoization
- **Symptom:** Dashboard may show legacy or duplicated behemoth data on first launch after an app update.
- **Immediate cause:** `useMemo(..., [])` reads `localStorage` before `HYDRATE` has run.
- **Underlying cause:** Dashboard bypasses the context state and reads raw `localStorage`.
- **Architectural cause:** Persistence is read in two places (context + Dashboard) with different timing and migration guarantees.

### 6.8 Floating-point display artifacts
- **Symptom:** Ugly numbers like `+1.8499999999999999%`.
- **Immediate cause:** UI renders raw JSON numbers without formatting/rounding.
- **Underlying cause:** `parsePct` + multiplication produces JS floating-point noise; converter writes it verbatim.
- **Architectural cause:** No centralized formatting utility for numeric values.

---

## 7. Areas of Uncertainty

1. **MK V level cost key** — Should MK V levels use `Power Serum` (like MK III/IV) or plain `Serum`?
2. **MK I/II level bonus semantics** — What do the raw `+N, +N, +N` strings map to? Are they Infantry/Rider/Hunter attack/health/lethality?
3. **Hero Appointment old-position crates** — Are there in-game crates for `Command Manual`/`Service Badge`/`Tactical Guide`?
4. **`__mech__` legacy usage** — Was `__mech__` ever persisted? If so, how much legacy data exists?
5. **Group-scoped filtering for formation/hero** — Is the current non-filtering behavior intentional or an oversight?
6. **BundleConversion desired semantics** — For crate bundles with multiple material options, should the UI show one unified bundle count or per-material rows?
7. **Offline build artifacts** — Should `dist/calculator.html` and `offline/calculator.html` be generated in CI, or are they intended to stay local-only?

---

## 8. Important Files

| File | Responsibility |
|---|---|
| `scripts/convert-excel.js` | Excel → `game-data.json` detection and parsers |
| `src/services/dataService.ts` | Zod validation, category/item/crate/bundle accessors |
| `src/features/calculator/hooks/useCalculator.tsx` | Reducer, hydration, persistence, derived results |
| `src/features/calculator/utils/calculator.ts` | Pure cost/bonus math |
| `src/features/calculator/components/CalculatorPage.tsx` | Generic page (formation/hero); only place `SummaryCard` is rendered |
| `src/features/calculator/components/BehemothPage.tsx` | Behemoth tile page |
| `src/features/calculator/components/BundleConversion.tsx` | Bundle math and unit mismatch |
| `src/features/calculator/components/CrateConversion.tsx` | Crate conversion with stale-closure effects |
| `src/features/calculator/components/BonusesTable.tsx` | Conditional hook violation |
| `src/features/dashboard/components/DashboardPage.tsx` | Aggregated costs; reads raw localStorage |
| `src/features/calculator/components/AppFooter.tsx` / `WhatsNewDialog.tsx` | Version badge logic |
| `src/data/json/crates.json` / `bundles.json` | Hand-edited crate/bundle data |
| `src/utils/slugs.ts` | Slug/MK helpers |

---

## 9. Assumptions

1. The code in the working directory is the source of truth; I did not verify data against the live game or wiki.
2. `game-data.json`, `crates.json`, and `bundles.json` on disk are the current shipped data.
3. Bonus values are cumulative per level, which matches the data and makes `computeNetGain` correct.
4. `localStorage` shapes observed in code represent all persisted formats.

---

## 10. Open Questions

1. Should `package.json` be bumped to `0.5.1-beta`, or should the footer derive its version from `CHANGELOG.md`?
2. What is the correct parsing for MK I/II level bonuses?
3. Should MK V levels use `Power Serum`?
4. Should the MK V crate include `Neuronal Medium` to support MK V skills?
5. Should `formation-system` and `hero-appointment` be added to `GROUP_SCOPED_CATEGORIES`?
6. Should `DashboardPage` consume `savedStates` from context instead of raw `localStorage`?
7. Should legacy `__mech__` data be migrated like `__behemoth__`?

---

## 11. Investigation Summary

The most impactful findings, in order:

1. **MK I/II Behemoth level bonuses are corrupt** — users see nonsensical stat names and 0% values.
2. **Version mismatch breaks the “What’s new” badge** — the dot never clears and the footer version is stale.
3. **`BundleConversion` mixes units** — crate-based bundles show crate count in a material-oriented “Needed” column.
4. **SummaryCard is missing from all tile pages** — combined totals are only available on the generic `CalculatorPage`.
5. **`BonusesTable` violates React Rules of Hooks** — can crash when switching Mech sections.
6. **`CrateConversion` effects have stale closures** — crate amounts do not stay in sync with the upgrade plan.
7. **Dashboard can show pre-migration data** — empty-deps memo reads `localStorage` before `HYDRATE`.
8. **MK V data is inconsistent** — skills cost `Neuronal Medium` but no MK V crate offers it; levels cost `Serum`.
9. **Floating-point artifacts render raw** — UI shows values like `1.8499999999999999%`.
10. **Legacy `__mech__` data is orphaned** — Dashboard reads it but calculator state does not migrate or use it.

In addition to confirming DeepSeek’s main bugs, this review found **genuine React hooks/effects bugs** and **state-persistence timing issues** that were not in the original report, and corrected the claim that `dist/`/`offline/` are committed (they are gitignored).
