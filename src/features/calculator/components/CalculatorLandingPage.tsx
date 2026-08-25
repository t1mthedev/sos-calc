import { Card, CardActionArea, CardContent, Stack, Typography, Box } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getCategorySlug } from '../../../utils/slugs';

const CATEGORIES = [
  {
    id: 'behemoth',
    name: 'Behemoth',
    description: 'Upgrade behemoth enhancements, levels, and skill trees',
  },
  {
    id: 'formation-system',
    name: 'Formation System',
    description: 'Upgrade plasma formations for infantry, riders, and hunters',
  },
  {
    id: 'spacecraft',
    name: 'Spacecraft',
    description: 'Upgrade spacecraft and enterprise with fuel and coatings',
  },
  {
    id: 'aircraft',
    name: 'Aircraft',
    description: 'Upgrade the Gen 4 (AC04) and Gen 3 (FA-1 Specter) aircraft and the FHS Ark CV-1 Carrier',
  },
  {
    id: 'vehicles',
    name: 'Vehicles',
    description: 'Upgrade vehicles',
  },
  {
    id: 'hero-appointment',
    name: 'Hero Appointment',
    description: 'Upgrade hero appointment slots for infantry, hunters, and riders',
  },
];

export function CalculatorLandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto' }}>
      <Card variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>Calculator</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Select a category to calculate upgrade costs.
        </Typography>
        <Stack spacing={1.5}>
          {CATEGORIES.map(cat => (
            <Card key={cat.id} variant="outlined" sx={{ cursor: 'pointer' }}>
              <CardActionArea onClick={() => navigate(`/calculator/${getCategorySlug(cat.id)}`)}>
                <CardContent>
                  <Typography sx={{ fontWeight: 600 }}>{cat.name}</Typography>
                  <Typography variant="body2" color="text.secondary">{cat.description}</Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
      </Card>
    </Box>
  );
}
