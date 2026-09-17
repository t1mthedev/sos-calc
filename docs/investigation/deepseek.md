# DeepSeek Investigation

Investigation of the `sos-calc` codebase for bugs, regressions, and architectural issues introduced during prior AI-assisted development.

---

## 1. Project Mental Model

`sos-calc` is a client-only, single-page React app that calculates upgrade costs for *State of Survival*. There is no backend. The user:

1. Picks a category (Formation System, Behemoth, Spacecraft, Aircraft, Vehicles, Mech, Hero Appointment).
2. Adds upgradeable items to a selection list.
3. Sets a `From` and `To` level per item.
4. Sees per-item totals (resources, stat bonuses, upgrade path) plus combined totals, and crate/bundle conversion.

Data flows in one direction:

```
Fandom wiki → scripts/scrape-*.mjs → src/data/excel/*.xlsx
            → scripts/convert-excel.js → src/data/json/game-data.json
            → src/services/dataService.ts (Zod validation + accessors)
            → src/features/calculator/hooks/useCalculator.tsx (state)
            → React components (UI)
```

State is persisted to `localStorage` under `sos-calc-state` (calculator plans) and `sos-calc-backpack` (inventory). `crates.json` and `bundles.json` are hand-edited static data (not derived from Excel).

The app has grown well beyond the original 4-category spec: it now ships 11 categories in `game-data.json` (behemoth split into 3 hidden categories, plus mechs, vehicles, hero appointment), routed through dedicated tile-based pages (`BehemothPage`, `SpacecraftPage`, `AircraftPage`, `VehiclesPage`, `MechPage`) plus a generic `CalculatorPage` for `formation-system` and `hero-appointment`.

## 2. Architecture

```
src/
  main.tsx                        Entry point (renders App)
  App.tsx                         Router + theme + CalculatorProvider
  components/
    Layout.tsx                    Nav tabs + footer shell
    MaterialIcon.tsx              WebP/JPG icon with fallback
  services/
    dataService.ts                Zod validation + all data accessors
  types/index.ts                  Shared TypeScript interfaces
  hooks/
    useDevMode.ts                 ?mode=dev flag (localStorage cached)
    usePageMeta.ts                document.title + GA events
  utils/
    slugs.ts                      Category/MK/group slug helpers
    pageMeta.ts                   Route → screen-name mapping
  features/
    calculator/
      hooks/useCalculator.tsx     Reducer + context + derived selectors
      utils/calculator.ts         Pure cost/bonus math (tested)
      components/                 All pages + selectors + tables
    dashboard/components/         DashboardPage + MaterialsTable
    backpack/components/          BackpackPage (inventory)
    dev/components/               DevToolsPage (export/import/reset)
```

Key contracts:

- `Category` is either **flat** (`items: UpgradeItem[]`) or **grouped** (`groups: Group[]`), never both (see `flattenItems`).
- `UpgradeItem.levels` is a dense, sorted list of `UpgradeLevel` where each level carries `costs`, `bonuses` (cumulative), and optional `benefit`/`skillsUnlocked`.
- Cost keys are full material names (e.g. `"Power Serum"`, `"Neuronal Medium"`), matching `crates.json` `materialKey` values.

## 3. Main Execution Flows

### 3.1 App bootstrap
`main.tsx` → `App.tsx` wraps everything in `CalculatorProvider` (context). `useReducer(reducer, null, createInitial)` seeds `categories` from `loadGameData()`. On mount, a `useEffect` reads `localStorage` and dispatches `HYDRATE`; a second `useEffect` persists `{ activeCategoryId, savedStates }` on change (skipped until hydrated). A third listens for `storage` events (cross-tab) and dispatches `SYNC_STORAGE`.

### 3.2 URL → state (routing)
Each page's `useEffect` maps URL params to a dispatch:

- `BehemothPage`: `SYNC_BEHEMOTH` (mk/section).
- `MechPage`: `SYNC_MECH` (section).
- `SpacecraftPage` / `AircraftPage` / `VehiclesPage` / `CalculatorPage`: `HYDRATE_FROM_URL` (categoryId + optional groupName).

These actions set `activeCategoryId` and `activeUpgrades` from `savedStates`, and (except `SYNC_BEHEMOTH`/`SYNC_MECH`) clear the behemoth/mech context.

