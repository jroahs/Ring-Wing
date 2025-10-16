import { theme } from '../../theme';
import { Button } from './Button';
import { FiTrash2, FiUser } from 'react-icons/fi';
import { useState } from 'react';

export const OrderItem = ({
  item,
  onVoid,
  onUpdateSize,
  onUpdateQuantity,
  onDiscountUpdate
}) => {
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountedQuantity, setDiscountedQuantity] = useState(item.pwdSeniorDiscount?.discountedQuantity || 0);

  const handleDiscountApply = () => {
    if (onDiscountUpdate) {
      onDiscountUpdate(item, discountedQuantity);
    }
    setShowDiscountModal(false);
  };

  const hasDiscount = item.pwdSeniorDiscount?.applied && item.pwdSeniorDiscount?.discountedQuantity > 0;
  return (
    <div 
      className="rounded-lg p-3 relative flex items-start gap-3"
      style={{ backgroundColor: theme.colors.hoverBg }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={() => onVoid(item)}
          className="p-1 rounded-full hover:bg-red-100 transition-colors self-start mt-1"
          style={{ color: theme.colors.error }}
        >
          <FiTrash2 className="w-5 h-5" />
        </button>        {item.image ? (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            onError={(e) => {
              // If image fails to load, use category-specific placeholder
              e.target.src = item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png';
            }}
          />
        ) : (
          <img 
            src={item.category === 'Beverages' ? '/placeholders/drinks.png' : '/placeholders/meal.png'} 
            alt={item.name} 
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        )}

        <div className="flex-1 min-w-0">
          <h4 
            className="font-bold text-sm md:text-base truncate" 
            style={{ color: theme.colors.primary }}
          >
            {item.name}
          </h4>          <select
            value={item.selectedSize}
            onChange={(e) => onUpdateSize(item, e.target.value)}
            className="w-full mt-1 text-sm rounded-lg px-2 py-1 transition-colors focus:outline-none focus:ring-2"
            style={{ 
              border: '2px solid ' + theme.colors.muted,
              backgroundColor: theme.colors.background,
              color: theme.colors.primary
            }}
          >
            {(item.availableSizes || []).map(size => (
              <option 
                key={size} 
                value={size} 
                style={{ color: theme.colors.primary }}
              >
                {size} (₱{item.pricing && item.pricing[size] ? item.pricing[size].toFixed(2) : item.price.toFixed(2)})
              </option>
            ))}
          </select>

          {/* PWD/Senior Discount Info */}
          {hasDiscount && (
            <div className="mt-1 text-xs bg-blue-50 px-2 py-1 rounded" style={{ color: theme.colors.primary }}>
              <div>PWD/Senior: {item.pwdSeniorDiscount.discountedQuantity}x (20% off + VAT exempt)</div>
              <div className="text-blue-600 mt-1">Card details will be collected at payment</div>
            </div>
          )}
        </div>        <div className="flex flex-col items-end gap-2">
          {/* PWD/Senior Discount Button */}
          <button
            onClick={() => setShowDiscountModal(true)}
            className={`p-1.5 rounded-full transition-colors ${
              hasDiscount 
                ? 'bg-blue-100 text-blue-600 hover:bg-blue-200' 
                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
            }`}
            title="PWD/Senior Discount"
          >
            <FiUser className="w-4 h-4" />
          </button>

          {/* Quantity Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUpdateQuantity(item, -1)}
              className="min-w-[36px]"
            >
              -
            </Button>
            <span 
              className="w-8 text-center text-lg" 
              style={{ color: theme.colors.primary }}
            >
              {item.quantity}
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onUpdateQuantity(item, 1)}
              className="min-w-[36px]"
            >
              +
            </Button>
          </div>
        </div>
      </div>

      {/* PWD/Senior Discount Modal */}
      {showDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-bold mb-4" style={{ color: theme.colors.primary }}>
              PWD/Senior Citizen Discount
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.colors.secondary }}>
              Select how many items are for PWD/Senior (20% discount + VAT exempt):
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.colors.primary }}>
                Quantity for discount (max: {item.quantity}):
              </label>
              <input
                type="number"
                min="0"
                max={item.quantity}
                value={discountedQuantity}
                onChange={(e) => setDiscountedQuantity(Math.min(item.quantity, Math.max(0, parseInt(e.target.value) || 0)))}
                className="w-full p-2 border rounded-lg"
                style={{ 
                  borderColor: theme.colors.muted,
                  backgroundColor: theme.colors.background,
                  color: theme.colors.primary
                }}
              />
            </div>

            <div className="text-xs text-gray-600 mb-4 bg-blue-50 p-2 rounded">
              Card holder details will be collected during payment processing
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setDiscountedQuantity(item.pwdSeniorDiscount?.discountedQuantity || 0);
                  setShowDiscountModal(false);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleDiscountApply}
                className="flex-1"
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};