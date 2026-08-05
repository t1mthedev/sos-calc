import { useRef, useState } from 'react';
import {
  Card, CardContent, CardHeader, Divider, Stack, Button, Typography, Alert, Snackbar,
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCalculator } from '../../calculator/hooks/useCalculator';

const CALC_STATE_KEY = 'sos-calc-state';
const BACKPACK_KEY = 'sos-calc-backpack';

export function DevToolsPage() {
  const { reset } = useCalculator();
  const [snackbar, setSnackbar] = useState<{ message: string; severity: 'success' | 'error' } | null>(null);
  const calculatorInputRef = useRef<HTMLInputElement>(null);
  const backpackInputRef = useRef<HTMLInputElement>(null);

  const download = (data: unknown, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCalculator = () => {
    const raw = localStorage.getItem(CALC_STATE_KEY);
    const data = raw ? JSON.parse(raw) : {};
    download(data, `sos-calc-backup-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleImportCalculator = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (typeof parsed !== 'object' || !parsed) throw new Error('invalid');
        if (parsed.savedStates) {
          if (typeof parsed.savedStates !== 'object') throw new Error('invalid');
        } else if (typeof parsed.selectedCategoryId === 'string') {
          parsed.savedStates = {};
          if (parsed.selectedCategoryId) {
            parsed.savedStates[parsed.selectedCategoryId] = {
              selectedGroupName: parsed.selectedGroupName ?? null,
              selectedUpgrades: Array.isArray(parsed.selectedUpgrades) ? parsed.selectedUpgrades : [],
            };
          }
          parsed.activeCategoryId = parsed.selectedCategoryId;
          delete parsed.selectedCategoryId;
          delete parsed.selectedGroupName;
          delete parsed.selectedUpgrades;
        } else {
          throw new Error('invalid');
        }
        localStorage.setItem(CALC_STATE_KEY, JSON.stringify(parsed));
        window.location.reload();
      } catch {
        setSnackbar({ message: 'Could not parse calculator backup file', severity: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = () => {
    if (window.confirm('This will permanently delete ALL saved upgrades across ALL categories. Are you sure?')) {
      reset();
    }
  };

  const handleExportBackpack = () => {
    const raw = localStorage.getItem(BACKPACK_KEY);
    const data = raw ? JSON.parse(raw) : { materials: {}, crates: {} };
    download(data, 'sos-calc-backpack.json');
  };

  const handleImportBackpack = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        if (!parsed || typeof parsed !== 'object' || !('materials' in parsed) || !('crates' in parsed)) {
          setSnackbar({ message: 'Invalid file — expected { materials: {}, crates: {} }', severity: 'error' });
          return;
        }
        localStorage.setItem(BACKPACK_KEY, JSON.stringify({ materials: parsed.materials ?? {}, crates: parsed.crates ?? {} }));
        window.location.reload();
      } catch {
        setSnackbar({ message: 'Failed to parse JSON file', severity: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <>
      <Stack spacing={3}>
        <div>
          <Typography variant="h4">Dev Tools</Typography>
          <Typography variant="body2" color="text.secondary">
            Backup, restore and manage development data
          </Typography>
        </div>

        <Card>
          <CardHeader title="Calculator state" subheader="All saved upgrades across all categories" />
          <CardContent>
            <Stack spacing={2}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCalculator} sx={{ alignSelf: 'flex-start' }}>
                Export to JSON
              </Button>
              <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => calculatorInputRef.current?.click()} sx={{ alignSelf: 'flex-start' }}>
                Import from JSON
              </Button>
              <Divider />
              <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleClearAll} sx={{ alignSelf: 'flex-start' }}>
                Clear All
              </Button>
              <input ref={calculatorInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportCalculator} />
            </Stack>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Backpack data" subheader="Your material and crate inventory" />
          <CardContent>
            <Stack spacing={2}>
              <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportBackpack} sx={{ alignSelf: 'flex-start' }}>
                Export
              </Button>
              <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => backpackInputRef.current?.click()} sx={{ alignSelf: 'flex-start' }}>
                Import
              </Button>
              <input ref={backpackInputRef} type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportBackpack} />
            </Stack>
          </CardContent>
        </Card>

        <Alert severity="info">Importing data will reload the page automatically.</Alert>
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