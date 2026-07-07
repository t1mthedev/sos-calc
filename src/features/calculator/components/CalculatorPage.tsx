import { Grid, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Card, CardContent, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { UpgradeSelector } from './UpgradeSelector';
import { UpgradeList } from './UpgradeList';
import { SummaryCard } from './SummaryCard';
import { ResourcesTable } from './ResourcesTable';
import { UpgradePathTable } from './UpgradePathTable';
import { BonusesTable } from './BonusesTable';
import { CrateConversion } from './CrateConversion';
import { BundleConversion } from './BundleConversion';
import { AppFooter } from './AppFooter';
import { useCalculator } from '../hooks/useCalculator';
import { getItemById } from '../../../services/dataService';

export function CalculatorPage() {
  const { selectedCategoryId, selectedUpgrades, results } = useCalculator();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Grid container spacing={3} sx={{ pt: 3, px: 3, flexGrow: 1 }}>
        <Grid size={{ xs: 12, md: 4 }}>
          <UpgradeSelector />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {selectedCategoryId === null ? (
              <Card sx={{ textAlign: 'center', py: 6, px: 3 }}>
                <CardContent>
                  <Typography variant="h5" gutterBottom>Welcome to SOS Calc</Typography>
                  <Typography color="text.secondary">
                    Select a category from the left to start calculating upgrade costs.
                  </Typography>
                  <Typography color="text.secondary" sx={{ mt: 2 }}>
                    Your data is saved locally — switch between categories freely.
                  </Typography>
                </CardContent>
              </Card>
            ) : (
              <>
                <UpgradeList />
                {selectedUpgrades.length > 0 && results.size === 0 && (
                  <Typography color="text.secondary">
                    Set current and target levels to see results.
                  </Typography>
                )}
                {results.size > 0 && (
                  <>
                    <SummaryCard />
                    <CrateConversion />
                    <BundleConversion />
                    {selectedUpgrades.map(sel => {
                      const itemId = sel.itemId;
                      if (!results.has(itemId)) return null;
                      const result = results.get(itemId)!;
                      const item = getItemById(selectedCategoryId ?? '', itemId);
                      const itemName = item?.name ?? itemId;
                      return (
                        <Accordion key={itemId}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>{itemName} · {result.upgradesCount} upgrade{result.upgradesCount !== 1 ? 's' : ''}</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Stack spacing={2}>
                              <BonusesTable itemId={itemId} />
                              <ResourcesTable itemId={itemId} />
                              <UpgradePathTable itemId={itemId} />
                            </Stack>
                          </AccordionDetails>
                        </Accordion>
                      );
                    })}
                  </>
                )}
              </>
            )}
          </Stack>
        </Grid>
      </Grid>
      <Box sx={{ width: 1, px: 3, pb: 2, pt: 1 }}>
        <AppFooter />
      </Box>
    </Box>
  );
}
