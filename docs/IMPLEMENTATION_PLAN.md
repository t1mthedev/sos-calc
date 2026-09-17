# Implementation Plan

## 1. Scope

Address confirmed runtime, state, data-display, and version defects only.

Confirmed findings:

- Version mismatch.
- Corrupt MK I/MK II level bonus output.
- Conditional React hook.
- Stale crate-conversion effects.
- Dashboard reading persisted state independently before migration.
- Bundle conversion unit inconsistency.

Requires decisions before implementation:

- Summary card on tile pages.
- MK V costs and crate contents.
- MK I/MK II bonus semantics.
- Bundle multi-material bundle-count semantics.
- Group filtering for formation and hero appointment.
- Legacy `__mech__` migration.
- Hero Appointment crate coverage.

Not included:

- Dead template cleanup.
- Slug helper cleanup.
- Scraper consolidation.
- Documentation cleanup.
- `dist/` or `offline/` changes; both are ignored and untracked.

## 2. Confirmed Problems

### Version badge mismatch

- **Root cause:** `APP_VERSION` comes from `package.json` (`0.4.0-beta`), while `WhatsNewDialog` stores the latest changelog version (`0.5.1-beta`).
- **Affected files:** `package.json`, `package-lock.json`, `src/version.ts`, `src/features/calculator/components/AppFooter.tsx`, `src/features/calculator/components/WhatsNewDialog.tsx`.
- **Affected components:** Footer version display and What's New badge.
- **Expected behavior:** The displayed version and stored acknowledgement version use one canonical version.
- **Current behavior:** The badge cannot be dismissed permanently and the footer shows a stale version.

### MK I/MK II level bonuses

- **Root cause:** `parseBehemothLevels()` treats `Benefit` as a stat name and `BenefitPct` as a percentage for every sheet. MK I/MK II contain raw comma-separated values and zero percentage values.
- **Affected files:** `scripts/convert-excel.js`, `src/data/excel/behemoth_levels.xlsx`, generated `src/data/json/game-data.json`.
- **Affected components:** Behemoth level data and `BonusesTable`.
- **Expected behavior:** Valid, semantically correct bonus records.
- **Current behavior:** Stats display as strings such as `+230, +138, +1,382` with `0%`.
- **Dependency:** The exact meaning of those values must be confirmed before defining the parser mapping.

### Conditional hook in `BonusesTable`

- **Root cause:** `useCalculator()` runs only after `if (hideBonuses) return null`.
- **Affected files:** `src/features/calculator/components/BonusesTable.tsx`, `src/features/calculator/components/MechPage.tsx`.
- **Affected components:** Mech enhancement/skills transition.
- **Expected behavior:** Hook order remains stable across renders.
- **Current behavior:** Toggling `hideBonuses` can violate the Rules of Hooks and produce runtime errors or corrupted hook state.

### Stale crate conversion

- **Root cause:** Effects that derive `amountNeeded` and the selected material read `combinedCosts` but do not depend on it.
- **Affected files:** `src/features/calculator/components/CrateConversion.tsx`.
- **Affected components:** Crate selection and amount calculation.
- **Expected behavior:** Changing upgrade levels immediately recalculates matching material and required amount.
- **Current behavior:** The UI can retain values from the previous upgrade plan until crate selection changes.

### Dashboard hydration timing

- **Root cause:** `DashboardPage` reads `localStorage` in an empty-dependency `useMemo`, independently of calculator hydration and migration.
- **Affected files:** `src/features/dashboard/components/DashboardPage.tsx`, `src/features/calculator/hooks/useCalculator.tsx`.
- **Affected components:** Dashboard saved-upgrade totals.
- **Expected behavior:** Dashboard reflects migrated calculator state.
- **Current behavior:** It may render pre-migration or stale data and not recompute.

### Bundle conversion units

