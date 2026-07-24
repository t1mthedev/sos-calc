import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CalculatorPage } from './features/calculator/components/CalculatorPage';
import { DashboardPage } from './features/dashboard/components/DashboardPage';
import { BackpackPage } from './features/backpack/components/BackpackPage';
import { Layout } from './components/Layout';
import { CalculatorProvider } from './features/calculator/hooks/useCalculator';

const theme = createTheme({
  colorSchemes: { light: true, dark: true },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <HashRouter>
        <CalculatorProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/calculator" element={<CalculatorPage />} />
              <Route path="/calculator/behemoth/:mkSlug/:sectionSlug" element={<CalculatorPage />} />
              <Route path="/calculator/:categorySlug" element={<CalculatorPage />} />
              <Route path="/calculator/:categorySlug/:groupSlug" element={<CalculatorPage />} />
              <Route path="/backpack" element={<BackpackPage />} />
            </Route>
          </Routes>
        </CalculatorProvider>
      </HashRouter>
    </ThemeProvider>
  );
}

export default App;