### 3.3 Calculation
`useCalculator` computes `visibleUpgrades` (group/MK filtered) → `results` (per-item `calculate()`) → `combinedCosts` (sum). `calculate()` in `utils/calculator.ts` sums `costs` from `from+1` to `to`, reads cumulative bonuses at both levels, and computes `netGain` as the difference.

### 3.4 Crate / bundle conversion
`CrateConversion` filters crates by `selectedCategoryId` and auto-matches options against `combinedCosts`. `BundleConversion` (`getBundlesByCategory`) resolves crate-based bundles and direct-material bundles.

## 4. Data Model and Data Flow

Defined in `src/types/index.ts`:

- `Bonus { type, value, unit }` — value is a **cumulative** total at that level (verified: hero-appointment `Infantry Attack` goes 1→2→3…; behemoth enhancement `Infantry Lethality` 1.85%→3.7% at level 6).
- `UpgradeLevel { level, name?, costs, bonuses, benefit?, skillsUnlocked? }`
- `UpgradeItem { id, name, maxLevel, levels }`
- `Group { name, mk?, items }` — `mk` is only used for behemoth skill groups.
- `Category { id, name, groups?, items? }`
- `Crate { id, name, imageName?, categoryIds: string[], options }` — note `categoryIds` is plural (a crate may span categories).
- `Bundle { id, name, priceDiamonds, categoryId?, contents: { crateId? | materialKey?, count }[] }`
- `SelectedUpgrade { itemId, currentLevel, targetLevel }`

Actual category inventory (from `game-data.json`, generated 2026-09-04):

| id | structure | items |
|---|---|---|
| behemoth-enhancement | flat | 6 (mk-0/65, mk-i/131, mk-ii/131, mk-iii/98, mk-iv/131, mk-v/131) |
| behemoth-levels | flat | 6 (mk-mk-0/100, others /200) |
| behemoth-skills | 99 groups | 257 items |
| formation-system | 3 groups | 20 |
| hero-appointment | 9 groups | 27 |
| mech-enhancement | flat | 1 (51 levels) |
| mech-skills | 4 groups | 4 |
| spacecraft | 2 groups | 8 |
| vehicles | 3 groups | 3 |
| aircraft | 3 groups | 3 |

## 5. Excel Import Flow

`scripts/convert-excel.js` (`main()` at line 727) reads every `.xlsx` in `src/data/excel/`, detects format, and appends to a `categories` array. Detection order (order is critical):

1. `isBehemothLevelsFile(wb)` — all sheets match `/^MK\s+\S+$/` AND first sheet header contains `powerserum`.
2. `isBehemothSkillsFile` — sheets match `/^MK\s+\S+\s+Skills$/`.
3. `isFormationFile` — has a `Summary` sheet.
4. `isBehemothFile` — sheets match `/^MK\s+\S+$/` (not skills/levels).
5. `isSpacecraftFile` — `Capsule_` / `AC04` / `Enterprise Capsule_`.
6. `isFA1SpecterFile`, `isCarrierFile`, `isVehiclesFile`, `isMechEnhancementFile`, `isMechSkillsFile`, `isHeroAppointmentFile` (6 positions), `isHeroAppointmentNewFile` (3 positions).

Per-file parsers (`parseBehemoth`, `parseCapsules`, `parseAircraft`, `parseBehemothLevels`, `parseBehemothSkills`, `parseVehicles`, `parseMechEnhancement`, `parseMechSkills`, `parseHeroAppointment`, `parseHeroAppointmentNew`, `parseCarrier`, `parseFA1Specter`) map short column names via `COST_KEY_MAP`.

Aircraft category is assembled *after* the loop from `aircraftItems`/`carrierItems` accumulated across files (lines 826–848).

Notes / issues:

- `parseBehemothLevels` generates IDs with `'mk-' + name.toLowerCase()…` where `name` already begins `MK `, producing `mk-mk-0`, `mk-mk-iii`, etc. (line 588). Matching still works only because callers use `endsWith`.
- `parseBehemoth` (enhancement) produces clean `mk-iii` IDs (no extra prefix) — inconsistent with the levels IDs.
- `parseBehemothLevels` maps cost keys by sheet name: `MK 0`→`Upgrade Chip`, `MK III`/`MK IV`→`Power Serum`, everything else (incl. `MK V`)→`Serum` (lines 576–581).
- `parseBehemothLevels` treats `Benefit` text as a bonus `type` and `parseFloat(BenefitPct)||0` as its value (lines 571–573). For MK I/II the source `Benefit` column holds raw stat strings (see §7).

