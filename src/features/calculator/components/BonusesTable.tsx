import { Card, CardContent, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { useCalculator } from '../hooks/useCalculator';

export function BonusesTable({ itemId }: { itemId?: string }) {
  const { results } = useCalculator();

  const key = itemId ?? Array.from(results.keys())[0];
  const result = key ? results.get(key) : undefined;

  if (!result) return null;

  const allTypes = [...new Set([
    ...result.currentBonuses.map(b => b.type),
    ...result.targetBonuses.map(b => b.type),
    ...result.netGain.map(b => b.type),
  ])];

  const formatVal = (v: number, unit: string) => {
    if (unit === '%') return `${v > 0 ? '+' : ''}${v}%`;
    return `${v > 0 ? '+' : ''}${v} ${unit}`;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>Stat Bonuses</Typography>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Stat</TableCell>
                <TableCell align="right">Current</TableCell>
                <TableCell align="right">Final</TableCell>
                <TableCell align="right">Gain</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allTypes.map(type => {
                const cur = result.currentBonuses.find(b => b.type === type);
                const tar = result.targetBonuses.find(b => b.type === type);
                const gain = result.netGain.find(b => b.type === type);
                const unit = cur?.unit ?? tar?.unit ?? gain?.unit ?? '';
                return (
                  <TableRow key={type}>
                    <TableCell>{type}</TableCell>
                    <TableCell align="right">{cur ? formatVal(cur.value, cur.unit) : '-'}</TableCell>
                    <TableCell align="right">{tar ? formatVal(tar.value, tar.unit) : '-'}</TableCell>
                    <TableCell align="right">
                      {gain ? formatVal(gain.value, unit) : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
}
