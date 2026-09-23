export const BrandColors = {
  50: '#ecfdf5',
  100: '#d1fae5',
  200: '#a7f3d0',
  300: '#6ee7b7',
  400: '#34d399',
  500: '#10b981',
  600: '#059669', // primary
  700: '#047857',
  800: '#065f46',
  900: '#064e3b',
  950: '#022c22',
};

export const SemanticColors = {
  light: {
    primary: BrandColors[600],
    secondary: '#475569',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    background: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    border: '#e2e8f0',
  },
  dark: {
    primary: BrandColors[500],
    secondary: '#94a3b8',
    success: '#34d399',
    warning: '#fbbf24',
    error: '#f87171',
    background: '#0f172a',
    text: '#f8fafc',
    textSecondary: '#94a3b8',
    border: '#334155',
  },
};

export default { BrandColors, SemanticColors };
