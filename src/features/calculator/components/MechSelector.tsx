import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Stack, Typography, Card, CardActionArea, CardContent, Button, Divider } from '@mui/material';
import { useCalculator } from '../hooks/useCalculator';
import { getSectionSlug } from '../../../utils/slugs';

const SECTION_OPTIONS: { value: string; label: string; description: string }[] = [
  { value: 'enhancement', label: 'Enhancement', description: 'Upgrade mech rarity with Mech Fragments' },
  { value: 'skills', label: 'Skills', description: 'Unlock and upgrade skill tree nodes with Firmware Modules' },
];

export function MechSelector() {
  const navigate = useNavigate();
  const { dispatch, mechSection, allItems, addUpgrade, selectedUpgrades } = useCalculator();

  const handleSelectSection = useCallback((value: string) => {
    dispatch({ type: 'SYNC_MECH', section: value });
    navigate(`/calculator/vehicles/mechs/${getSectionSlug(value)}`);
  }, [dispatch, navigate]);

  return (
    <Stack spacing={2}>
      {!mechSection && (
        <>
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

      {mechSection && (
        <>
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
