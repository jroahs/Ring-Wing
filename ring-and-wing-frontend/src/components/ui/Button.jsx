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
  
    const variantStyles = {
      primary: `
        bg-gradient-to-r from-red-900 to-red-800
        hover:from-red-800 hover:to-red-700
        text-white shadow-md hover:shadow-lg
        focus:ring-red-900/50
      `,
      secondary: `
        bg-white text-red-900 border-2 border-red-900
        hover:bg-red-900 hover:text-white
        focus:ring-red-900/50
      `,
      accent: `
        bg-gradient-to-r from-orange-600 to-orange-500
        hover:from-orange-500 hover:to-orange-400
        text-white shadow-md hover:shadow-lg
        focus:ring-orange-500/50
      `,
      ghost: `
        bg-transparent hover:bg-red-900/10
        text-red-900 border-2 border-transparent
        hover:border-red-900
        focus:ring-red-900/30
      `
    };
  
    return (
      <button
        className={`
          ${baseStyles}
          ${sizeStyles[size]}
          ${variantStyles[variant]}
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