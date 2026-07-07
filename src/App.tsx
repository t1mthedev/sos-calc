import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { CalculatorPage } from './features/calculator/components/CalculatorPage';
import { CalculatorProvider } from './features/calculator/hooks/useCalculator';

const theme = createTheme({
  colorSchemes: { light: true, dark: true },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CalculatorProvider>
        <CalculatorPage />
      </CalculatorProvider>
    </ThemeProvider>
  );
}

export default App;
