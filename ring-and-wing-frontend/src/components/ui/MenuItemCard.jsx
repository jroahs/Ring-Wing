import { theme } from '../../theme';

export const MenuItemCard = ({ item, onClick }) => {
  const basePrice = item.pricing.base || Object.values(item.pricing)[0];

  return (
    <div
      className="relative rounded-lg overflow-hidden cursor-pointer aspect-square shadow-md hover:shadow-lg transition-shadow"
      onClick={onClick}
    >
      <div className="relative w-full h-full">
        {item.image && (
          <img 
            src={item.image} 
            alt={item.name} 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
              e.target.alt = 'Image not available';
            }}
          />
        )}

        <div 
          className="absolute bottom-0 left-0 right-0 px-2 py-1.5" 
          style={{ backgroundColor: theme.colors.accent }}
        >
          <div className="grid grid-cols-[1fr_auto] items-baseline gap-1">
            <h3 
              className="text-white font-bold leading-tight break-words"
              style={{
                fontSize: theme.fontSizes.sm,
                lineHeight: '1.2',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {item.name}
            </h3>
            
            <span className="text-white font-bold whitespace-nowrap">
              ₱{typeof basePrice === 'number' ? basePrice.toFixed(0) : basePrice}
            </span>
          </div>
        </div>
      </div>

      <div 
        className="absolute top-1.5 left-1.5 rounded-md px-3 py-2 font-bold"
        style={{ 
          backgroundColor: theme.colors.accent,
          color: theme.colors.background,
          boxShadow: theme.shadows.md
        }}
      >
        {item.code}
      </div>
    </div>
  );
};