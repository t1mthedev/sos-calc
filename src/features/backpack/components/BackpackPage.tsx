import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Stack, Box,
  TextField, Alert, Snackbar, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ImageIcon from '@mui/icons-material/Image';
import type { BackpackData, Crate } from '../../../types';
import { MaterialIcon } from '../../../components/MaterialIcon';
import { getAllMaterialKeys, getCrates, getMaterialsByType } from '../../../services/dataService';

const BACKPACK_KEY = 'sos-calc-backpack';

function loadFromStorage(): BackpackData {
  try {
    const raw = localStorage.getItem(BACKPACK_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && 'materials' in parsed && 'crates' in parsed) {
        return parsed as BackpackData;
      }
    }
  } catch {
    /* corrupted data, fall through */
  }
  return { materials: {}, crates: {} };
}

function CrateIcon({ crateName, imageName }: { crateName: string; imageName?: string }) {
  const imgName = imageName ?? crateName;
  const [failed, setFailed] = useState<'webp' | 'jpg'>();
  if (failed === 'jpg') return <ImageIcon sx={{ fontSize: 28, color: 'text.disabled' }} />;
  const ext = failed === 'webp' ? 'jpg' : 'webp';
  return (
    <img
      src={`${import.meta.env.BASE_URL}crates/${encodeURIComponent(imgName)}.${ext}`}
      alt={crateName}
      width={32}
      height={35}
      style={{ display: 'block' }}
      onError={() => setFailed(ext as 'webp' | 'jpg')}
    />
  );
}

export function BackpackPage() {
  const [data, setData] = useState<BackpackData>(loadFromStorage);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);

  useEffect(() => {
    localStorage.setItem(BACKPACK_KEY, JSON.stringify(data));
  }, [data]);

  const materialKeys = getAllMaterialKeys();
  const materialTypes = getMaterialsByType();
  const crates = getCrates();

  const crateContributions = useMemo(() => {
    const contributions: Record<string, number> = {};
    for (const crate of crates) {
      const count = data.crates[crate.id] ?? 0;
      if (count === 0) continue;
      for (const option of crate.options) {
        contributions[option.materialKey] = (contributions[option.materialKey] ?? 0) + count * option.amount;
      }
    }
    return contributions;
  }, [data.crates, crates]);

  const handleMaterialChange = useCallback((key: string, raw: string) => {
    const num = Math.max(0, parseInt(raw, 10) || 0);
    setData(prev => ({ ...prev, materials: { ...prev.materials, [key]: num } }));
  }, []);

  const handleCrateChange = useCallback((id: string, raw: string) => {
    const num = Math.max(0, parseInt(raw, 10) || 0);
    setData(prev => ({ ...prev, crates: { ...prev.crates, [id]: num } }));
  }, []);

  const crateOptionsText = (crate: Crate): string =>
    crate.options.map(o => `${o.amount}× ${o.materialName}`).join('  /  ');

  const renderMaterialTable = (keys: string[]) => (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 40 }}>Icon</TableCell>
            <TableCell>Material</TableCell>
            <TableCell sx={{ width: 220 }}>Quantity</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {keys.map(key => {
            const owned = data.materials[key] ?? 0;
            const fromCrates = crateContributions[key] ?? 0;
            const virtualTotal = owned + fromCrates;
            return (
              <TableRow key={key}>
                <TableCell><MaterialIcon materialKey={key} /></TableCell>
                <TableCell>{key}</TableCell>
                <TableCell>
                  <Stack direction="column" spacing={0.5} sx={{ alignItems: 'flex-start' }}>
                    <TextField
                      type="number"
                      size="small"
                      value={data.materials[key] ?? ''}
                      onChange={e => handleMaterialChange(key, e.target.value)}
                      slotProps={{
                        htmlInput: { min: 0, style: { textAlign: 'right' } },
                      }}
                      sx={{ width: '100%' }}
                    />
                    {fromCrates > 0 && (
                      <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                        owned: {owned} · {virtualTotal} with crates
                      </Typography>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );

  const hasAny = materialKeys.some(k => (data.materials[k] ?? 0) > 0)
    || crates.some(c => (data.crates[c.id] ?? 0) > 0);

  return (
    <>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Box>
            <Typography variant="h4">Backpack</Typography>
            <Typography variant="body2" color="text.secondary">
              Track your resource and crate inventory
            </Typography>
          </Box>
        </Box>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Materials ({materialKeys.length})
            </Typography>
            <Stack spacing={1}>
              {materialTypes.filter(g => g.materialKeys.length > 0).map(group => (
                <Accordion key={group.id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {group.name} ({group.materialKeys.length})
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 1 }}>
                    {renderMaterialTable(group.materialKeys)}
                  </AccordionDetails>
                </Accordion>
              ))}
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Crates ({crates.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 40 }}>Icon</TableCell>
                    <TableCell>Crate</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {crates.map(crate => (
                    <TableRow key={crate.id}>
                      <TableCell><CrateIcon crateName={crate.name} imageName={crate.imageName} /></TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {crate.name}
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.4, display: 'block' }}>
                          Each crate (choose one): {crateOptionsText(crate)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={data.crates[crate.id] ?? ''}
                          onChange={e => handleCrateChange(crate.id, e.target.value)}
                          slotProps={{
                            htmlInput: { min: 0, style: { textAlign: 'right' } },
                          }}
                          sx={{ width: 120 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {!hasAny && (
          <Alert severity="info">
            Your backpack is empty. Enter quantities for materials and crates you own.
          </Alert>
        )}
      </Stack>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={4000}
        onClose={() => setSnackbar(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {snackbar ? (
          <Alert severity={snackbar.severity} onClose={() => setSnackbar(null)} variant="filled">
            {snackbar.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
