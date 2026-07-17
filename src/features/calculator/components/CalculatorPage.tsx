import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Grid, Stack, Typography, Accordion, AccordionSummary, AccordionDetails, Card, CardContent } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { UpgradeSelector } from './UpgradeSelector';
import { UpgradeList } from './UpgradeList';
import { SummaryCard } from './SummaryCard';
import { ResourcesTable } from './ResourcesTable';
import { UpgradePathTable } from './UpgradePathTable';
import { BonusesTable } from './BonusesTable';
import { CrateConversion } from './CrateConversion';
import { BundleConversion } from './BundleConversion';
import { useCalculator } from '../hooks/useCalculator';
import { resolveCategoryId, normalizeSlug, resolveBySlug, resolveMk, buildSlugLookup } from '../../../utils/slugs';

export function CalculatorPage() {
  const { categorySlug, groupSlug, mkSlug, sectionSlug } = useParams();
  const { dispatch, selectedCategoryId, selectedGroupName, selectedUpgrades, results, allItems, isCombinedBehemoth, behemothMk, behemothSection, categories } = useCalculator();

  const groupLookup = useMemo(
    () => buildSlugLookup(categories.flatMap(c => (c.groups ?? []).map(g => g.name))),
    [categories],
  );

  useEffect(() => {
    if (!categorySlug && !mkSlug) return;

    if (mkSlug && sectionSlug) {
      const mk = resolveMk(mkSlug);
      const section = normalizeSlug(sectionSlug);
      if (mk) {
        if (selectedCategoryId === '__behemoth__' && behemothMk === mk && behemothSection === section) return;
        dispatch({ type: 'HYDRATE_FROM_URL', categoryId: '__behemoth__', behemothMk: mk, behemothSection: section });
        return;
      }
    }

    if (categorySlug) {
      const catId = resolveCategoryId(categorySlug);
      if (!catId) return;
      if (catId === '__behemoth__') {
        if (groupSlug) {
          const mk = resolveMk(groupSlug);
          if (selectedCategoryId === '__behemoth__' && behemothMk === mk && !behemothSection) return;
          dispatch({ type: 'HYDRATE_FROM_URL', categoryId: '__behemoth__', behemothMk: mk ?? undefined });
        } else {
          if (selectedCategoryId === '__behemoth__' && !behemothMk) return;
          dispatch({ type: 'HYDRATE_FROM_URL', categoryId: '__behemoth__' });
        }
      } else {
        if (selectedCategoryId === catId && selectedGroupName === undefined) return;
        const groupName = groupSlug ? resolveBySlug(groupSlug, groupLookup) : undefined;
        if (selectedCategoryId === catId && selectedGroupName === groupName) return;
        dispatch({ type: 'HYDRATE_FROM_URL', categoryId: catId, groupName });
      }
    }
  }, [categorySlug, groupSlug, mkSlug, sectionSlug, dispatch, groupLookup, selectedCategoryId, selectedGroupName, behemothMk, behemothSection]);

  return (
    <>
      <Grid container spacing={3}>
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
                {!isCombinedBehemoth && <UpgradeList />}
                {isCombinedBehemoth && selectedUpgrades.length > 0 && (
                  <Card variant="outlined" sx={{ py: 2, px: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {behemothMk
                        ? `Combined totals for ${behemothMk} — select a section to add or modify upgrades.`
                        : `Combined totals for all Behemoths — select a type to add or modify upgrades.`}
                    </Typography>
                  </Card>
                )}
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
              </>
            )}
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