## 6. UI Flow

- `Layout` renders three nav tabs (Dashboard / Calculator / Backpack; + Dev Tools when `?mode=dev`) and the footer.
- `CalculatorLandingPage` lists six entries (Behemoth, Formation, Spacecraft, Aircraft, Vehicles, Hero Appointment) as tiles.
- Tile pages (`BehemothPage`, `SpacecraftPage`, `AircraftPage`, `VehiclesPage`, `MechPage`) show a **selector** in the left column and results in the right column. `UpgradeList` renders per-item `From`/`To` autocompletes. Results render `CrateConversion`, `BundleConversion`, and per-item accordions with `BonusesTable`, `ResourcesTable`, `UpgradePathTable`.
- `CalculatorPage` (generic, for formation-system / hero-appointment) additionally renders `SummaryCard` and an `UpgradeSelector` with a group dropdown.

## 7. Confirmed Bugs

### 7.1 Version mismatch breaks the "What's new" badge
- **Severity:** Medium (persistent cosmetic bug; stale version in footer).
- **Confidence:** Confirmed.
- **Files:** `package.json` (line 4: `"version": "0.4.0-beta"`), `CHANGELOG.md` (line 3: `## [0.5.1-beta]`), `src/features/calculator/components/AppFooter.tsx:8`, `src/features/calculator/components/WhatsNewDialog.tsx:43`, `src/version.ts`.
- **Flow:** `APP_VERSION = "0.4.0-beta"`. `AppFooter` computes `isNew = getLastSeenVersion() !== APP_VERSION`. Clicking "Got it" calls `saveSeenVersion(entry?.version)` where `entry.version` is the changelog version `"0.5.1-beta"`. The stored value can never equal `APP_VERSION`, so the badge dot never dismisses; the footer also shows the stale `v0.4.0-beta`.
- **Evidence:** `package.json` vs `CHANGELOG.md` discrepancy; the two values are compared for equality in `AppFooter.tsx:8`.
- **Intended behavior:** Badge dot clears after the user acknowledges the current version; footer shows the actual shipped version.

### 7.2 Behemoth MK I / MK II "levels" bonuses are garbage
- **Severity:** High (wrong stat data displayed to users).
- **Confidence:** Confirmed (verified against `behemoth_levels.xlsx` and generated JSON).
- **Files:** `scripts/convert-excel.js:562-596` (`parseBehemothLevels`), source `src/data/excel/behemoth_levels.xlsx`.
- **Flow:** For MK I and MK II, the `Benefit` column contains raw strings such as `"+230, +138, +1,382"` and `BenefitPct` is `0`. The converter emits `bonuses: [{ type: "+230, +138, +1,382", value: 0, unit: "%" }]`. `BonusesTable` therefore renders a "stat" named `+230, +138, +1,382` with `0%` current/final/gain.
- **Evidence:** `node` inspection of `game-data.json`: `mk-mk-i`/`mk-mk-ii` `bonuses` show `{ type: "+230, +138, +1,382", value: 0 }`; `mk-mk-0`/`mk-mk-iii`/`mk-mk-iv` show proper `{ type: "Infantry Attack", value: 0.5 }`. Raw Excel rows confirm `Benefit`/`BenefitPct` contents.
- **Intended behavior:** MK I/II levels should show the same kind of named stat + percentage as MK 0/III/IV.
- **Additional evidence needed (if any):** Confirm the in-game meaning of the MK I/II raw stat strings (are they Infantry/Rider/Hunter values?) to convert them correctly.

