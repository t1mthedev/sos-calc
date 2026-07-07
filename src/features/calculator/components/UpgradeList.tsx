import { Stack, Typography, IconButton, Autocomplete, TextField, Card, CardContent } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCalculator } from '../hooks/useCalculator';
import type { UpgradeLevel } from '../../../types';

export function UpgradeList() {
  const { selectedUpgrades, allItems, setUpgradeCurrent, setUpgradeTarget, removeUpgrade } = useCalculator();

  if (selectedUpgrades.length === 0) return null;

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Selected Upgrades</Typography>
      {selectedUpgrades.map(sel => {
        const item = allItems.find(i => i.id === sel.itemId);
        if (!item) return null;

        const fromValue = item.levels.find(l => l.level === sel.currentLevel) ?? null;
        const toOptions = sel.currentLevel > 0
          ? item.levels.filter(l => l.level > sel.currentLevel)
          : item.levels;
        const toValue = toOptions.find(l => l.level === sel.targetLevel) ?? null;

        return (
          <Card key={sel.itemId} variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                <Typography sx={{ minWidth: 180, fontWeight: 500 }}>{item.name}</Typography>

                <Autocomplete
                  options={item.levels}
                  getOptionLabel={(o: UpgradeLevel) => o.name ?? `Lv ${o.level}`}
                  value={fromValue}
                  onChange={(_, v) => v && setUpgradeCurrent(sel.itemId, v.level)}
                  isOptionEqualToValue={(o, v) => o.level === v.level}
                  renderInput={params => <TextField {...params} label="From" size="small" sx={{ width: 180 }} />}
                  size="small"
                />
                <Autocomplete
                  options={toOptions}
                  getOptionLabel={(o: UpgradeLevel) => o.name ?? `Lv ${o.level}`}
                  value={toValue}
                  onChange={(_, v) => v && setUpgradeTarget(sel.itemId, v.level)}
                  isOptionEqualToValue={(o, v) => o.level === v.level}
                  renderInput={params => <TextField {...params} label="To" size="small" sx={{ width: 180 }} />}
                  size="small"
                  disabled={!fromValue}
                  sx={{ '&.Mui-disabled .MuiInputBase-root': { backgroundColor: 'action.hover', cursor: 'not-allowed' }, '&.Mui-disabled .MuiOutlinedInput-notchedOutline': { borderStyle: 'dashed', borderColor: 'text.disabled', borderWidth: 2 } }}
                />

                <IconButton size="small" color="error" onClick={() => removeUpgrade(sel.itemId)}>
                  <DeleteIcon />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        );
      })}
    </Stack>
  );
}
