import { AppBar, Tabs, Tab, Box, Container, Button } from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalculateIcon from '@mui/icons-material/Calculate';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import BuildIcon from '@mui/icons-material/Build';
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

const DEV_NAV_ITEM = { label: 'Dev Tools', path: '/dev', icon: <BuildIcon /> };

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isDev = useDevMode();

  useEffect(() => {
    (window as any).gtag?.('event', 'page_view', { page_path: location.pathname + location.hash });
  }, [location]);

  const navItems = isDev ? [...NAV_ITEMS, DEV_NAV_ITEM] : NAV_ITEMS;
  const activeTab = navItems.findIndex(item => location.pathname.startsWith(item.path));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={1} sx={{ position: 'relative' }}>
        <Tabs
          value={activeTab >= 0 ? activeTab : 1}
          indicatorColor="secondary"
          textColor="inherit"
          variant="fullWidth"
        >
          {navItems.map(item => (
            <Tab
              key={item.path}
              label={item.label}
              icon={item.icon}
              iconPosition="start"
              onClick={() => navigate(item.path)}
            />
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
