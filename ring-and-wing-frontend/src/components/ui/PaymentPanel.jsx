import React from 'react';
import { theme } from '../../theme';
import { Button } from './Button';
import { Badge } from './Badge';

export const PaymentPanel = ({
  total,
  subtotal,
  discount,
  cashFloat,
  onProcessPayment,
  onCancelOrder,
  disabled
}) => {
  // Enhanced currency formatting
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '0.00';
    return Number(amount).toFixed(2);
  };
  return (
    <div className="pt-2 border-t" style={{ borderColor: theme.colors.muted }}>
      {/* Cash Float Display */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium" style={{ color: theme.colors.primary }}>
          Cash Float:
        </span>
        <Badge variant="accent" className="text-sm px-2 py-1">₱{formatCurrency(cashFloat)}</Badge>
      </div>

      {/* Order Summary */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span style={{ color: theme.colors.primary }}>Subtotal:</span>
          <span style={{ color: theme.colors.primary }}>₱{subtotal}</span>
        </div>
        {parseFloat(discount) > 0 && (
          <div className="flex justify-between text-sm">
            <span style={{ color: theme.colors.secondary }}>
              PWD/Senior Discount (20%):
            </span>
            <span style={{ color: theme.colors.secondary }}>-₱{discount}</span>
          </div>
        )}
        <div className="flex justify-between text-lg font-bold border-t pt-2">
          <span style={{ color: theme.colors.primary }}>TOTAL:</span>
          <span style={{ color: theme.colors.primary }}>₱{total}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={onCancelOrder}
          disabled={disabled}
          className="flex-1"
        >
          Cancel Order
        </Button>
        <Button
          variant="primary"
          onClick={onProcessPayment}
          disabled={disabled}
          className="flex-1"
        >
          PROCESS PAYMENT
        </Button>
      </div>
    </div>
  );
};