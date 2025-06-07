import { theme } from '../../theme';
import { Card } from './Card';
import { Badge } from './Badge';

export const PaymentSummary = ({
  summary,
  period = 'Today',
  showBreakdown = true,
  className = ''
}) => {
  const {
    totalSales,
    orderCount,
    averageOrderValue,    paymentMethods = {
      cash: 0,
      'e-wallet': 0
    }
  } = summary;

  return (
    <Card className={className}>
      <div className="p-4">
        <div className="flex items-baseline justify-between mb-4">
          <h3 
            className="text-sm font-medium"
            style={{ color: theme.colors.muted }}
          >
            Sales Summary • {period}
          </h3>
          <Badge variant="accent">
            {orderCount} Orders
          </Badge>
        </div>

        <div className="mb-6">
          <div 
            className="text-3xl font-bold"
            style={{ color: theme.colors.primary }}
          >
            ₱{totalSales.toFixed(2)}
          </div>
          <div 
            className="text-sm mt-1"
            style={{ color: theme.colors.secondary }}
          >
            Avg. ₱{averageOrderValue.toFixed(2)} per order
          </div>
        </div>

        {showBreakdown && (
          <div className="space-y-3">
            <h4 
              className="text-xs font-medium uppercase tracking-wider"
              style={{ color: theme.colors.muted }}
            >
              Payment Breakdown
            </h4>

            {Object.entries(paymentMethods).map(([method, amount]) => (
              <div 
                key={method}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: getPaymentMethodColor(method) 
                    }}
                  />
                  <span 
                    className="text-sm capitalize"
                    style={{ color: theme.colors.primary }}
                  >
                    {method}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span 
                    className="text-sm font-medium"
                    style={{ color: theme.colors.primary }}
                  >
                    ₱{amount.toFixed(2)}
                  </span>
                  <span 
                    className="text-xs"
                    style={{ color: theme.colors.muted }}
                  >
                    {calculatePercentage(amount, totalSales)}%
                  </span>
                </div>
              </div>
            ))}

            {/* Payment Methods Bar Chart */}
            <div className="flex h-2 rounded-full overflow-hidden mt-2">
              {Object.entries(paymentMethods).map(([method, amount]) => (
                <div
                  key={method}
                  className="transition-all duration-500"
                  style={{
                    backgroundColor: getPaymentMethodColor(method),
                    width: `${calculatePercentage(amount, totalSales)}%`
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const getPaymentMethodColor = (method) => {
  const methodColors = {
    cash: theme.colors.success,
    'e-wallet': theme.colors.accent
  };
  return methodColors[method] || theme.colors.muted;
};

const calculatePercentage = (amount, total) => {
  if (!total) return 0;
  return ((amount / total) * 100).toFixed(1);
};