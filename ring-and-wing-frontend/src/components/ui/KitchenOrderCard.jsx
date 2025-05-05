import { theme } from '../../theme';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { FiClock, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';

export const KitchenOrderCard = ({
  order,
  onStatusChange,
  isActive = false,
  showTimer = true
}) => {
  const getStatusColor = (status) => {
    const statusColors = {
      pending: theme.colors.warning,
      preparing: theme.colors.accent,
      ready: theme.colors.success,
      delivered: theme.colors.muted
    };
    return statusColors[status] || theme.colors.muted;
  };

  const calculateWaitTime = (createdAt) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMinutes = Math.floor((now - orderTime) / 60000);
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes === 1) return '1 min';
    return `${diffMinutes} mins`;
  };

  const isOverdue = (createdAt) => {
    const now = new Date();
    const orderTime = new Date(createdAt);
    const diffMinutes = Math.floor((now - orderTime) / 60000);
    return diffMinutes > 15; // Orders taking longer than 15 minutes are considered overdue
  };

  return (
    <Card
      className={`transition-all duration-300 ${
        isActive ? 'ring-2' : ''
      }`}
      style={{ 
        borderColor: getStatusColor(order.status),
        backgroundColor: isActive 
          ? theme.colors.activeBg 
          : theme.colors.background
      }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 
                className="text-lg font-bold"
                style={{ color: theme.colors.primary }}
              >
                #{order.receiptNumber}
              </h3>
              <Badge variant={order.status}>
                {order.status.toUpperCase()}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary">
                {order.orderType}
              </Badge>
              {showTimer && (
                <div 
                  className="flex items-center gap-1 text-sm"
                  style={{ 
                    color: isOverdue(order.createdAt) 
                      ? theme.colors.error 
                      : theme.colors.muted 
                  }}
                >
                  <FiClock className="w-4 h-4" />
                  {calculateWaitTime(order.createdAt)}
                </div>
              )}
            </div>
          </div>

          {isOverdue(order.createdAt) && order.status !== 'delivered' && (
            <div 
              className="text-sm flex items-center gap-1"
              style={{ color: theme.colors.error }}
            >
              <FiAlertCircle className="w-4 h-4" />
              Overdue
            </div>
          )}
        </div>

        {/* Items */}
        <div className="space-y-2 mb-4">
          {order.items.map((item, index) => (
            <div 
              key={index}
              className="flex justify-between items-start py-2"
              style={{ 
                borderBottom: index !== order.items.length - 1 
                  ? `1px solid ${theme.colors.muted}20` 
                  : 'none' 
              }}
            >
              <div>
                <div 
                  className="font-medium"
                  style={{ color: theme.colors.primary }}
                >
                  {item.quantity}x {item.name}
                </div>
                <div 
                  className="text-sm"
                  style={{ color: theme.colors.secondary }}
                >
                  {item.selectedSize}
                </div>
                {item.notes && (
                  <div 
                    className="text-sm mt-1"
                    style={{ color: theme.colors.accent }}
                  >
                    Note: {item.notes}
                  </div>
                )}
              </div>
              {item.isComplete && (
                <FiCheckCircle 
                  className="w-5 h-5"
                  style={{ color: theme.colors.success }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {order.status === 'pending' && (
            <Button
              variant="primary"
              fullWidth
              onClick={() => onStatusChange(order._id, 'preparing')}
            >
              Start Preparing
            </Button>
          )}
          
          {order.status === 'preparing' && (
            <Button
              variant="success"
              fullWidth
              onClick={() => onStatusChange(order._id, 'ready')}
            >
              Mark as Ready
            </Button>
          )}
          
          {order.status === 'ready' && (
            <Button
              variant="accent"
              fullWidth
              onClick={() => onStatusChange(order._id, 'delivered')}
            >
              Complete Order
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};