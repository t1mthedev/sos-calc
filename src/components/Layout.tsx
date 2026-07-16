import { AppBar, Tabs, Tab, Box, Container, Button } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalculateIcon from '@mui/icons-material/Calculate';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import LogoutIcon from '@mui/icons-material/Logout';
import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDevMode } from '../hooks/useDevMode';
import { AppFooter } from '../features/calculator/components/AppFooter';

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Calculator', path: '/calculator', icon: <CalculateIcon /> },
  { label: 'Backpack', path: '/backpack', icon: <WorkHistoryIcon /> },
];

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDev = useDevMode();

  useEffect(() => {
    (window as any).gtag?.('event', 'page_view', { page_path: location.pathname + location.hash });
  }, [location]);

  const activeTab = NAV_ITEMS.findIndex(item => location.pathname.startsWith(item.path));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={1} sx={{ position: 'relative' }}>
        <Tabs
          value={activeTab >= 0 ? activeTab : 1}
          onChange={(_e, newValue) => navigate(NAV_ITEMS[newValue].path)}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
        >
          {NAV_ITEMS.map(item => (
            <Tab key={item.path} label={item.label} icon={item.icon} iconPosition="start" />
          ))}
        </Tabs>
        {isDev && (
          <Button
            color="inherit"
            size="small"
            startIcon={<LogoutIcon />}
            sx={{ position: 'absolute', right: 16, top: 0, bottom: 0, my: 'auto', height: 36 }}
            onClick={() => {
              localStorage.removeItem('sos-calc-dev-mode');
              window.location.href = window.location.href.replace(/[?&]mode=dev/, '');
            }}
          >
            Disable Dev Mode
          </Button>
        )}
      </AppBar>

      <Container maxWidth="xl" sx={{ flexGrow: 1, py: 3 }}>
        <Outlet />
      </Container>

      <Box sx={{ width: 1, px: 3, pb: 2, pt: 1 }}>
        <AppFooter />
      </Box>
    </Box>
  );
}
