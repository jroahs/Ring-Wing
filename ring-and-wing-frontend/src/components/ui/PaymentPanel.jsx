import React from 'react'; // Added React import for Fragment
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
  onPaymentMethodChange,
  onCashAmountChange,
  onProcessPayment,
  onCancelOrder,
  cardDetails,
  onCardDetailsChange,
  eWalletDetails,
  onEWalletDetailsChange,
  disabled
}) => {
  const paymentMethods = ['cash', 'card', 'e-wallet'];

  return (    <div className="pt-2 border-t" style={{ borderColor: theme.colors.muted }}>
      <div className="mb-1">
        <span className="text-xs font-medium" style={{ color: theme.colors.primary }}>
          Payment via:
        </span>
      </div>      {/* Payment Methods Row - Remove Discount Button */}      <div className="flex flex-wrap items-center gap-1 mb-1">
        {paymentMethods.map((method, index) => (
          <React.Fragment key={method}>
            <Button
              variant={paymentMethod === method ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPaymentMethodChange(method)}
              className="h-7 px-2 text-xs font-medium"
            >
              {method.toUpperCase()}
            </Button>
            {index < paymentMethods.length - 1 && (
              <span className="mx-0.5 text-xs" style={{ color: theme.colors.muted }}>•</span>
            )}
          </React.Fragment>
        ))}
      </div>

      <div className="flex justify-between items-center mb-2"> {/* Reduced mb-3 to mb-2 */}
        <span className="text-xs" style={{ color: theme.colors.primary }}> {/* Reduced text-sm to text-xs */}
          Cash Float:
        </span>
        <Badge variant="accent" className="text-xs px-1 py-0.5">₱{cashFloat.toFixed(2)}</Badge> {/* Adjusted padding & text size */}
      </div>

      {/* Discount button is now in the row above, so this section is removed */}      <div className="space-y-1 mb-3"> {/* Reduced space-y-2 to space-y-1 and mb-4 to mb-3 */}
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

        <div className="flex justify-between text-base font-bold"> {/* Reduced text-lg to text-base */}
          <span style={{ color: theme.colors.primary }}>TOTAL:</span>
          <span style={{ color: theme.colors.primary }}>₱{total}</span>
        </div>
      </div>

      {paymentMethod === 'cash' && (
        <div className="mb-2"> {/* Reduced mb-3 to mb-2 */}
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
      
      {paymentMethod === 'card' && (
        <div className="space-y-1 mb-2"> {/* Reduced space-y-2 to space-y-1 and mb-3 to mb-2 */}
          <input
            type="text"
            value={cardDetails?.last4 || ''}
            onChange={(e) => onCardDetailsChange({...cardDetails, last4: e.target.value})}
            maxLength={4}
            className="w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors"
            style={{
              borderColor: theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="Last 4 digits of card"
          />
          <input
            type="text"
            value={cardDetails?.name || ''}
            onChange={(e) => onCardDetailsChange({...cardDetails, name: e.target.value})}
            className="w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors"
            style={{
              borderColor: theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="Cardholder name"
          />
        </div>
      )}
      
      {paymentMethod === 'e-wallet' && (
        <div className="space-y-1 mb-2"> {/* Reduced space-y-2 to space-y-1 and mb-3 to mb-2 */}
          <input
            type="text"
            value={eWalletDetails?.number || ''}
            onChange={(e) => onEWalletDetailsChange({...eWalletDetails, number: e.target.value})}
            className="w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors"
            style={{
              borderColor: theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="E-wallet number"
          />
          <input
            type="text"
            value={eWalletDetails?.name || ''}
            onChange={(e) => onEWalletDetailsChange({...eWalletDetails, name: e.target.value})}
            className="w-full p-3 text-sm rounded-lg border-2 focus:outline-none transition-colors"
            style={{
              borderColor: theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
            placeholder="E-wallet account name"
          />
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="danger"
          onClick={onCancelOrder}
          fullWidth
          size="sm" // Added size sm for consistency
          className="py-1.5" // Adjusted padding
        >
          Cancel Order
        </Button>          <Button
          variant="primary"
          onClick={() => {
            if (disabled) return;
            onProcessPayment();
          }}
          disabled={disabled}
          fullWidth
          size="sm"
          className="py-1.5"
        >
          PROCESS PAYMENT
        </Button>
      </div>
    </div>
  );
};