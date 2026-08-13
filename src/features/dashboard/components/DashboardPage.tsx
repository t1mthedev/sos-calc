import { useMemo } from 'react';
import { Card, CardContent, Typography, Stack, Chip, Box } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import type { UpgradeItem, SelectedUpgrade, BackpackData } from '../../../types';
import { getCategories, getCrates, getBehemothItemMkMap } from '../../../services/dataService';
import { sumCosts } from '../../calculator/utils/calculator';
import { MaterialsTable, sortMaterialEntries, type MaterialsTableSection, type MaterialsTableSectionMk } from './MaterialsTable';

const BEHEMOTH_CATEGORY_IDS = ['behemoth-enhancement', 'behemoth-levels', 'behemoth-skills'];
const BEHEMOTH_KEYS = new Set(['__behemoth__', ...BEHEMOTH_CATEGORY_IDS]);

const BEHEMOTH_GROUP_DEFS: { name: string; mks: string[] }[] = [
  { name: 'Behemoths', mks: ['MK I', 'MK II'] },
  { name: 'Companion Behemoths', mks: ['MK 0', 'MK III', 'MK IV', 'MK V'] },
];

const BACKPACK_KEY = 'sos-calc-backpack';

function loadBackpack(): BackpackData {
  try {
    const raw = localStorage.getItem(BACKPACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'materials' in parsed && 'crates' in parsed) {
        return parsed as BackpackData;
      }
    }
  } catch { /* ignore */ }
  return { materials: {}, crates: {} };
}

function buildItemLookup(): Map<string, UpgradeItem> {
  const map = new Map<string, UpgradeItem>();
  for (const cat of getCategories()) {
    const items = cat.items ?? cat.groups?.flatMap(g => g.items) ?? [];
    for (const item of items) {
      map.set(item.id, item);
    }
  }
  return map;
}

interface SavedCategoryInfo {
  categoryName: string;
  upgradeCount: number;
}

function loadAggregatedCosts(): { totals: Record<string, number>; categories: SavedCategoryInfo[]; behemothSections: MaterialsTableSection[]; nonBehemothUpgradeCount: number; behemothUpgradeCount: number } {
  try {
    const raw = localStorage.getItem('sos-calc-state');
    if (!raw) return { totals: {}, categories: [], behemothSections: [], nonBehemothUpgradeCount: 0, behemothUpgradeCount: 0 };

    const parsed = JSON.parse(raw);
    const savedStates = parsed.savedStates as Record<string, { selectedUpgrades: SelectedUpgrade[] }> | undefined;
    if (!savedStates) return { totals: {}, categories: [], behemothSections: [], nonBehemothUpgradeCount: 0, behemothUpgradeCount: 0 };

    const itemLookup = buildItemLookup();
    const behemothItemMkMap = getBehemothItemMkMap();
    const categories = getCategories();
    const catNameMap = new Map(categories.map(c => [c.id, c.name]));

    const totals: Record<string, number> = {};
    const categoriesInfo: SavedCategoryInfo[] = [];
    let nonBehemothUpgradeCount = 0;

    const behemothUpgrades = new Map<string, SelectedUpgrade>();
    for (const id of BEHEMOTH_CATEGORY_IDS) {
      for (const u of savedStates[id]?.selectedUpgrades ?? []) {
        behemothUpgrades.set(u.itemId, u);
      }
    }
    for (const u of savedStates['__behemoth__']?.selectedUpgrades ?? []) {
      behemothUpgrades.set(u.itemId, u);
    }

    for (const [catId, state] of Object.entries(savedStates)) {
      if (BEHEMOTH_KEYS.has(catId)) continue;

      const upgrades = state.selectedUpgrades ?? [];
      if (upgrades.length === 0) continue;

      categoriesInfo.push({
        categoryName: catNameMap.get(catId) ?? catId,
        upgradeCount: upgrades.length,
      });
      nonBehemothUpgradeCount += upgrades.length;

      for (const upgrade of upgrades) {
        const item = itemLookup.get(upgrade.itemId);
        if (!item) continue;
        const costs = sumCosts(item, upgrade.currentLevel, upgrade.targetLevel);
        for (const [key, val] of Object.entries(costs)) {
          totals[key] = (totals[key] || 0) + val;
        }
      }
    }

    const mkTotals = new Map<string, Record<string, number>>();
    const mkCounts = new Map<string, number>();
    let behemothUpgradeCount = 0;

    for (const upgrade of behemothUpgrades.values()) {
      const item = itemLookup.get(upgrade.itemId);
      if (!item) continue;
      behemothUpgradeCount++;

      const costs = sumCosts(item, upgrade.currentLevel, upgrade.targetLevel);

      const mk = behemothItemMkMap.get(upgrade.itemId) ?? 'Other';
      const mkTotal = mkTotals.get(mk) ?? {};
      for (const [key, val] of Object.entries(costs)) {
        mkTotal[key] = (mkTotal[key] || 0) + val;
      }
      mkTotals.set(mk, mkTotal);
      mkCounts.set(mk, (mkCounts.get(mk) ?? 0) + 1);
    }

    if (behemothUpgradeCount > 0) {
      categoriesInfo.push({ categoryName: 'Behemoth', upgradeCount: behemothUpgradeCount });
    }

    const behemothSections: MaterialsTableSection[] = [];
    for (const def of BEHEMOTH_GROUP_DEFS) {
      const mks: MaterialsTableSectionMk[] = [];
      for (const mk of def.mks) {
        const count = mkCounts.get(mk) ?? 0;
        if (count === 0) continue;
        mks.push({ mk, upgradeCount: count, entries: sortMaterialEntries(mkTotals.get(mk) ?? {}) });
      }
      if (def.name === 'Companion Behemoths') {
        const count = mkCounts.get('Other') ?? 0;
        if (count > 0) {
          mks.push({ mk: 'Other', upgradeCount: count, entries: sortMaterialEntries(mkTotals.get('Other') ?? {}) });
        }
      }
      const upgradeCount = mks.reduce((sum, m) => sum + m.upgradeCount, 0);
      if (upgradeCount === 0) continue;

      const groupTotals: Record<string, number> = {};
      for (const m of mks) {
        for (const [key, val] of m.entries) {
          groupTotals[key] = (groupTotals[key] || 0) + val;
        }
      }
      behemothSections.push({ name: def.name, upgradeCount, mks, totalEntries: sortMaterialEntries(groupTotals) });
    }

    return { totals, categories: categoriesInfo, behemothSections, nonBehemothUpgradeCount, behemothUpgradeCount };
  } catch {
    return { totals: {}, categories: [], behemothSections: [], nonBehemothUpgradeCount: 0, behemothUpgradeCount: 0 };
  }
}

