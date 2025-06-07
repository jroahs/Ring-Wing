import { theme } from '../../theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { FiClock, FiRefreshCw } from 'react-icons/fi';

export const RecentOrders = ({
  orders,
  onRefresh,
  onViewOrder,
  maxItems = 5,
  showLoadMore = true,
  isLoading = false
}) => {
  return (
    <Card
      title="Recent Orders"
      headerAction={
        <Button
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading}
        >
          <FiRefreshCw className={isLoading ? 'animate-spin' : ''} />
        </Button>
      }
    >
      <div className="divide-y" style={{ borderColor: theme.colors.muted + '20' }}>
        {orders.length === 0 ? (
          <div 
            className="py-8 text-center text-sm"
            style={{ color: theme.colors.muted }}
          >
            No recent orders
          </div>
        ) : (
          orders.slice(0, maxItems).map((order) => (
            <div 
              key={order._id}
              className="py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-opacity-5 transition-colors"
              style={{ backgroundColor: theme.colors.activeBg }}
              onClick={() => onViewOrder(order)}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span 
                      className="font-medium"
                      style={{ color: theme.colors.primary }}
                    >
                      Order #{order.receiptNumber}
                    </span>
                    <Badge variant={getOrderStatusVariant(order.status)}>
                      {order.status}
                    </Badge>
                  </div>
                  
                  <div 
                    className="mt-1 text-sm"
                    style={{ color: theme.colors.secondary }}
                  >
                    {order.items.length} items • ₱{order.totals.total}
                  </div>
                  
                  <div 
                    className="mt-1 text-xs flex items-center gap-1"
                    style={{ color: theme.colors.muted }}
                  >
                    <FiClock className="w-3 h-3" />
                    {formatOrderTime(order.createdAt)}
                  </div>
                </div>

                <Badge variant={getPaymentMethodVariant(order.paymentMethod)}>
                  {order.paymentMethod}
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {showLoadMore && orders.length > maxItems && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewOrder('all')}
          >
            View All Orders
          </Button>
        </div>
      )}
    </Card>
  );
};

const getOrderStatusVariant = (status) => {
  const statusMap = {
    pending: 'warning',
    processing: 'accent',
    completed: 'success',
    cancelled: 'error',
    received: 'success',
    preparing: 'warning',
    ready: 'primary',
    delivered: 'success'
  };
  return statusMap[status?.toLowerCase()] || 'default';
};

const getPaymentMethodVariant = (method) => {
  const methodMap = {
    cash: 'success',
    'e-wallet': 'accent',
    pending: 'warning'
  };
  return methodMap[method?.toLowerCase()] || 'default';
};

const formatOrderTime = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString();
};