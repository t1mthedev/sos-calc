import { useMemo } from 'react';
import {
  Card, CardContent, Typography,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Stack,
} from '@mui/material';
import { getBundlesByCategory, getCrateById } from '../../../services/dataService';
import { useCalculator } from '../hooks/useCalculator';

export function BundleConversion() {
  const { selectedCategoryId, combinedCosts } = useCalculator();

  const bundles = useMemo(
    () => getBundlesByCategory(selectedCategoryId ?? ''),
    [selectedCategoryId]
  );

  const rows = useMemo(() => {
    const result: {
      bundleId: string;
      bundleName: string;
      priceDiamonds: number;
      materialName: string;
      qtyPerBundle: number;
      totalNeeded: number;
      bundlesNeeded: number;
      yieldTotal: number;
      diamondsTotal: number;
    }[] = [];

    for (const bundle of bundles) {
      const isAndBundle = bundle.contents.every(c => c.materialKey && !c.crateId);

      if (isAndBundle) {
        const contentRows: {
          materialKey: string;
          materialName: string;
          qtyPerBundle: number;
          totalNeeded: number;
        }[] = [];

        for (const content of bundle.contents) {
          if (!content.materialKey) continue;
          const totalNeeded = combinedCosts[content.materialKey];
          if (!totalNeeded || totalNeeded <= 0) continue;
          contentRows.push({
            materialKey: content.materialKey,
            materialName: content.materialKey,
            qtyPerBundle: content.count,
            totalNeeded,
          });
        }

        if (contentRows.length === 0) continue;

        const bundlesNeeded = Math.max(...contentRows.map(r => Math.ceil(r.totalNeeded / r.qtyPerBundle)));

        for (const cr of contentRows) {
          result.push({
            bundleId: bundle.id,
            bundleName: bundle.name,
            priceDiamonds: bundle.priceDiamonds,
            materialName: cr.materialName,
            qtyPerBundle: cr.qtyPerBundle,
            totalNeeded: cr.totalNeeded,
            bundlesNeeded,
            yieldTotal: bundlesNeeded * cr.qtyPerBundle,
            diamondsTotal: bundlesNeeded * bundle.priceDiamonds,
          });
        }
      } else {
        for (const content of bundle.contents) {
          if (!content.crateId) continue;
          const crate = getCrateById(content.crateId);
          if (!crate) continue;
          const matchingOptions = crate.options.filter(o => (combinedCosts[o.materialKey] ?? 0) > 0);
          for (const opt of matchingOptions) {
            const totalNeeded = combinedCosts[opt.materialKey];
            const cratesNeeded = Math.ceil(totalNeeded / opt.amount);
            const bundlesNeeded = Math.ceil(cratesNeeded / content.count);
            result.push({
              bundleId: bundle.id,
              bundleName: bundle.name,
              priceDiamonds: bundle.priceDiamonds,
              materialName: opt.materialName,
              qtyPerBundle: content.count * opt.amount,
              totalNeeded: cratesNeeded,
              bundlesNeeded,
              yieldTotal: bundlesNeeded * content.count * opt.amount,
              diamondsTotal: bundlesNeeded * bundle.priceDiamonds,
            });
          }
        }
      }
    }
    return result;
  }, [bundles, combinedCosts]);

  if (rows.length === 0) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Bundle Conversion</Typography>
        <Stack spacing={2}>
          {bundles.map(bundle => {
            const bundleRows = rows.filter(r => r.bundleId === bundle.id);
            if (bundleRows.length === 0) return null;
            const isAndBundle = bundle.contents.every(c => c.materialKey && !c.crateId);

            return (
              <Stack key={bundle.id} spacing={1}>
                <Typography variant="subtitle2">
                  {bundle.name} · {bundle.priceDiamonds} diamonds
                  {isAndBundle && (
                    <Typography variant="body2" color="text.secondary" component="span">
                      {' — '}Each bundle: {bundle.contents.map(c => `${c.count} ${c.materialKey}`).join(' + ')}
                    </Typography>
                  )}
                </Typography>
                {isAndBundle && (
                  <Typography variant="body2" color="text.secondary">
                    Bundles needed: <strong>{bundleRows[0].bundlesNeeded}</strong>
                    {' · '}
                    Total diamonds: <strong>{bundleRows[0].diamondsTotal}</strong>
                  </Typography>
                )}
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Material</TableCell>
                        <TableCell align="right">Per bundle</TableCell>
                        <TableCell align="right">Needed</TableCell>
                        {isAndBundle && <TableCell align="right">Yield</TableCell>}
                        <TableCell align="right">{isAndBundle ? 'Bundles (max)' : 'Bundles'}</TableCell>
                        {!isAndBundle && <TableCell align="right">Diamonds</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {bundleRows.map((row, i) => (
                        <TableRow key={i}>
                          <TableCell>{row.materialName}</TableCell>
                          <TableCell align="right">{row.qtyPerBundle}</TableCell>
                          <TableCell align="right">{row.totalNeeded}</TableCell>
                          {isAndBundle && <TableCell align="right">{row.yieldTotal}</TableCell>}
                          <TableCell align="right">{row.bundlesNeeded}</TableCell>
                          {!isAndBundle && <TableCell align="right">{row.diamondsTotal}</TableCell>}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
