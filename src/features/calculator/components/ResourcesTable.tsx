import { useMemo } from 'react';
import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useCalculator } from '../hooks/useCalculator';

export function ResourcesTable({ itemId }: { itemId?: string }) {
  const { results, allItems } = useCalculator();

  const key = itemId ?? Array.from(results.keys())[0];
  const result = key ? results.get(key) : undefined;
  const item = key ? allItems.find(i => i.id === key) : undefined;

  const rows = useMemo(() => {
    if (!result) return [];
    const resourceKeys = Object.keys(result.totalCosts);
    if (!resourceKeys.length) return [];
    return result.upgradePath.map(step => {
      const row: Record<string, string | number> = {
        from: step.from.name ?? `Lv ${step.from.level}`,
        to: step.to.name ?? `Lv ${step.to.level}`,
      };
      for (const rk of resourceKeys) {
        row[rk] = step.costs[rk] ?? 0;
      }
      return row;
    });
  }, [result]);

  if (!result || !item) return null;
  const resourceKeys = Object.keys(result.totalCosts);
  if (!resourceKeys.length) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>{item.name} — Resources Per Upgrade</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                {resourceKeys.map(rk => (
                  <TableCell key={rk} sx={{ textTransform: 'capitalize' }}>{rk}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.from}</TableCell>
                  <TableCell>{row.to}</TableCell>
                  {resourceKeys.map(rk => (
                    <TableCell key={rk}>{row[rk]}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
