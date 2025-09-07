// Ring & Wing Global Theme
// Centralized color system to maintain consistency across components

export const theme = {
  colors: {
    // Primary brand colors
    primary: '#2e0304',        // Dark brown - main text and primary elements
    background: '#fefdfd',     // Off-white background
    accent: '#f1670f',         // Orange - accent color for highlights and actions
    secondary: '#853619',      // Brown - secondary elements and borders
    muted: '#ac9c9b',          // Light brown - muted text and subtle elements
    
    // Transparent variants for overlays and backgrounds
    activeBg: '#f1670f20',     // Orange with 20% opacity for active states
    accentLight: '#f1670f30',  // Orange with 30% opacity
    accentMedium: '#f1670f40', // Orange with 40% opacity
    accentHeavy: '#f1670f60',  // Orange with 60% opacity
    accentStrong: '#f1670f80', // Orange with 80% opacity
  },
  
  // Font sizes for consistent typography
  fontSizes: {
    xs: '0.75rem',     // 12px
    sm: '0.875rem',    // 14px
    base: '1rem',      // 16px
    lg: '1.125rem',    // 18px
    xl: '1.25rem',     // 20px
    '2xl': '1.5rem',   // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem',  // 36px
  },
  
  // Spacing values
  spacing: {
    xs: '0.25rem',     // 4px
    sm: '0.5rem',      // 8px
    md: '1rem',        // 16px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
    '2xl': '3rem',     // 48px
  },
  
  // Border radius values
  borderRadius: {
    sm: '0.25rem',     // 4px
    md: '0.5rem',      // 8px
    lg: '1rem',        // 16px
    xl: '1.5rem',      // 24px
    full: '9999px',    // Fully rounded
  },
  
  // Gradient combinations for scrollbars and special elements
  gradients: {
    primaryOrange: 'linear-gradient(180deg, #f1670f 0%, #853619 100%)',
    orangeToDark: 'linear-gradient(180deg, #f1670f 0%, #2e0304 100%)',
    orangeToLight: 'linear-gradient(180deg, #f1670f 0%, #fefdfd 100%)',
  },
  
  // Status colors that match your current design
  status: {
    active: '#28a745',         // Green for active status
    inactive: '#6c757d',       // Gray for inactive status
    warning: '#ffc107',        // Yellow for warnings
    danger: '#dc3545',         // Red for danger/deletion
  }
};

// Export individual groups for convenience
export const colors = theme.colors;
export const fontSizes = theme.fontSizes;
export const spacing = theme.spacing;
export const borderRadius = theme.borderRadius;
export const gradients = theme.gradients;
export const status = theme.status;

// Default export
export default theme;
