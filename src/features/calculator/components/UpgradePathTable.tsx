import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useCalculator } from '../hooks/useCalculator';

export function UpgradePathTable({ itemId }: { itemId?: string }) {
  const { results, allItems } = useCalculator();

  const key = itemId ?? Array.from(results.keys())[0];
  const result = key ? results.get(key) : undefined;
  const item = key ? allItems.find(i => i.id === key) : undefined;

  if (!result || !item) return null;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>{item.name} — Upgrade Step</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell align="right">Level</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.upgradePath.map((step, i) => (
                <TableRow key={i}>
                  <TableCell>{step.from.name ?? `Lv ${step.from.level}`}</TableCell>
                  <TableCell>{step.to.name ?? `Lv ${step.to.level}`}</TableCell>
                  <TableCell align="right">{step.to.level}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
