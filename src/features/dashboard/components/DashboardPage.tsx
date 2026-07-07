import { useMemo } from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack, Chip, Box } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import type { UpgradeItem, SelectedUpgrade } from '../../../types';
import { getCategories } from '../../../services/dataService';
import { sumCosts } from '../../calculator/utils/calculator';

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

    for (const [catId, state] of Object.entries(savedStates)) {
      const upgrades = state.selectedUpgrades ?? [];
      if (upgrades.length === 0) continue;

      categoriesInfo.push({
        categoryName: catNameMap.get(catId) ?? catId,
        upgradeCount: upgrades.length,
      });

      for (const upgrade of upgrades) {
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
                    <TableCell>Material</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedEntries.map(([key, val]) => (
                    <TableRow key={key}>
                      <TableCell>{MATERIAL_LABELS[key] ?? key}</TableCell>
                      <TableCell align="right">{val.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
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
    </Stack>
  );
}

export { DashboardPage };
