import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Card, CardContent, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Stack, Box,
  TextField, Button, Alert, Snackbar,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import type { BackpackData, Crate } from '../../../types';
import { getAllMaterialKeys, getCrates } from '../../../services/dataService';

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

export function BackpackPage() {
  const [data, setData] = useState<BackpackData>(loadFromStorage);
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDevMode = new URLSearchParams(window.location.search).get('mode') === 'dev';

  useEffect(() => {
    localStorage.setItem(BACKPACK_KEY, JSON.stringify(data));
  }, [data]);

  const materialKeys = getAllMaterialKeys();
  const crates = getCrates();

  const handleMaterialChange = useCallback((key: string, raw: string) => {
    const num = Math.max(0, parseInt(raw, 10) || 0);
    setData(prev => ({ ...prev, materials: { ...prev.materials, [key]: num } }));
  }, []);

  const handleCrateChange = useCallback((id: string, raw: string) => {
    const num = Math.max(0, parseInt(raw, 10) || 0);
    setData(prev => ({ ...prev, crates: { ...prev.crates, [id]: num } }));
  }, []);

  const handleExport = useCallback(() => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sos-calc-backpack.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleImportClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed || typeof parsed !== 'object' || !('materials' in parsed) || !('crates' in parsed)) {
          setSnackbar({ message: 'Invalid file — expected { materials: {}, crates: {} }', severity: 'error' });
          return;
        }
        setData({ materials: parsed.materials ?? {}, crates: parsed.crates ?? {} });
        setSnackbar({ message: 'Backpack imported successfully', severity: 'success' });
      } catch {
        setSnackbar({ message: 'Failed to parse JSON file', severity: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const crateOptionsText = (crate: Crate): string =>
    crate.options.map(o => `${o.amount}× ${o.materialName}`).join('  /  ');

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
          {isDevMode && (
            <>
              <Stack direction="row" spacing={1}>
                <Button variant="outlined" startIcon={<UploadIcon />} onClick={handleImportClick}>
                  Import
                </Button>
                <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExport}>
                  Export
                </Button>
              </Stack>
              <input ref={fileInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImport} />
            </>
          )}
        </Box>

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Materials ({materialKeys.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Material</TableCell>
                    <TableCell align="right" sx={{ width: 160 }}>Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {materialKeys.map(key => (
                    <TableRow key={key}>
                      <TableCell>{key}</TableCell>
                      <TableCell align="right">
                        <TextField
                          type="number"
                          size="small"
                          value={data.materials[key] ?? ''}
                          onChange={e => handleMaterialChange(key, e.target.value)}
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

        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Crates ({crates.length})
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Crate</TableCell>
                    <TableCell align="right" sx={{ width: 160 }}>Quantity</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {crates.map(crate => (
                    <TableRow key={crate.id}>
                      <TableCell>
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
            {isDevMode && ' Use the Import button to load data from a file.'}
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
