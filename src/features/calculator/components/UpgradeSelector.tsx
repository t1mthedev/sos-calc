import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FormControl, InputLabel, Select, MenuItem, Button, Stack, Typography, Divider, IconButton, Tooltip, Chip } from '@mui/material';
import { useDevMode } from '../../../hooks/useDevMode';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCalculator } from '../hooks/useCalculator';
import { BehemothSelector } from './BehemothSelector';
import { getCategorySlug, toSlug } from '../../../utils/slugs';

const BEHEMOTH_CAT_IDS = new Set(['behemoth-enhancement', 'behemoth-levels', 'behemoth-skills']);

export function UpgradeSelector() {
  const isDev = useDevMode();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { categories, selectedCategoryId, selectedCategory, selectedGroupName, groupItems, allItems,
    selectCategory, selectGroup, addUpgrade, selectedUpgrades, reset, hasSavedData, hasCurrentData, clearCategory, isBehemoth } = useCalculator();

  const dropdownOptions = [
    { id: '__behemoth__', name: 'Behemoth' },
    ...categories.filter(c => !BEHEMOTH_CAT_IDS.has(c.id)),
  ];

  const handleCategoryChange = (id: string) => {
    selectCategory(id);
    navigate(`/calculator/${getCategorySlug(id)}`);
  };

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

  const handleExport = () => {
    const ls = localStorage.getItem('sos-calc-state');
    const data = ls ? JSON.parse(ls) : {};
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sos-calc-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (typeof parsed !== 'object' || !parsed) throw new Error('invalid');
        if (parsed.savedStates) {
          if (typeof parsed.savedStates !== 'object') throw new Error('invalid');
        } else if (typeof parsed.selectedCategoryId === 'string') {
          parsed.savedStates = {};
          if (parsed.selectedCategoryId) {
            parsed.savedStates[parsed.selectedCategoryId] = {
              selectedGroupName: parsed.selectedGroupName ?? null,
              selectedUpgrades: Array.isArray(parsed.selectedUpgrades) ? parsed.selectedUpgrades : [],
            };
          }
          parsed.activeCategoryId = parsed.selectedCategoryId;
          delete parsed.selectedCategoryId;
          delete parsed.selectedGroupName;
          delete parsed.selectedUpgrades;
        } else {
          throw new Error('invalid');
        }
        localStorage.setItem('sos-calc-state', JSON.stringify(parsed));
        window.location.reload();
      } catch {
        alert('Could not parse backup file');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <Stack spacing={2}>
      <FormControl fullWidth>
        <InputLabel>Category</InputLabel>
        <Select value={isBehemoth ? '__behemoth__' : (selectedCategoryId ?? '')} label="Category" onChange={e => handleCategoryChange(e.target.value)}>
          {dropdownOptions.map(opt => (
            <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {isBehemoth ? (
        <BehemothSelector />
      ) : (
        <>
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
        </>
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
        {isDev && (
          <>
            {hasSavedData && <Button variant="outlined" size="small" color="error" onClick={() => {
              if (window.confirm('This will permanently delete ALL saved upgrades across ALL categories. Are you sure?')) reset();
            }}>
              Clear All
            </Button>}
            <Button variant="outlined" size="small" onClick={handleExport}>
              Export to JSON
            </Button>
            <Button variant="outlined" size="small" onClick={() => inputRef.current?.click()}>
              Import from JSON
            </Button>
          </>
        )}
      </Stack>
      <input type="file" accept=".json" ref={inputRef} onChange={handleImport} style={{ display: 'none' }} />
    </Stack>
  );
}