### 7.3 BundleConversion unit mismatch (crate-based branch)
- **Severity:** Medium (confusing/wrong "Needed" number).
- **Confidence:** Confirmed.
- **Files:** `src/features/calculator/components/BundleConversion.tsx:70-93`.
- **Flow:** For crate-based bundles, `totalNeeded` is assigned `cratesNeeded` (a crate count), while `qtyPerBundle = content.count * opt.amount` (a material quantity). The table renders "Per bundle" (material) next to "Needed" (crates) — inconsistent units. The AND-bundle branch, by contrast, sets `totalNeeded` to the material amount.
- **Evidence:** Lines 77–90 (`totalNeeded: cratesNeeded`) vs lines 43–51 (AND branch uses material totals).
- **Intended behavior:** "Needed" should be the total material required (comparable to "Per bundle"), or the column should be labeled "Crates".

## 8. Likely Bugs

### 8.1 SummaryCard missing on all tile-based pages
- **Severity:** Medium.
- **Confidence:** High (feature regression).
- **Files:** `src/features/calculator/components/CalculatorPage.tsx:87` (only place `SummaryCard` is rendered). `BehemothPage.tsx`, `SpacecraftPage.tsx`, `AircraftPage.tsx`, `VehiclesPage.tsx`, `MechPage.tsx` render `CrateConversion`/`BundleConversion` but never `SummaryCard`.
- **Evidence:** `grep` shows `SummaryCard` only in `CalculatorPage.tsx`. `CHANGELOG.md` `0.2.1` explicitly lists "Combined summary view showing totals across all MK types at the top level" and "per MK showing totals across all sections".
- **Intended behavior:** Users on behemoth (and other tile) pages should see a combined totals card; the changelog indicates it was once present/planned.

### 8.2 Combined behemoth/mech selectors are dead code
- **Severity:** Low–Medium.
- **Confidence:** High.
- **Files:** `src/features/calculator/hooks/useCalculator.tsx:361, 417, 450-451`; `dataService.ts:267-336` (`getBehemothItemsForMk`, `getAllBehemothItems`, `getBehemothItemMkMap`, `getAllMechItems`, `getMechItemSectionMap`).
- **Flow:** `visibleUpgrades` returns `[]` when `!state.behemothMk` (line 432) or `!state.mechSection` (line 436). `SYNC_BEHEMOTH`/`SYNC_MECH` clear `activeUpgrades` in the combined (no-section) case, so `isCombinedBehemoth`/`isCombinedMech` branches in `results` (lines 450–451) can never produce a result.
- **Evidence:** No component renders a combined behemoth summary; the combined-view code paths are unreachable.

### 8.3 MK V data inconsistency
- **Severity:** Medium (incomplete/incorrect data).
- **Confidence:** High that data is inconsistent; lower confidence about correct in-game values.
- **Files:** `src/data/json/crates.json` (`behemoth-mk-v-custom`), `scripts/convert-excel.js:576-581`, `src/data/excel/behemoth_levels.xlsx`, `src/data/excel/Behemoth_MK_V.xlsx`.
- **Flow:** MK V **skills** cost `Neuronal Medium` (verified), but the MK V crate options are `Serum`/`Biobattery`/fragments — no `Neuronal Medium`, so MK V skills cannot be crate-converted. MK V **levels** map to `Serum` (not `Power Serum` like MK III/IV) and have empty `Benefit`/`BenefitPct` (no bonuses). MK V **enhancement** uses `MK V Fragment` (fine).
- **Evidence:** Data dumps of cost keys per category/MK; crate options in `crates.json`; empty MK V level rows in `behemoth_levels.xlsx`.

### 8.4 Group-scoped filtering omits grouped generic categories
- **Severity:** Low.
- **Confidence:** Medium (could be intentional).
- **Files:** `useCalculator.tsx:9` (`GROUP_SCOPED_CATEGORIES = new Set(['aircraft','spacecraft','vehicles'])`), `useCalculator.tsx:439-442`.
- **Flow:** `formation-system` and `hero-appointment` are grouped categories but are **not** in the set, so `visibleUpgrades` returns all `activeUpgrades` regardless of the selected group. Switching groups filters what can be *added* (`UpgradeSelector` uses `groupItems`) but not the *upgrade list*.
- **Intended behavior:** Unclear — likely these should behave like spacecraft/aircraft/vehicles (group-scoped), or the group selector should not imply filtering.

## 9. Areas Requiring Further Investigation

