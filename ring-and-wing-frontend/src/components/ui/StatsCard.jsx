import { theme } from '../../theme';
import { Card } from './Card';

export const StatsCard = ({
  title,
  value,
  icon,
  trend,
  trendValue,
  variant = 'default',
  className = ''
}) => {
  const variants = {
    default: {
      bg: theme.colors.background,
      iconBg: theme.colors.activeBg,
      iconColor: theme.colors.accent
    },
    primary: {
      bg: theme.colors.primary,
      iconBg: theme.colors.background + '20',
      iconColor: theme.colors.background
    },
    accent: {
      bg: theme.colors.accent,
      iconBg: theme.colors.background + '20',
      iconColor: theme.colors.background
    }
  };

  const style = variants[variant];
  const isPositiveTrend = trend === 'up';
  const isDarkVariant = variant !== 'default';

  return (
    <Card 
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: style.bg }}
    >
      <div className="p-6">
        <div 
          className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
          style={{ backgroundColor: style.iconBg }}
        >
          <div style={{ color: style.iconColor }}>{icon}</div>
        </div>

        <h3 
          className="text-sm font-medium mb-1"
          style={{ color: isDarkVariant ? theme.colors.background : theme.colors.muted }}
        >
          {title}
        </h3>

        <div className="flex items-baseline gap-2">
          <span 
            className="text-2xl font-bold"
            style={{ color: isDarkVariant ? theme.colors.background : theme.colors.primary }}
          >
            {value}
          </span>

          {trendValue && (
            <span 
              className="text-sm font-medium"
              style={{ 
                color: isDarkVariant 
                  ? theme.colors.background + '80'
                  : isPositiveTrend 
                    ? theme.colors.success 
                    : theme.colors.error 
              }}
            >
              {isPositiveTrend ? '↑' : '↓'} {trendValue}
            </span>
          )}
        </div>
      </div>

      {/* Decorative Background Pattern */}
      <div 
        className="absolute top-0 right-0 w-32 h-32 transform translate-x-16 -translate-y-16 opacity-10"
        style={{
          background: `radial-gradient(circle at center, ${style.iconColor}, transparent 70%)`,
          pointerEvents: 'none'
        }}
      />
    </Card>
  );
};