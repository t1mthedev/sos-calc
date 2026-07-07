import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import changelogText from '../../../../CHANGELOG.md?raw';

const LS_KEY = 'sos-calc-last-version';

export function getLastSeenVersion(): string {
  try { return localStorage.getItem(LS_KEY) || ''; } catch { return ''; }
}

function saveSeenVersion(version: string) {
  try { localStorage.setItem(LS_KEY, version); } catch { /* ignore */ }
}

export function parseLatestEntry(md: string): { version: string; body: string } | null {
  const lines = md.split('\n');
  let version = '';
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^## \[(.+?)\]/);
    if (m) {
      version = m[1];
      start = i + 1;
      break;
    }
  }
  if (!version || start < 0) return null;
  let end = lines.length;
  for (let i = start; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return { version, body: lines.slice(start, end).join('\n').trim() };
}

interface Props {
  open: boolean;
  onClose: () => void;
}

export function WhatsNewDialog({ open, onClose }: Props) {
  const entry = parseLatestEntry(changelogText);

  const handleGotIt = () => {
    saveSeenVersion(entry?.version || '');
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