function DashboardPage() {
  const { totals, categories, behemothSections, nonBehemothUpgradeCount, behemothUpgradeCount } = useMemo(() => loadAggregatedCosts(), []);

  const backpack = useMemo(() => loadBackpack(), []);

  const crates = useMemo(() => getCrates(), []);

  const crateContributions = useMemo(() => {
    const contributions: Record<string, number> = {};
    for (const crate of crates) {
      const count = backpack.crates[crate.id] ?? 0;
      if (count === 0) continue;
      for (const option of crate.options) {
        contributions[option.materialKey] = (contributions[option.materialKey] ?? 0) + count * option.amount;
      }
    }
    return contributions;
  }, [backpack.crates, crates]);

  const sortedEntries = useMemo(() => sortMaterialEntries(totals), [totals]);

  const totalUpgradeCount = nonBehemothUpgradeCount + behemothUpgradeCount;
  const hasAnyUpgrades = sortedEntries.length > 0 || behemothSections.length > 0;

  const crateEntries = useMemo(() => {
    return crates
      .map(c => ({ crate: c, count: backpack.crates[c.id] ?? 0 }))
      .filter(({ count }) => count > 0);
  }, [backpack.crates, crates]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" gutterBottom>Dashboard</Typography>
        <Typography color="text.secondary">
          Overview of all saved upgrade plans across categories.
        </Typography>
      </Box>

      {categories.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Active Categories
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
              {categories.map(c => (
                <Chip key={c.categoryName} label={`${c.categoryName} (${c.upgradeCount})`} variant="outlined" />
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}

      {hasAnyUpgrades ? (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Total Resources Needed ({totalUpgradeCount} upgrade{totalUpgradeCount !== 1 ? 's' : ''})
            </Typography>
            <MaterialsTable
              entries={sortedEntries}
              sections={behemothSections}
              backpack={backpack}
              crateContributions={crateContributions}
            />
            <Box sx={{ mt: 1.5, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="caption" color="text.secondary">
                <Typography component="span" sx={{ color: 'success.main', fontWeight: 600 }}>●</Typography> Fully covered
              </Typography>
              <Typography variant="caption" color="text.secondary">
                <Typography component="span" sx={{ color: 'warning.main', fontWeight: 600 }}>●</Typography> Still needed
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ textAlign: 'center', py: 6 }}>
          <CardContent>
            <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
            <Typography color="text.secondary">
              No saved upgrades yet. Go to the Calculator to add some.
            </Typography>
          </CardContent>
        </Card>
      )}

      {crateEntries.length > 0 && !hasAnyUpgrades && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Backpack Crates
            </Typography>
            <Stack spacing={1}>
              {crateEntries.map(({ crate, count }) => (
                <Box key={crate.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2">{crate.name}</Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{count}</Typography>
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Stack>
  );
}

export { DashboardPage };
