import { Card, CardContent, Typography, Box } from '@mui/material';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';

export function BackpackPage() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}>
      <Card sx={{ maxWidth: 500, textAlign: 'center', py: 6, px: 4 }}>
        <CardContent>
          <WorkHistoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h4" gutterBottom>Backpack</Typography>
          <Typography color="text.secondary" variant="body1">
            Coming soon — manage your resource inventory and track what you have.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
