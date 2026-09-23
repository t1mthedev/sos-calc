import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { APP_VERSION, LATEST_ENTRY } from '../../../version';

const LS_KEY = 'sos-calc-last-version';

export function getLastSeenVersion(): string {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}

function saveSeenVersion(version: string) {
  try { localStorage.setItem(LS_KEY, version); } catch { /* ignore */ }
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WhatsNewDialog({ open, onClose }: Props) {
  const entry = LATEST_ENTRY;

  const handleGotIt = () => {
    saveSeenVersion(APP_VERSION);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>What's New in v{entry?.version}</DialogTitle>
      <DialogContent>
        {entry ? (
          entry.body.split('\n').map((line, i) => {
            if (line.startsWith('### ')) {
              return <Typography key={i} variant="subtitle2" sx={{ mt: 2, mb: 1 }}>{line.replace('### ', '')}</Typography>;
            }
            if (line.startsWith('- ')) {
              return <Typography key={i} variant="body2" sx={{ ml: 2 }}>{line}</Typography>;
            }
            return line.trim() ? <Typography key={i} variant="body2" sx={{ mt: 1 }}>{line}</Typography> : null;
          })
        ) : (
          <Typography color="text.secondary">No changelog available.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleGotIt} variant="contained">Got it</Button>
      </DialogActions>
    </Dialog>
  );
}
