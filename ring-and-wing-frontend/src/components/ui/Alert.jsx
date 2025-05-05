import { theme } from '../../theme';

export const Alert = ({ type = 'info', message, onClose }) => {
  const styles = {
    error: {
      bg: theme.colors.errorBg,
      text: theme.colors.error,
      border: theme.colors.error
    },
    success: {
      bg: theme.colors.successBg,
      text: theme.colors.success,
      border: theme.colors.success
    },
    warning: {
      bg: theme.colors.warningBg,
      text: theme.colors.warning,
      border: theme.colors.warning
    },
    info: {
      bg: theme.colors.activeBg,
      text: theme.colors.primary,
      border: theme.colors.accent
    }
  };

  const currentStyle = styles[type];

  return (
    <div
      className="w-full p-4 rounded-lg mb-4 flex items-center justify-between"
      style={{
        backgroundColor: currentStyle.bg,
        borderLeft: `4px solid ${currentStyle.border}`
      }}
    >
      <span style={{ color: currentStyle.text }}>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 hover:opacity-70 transition-opacity"
          style={{ color: currentStyle.text }}
        >
          ×
        </button>
      )}
    </div>
  );
};