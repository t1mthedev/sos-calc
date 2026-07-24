import { useMemo } from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack, Chip, Box } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import type { UpgradeItem, SelectedUpgrade, BackpackData, BehemothMk } from '../../../types';
import { getCategories, getCrates, getBehemothItemsForMk } from '../../../services/dataService';
import { sumCosts } from '../../calculator/utils/calculator';
import { MaterialIcon } from '../../../components/MaterialIcon';

const MATERIAL_LABELS: Record<string, string> = {
  manuals: 'Tactical Analysis',
  boards: 'Optical Storage Boards',
  fiber: 'Luminous Fiber',
  fuel: 'Nuclear Fuel Rod',
  coating: 'Antimatter Coating',
  alloy: 'Reinforced Alloy',
  neuronal: 'Neuronal Medium',
};

const SORT_ORDER = ['manuals', 'boards', 'fiber', 'fuel', 'coating', 'alloy', 'neuronal'];
const BEHEMOTH_HIDDEN_IDS = new Set(['behemoth-enhancement', 'behemoth-levels', 'behemoth-skills']);
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

function loadAggregatedCosts(): { totals: Record<string, number>; categories: SavedCategoryInfo[] } {
  try {
    const raw = localStorage.getItem('sos-calc-state');
    if (!raw) return { totals: {}, categories: [] };

    const parsed = JSON.parse(raw);
    const savedStates = parsed.savedStates as Record<string, { selectedUpgrades: SelectedUpgrade[] }> | undefined;
    if (!savedStates) return { totals: {}, categories: [] };

    const itemLookup = buildItemLookup();
    const categories = getCategories();
    const catNameMap = new Map(categories.map(c => [c.id, c.name]));
    catNameMap.set('__behemoth__', 'Behemoth');

    const totals: Record<string, number> = {};
    const categoriesInfo: SavedCategoryInfo[] = [];

    const hasBehemothEntry = '__behemoth__' in savedStates;

    for (const [catId, state] of Object.entries(savedStates)) {
      if (hasBehemothEntry && BEHEMOTH_HIDDEN_IDS.has(catId)) continue;

      const upgrades = state.selectedUpgrades ?? [];
      if (upgrades.length === 0) continue;

      let filteredUpgrades = upgrades;
      if (catId === '__behemoth__') {
        const behemothMk = (state as Record<string, unknown>).behemothMk as string | undefined;
        if (behemothMk) {
          const validIds = new Set(
            getBehemothItemsForMk(behemothMk as BehemothMk).flatMap(s => s.items.map(i => i.id))
          );
          filteredUpgrades = upgrades.filter(u => validIds.has(u.itemId));
        }
      }

      if (filteredUpgrades.length === 0) continue;

      categoriesInfo.push({
        categoryName: catNameMap.get(catId) ?? catId,
        upgradeCount: filteredUpgrades.length,
      });

      for (const upgrade of filteredUpgrades) {
        const item = itemLookup.get(upgrade.itemId);
        if (!item) continue;
        const costs = sumCosts(item, upgrade.currentLevel, upgrade.targetLevel);
        for (const [key, val] of Object.entries(costs)) {
          totals[key] = (totals[key] || 0) + val;
        }
      }
    }

    return { totals, categories: categoriesInfo };
  } catch {
    return { totals: {}, categories: [] };
  }
}

function DashboardPage() {
  const { totals, categories } = useMemo(() => loadAggregatedCosts(), []);

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

  const sortedEntries = useMemo(() => {
    const entries = Object.entries(totals).filter(([_, v]) => v > 0);
    entries.sort((a, b) => {
      const ai = SORT_ORDER.indexOf(a[0]);
      const bi = SORT_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
    return entries;
  }, [totals]);

  const totalItems = categories.reduce((sum, c) => sum + c.upgradeCount, 0);

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

      {sortedEntries.length > 0 ? (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Total Resources Needed ({totalItems} upgrade{totalItems !== 1 ? 's' : ''})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }}>Icon</TableCell>
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Have</TableCell>
                    <TableCell align="right">Remaining</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedEntries.map(([key, val]) => {
                    const have = backpack.materials[key] ?? 0;
                    const fromCrates = crateContributions[key] ?? 0;
                    const remaining = Math.max(0, val - have);
                    const remainingWithCrates = Math.max(0, val - have - fromCrates);
                    return (
                      <TableRow key={key}>
                        <TableCell><MaterialIcon materialKey={key} /></TableCell>
                        <TableCell>{MATERIAL_LABELS[key] ?? key}</TableCell>
                        <TableCell align="right">{val.toLocaleString()}</TableCell>
                        <TableCell align="right">
                          {have > 0 ? (
                            <>
                              <Typography component="span" variant="body2">{have.toLocaleString()}</Typography>
                              {fromCrates > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', whiteSpace: 'nowrap' }}>
                                  {have + fromCrates} with crates
                                </Typography>
                              )}
                            </>
                          ) : fromCrates > 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                              {fromCrates} (crates)
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled">0</Typography>
                          )}
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            component="span"
                            variant="body2"
                            sx={{ fontWeight: 600, color: remaining === 0 ? 'success.main' : 'warning.main' }}
                          >
                            {remaining.toLocaleString()}
                          </Typography>
                          {fromCrates > 0 && remainingWithCrates < remaining && (
                            <Typography variant="caption" sx={{ display: 'block', whiteSpace: 'nowrap', color: 'warning.light', fontStyle: 'italic' }}>
                              {remainingWithCrates.toLocaleString()} with crates
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
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

      {crateEntries.length > 0 && sortedEntries.length === 0 && (
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
