import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Grid, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Card, Breadcrumbs, Link, Box } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { MechSelector } from './MechSelector';
import { UpgradeList } from './UpgradeList';
import { ResourcesTable } from './ResourcesTable';
import { UpgradePathTable } from './UpgradePathTable';
import { BonusesTable } from './BonusesTable';
import { CrateConversion } from './CrateConversion';
import { BundleConversion } from './BundleConversion';
import { useCalculator } from '../hooks/useCalculator';
import { getMechCategoryId } from '../../../services/dataService';
import { normalizeSlug } from '../../../utils/slugs';
import type { MechSection } from '../../../types';

const SECTION_LABELS: Record<string, string> = {
  enhancement: 'Enhancement',
  skills: 'Skills',
};

export function MechPage() {
  const { sectionSlug } = useParams();
  const navigate = useNavigate();
  const { dispatch, selectedCategoryId, selectedUpgrades, results, allItems, mechSection } = useCalculator();

  useEffect(() => {
    const section = sectionSlug ? (normalizeSlug(sectionSlug) as MechSection) : null;
    if (section && section !== 'enhancement' && section !== 'skills') return;
    const expectedCategoryId = section ? getMechCategoryId(section) : null;
    if (selectedCategoryId === expectedCategoryId && mechSection === section) return;
    dispatch({ type: 'SYNC_MECH', section });
  }, [sectionSlug, dispatch, selectedCategoryId, mechSection]);

  const isDetail = sectionSlug != null;

  const breadcrumbs = (
    <Box sx={{ mb: 2 }}>
      <Breadcrumbs aria-label="breadcrumb">
        <Link component="button" underline="hover" color="inherit" onClick={() => navigate('/calculator')}>
          Calculator
        </Link>
        <Link component="button" underline="hover" color="inherit" onClick={() => navigate('/calculator/vehicles')}>
          Vehicles
        </Link>
        {mechSection ? (
          <Link
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => navigate('/calculator/vehicles/mechs')}
          >
            Mechs
          </Link>
        ) : (
          <Typography color="text.primary">Mechs</Typography>
        )}
        {mechSection && <Typography color="text.primary">{SECTION_LABELS[mechSection] ?? mechSection}</Typography>}
      </Breadcrumbs>
    </Box>
  );

  if (!isDetail) {
    return (
      <Card variant="outlined" sx={{ p: 3 }}>
        {breadcrumbs}
        <Typography variant="h5" sx={{ mb: 2 }}>Mechs</Typography>
        <MechSelector />
      </Card>
    );
  }

  return (
    <>
      {breadcrumbs}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 4 }}>
          <MechSelector />
        </Grid>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            {mechSection && <UpgradeList />}
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
                           <BonusesTable itemId={itemId} hideBonuses={mechSection === 'skills'} />
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
