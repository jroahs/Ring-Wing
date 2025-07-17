/**
 * Simple, intelligent order detection that actually works
 */

export const detectOrder = (message, menuItems, recentSuggestions = []) => {
  const input = message.toLowerCase().trim();
  console.log('🧠 Smart Order Detection:', input);
  
  // Find any menu items mentioned in the message
  const mentionedItems = menuItems.filter(item => {
    const itemName = item.name.toLowerCase();
    return input.includes(itemName) || itemName.includes(input);
  });
  
  // Extract quantity if present
  const quantityMatch = input.match(/(\d+|one|two|three|four|five|six|seven|eight|nine|ten)/i);
  const quantity = quantityMatch ? parseInt(quantityMatch[1]) || getNumberFromWord(quantityMatch[1]) : 1;
  
  // Check if this looks like an order
  const orderIndicators = [
    'ok', 'sure', 'yes', 'yeah', 'yep',
    'i want', 'i\'ll have', 'give me', 'can i get', 'can i have',
    'order', 'add', 'get me', 'please'
  ];
  
  const hasOrderIndicator = orderIndicators.some(indicator => input.includes(indicator));
  const isJustItemName = mentionedItems.some(item => 
    item.name.toLowerCase() === input || 
    input === item.name.toLowerCase().replace(/\s+/g, '') ||
    (input.split(' ').length <= 3 && input.includes(item.name.toLowerCase().split(' ')[0]))
  );
  
  // Exclude obvious non-orders
  const nonOrderPatterns = [
    'what drinks', 'what beverages', 'partner it with', 'pair it with',
    'goes with', 'go with', 'how much', 'price', 'cost'
  ];
  
  const isNonOrder = nonOrderPatterns.some(pattern => input.includes(pattern));
  
  if (isNonOrder) {
    console.log('🚫 Not an order - contains non-order pattern');
    return { isOrder: false, items: [] };
  }
  
  if ((hasOrderIndicator || isJustItemName) && mentionedItems.length > 0) {
    console.log('✅ Order detected!', mentionedItems.map(i => i.name));
    return {
      isOrder: true,
      items: mentionedItems.map(item => ({
        menuItem: item,
        quantity: quantity,
        size: item.pricing ? Object.keys(item.pricing)[0] : 'base'
      }))
    };
  }
  
  console.log('🤔 No clear order intent');
  return { isOrder: false, items: [] };
};

function getNumberFromWord(word) {
  const numbers = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
  };
  return numbers[word.toLowerCase()] || 1;
}
