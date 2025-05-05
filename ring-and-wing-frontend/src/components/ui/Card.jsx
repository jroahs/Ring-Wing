import { theme } from '../../theme';

export const Card = ({
  children,
  variant = 'default',
  elevation = 'md',
  interactive = false,
  className = '',
  ...props
}) => {
  const variants = {
    default: {
      backgroundColor: theme.colors.background,
      borderColor: theme.colors.muted + '20'
    },
    active: {
      backgroundColor: theme.colors.activeBg,
      borderColor: theme.colors.muted + '20'
    },
    highlight: {
      backgroundColor: theme.colors.accent + '10',
      borderColor: theme.colors.accent
    }
  };

  const elevations = {
    none: 'shadow-none',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg'
  };

  const style = variants[variant] || variants.default;

  return (
    <div
      className={`
        rounded-xl border transition-all
        ${elevations[elevation]}
        ${interactive ? 'hover:brightness-95 cursor-pointer' : ''}
        ${className}
      `}
      style={{
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor
      }}
      {...props}
    >
      {children}
    </div>
  );
};