1. **Correct MK V level costs** — should MK V use `Power Serum` rather than `Serum`? Confirm against the game/wiki before changing `convert-excel.js` and `crates.json`.
2. **MK I/II level bonus format** — determine the correct stat names/values for MK I/II levels (the source has raw `+N, +N, +N` strings).
3. **hero-appointment crate coverage** — old positions cost `Command Manual`/`Service Badge`/`Tactical Guide` but `hero-appointment-custom` only lists `Field Manual`/`Medal of Command` (new positions). Confirm whether old-position crates are missing.
4. **Cross-tab `SYNC_STORAGE`** — it replaces `savedStates` wholesale and does not migrate a legacy `__behemoth__` key (§10.1), which may drop in-flight edits in another tab.
5. **Offline build staleness** — `dist/calculator.html` and `offline/calculator.html` are checked-in build artifacts; verify they are regenerated in CI and not manually committed.
6. **`getScreenName` regex** — `/^\/calculator\d*$/` in `pageMeta.ts:15` is redundant/odd (see §10.2).

## 10. Suspicious but Probably Intentional Behavior

1. **Behemoth "Other" bucket** in `DashboardPage.loadAggregatedCosts` (`mkTotals` with `?? 'Other'`) only renders under "Companion Behemoths" — a deliberate fallback for unmapped item IDs.
2. **Mechs nested under "Vehicles"** on the dashboard (`DashboardPage.tsx:190-198`) and in navigation (`VehiclesLandingPage`) — intentional per changelog `0.4.0` and `7163e66`.
3. **Behemoth enhancement level 1 has `cost: 0`** (the base/free unlock) — intentional, and `sumCosts` correctly excludes `from` level.
4. **`CrateConversion` falls back to showing all category crates** when no crate option matches `combinedCosts` (`matched.length > 0 ? matched : categoryCrates`) — intentional "manual fallback" behavior.
5. **Cumulative bonus semantics** — `computeNetGain` assumes bonuses are cumulative; this matches the actual data (verified), so it is correct, not a bug.

## 11. Technical Debt

1. **Dead template code:** `src/src/` (original Vite template: counter `App.tsx`, `main.tsx`, `assets/`, `App.css`, `index.css`). Also unused root files `src/App.css`, `src/react.svg`, `src/vite.svg`, `src/hero.png`.
2. **Committed artifacts:** `bkp/sos-calc-backup-2026-07-04.json`, `examples/`, `offline/`, `dist/`, `debug_mk3.html`.
3. **Inconsistent item IDs:** `behemoth-levels` uses `mk-mk-*` (double prefix) vs `behemoth-enhancement` `mk-*`. Matching relies on `endsWith`, which is fragile.
4. **Duplicated parsers:** `parseHeroAppointment` and `parseHeroAppointmentNew` are near-identical (differ only in cost columns and bonus splitting).
5. **Accumulated one-off scraper scripts** (`scrape-behemoth-skills.mjs` vs `scrape-all-behemoth-skills.mjs`, `scrape-behemoth-levels.mjs` vs `scrape-all-behemoth-levels.mjs`, plus `add-missing-mk-sheets.mjs`, `add-mk-v-levels.mjs`, `update-*.mjs`, `inspect-*.mjs`, `test-regex.mjs`, etc.).
6. **Stale documentation:** `SPEC.md`, `AGENTS.md`, and `tasks.md` disagree with actual data (e.g. AGENTS claims 2 enhancement items and no MK 0/I/II/V; SPEC claims 4 categories).
7. **Convoluted slug helpers:** `resolveCategoryId` = `normalizeSlug(slug).replace(/\s+/g,'-')` performs a pointless round-trip (`-`→space→`-`).

## 12. Root Cause Candidates

1. **Version not bumped in `package.json`** while `CHANGELOG.md` was advanced through `0.5.1-beta` (commits `3604a80`, `7e06c73`, `9dc84cc`, `57cce95` all add MK V without touching `package.json`). This directly causes §7.1.
2. **Tile-page refactor dropped the summary card.** The `0.2.1` change split behemoth into a tile flow (`BehemothPage`/`BehemothSelector`) and the combined-summary UI was not carried into the new pages (§8.1, §8.2).
3. **Copy-paste data pattern for MK V.** The MK V crate (commit `57cce95`) mirrors the MK I/II crate (Serum/Biobattery) even though MK V skills/levels use `Neuronal Medium`/`Power Serum`-style data — consistent with an AI copying an existing crate definition without adapting it (§8.3).
4. **`parseBehemothLevels` assumes uniform Benefit/BenefitPct format** across all MK sheets; the MK I/II sheets violate that assumption (§7.2).
5. **`GROUP_SCOPED_CATEGORIES` not updated** when formation-system / hero-appointment were added as grouped categories (§8.4).

