import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Typography, Card, CardActionArea, CardContent, Chip, Button, Divider, Box } from '@mui/material';
import { useCalculator } from '../hooks/useCalculator';
import { getMkSlug, getSectionSlug } from '../../../utils/slugs';

type BehemothMkValue = 'MK 0' | 'MK I' | 'MK II' | 'MK III' | 'MK IV' | 'MK V';

const BEHEMOTH_GROUPS: { label: string; options: { value: BehemothMkValue; label: string; description: string }[] }[] = [
  {
    label: 'Behemoths',
    options: [
      { value: 'MK I', label: 'MK I', description: 'Enhancement, levels, and skill trees for MK I' },
      { value: 'MK II', label: 'MK II', description: 'Enhancement, levels, and skill trees for MK II' },
      { value: 'MK V', label: 'MK V', description: 'Enhancement, levels, and skill trees for MK V' },
    ],
  },
  {
    label: 'Companion Behemoths',
    options: [
      { value: 'MK 0', label: 'MK 0', description: 'Enhancement, levels, and skill trees for MK 0' },
      { value: 'MK III', label: 'MK III', description: 'Enhancement, levels, and skill trees for MK III' },
      { value: 'MK IV', label: 'MK IV', description: 'Enhancement, levels, and skill trees for MK IV' },
    ],
  },
];

const SECTION_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'enhancement', label: 'Enhancement', description: 'Upgrade behemoth rarity with fragments' },
  { value: 'levels', label: 'Levels', description: 'Level up behemoth with Power Serum' },
  { value: 'skills', label: 'Skills', description: 'Unlock and upgrade skill tree nodes' },
];

export function BehemothSelector() {
  const navigate = useNavigate();
  const { behemothMk, behemothSection, selectBehemothMk, selectBehemothSection, allItems, addUpgrade, selectedUpgrades } = useCalculator();

  const handleSelectMk = useCallback((value: string) => {
    selectBehemothMk(value);
    navigate(`/calculator/behemoth/${getMkSlug(value)}`);
  }, [selectBehemothMk, navigate]);

  const handleDeleteMk = useCallback(() => {
    selectBehemothMk('');
    navigate('/calculator/behemoth');
  }, [selectBehemothMk, navigate]);

  const handleSelectSection = useCallback((value: string) => {
    selectBehemothSection(value);
    navigate(`/calculator/behemoth/${getMkSlug(behemothMk ?? '')}/${getSectionSlug(value)}`);
  }, [selectBehemothSection, behemothMk, navigate]);

  const handleDeleteSection = useCallback(() => {
    selectBehemothSection('');
    navigate(`/calculator/behemoth/${getMkSlug(behemothMk ?? '')}`);
  }, [selectBehemothSection, behemothMk, navigate]);

  return (
    <Stack spacing={2}>
      {!behemothMk && (
        <>
          <Typography variant="subtitle2" color="text.secondary">Select Behemoth type:</Typography>
          {BEHEMOTH_GROUPS.map(group => (
            <Box key={group.label}>
              <Typography variant="overline" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.5 }}>
                {group.label}
              </Typography>
              {group.options.map(opt => (
                <Card key={opt.value} variant="outlined" sx={{ cursor: 'pointer', mb: 1 }}>
                  <CardActionArea onClick={() => handleSelectMk(opt.value)}>
                    <CardContent>
                      <Typography sx={{ fontWeight: 600 }}>{opt.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{opt.description}</Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              ))}
            </Box>
          ))}
        </>
      )}

      {behemothMk && !behemothSection && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle2" color="text.secondary">Behemoth:</Typography>
            <Chip label={behemothMk} size="small" color="primary" onDelete={handleDeleteMk} />
          </Stack>
          <Typography variant="subtitle2" color="text.secondary">Select section:</Typography>
          {SECTION_OPTIONS.map(opt => (
            <Card key={opt.value} variant="outlined" sx={{ cursor: 'pointer' }}>
              <CardActionArea onClick={() => handleSelectSection(opt.value)}>
                <CardContent>
                  <Typography sx={{ fontWeight: 600 }}>{opt.label}</Typography>
                  <Typography variant="body2" color="text.secondary">{opt.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </>
      )}

      {behemothMk && behemothSection && (
        <>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={behemothMk} size="small" color="primary" onDelete={handleDeleteMk} />
            <Chip
              label={SECTION_OPTIONS.find(s => s.value === behemothSection)?.label ?? behemothSection}
              size="small"
              variant="outlined"
              onDelete={handleDeleteSection}
            />
          </Stack>
          <Divider />
          {allItems.length > 0 && (
            <Stack spacing={1}>
              <Typography variant="subtitle2" color="text.secondary">Add upgrades to calculate:</Typography>
              {allItems.map(item => {
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
    </Stack>
  );
}
