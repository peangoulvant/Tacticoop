import { createTheme } from '@mui/material/styles';

/** Palette « système de commandement naval » : bleu marine dominant (docs/maquette). */
export const palette = {
  bg: '#060f1f',
  panel: '#0a1a33',
  panelBorder: '#1d3a63',
  accent: '#2d8cff',
  text: '#e6eefb',
  muted: '#8ba3c4',
  ally: '#0a63d6',
  enemy: '#b01218',
  /** Quatre teintes proches de l'ambre pour les contacts, attribuées selon leur numéro (AB-26). */
  contactTints: ['#d99a0b', '#f0b429', '#c27a0a', '#c8b323'],
  /** Cases à portée d'une recherche active en préparation. */
  searchRange: '#5fd3ff',
  good: '#4caf50',
  warn: '#d9b84a',
};

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: palette.accent },
    background: { default: palette.bg, paper: palette.panel },
    text: { primary: palette.text, secondary: palette.muted },
    divider: palette.panelBorder,
  },
  shape: { borderRadius: 6 },
  typography: {
    fontFamily: '"Rajdhani","Segoe UI",Roboto,sans-serif',
    button: { textTransform: 'none' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: `1px solid ${palette.panelBorder}` },
      },
    },
  },
});
