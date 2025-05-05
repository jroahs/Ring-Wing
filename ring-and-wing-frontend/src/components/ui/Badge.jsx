import { theme } from '../../theme';

export const Badge = ({
  children,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const variants = {
    primary: {
      background: theme.colors.primary,
      color: theme.colors.background
    },
    secondary: {
      background: theme.colors.secondary,
      color: theme.colors.background
    },
    accent: {
      background: theme.colors.accent,
      color: theme.colors.background
    },
    success: {
      background: theme.colors.success,
      color: theme.colors.background
    },
    warning: {
      background: theme.colors.warning,
      color: theme.colors.background
    },
    error: {
      background: theme.colors.error,
      color: theme.colors.background
    },
    pending: {
      background: theme.colors.warning + '20',
      color: theme.colors.warning
    },
    preparing: {
      background: theme.colors.accent + '20',
      color: theme.colors.accent
    },
    ready: {
      background: theme.colors.success + '20',
      color: theme.colors.success
    },
    delivered: {
      background: theme.colors.muted + '20',
      color: theme.colors.muted
    }
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  };

  const style = variants[variant] || variants.primary;

  return (
    <span
      className={`
        inline-flex items-center justify-center 
        font-medium rounded-full whitespace-nowrap
        ${sizes[size]}
        ${className}
      `}
      style={style}
    >
      {children}
    </span>
  );
};