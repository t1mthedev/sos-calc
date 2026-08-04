import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { CalculatorPage } from './features/calculator/components/CalculatorPage';
import { CalculatorLandingPage } from './features/calculator/components/CalculatorLandingPage';
import { BehemothPage } from './features/calculator/components/BehemothPage';
import { SpacecraftPage } from './features/calculator/components/SpacecraftPage';
import { AircraftPage } from './features/calculator/components/AircraftPage';
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
              <Route path="/calculator" element={<CalculatorLandingPage />} />
              <Route path="/calculator/behemoth" element={<BehemothPage />} />
              <Route path="/calculator/behemoth/:mkSlug" element={<BehemothPage />} />
              <Route path="/calculator/behemoth/:mkSlug/:sectionSlug" element={<BehemothPage />} />
              <Route path="/calculator/spacecraft" element={<SpacecraftPage />} />
              <Route path="/calculator/spacecraft/:typeSlug" element={<SpacecraftPage />} />
              <Route path="/calculator/aircraft" element={<AircraftPage />} />
              <Route path="/calculator/aircraft/:typeSlug" element={<AircraftPage />} />
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
