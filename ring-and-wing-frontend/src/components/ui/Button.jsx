export const Button = ({ 
    children, 
    variant = 'primary', 
    size = 'md', 
    fullWidth = false, 
    isLoading = false, 
    disabled = false,
    className = '',
    ...props 
  }) => {
    // Import theme for consistent colors
    const theme = {
      colors: {
        primary: '#2e0304',
        accent: '#f1670f',
      }
    };

    const baseStyles = `
      inline-flex items-center justify-center
      font-medium transition-all
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-60 disabled:cursor-not-allowed
    `;
  
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-base rounded-lg',
      lg: 'px-6 py-3 text-lg rounded-xl'
    };

    const getVariantStyles = () => {
      switch(variant) {
        case 'accent':
          return {
            backgroundColor: theme.colors.accent,
            color: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          };
        case 'secondary':
          return {
            backgroundColor: 'white',
            color: theme.colors.primary,
            border: `2px solid ${theme.colors.primary}`,
          };
        case 'ghost':
          return {
            backgroundColor: 'transparent',
            color: theme.colors.primary,
            border: `2px solid transparent`,
          };
        default: // primary
          return {
            backgroundColor: theme.colors.primary,
            color: 'white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          };
      }
    };
  
    return (
      <button
        style={getVariantStyles()}
        className={`
          ${baseStyles}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `.trim()}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg 
              className="animate-spin -ml-1 mr-3 h-5 w-5" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Loading...</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  };