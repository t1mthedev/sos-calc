# Agent Memory

## Build & Test
- `npm run build` — tsc + vite
- `npm test` — vitest run
- `npm run lint` — oxlint
- `node scripts/convert-excel.js` — rebuild game-data.json from Excel
- `node scripts/scrape-behemoth-skills.mjs` — re-scrape wiki data

## Project Overview
Upgrade cost calculator for State of Survival. Single-page React app, no backend. Data flows: Fandom wiki → scraper scripts → Excel files → `convert-excel.js` → `game-data.json` → Zod-validated → UI.

## Key Architecture

### Data Pipeline
1. **Scrapers** (`scripts/scrape-*.mjs`) fetch wiki data and write `.xlsx` to `src/data/excel/`
2. **Converter** (`scripts/convert-excel.js`) reads all `.xlsx` files, detects format by sheet names, produces `src/data/json/game-data.json`
3. **Validation** (`src/services/dataService.ts`) validates with Zod on load
4. **State** persisted to `localStorage` key `sos-calc-state`

### Converter File Detection Order (critical!)
The `main()` loop in `convert-excel.js` checks files in this order:
1. `isBehemothSkillsFile()` — sheets match `/^MK\s+\S+\s+Skills$/`
2. `isFormationFile()` — sheets include "Summary"
3. `isBehemothFile()` — sheets match `/^MK\s+\S+$/` (NOT Skills)
4. `isSpacecraftFile()` — capsules/aircraft sheets

### Categories
| Category | ID | Structure | Items |
|---|---|---|---|
| Formation System | `formation-system` | 3 groups | 20 items |
| Behemoth Enhancement | `behemoth-enhancement` | flat | 2 items (98+131 levels) |
| Behemoth Skills | `behemoth-skills` | 9 groups | 133 items (2020 levels) |
| Spacecraft | `spacecraft` | 2 groups | 8 items |
| Aircraft | `aircraft` | flat | 1 item (140 levels) |

### Behemoth Skills
- 9 skill trees: Laser Storm, Power Core I/II, Missile Interception (MK III); Frost Rend, Cryo Loadout I/II, Howl of Winter, Frozen Fortress (MK IV)
- Only cost resource: **Neuronal Medium**
- Each tree has a `mk` field: `"MK III"` or `"MK IV"`
- Item IDs are tree-prefixed (e.g. `power-core-ii-rider-defense`) to avoid collisions
- Wiki has sub-stages per level (stars); converter consolidates duplicates by merging costs and bonuses per level

### Crate System
- `crates.json` uses `categoryIds: string[]` (not single `categoryId`) — a crate can belong to multiple categories
- Behemoth MK III and MK IV crates appear under both `behemoth-enhancement` and `behemoth-skills`
- Crate Conversion UI shows a single crate picker (Autocomplete) — no automatic bundles table

### Bundle System
- `bundles.json` has crate-based bundles (`crateId` + `count`) and direct-material bundles (`materialKey` + `count`)
- For crate-based bundles, `qtyPerBundle = count * crate.option.amount`
- `getBundlesByCategory()` filters by bundle's own `categoryId` OR by matching crate's category

### Version Tracking
- App version in `package.json`, shown in footer
- `CHANGELOG.md` uses Keep a Changelog format with user-facing language
- "What's new" dialog reads latest changelog entry, stores seen version in localStorage

## Cost Key Mapping
Converter maps Excel column short names to full material names:
- `manuals` → Tactical Analysis
- `boards` → Optical Storage Boards
- `fiber` → Luminous Fiber
- `fuel` → Nuclear Fuel Rod
- `coating` → Antimatter Coating
- `alloy` → Reinforced Alloy
- `neuronal` → Neuronal Medium
