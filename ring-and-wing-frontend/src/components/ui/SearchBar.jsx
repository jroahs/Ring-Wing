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
      iconSize: '1rem',
      padding: '0.5rem 1rem 0.5rem 2.25rem'
    },
    md: {
      height: '2.75rem',
      fontSize: theme.fontSizes.base,
      iconSize: '1.125rem',
      padding: '0.625rem 1rem 0.625rem 2.5rem'
    },
    lg: {
      height: '3rem',
      fontSize: theme.fontSizes.base,
      iconSize: '1.25rem',
      padding: '0.75rem 1rem 0.75rem 2.75rem'
    }
  };

  const sizeStyle = sizes[size];

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={value}
        onChange={onChange}
        className="w-full rounded-lg focus:outline-none transition-all"
        style={{
          backgroundColor: 'white',
          border: `1px solid ${theme.colors.muted}`,
          height: sizeStyle.height,
          fontSize: sizeStyle.fontSize,
          padding: sizeStyle.padding
        }}
        placeholder={placeholder}
      />
      <div 
        className="absolute left-3 top-1/2 -translate-y-1/2"
        style={{ color: theme.colors.muted }}
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
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
    </div>
  );
};