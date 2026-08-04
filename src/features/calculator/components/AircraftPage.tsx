import { useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Grid, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Card, Breadcrumbs, Link, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { AircraftSelector } from './AircraftSelector';
import { UpgradeList } from './UpgradeList';
import { ResourcesTable } from './ResourcesTable';
import { UpgradePathTable } from './UpgradePathTable';
import { BonusesTable } from './BonusesTable';
import { CrateConversion } from './CrateConversion';
import { BundleConversion } from './BundleConversion';
import { useCalculator } from '../hooks/useCalculator';
import { resolveBySlug, buildSlugLookup } from '../../../utils/slugs';
const AIRCRAFT_GROUP_NAMES = ['AC04', 'FA-1 Specter', 'Carrier'];

export function AircraftPage() {
  const { typeSlug } = useParams();
  const navigate = useNavigate();
  const { dispatch, selectedCategoryId, selectedGroupName, selectedUpgrades, results, allItems } = useCalculator();

  const groupLookup = useMemo(() => buildSlugLookup(AIRCRAFT_GROUP_NAMES), []);

  const selectedGroupNameFromUrl = useMemo(
    () => (typeSlug ? (resolveBySlug(typeSlug, groupLookup) ?? null) : null),
    [typeSlug, groupLookup],
  );

  useEffect(() => {
    const groupName = selectedGroupNameFromUrl;
    if (selectedCategoryId === 'aircraft' && selectedGroupName === groupName) return;
    dispatch({ type: 'HYDRATE_FROM_URL', categoryId: 'aircraft', groupName: groupName ?? undefined });
  }, [typeSlug, selectedGroupNameFromUrl, dispatch, selectedCategoryId, selectedGroupName]);

  const isDetail = selectedGroupNameFromUrl != null;

  const breadcrumbs = (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link component="button" underline="hover" color="inherit" onClick={() => navigate('/calculator')}>
          Calculator
        </Link>
        {isDetail ? (
          <Link component="button" underline="hover" color="inherit" onClick={() => navigate('/calculator/aircraft')}>
            Aircraft
          </Link>
        ) : (
          <Typography color="text.primary">Aircraft</Typography>
        )}
        {isDetail && <Typography color="text.primary">{selectedGroupNameFromUrl}</Typography>}
      </Breadcrumbs>
    </Box>
  );

  if (!isDetail) {
    return (
      <Card variant="outlined" sx={{ p: 3 }}>
        {breadcrumbs}
        <Typography variant="h5" sx={{ mb: 2 }}>Aircraft</Typography>
        <AircraftSelector />
      </Card>
    );
  }

  return (
    <>
      {breadcrumbs}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <AircraftSelector />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <UpgradeList />
            {selectedUpgrades.length > 0 && results.size === 0 && (
              <Typography color="text.secondary">
                Set current and target levels to see results.
              </Typography>
            )}
            {results.size > 0 && (
              <>
                <CrateConversion />
                <BundleConversion />
                {selectedUpgrades.map(sel => {
                  const itemId = sel.itemId;
                  if (!results.has(itemId)) return null;
                  const result = results.get(itemId)!;
                  const item = allItems.find(i => i.id === itemId);
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
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