- **Root cause:** Crate-based rows set `totalNeeded` to `cratesNeeded`, while `qtyPerBundle` is material quantity and the table labels the column generically as `Needed`.
- **Affected files:** `src/features/calculator/components/BundleConversion.tsx`.
- **Affected components:** Bundle conversion table.
- **Expected behavior:** Displayed quantities have explicit and consistent units.
- **Current behavior:** A material-oriented row displays a crate count as “Needed”.

## 3. Proposed Changes

### Version handling

- **Exact files:** `package.json`, `package-lock.json`, possibly `src/features/calculator/components/WhatsNewDialog.tsx`.
- **Component/method:** `APP_VERSION`, footer comparison, and acknowledgement persistence.
- **What should change:** Establish one canonical version and ensure footer comparison and acknowledgement use it.
- **Why:** Prevent stale display and permanently active badge state.
- **Dependencies:** Confirm whether the changelog version or package version is authoritative.
- **Potential side effects:** Version changes may intentionally show the dialog again for users.

### Behemoth level parser

- **Exact files:** `scripts/convert-excel.js`; regenerated `src/data/json/game-data.json`; parser tests if introduced.
- **Component/method:** `parseBehemothLevels()`.
- **What should change:** Handle MK I/MK II source rows according to their actual bonus schema instead of applying the uniform `Benefit`/`BenefitPct` rule.
- **Why:** Prevent corrupt generated bonus data.
- **Dependencies:** Confirm the semantic mapping of each raw numeric value.
- **Potential side effects:** Regenerating data may alter all affected MK I/MK II displayed totals.

### Hook ordering

- **Exact files:** `src/features/calculator/components/BonusesTable.tsx`.
- **Component/method:** `BonusesTable`.
- **What should change:** Keep `useCalculator()` before any conditional return.
- **Why:** Preserve React hook ordering.
- **Dependencies:** None.
- **Potential side effects:** None expected.

### Crate effect dependencies

- **Exact files:** `src/features/calculator/components/CrateConversion.tsx`.
- **Component/method:** Effects deriving selected option and `amountNeeded`.
- **What should change:** Ensure derived selection and amount state respond to changes in `combinedCosts`, selected crate, and selected option.
- **Why:** Remove stale conversion results.
- **Dependencies:** Preserve intentional manual amount editing behavior.
- **Potential side effects:** User-entered amounts must not be unexpectedly overwritten except when the selected calculated material changes.

### Dashboard state source

- **Exact files:** `src/features/dashboard/components/DashboardPage.tsx`, potentially `src/features/calculator/hooks/useCalculator.tsx` or a shared selector.
- **Component/method:** Dashboard aggregation and calculator hydration state.
- **What should change:** Make dashboard aggregation react to hydrated calculator state rather than independently reading raw storage once.
- **Why:** Apply migrations before calculating displayed totals.
- **Dependencies:** Decide whether dashboard should consume context state directly or use a shared storage/migration loader.
- **Potential side effects:** Existing saved plans should remain unchanged.

### Bundle units

- **Exact files:** `src/features/calculator/components/BundleConversion.tsx`.
- **Component/method:** Crate-based row construction and table labels.
- **What should change:** After clarification, either display material `totalNeeded`, display crate count with an explicit label, or model both values separately.
- **Why:** Prevent misleading quantity comparisons.
- **Dependencies:** Required decision on intended UI semantics.
- **Potential side effects:** Existing displayed numbers may change units, requiring regression coverage.

## 4. Implementation Order

1. Confirm version authority and unresolved business decisions.
2. Fix the conditional hook because it is isolated and can cause runtime failures.
3. Fix crate-conversion dependency handling.
4. Fix dashboard hydration/state consumption.
5. Resolve MK I/MK II semantics, update the converter, regenerate JSON, and validate imported data.
6. Resolve bundle quantity semantics and update the conversion UI.
7. Address any approved summary, MK V, filtering, or migration changes separately.

The data-parser change depends on external semantic confirmation. Bundle presentation depends on the unit decision. Dashboard changes must preserve the existing migration behavior in `HYDRATE`.

