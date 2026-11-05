import { CssBaseline, ThemeProvider } from '@mui/material';
import { MissionSetupScreen } from '../features/mission-setup';
import { TacticalScreen } from '../features/tactical-map';
import { useGameStore } from '../store/useGameStore';
import { theme } from './theme';

export function App() {
  const state = useGameStore((s) => s.state);
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {state.status === 'preparation' ? (
        <MissionSetupScreen setup={state.setup} />
      ) : (
        <TacticalScreen mission={state} />
      )}
    </ThemeProvider>
  );
}
