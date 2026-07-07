import { useState } from 'react';
import { Box, Typography, Button, Badge } from '@mui/material';
import { APP_VERSION } from '../../../version';
import { WhatsNewDialog, getLastSeenVersion } from './WhatsNewDialog';

export function AppFooter() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isNew = getLastSeenVersion() !== APP_VERSION;

  return (
    <>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          v{APP_VERSION}
        </Typography>
        <Badge color="error" variant="dot" invisible={!isNew}>
          <Button
            size="small"
            variant="text"
            sx={{ textTransform: 'none' }}
            onClick={() => setDialogOpen(true)}
          >
            What's new
          </Button>
        </Badge>
      </Box>
      <WhatsNewDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  );
}
