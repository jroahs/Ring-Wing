import { theme } from '../../theme';
import { useEffect } from 'react';

export const Toast = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  useEffect(() => {
    if (duration && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const styles = {
    success: {
      icon: 'OK',
      bg: theme.colors.successBg,
      border: theme.colors.success,
      text: theme.colors.success
    },
    error: {
      icon: 'X',
      bg: theme.colors.errorBg,
      border: theme.colors.error,
      text: theme.colors.error
    },
    warning: {
      icon: '!',
      bg: theme.colors.warningBg,
      border: theme.colors.warning,
      text: theme.colors.warning
    },
    info: {
      icon: 'i',
      bg: theme.colors.activeBg,
      border: theme.colors.accent,
      text: theme.colors.primary
    }
  };

  const style = styles[type];

  return (
    <div
      className="fixed top-4 right-4 z-50 min-w-[300px] max-w-md animate-slide-in"
      style={{
        backgroundColor: style.bg,
        borderLeft: `4px solid ${style.border}`,
        borderRadius: theme.borderRadius.lg,
        boxShadow: theme.shadows.lg,
        padding: theme.spacing[4]
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-6 h-6 flex items-center justify-center rounded-full text-sm font-bold"
          style={{
            backgroundColor: style.border,
            color: style.bg
          }}
        >
          {style.icon}
        </div>
        <p style={{ color: style.text }}>{message}</p>
        {onClose && (
          <button
            onClick={onClose}
            className="ml-auto hover:opacity-70 transition-opacity"
            style={{ color: style.text }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
};