## 13. Important Files

| File | Responsibility |
|---|---|
| `scripts/convert-excel.js` | Excel → `game-data.json` (format detection + parsers) |
| `src/services/dataService.ts` | Zod validation; category/crate/bundle accessors; behemoth/mech helpers |
| `src/features/calculator/hooks/useCalculator.tsx` | Reducer, hydration, persistence, derived results |
| `src/features/calculator/utils/calculator.ts` | Pure cost/bonus math (unit-tested) |
| `src/App.tsx` | Routes + providers |
| `src/features/calculator/components/BehemothPage.tsx` | Behemoth tile page |
| `src/features/calculator/components/CalculatorPage.tsx` | Generic page (formation/hero) |
| `src/features/calculator/components/BundleConversion.tsx` | Bundle math (bug §7.3) |
| `src/features/calculator/components/CrateConversion.tsx` | Crate math |
| `src/features/dashboard/components/DashboardPage.tsx` | Aggregated costs + backpack comparison |
| `src/features/calculator/components/AppFooter.tsx` / `WhatsNewDialog.tsx` | Version badge (bug §7.1) |
| `src/data/json/crates.json` / `bundles.json` | Hand-edited crate/bundle data |
| `src/utils/slugs.ts` | Slug/MK helpers |

## 14. Assumptions

1. `game-data.json`, `crates.json`, `bundles.json` are treated as the current source of truth (generated data on disk), and were inspected directly.
2. Bonus values are **cumulative** per level (verified against actual data), so `computeNetGain` is correct.
3. `crates.json` `materialKey` values must exactly match `game-data.json` cost keys for auto-matching.
4. The `behemoth-*` categories are intentionally hidden from the user-facing dropdown and are only reachable via the Behemoth tile page.

## 15. Open Questions

1. Should MK V levels use `Power Serum` (like MK III/IV) or plain `Serum`?
2. What are the correct stat names/values for MK I/II level bonuses?
3. Was the "combined summary" behemoth feature intentionally removed, or lost in the tile refactor?
4. Should `formation-system`/`hero-appointment` be group-scoped like spacecraft/aircraft/vehicles?
5. Is `package.json` (not `CHANGELOG.md`) the canonical version, and should it be bumped to `0.5.1-beta`?

## Investigation Summary

Most impactful findings, in order:

1. **Behemoth MK I / MK II "levels" bonuses are broken** — the converter emits `{ type: "+230, +138, +1,382", value: 0 }` for these levels because the source Excel stores raw stat strings in `Benefit` and `0` in `BenefitPct` (`convert-excel.js:562-596`). Users see garbage stat data.
2. **Version mismatch (`package.json` 0.4.0-beta vs `CHANGELOG.md` 0.5.1-beta)** breaks the "What's new" badge (never dismisses) and shows a stale footer version (`AppFooter.tsx:8`, `WhatsNewDialog.tsx:43`).
3. **`BundleConversion` reports the wrong "Needed" unit for crate-based bundles** — it prints `cratesNeeded` (crate count) against a material "Per bundle" column (`BundleConversion.tsx:77-90`).
4. **`SummaryCard` (combined totals) is missing from all tile-based pages** — only the generic `CalculatorPage` renders it, contradicting the `0.2.1` changelog and leaving combined behemoth/mech selectors as dead code.
5. **MK V data is internally inconsistent** — skills use `Neuronal Medium` (no crate provides it), levels use `Serum` and empty benefits; the MK V crate copies the MK I/II pattern.
6. **Group-scoped filtering inconsistency** — `formation-system`/`hero-appointment` are grouped but excluded from `GROUP_SCOPED_CATEGORIES`, so their upgrade lists are not filtered by group.
7. **Technical debt** — dead Vite-template code under `src/src/`, unused root assets, `mk-mk-*` ID double-prefix, duplicated hero-appointment parsers, ~24 one-off scraper scripts, and stale docs (`SPEC.md`/`AGENTS.md`/`tasks.md`).
