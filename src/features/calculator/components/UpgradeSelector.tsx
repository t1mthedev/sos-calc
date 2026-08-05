import { useNavigate } from 'react-router-dom';
import { FormControl, InputLabel, Select, MenuItem, Button, Stack, Typography, Divider, IconButton, Tooltip, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCalculator } from '../hooks/useCalculator';
import { getCategorySlug, toSlug } from '../../../utils/slugs';

export function UpgradeSelector() {
  const navigate = useNavigate();
  const { selectedCategoryId, selectedCategory, selectedGroupName, groupItems, allItems,
    selectGroup, addUpgrade, selectedUpgrades, hasCurrentData, clearCategory } = useCalculator();

  const handleGroupChange = (name: string) => {
    selectGroup(name);
    const catSlug = selectedCategoryId ? getCategorySlug(selectedCategoryId) : '';
    navigate(`/calculator/${catSlug}/${toSlug(name)}`);
  };

  const handleClearCategory = () => {
    if (window.confirm('Clear all upgrades in this category?')) {
      clearCategory();
      navigate('/calculator');
    }
  };

  return (
    <Stack spacing={2}>
      {selectedCategory?.groups && (
            <FormControl fullWidth>
              <InputLabel>Group</InputLabel>
              <Select value={selectedGroupName ?? ''} label="Group" onChange={e => handleGroupChange(e.target.value)}
                renderValue={v => {
                  const g = selectedCategory?.groups?.find(gr => gr.name === v);
                  return g?.mk ? <>{g.name} <Chip label={g.mk} size="small" variant="outlined" sx={{ ml: 1, fontSize: '0.7rem', height: 20 }} /></> : v;
                }}>
                {selectedCategory.groups.map(g => (
                  <MenuItem key={g.name} value={g.name}>
                    {g.name}
                    {g.mk && <Chip label={g.mk} size="small" variant="outlined" sx={{ ml: 1, fontSize: '0.7rem', height: 20 }} />}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {((selectedCategory && !selectedCategory.groups) || (selectedGroupName && groupItems.length > 0)) && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">Add upgrades to calculate:</Typography>
              {(selectedCategory?.groups ? groupItems : allItems).map(item => {
                const added = selectedUpgrades.some(u => u.itemId === item.id);
                return (
                  <Stack key={item.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography sx={{ flex: 1 }}>{item.name}</Typography>
                    <Button
                      size="small"
                      variant={added ? 'outlined' : 'contained'}
                      color={added ? 'inherit' : 'primary'}
                      disabled={added}
                      onClick={() => addUpgrade(item.id)}
                    >
                      {added ? 'Added' : 'Add'}
                    </Button>
                  </Stack>
                );
              })}
            </Stack>
          )}

      <Divider />
      <Stack spacing={1}>
        {hasCurrentData && <Tooltip title="Clear all upgrades in this category">
          <IconButton
            size="small"
            color="error"
            onClick={handleClearCategory}
            sx={{ alignSelf: 'flex-start' }}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Tooltip>}
      </Stack>
    </Stack>
  );
}
