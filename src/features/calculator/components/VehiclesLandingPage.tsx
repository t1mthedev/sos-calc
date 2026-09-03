import { Card, CardActionArea, CardContent, Stack, Typography, Box, Breadcrumbs, Link } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const VEHICLE_SECTIONS = [
  {
    id: 'vehicles',
    name: 'Vehicles',
    description: 'Upgrade Purple, Gen 1, and Gen 2 vehicle star enhancements',
    route: '/calculator/vehicles/vehicles',
  },
  {
    id: 'mechs',
    name: 'Mechs',
    description: 'Upgrade mech enhancement and skill trees',
    route: '/calculator/vehicles/mechs',
  },
];

export function VehiclesLandingPage() {
  const navigate = useNavigate();

  return (
    <Card variant="outlined" sx={{ p: 3 }}>
      <Box sx={{ mb: 2 }}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link component="button" underline="hover" color="inherit" onClick={() => navigate('/calculator')}>
            Calculator
          </Link>
          <Typography color="text.primary">Vehicles</Typography>
        </Breadcrumbs>
      </Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Vehicles</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Select a section to calculate upgrade costs.
      </Typography>
      <Stack spacing={1.5}>
        {VEHICLE_SECTIONS.map(section => (
          <Card key={section.id} variant="outlined" sx={{ cursor: 'pointer' }}>
            <CardActionArea onClick={() => navigate(section.route)}>
              <CardContent>
                <Typography sx={{ fontWeight: 600 }}>{section.name}</Typography>
                <Typography variant="body2" color="text.secondary">{section.description}</Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        ))}
      </Stack>
    </Card>
  );
}
