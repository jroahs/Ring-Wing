import { theme } from '../../theme';
import { Button } from './Button';
import { Badge } from './Badge';

export const PaymentPanel = ({
  total,
  subtotal,
  discount,
  cashFloat,
  paymentMethod,
  cashAmount,
  isDiscountApplied,
  onPaymentMethodChange,
  onCashAmountChange,
  onDiscountToggle,
  onProcessPayment,
  onCancelOrder,
  disabled
}) => {
  const paymentMethods = ['cash', 'card', 'e-wallet'];

  return (
    <div className="pt-4 border-t-2" style={{ borderColor: theme.colors.muted }}>
      <div className="flex gap-2 mb-3 flex-wrap">
        {paymentMethods.map(method => (
          <Button
            key={method}
            variant={paymentMethod === method ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => onPaymentMethodChange(method)}
          >
            {method.toUpperCase()}
          </Button>
        ))}
      </div>

      <div className="flex justify-between items-center mb-3">
        <span className="text-sm" style={{ color: theme.colors.primary }}>
          Cash Float:
        </span>
        <Badge variant="accent">₱{cashFloat.toFixed(2)}</Badge>
      </div>

      <Button
        variant={isDiscountApplied ? 'primary' : 'secondary'}
        fullWidth
        className="mb-3"
        onClick={onDiscountToggle}
      >
        PWD/Senior Discount (10%)
      </Button>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: theme.colors.primary }}>Subtotal:</span>
          <span style={{ color: theme.colors.primary }}>₱{subtotal}</span>
        </div>
        
        {parseFloat(discount) > 0 && (
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: theme.colors.secondary }}>
              Discount (10%):
            </span>
            <span style={{ color: theme.colors.secondary }}>-₱{discount}</span>
          </div>
        )}

        <div className="flex justify-between text-lg font-bold">
          <span style={{ color: theme.colors.primary }}>TOTAL:</span>
          <span style={{ color: theme.colors.primary }}>₱{total}</span>
        </div>
      </div>

      {paymentMethod === 'cash' && (
        <div className="mb-3">
          <input
            type="number"
            value={cashAmount === 0 ? '' : cashAmount}
            onChange={(e) => {
              const value = e.target.value;
              onCashAmountChange(value === '' ? 0 : Math.max(0, parseFloat(value) || 0));
            }}
            className="w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors"
            style={{
              borderColor: theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="Cash amount"
          />
        </div>
      )}

      <div className="grid gap-2">
        <Button
          variant="danger"
          onClick={onCancelOrder}
          fullWidth
        >
          Cancel Order
        </Button>
        
        <Button
          variant="primary"
          onClick={onProcessPayment}
          disabled={disabled}
          fullWidth
        >
          PROCESS PAYMENT
        </Button>
      </div>
    </div>
  );
};