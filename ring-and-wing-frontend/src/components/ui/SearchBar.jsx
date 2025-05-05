import { theme } from '../../theme';

export const SearchBar = ({
  value,
  onChange,
  placeholder = 'Search...',
  size = 'md',
  className = ''
}) => {
  const sizes = {
    sm: {
      height: '2.5rem',
      fontSize: theme.fontSizes.sm,
      iconSize: '1.25rem',
      padding: '0.5rem 1rem 0.5rem 2.5rem'
    },
    md: {
      height: '3rem',
      fontSize: theme.fontSizes.base,
      iconSize: '1.5rem',
      padding: '0.75rem 1.5rem 0.75rem 3rem'
    },
    lg: {
      height: '4rem',
      fontSize: theme.fontSizes.lg,
      iconSize: '1.75rem',
      padding: '1rem 1.5rem 1rem 3.5rem'
    }
  };

  const sizeStyle = sizes[size];

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full rounded-2xl shadow-lg focus:outline-none transition-all"
        style={{
          backgroundColor: theme.colors.background,
          border: `3px solid ${theme.colors.muted}`,
          height: sizeStyle.height,
          fontSize: sizeStyle.fontSize,
          padding: sizeStyle.padding
        }}
        placeholder={placeholder}
      />
      <div 
        className="absolute left-4 top-1/2 -translate-y-1/2"
        style={{ color: theme.colors.accent }}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
          style={{
            width: sizeStyle.iconSize,
            height: sizeStyle.iconSize
          }}
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={3} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
    </div>
  );
};