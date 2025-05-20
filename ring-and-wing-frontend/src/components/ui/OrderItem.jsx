import { theme } from '../../theme';
import { Button } from './Button';
import { FiTrash2 } from 'react-icons/fi';

export const OrderItem = ({
  item,
  onVoid,
  onUpdateSize,
  onUpdateQuantity
}) => {
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
        </div>

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
  );
};