## 5. Testing Strategy

- Run existing calculator unit tests unchanged.
- Add a regression test for `BonusesTable` toggling `hideBonuses`.
- Test crate conversion after changing upgrade levels while keeping the same crate selected.
- Test crate replacement and manual amount editing.
- Test dashboard totals after legacy Behemoth migration.
- Test dashboard totals after cross-tab storage updates.
- Test version acknowledgement using the current changelog/package version.
- Test converter input for MK 0, MK I, MK II, MK III, MK IV, and MK V sheets.
- Assert MK I/MK II generated bonuses have valid names, values, and units after semantics are confirmed.
- Test same-level upgrades, zero-cost levels, empty selections, and invalid persisted item IDs.
- Test bundle rows with one crate option and multiple matching crate options.
- Test bundles containing multiple materials/options and verify the chosen bundle-count semantics.
- Test tile-page and generic-page UI behavior if the SummaryCard change is approved.

## 6. Validation Checklist

- Package and changelog version behavior is consistent.
- What's New acknowledgement clears the badge.
- No conditional hook remains.
- Crate totals update when upgrade levels change.
- Dashboard reflects migrated saved state.
- MK I/MK II generated data no longer contains raw numeric strings as stat names.
- Bundle quantities clearly identify material versus crate units.
- Existing calculator cost and bonus tests pass.
- Excel conversion completes successfully.
- Generated JSON passes Zod validation.
- `npm test`, `npm run lint`, and `npm run build` pass.
- No unrelated generated or source files change.

## 7. Risks and Side Effects

- MK I/MK II corrections may change displayed bonus totals substantially.
- Regenerating `game-data.json` can introduce unrelated data changes if source workbooks or converter behavior differ.
- Changing version authority may cause users to see the What's New dialog once more.
- Dashboard changes may alter update timing across tabs.
- Bundle display changes can affect user interpretation of required purchases.
- Automatic state migration must not discard valid category selections.

## 8. Open Questions / Required Decisions

- Is `package.json` or the latest changelog entry the canonical application version?
- What do the MK I/MK II comma-separated bonus values represent?
- Should MK V levels use `Serum` or `Power Serum`?
- Should the MK V crate include `Neuronal Medium`?
- Was the SummaryCard intentionally removed from tile pages?
- For crate bundles, should “Needed” mean material quantity or crate count?
- Should multi-material crate bundles show one unified bundle count?
- Should formation and hero appointment upgrade lists be group-scoped?
- Was `__mech__` ever persisted in released versions and therefore require migration?
- Are old Hero Appointment materials intended to have dedicated crates?

## 9. Files Expected to Change

Expected for confirmed fixes:

- `package.json`
- `package-lock.json`
- `scripts/convert-excel.js`
- `src/data/json/game-data.json`
- `src/features/calculator/components/BonusesTable.tsx`
- `src/features/calculator/components/CrateConversion.tsx`
- `src/features/dashboard/components/DashboardPage.tsx`
- `src/features/calculator/hooks/useCalculator.tsx`
- `src/features/calculator/components/BundleConversion.tsx`
- Appropriate test files

Investigated but should not change without a decision:

- `src/data/json/crates.json`
- `src/data/json/bundles.json`
- `src/features/calculator/components/SummaryCard.tsx`
- Tile page components
- `src/utils/pageMeta.ts`
- `src/utils/slugs.ts`
- Technical-debt files and ignored build artifacts

## 10. Final Technical Summary

Confirmed root causes are the version source mismatch, non-uniform MK I/MK II Excel schema, conditional hook invocation, incomplete crate-effect dependencies, dashboard’s independent pre-hydration storage read, and crate/material unit conflation in bundle rows.

The safe implementation should first address isolated runtime and state defects, then correct generated Behemoth data only after the raw bonus semantics are confirmed. Summary-card behavior, MK V data, bundle aggregation semantics, category filtering, legacy mech migration, and Hero Appointment crate coverage require explicit product or data decisions before changes are planned.
