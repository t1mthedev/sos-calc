# Changelog

## [0.5.0-beta] - 2026-08-25
### Added
- Hero Appointment upgrade category
- new upgrade materials:Command Manual, Field Manual, Tactical Guide, Service Badge, Medal of Command

### Fixed
- Prevent multi-tab stale write

## [0.4.1-beta] - 2026-08-13
### Changed
- Dashboard now shows all saved Behemoth upgrades regardless of the last-selected type
- Dashboard groups Behemoth resources into Behemoths / Companion Behemoths sections with group totals and collapsible per-MK detail

## [0.4.0-beta] - 2026-08-04
### Added
- Vehicles section with Purple, Gen 1, and Gen 2 vehicle star enhancement ladders on per-generation tile pages
- FA-1 Specter (Gen 3) aircraft data
- Carrier data

### Changed
- Split the Aircraft page into per-aircraft tiles (AC04 / FA-1 Specter / Carrier) and mark AC04 as Gen 4

## [0.3.3-beta] - 2026-08-03
### Added
- Carrier data

## [0.3.2-beta] - 2026-08-03
### Added
- Aircraft Custom Crate, expanded Spacecraft Research crate options (adding Fusion Cells, Maglev Module, and Plasma Fuel materials), and Behemoth MK I / MK II / Custom crates

## [0.3.1-beta] - 2026-07-16
### Changed
- Clear button now only clears the current category instead of all saved upgrades

## [0.3.0-beta] - 2026-07-14
### Added
- Dashboard "have vs need" comparison with Have and Remaining columns that subtract backpack inventory from upgrade totals, with crate contribution estimates
- Material icons in the Dashboard resources table

## [0.2.2-beta] - 2026-07-14
### Added
- Backpack page with material and crate inventory

## [0.2.1-beta] - 2026-07-07
### Added
- Consolidated Behemoth categories into a single "Behemoth" entry with MK type and section card flow
- Combined summary view showing totals across all MK types at the top level
- Combined summary per MK showing totals across all sections

### Changed
- Hidden individual behemoth categories (Enhancement, Levels, Skills) from the dropdown

## [0.2.0-beta] - 2026-07-06
### Added
- Behemoth Skills calculator: 9 skill trees for MK III and MK IV with all upgrade levels
- MK III / MK IV labels now visible in the group selector dropdown

### Changed
- Behemoth MK III and MK IV custom crates now appear under both Behemoth Enhancement and Behemoth Skills categories
- Fixed level display for skills with multiple upgrade stages per level
- Fixed duplicate item names in the upgrade list
- Crate Conversion now shows a single crate picker instead of displaying all crates at once

## [0.1.0-beta] - 2026-07-06
### Added
- Upgrade calculator for Formation System, Behemoth Enhancement, Spacecraft (including Enterprise), and Aircraft
- Crate conversion: select a crate and see how many you need for each material required by your upgrades
- Bundle conversion: calculate diamond costs for bundles that contain crates or directly give materials
- All upgrade data is stored locally in your browser — switching between categories keeps your progress
- Offline mode: everything works without internet, share a single HTML file
