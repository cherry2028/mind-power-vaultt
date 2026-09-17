// Brand tokens for the Autopsy page (same palette as shareCards.js).
export const C = {
  black: '#05050A',
  ink: '#0B0B12',
  panel: 'rgba(201,168,76,0.06)',
  line: 'rgba(201,168,76,0.28)',
  gold: '#C9A84C',
  goldPale: '#E2C97A',
  cream: '#F5F2EA',
  body: '#D9D4C7',
  mid: '#9A8870',
  red: '#E0707F',
  green: '#5CC08E',
  sans: "'DM Sans','Noto Sans Telugu','Nirmala UI',sans-serif",
  serif: "'Cormorant Garamond','Noto Serif Telugu',serif",
};

export const signColor = (paise) => (paise < 0 ? C.red : paise > 0 ? C.green : C.body);
