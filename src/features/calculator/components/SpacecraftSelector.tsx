import { useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Stack, Typography, Card, CardActionArea, CardContent, Button, Divider } from '@mui/material';
import { useCalculator } from '../hooks/useCalculator';
import { toSlug } from '../../../utils/slugs';

const SPACECRAFT_GROUPS = [
  { label: 'Spacecraft', description: 'Upgrade the standard spacecraft capsules' },
  { label: 'Enterprise', description: 'Upgrade the Enterprise capsules' },
];

export function SpacecraftSelector() {
  const navigate = useNavigate();
  const { typeSlug } = useParams();
  const { groupItems, addUpgrade, selectedUpgrades } = useCalculator();

  const selectedGroup = useMemo(
    () => SPACECRAFT_GROUPS.find(g => toSlug(g.label) === typeSlug) ?? null,
    [typeSlug],
  );

  const handleSelectGroup = useCallback((label: string) => {
    navigate(`/calculator/spacecraft/${toSlug(label)}`);
  }, [navigate]);

  if (!selectedGroup) {
    return (
      <Stack spacing={2}>
        <Typography variant="subtitle2" color="text.secondary">Select spacecraft type:</Typography>
        {SPACECRAFT_GROUPS.map(group => (
          <Card key={group.label} variant="outlined" sx={{ cursor: 'pointer' }}>
            <CardActionArea onClick={() => handleSelectGroup(group.label)}>
              <CardContent>
                <Typography sx={{ fontWeight: 600 }}>{group.label}</Typography>
                <Typography variant="body2" color="text.secondary">{group.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2" color="text.secondary">Add upgrades to calculate:</Typography>
      {groupItems.length > 0 && (
        <Stack spacing={1}>
          {groupItems.map(item => {
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
    </Stack>
  );
}
