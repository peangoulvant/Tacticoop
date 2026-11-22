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
  /** Cases à portée d'un balayage en préparation. */
  sweepRange: '#5fd3ff',
  /** Cases que l'on peut viser pendant la préparation d'un tir. */
  fireRange: '#ff9f43',
  /** Projectiles : alliés (bleu clair) et hostiles identifiés (rouge clair). */
  projectileAlly: '#5fd3ff',
  projectileHostile: '#ff6b6b',
  /** Pastille de statut d'un projectile : cible acquise (ambre) ou inconnue / en recherche (gris-bleu). */
  projectileTargeted: '#ffb02e',
  projectileSearching: '#8ba3c4',
  good: '#4caf50',
  warn: '#d9b84a',
};

/**
 * Barres de défilement fines et discrètes, aux couleurs de l'interface : une piste transparente,
 * un curseur arrondi de 4 px visible (la bordure transparente agrandit la zone de saisie sans
 * épaissir le trait), qui s'éclaire au survol. Les flèches sont masquées.
 *
 * Chrome, Edge et Safari lisent les pseudo-éléments `::-webkit-scrollbar` ; Firefox ne lit que les
 * propriétés standard `scrollbar-width` et `scrollbar-color`. Ces dernières ne sont donc posées que
 * là où les pseudo-éléments n'existent pas (`@supports not selector(...)`) : Chrome récent
 * ignorerait sinon le style arrondi dès qu'une propriété standard est présente.
 */
const scrollbarStyles = {
  '*::-webkit-scrollbar': { width: 8, height: 8, backgroundColor: 'transparent' },
  '*::-webkit-scrollbar-track': { backgroundColor: 'transparent' },
  '*::-webkit-scrollbar-corner': { backgroundColor: 'transparent' },
  '*::-webkit-scrollbar-button': { display: 'none' },
  '*::-webkit-scrollbar-thumb': {
    backgroundColor: palette.panelBorder,
    backgroundClip: 'padding-box',
    border: '2px solid transparent',
    borderRadius: 8,
  },
  '*::-webkit-scrollbar-thumb:hover': { backgroundColor: palette.muted },
  '@supports not selector(::-webkit-scrollbar)': {
    '*': { scrollbarWidth: 'thin', scrollbarColor: `${palette.panelBorder} transparent` },
  },
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
    MuiCssBaseline: { styleOverrides: scrollbarStyles },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: `1px solid ${palette.panelBorder}` },
      },
    },
  },
});
