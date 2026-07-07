import { Card, CardContent, Typography, Grid } from '@mui/material';
import { useCalculator } from '../hooks/useCalculator';

export function SummaryCard() {
  const { results, combinedCosts, selectedUpgrades } = useCalculator();

  if (selectedUpgrades.length === 0) return null;

  const totalUpgrades = Array.from(results.values()).reduce((s, r) => s + r.upgradesCount, 0);

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Total Summary</Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">Upgrades</Typography>
            <Typography variant="h6">{totalUpgrades}</Typography>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <Typography variant="body2" color="text.secondary">Components</Typography>
            <Typography variant="h6">{selectedUpgrades.length}</Typography>
          </Grid>
          {Object.entries(combinedCosts).map(([key, val]) => (
            <Grid key={key} size={{ xs: 6, sm: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ textTransform: 'capitalize' }}>{key}</Typography>
              <Typography variant="h6">{val}</Typography>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
}
