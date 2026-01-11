import React, { useState } from 'react';
import { X, Check, Coffee, Clock, ChefHat, CheckCircle } from 'lucide-react';
import { theme } from '../theme';

/**
 * OrderProcessingModalTablet - Tablet-optimized modal for viewing and completing kitchen orders
 * Designed to match the tablet POS aesthetic with better touch targets and scrolling
 */
const OrderProcessingModalTablet = ({ 
  isOpen, 
  onClose, 
  orders = [], 
  updateOrderStatus 
}) => {
  const [actionLoading, setActionLoading] = useState(null);

  if (!isOpen) return null;

  // Filter orders - show orders that are being processed (not pending payment or completed)
  const processedOrders = orders.filter(order => 
    order.status !== 'completed' && 
    order.paymentMethod !== 'pending' &&
    order.status !== 'pending'
  );

  // Group orders by status for easy viewing
  const receivedOrders = processedOrders.filter(o => o.status === 'received');
  const preparingOrders = processedOrders.filter(o => o.status === 'preparing');
  const readyOrders = processedOrders.filter(o => o.status === 'ready');

  const formatPHP = (value) => `₱${(value || 0).toFixed(2)}`;

  const getStatusConfig = (status) => {
    switch(status) {
      case 'received':
        return { 
          bgColor: theme.colors.accentLight,
          borderColor: theme.colors.accent,
          textColor: theme.colors.secondary,
          icon: Clock,
          label: 'Received'
        };
      case 'preparing':
        return { 
          bgColor: theme.colors.activeBg,
          borderColor: theme.colors.accent,
          textColor: theme.colors.primary,
          icon: ChefHat,
          label: 'Preparing'
        };
      case 'ready':
        return { 
          bgColor: theme.colors.background,
          borderColor: theme.colors.muted,
          textColor: theme.colors.secondary,
          icon: CheckCircle,
          label: 'Ready'
        };
      default:
        return { 
          bgColor: theme.colors.background,
          borderColor: theme.colors.muted,
          textColor: theme.colors.primary,
          icon: Coffee,
          label: status
        };
    }
  };

  const handleMarkCompleted = async (orderId) => {
    setActionLoading(orderId);
    try {
      await updateOrderStatus(orderId, 'completed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-5 border-b"
          style={{ backgroundColor: theme.colors.primary }}
        >
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Coffee size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Kitchen Orders</h2>
              <p className="text-white/70 text-sm">
                {processedOrders.length} active {processedOrders.length === 1 ? 'order' : 'orders'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Status Summary Bar */}
        <div className="flex gap-2 p-4 border-b" style={{ backgroundColor: theme.colors.background }}>
          <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: theme.colors.accentLight, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.colors.accent }}>
            <Clock size={18} style={{ color: theme.colors.accent }} />
            <span className="text-sm font-medium" style={{ color: theme.colors.secondary }}>Received: {receivedOrders.length}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: theme.colors.activeBg, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.colors.accent }}>
            <ChefHat size={18} style={{ color: theme.colors.accent }} />
            <span className="text-sm font-medium" style={{ color: theme.colors.primary }}>Preparing: {preparingOrders.length}</span>
          </div>
          <div className="flex-1 flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: theme.colors.background, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.colors.muted }}>
            <CheckCircle size={18} style={{ color: theme.colors.secondary }} />
            <span className="text-sm font-medium" style={{ color: theme.colors.secondary }}>Ready: {readyOrders.length}</span>
          </div>
        </div>

        {/* Orders List - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {processedOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16" style={{ color: theme.colors.muted }}>
              <CheckCircle size={64} className="mb-4 opacity-50" style={{ color: theme.colors.muted }} />
              <p className="text-lg font-medium">No active orders</p>
              <p className="text-sm mt-1">All orders have been completed</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {processedOrders.map(order => {
                const statusConfig = getStatusConfig(order.status);
                const StatusIcon = statusConfig.icon;
                const isLoading = actionLoading === order._id;

                return (
                  <div 
                    key={order._id}
                    className="rounded-xl overflow-hidden transition-all"
                    style={{
                      borderWidth: '2px',
                      borderStyle: 'solid',
                      borderColor: statusConfig.borderColor,
                      opacity: isLoading ? 0.6 : 1
                    }}
                  >
                    {/* Order Header */}
                    <div className="p-4" style={{ backgroundColor: statusConfig.bgColor, borderBottomWidth: '1px', borderBottomStyle: 'solid', borderBottomColor: statusConfig.borderColor }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg shadow-sm" style={{ backgroundColor: 'white' }}>
                            <StatusIcon size={20} style={{ color: statusConfig.textColor }} />
                          </div>
                          <div>
                            <h3 className="font-bold" style={{ color: theme.colors.primary }}>
                              Order #{order.receiptNumber || order._id?.substring(0, 6)}
                            </h3>
                            <p className="text-xs" style={{ color: theme.colors.muted }}>
                              {new Date(order.createdAt).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.textColor, borderWidth: '1px', borderStyle: 'solid', borderColor: statusConfig.borderColor }}>
                          {statusConfig.label}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="p-4" style={{ backgroundColor: 'white' }}>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {order.items?.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-bold px-2 py-0.5 rounded" style={{ color: theme.colors.accent, backgroundColor: theme.colors.accentLight }}>
                                {item.quantity}x
                              </span>
                              <span style={{ color: theme.colors.primary }}>{item.name}</span>
                              {item.selectedSize && item.selectedSize !== 'base' && (
                                <span className="text-xs" style={{ color: theme.colors.muted }}>({item.selectedSize})</span>
                              )}
                            </div>
                            <span style={{ color: theme.colors.secondary }}>{formatPHP(item.price * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Order Total */}
                      <div className="mt-3 pt-3 flex justify-between items-center" style={{ borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: theme.colors.muted }}>
                        <span className="font-medium" style={{ color: theme.colors.secondary }}>Total</span>
                        <span className="font-bold text-lg" style={{ color: theme.colors.primary }}>
                          {formatPHP(order.totals?.total)}
                        </span>
                      </div>

                      {/* Notes if any */}
                      {order.items?.some(item => item.notes) && (
                        <div className="mt-2 p-2 rounded-lg" style={{ backgroundColor: theme.colors.activeBg, borderWidth: '1px', borderStyle: 'solid', borderColor: theme.colors.accent }}>
                          <p className="text-xs font-medium" style={{ color: theme.colors.secondary }}>Special Notes:</p>
                          {order.items.filter(item => item.notes).map((item, idx) => (
                            <p key={idx} className="text-xs mt-1" style={{ color: theme.colors.primary }}>
                              • {item.name}: {item.notes}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <div className="p-4" style={{ backgroundColor: theme.colors.background, borderTopWidth: '1px', borderTopStyle: 'solid', borderTopColor: theme.colors.muted }}>
                      <button
                        onClick={() => handleMarkCompleted(order._id)}
                        disabled={isLoading}
                        className="w-full py-3 rounded-xl font-bold text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ backgroundColor: theme.colors.accent }}
                      >
                        {isLoading ? (
                          <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <Check size={20} />
                            <span>Mark as Completed</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ backgroundColor: theme.colors.background, borderTopColor: theme.colors.muted }}>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold transition-all"
            style={{ 
              backgroundColor: theme.colors.primary,
              color: 'white'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderProcessingModalTablet;
