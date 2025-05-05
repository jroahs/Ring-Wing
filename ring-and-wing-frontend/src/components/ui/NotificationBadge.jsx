import { useEffect } from 'react';
import { theme } from '../../theme';

export const NotificationBadge = ({
  count,
  variant = 'primary',
  animate = true,
  size = 'md',
  onClick,
  pulseColor,
  className = ''
}) => {
  useEffect(() => {
    if (count > 0) {
      // Play notification sound
      const audio = new Audio('/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {}); // Ignore errors if audio can't play
    }
  }, [count]);

  const variants = {
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    accent: theme.colors.accent,
    success: theme.colors.success,
    warning: theme.colors.warning,
    error: theme.colors.error
  };

  const sizes = {
    sm: {
      base: 'w-4 h-4 text-xs',
      wrapper: 'w-2 h-2',
      pulse: 'w-4 h-4'
    },
    md: {
      base: 'w-5 h-5 text-sm',
      wrapper: 'w-2.5 h-2.5',
      pulse: 'w-6 h-6'
    },
    lg: {
      base: 'w-6 h-6',
      wrapper: 'w-3 h-3',
      pulse: 'w-8 h-8'
    }
  };

  const backgroundColor = variants[variant];
  const actualPulseColor = pulseColor || backgroundColor;

  if (!count) return null;

  return (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center 
        rounded-full font-bold ${sizes[size].base} 
        ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}
        ${className}
      `}
      style={{ 
        backgroundColor,
        color: theme.colors.background
      }}
    >
      {/* Notification Count */}
      {count > 99 ? '99+' : count}

      {/* Pulse Animation */}
      {animate && (
        <span className="absolute inline-flex">
          <span 
            className={`
              animate-ping absolute inline-flex
              rounded-full opacity-75 ${sizes[size].wrapper}
            `}
            style={{ backgroundColor: actualPulseColor }}
          />
          <span 
            className={`
              relative inline-flex rounded-full ${sizes[size].pulse}
            `}
            style={{ 
              backgroundColor: actualPulseColor,
              opacity: 0.25
            }}
          />
        </span>
      )}
    </button>
  );
};