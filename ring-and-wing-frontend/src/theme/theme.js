export const theme = {
  colors: {
    primary: {
      main: '#2e0304',
      light: '#4a0507',
      dark: '#1c0102',
      contrastText: '#ffffff'
    },
    secondary: {
      main: '#853619',
      light: '#9f4121',
      dark: '#6b2b14',
      contrastText: '#ffffff'
    },
    accent: {
      main: '#f1670f',
      light: '#f47f37',
      dark: '#d85c0e',
      contrastText: '#ffffff'
    },
    background: {
      default: '#fefdfd',
      paper: '#ffffff',
      alt: '#f8f9fa'
    },
    text: {
      primary: '#2e0304',
      secondary: '#666666',
      disabled: '#999999'
    },
    border: {
      main: '#e0e0e0',
      light: '#f0f0f0',
      dark: '#cccccc'
    },
    status: {
      success: '#28a745',
      warning: '#ffc107',
      error: '#dc3545',
      info: '#17a2b8'
    },
    gradients: {
      primary: 'linear-gradient(135deg, #2e0304, #853619)',
      accent: 'linear-gradient(135deg, #f1670f, #853619)',
      light: 'linear-gradient(135deg, #fefdfd, #f8f9fa)'
    }
  },
  typography: {
    fontFamily: {
      primary: '"Inter", system-ui, -apple-system, sans-serif',
      secondary: '"Playfair Display", serif'
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem'
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '1rem',
    xl: '1.5rem',
    full: '9999px'
  },
  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.1)',
    inner: 'inset 0 2px 4px rgba(0,0,0,0.06)'
  },
  transitions: {
    quick: 'all 0.2s ease',
    normal: 'all 0.3s ease',
    slow: 'all 0.5s ease'
  },
  zIndex: {
    modal: 1000,
    dropdown: 100,
    header: 50
  }
};