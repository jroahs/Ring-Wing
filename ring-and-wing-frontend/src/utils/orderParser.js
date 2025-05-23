/**
 * Parses order text to extract quantities, item names, and sizes
 * @param {string} orderText - The user's order text
 * @returns {Array<Object>} - Extracted order details
 */
export function parseOrderText(orderText) {
  const text = orderText.toLowerCase();
  
  // Quantity detection patterns
  const quantityPatterns = [
    // Match numeric quantities (1, 2, 3, etc.)
    /(\d+)\s+(.*?)(?=\s+and|\s*$|\s*,)/i,
    
    // Match text quantities (one, two, three, etc.)
    /(one|two|three|four|five|six|seven|eight|nine|ten)\s+(.*?)(?=\s+and|\s*$|\s*,)/i
  ];
  
  // Size detection patterns
  const sizePatterns = [
    // Standard sizes
    /(small|medium|large|regular)\s+(.*?)(?=\s+and|\s*$|\s*,)/i,
    
    // Abbreviated sizes (sm, md, lg)
    /(sm|md|lg)\s+(.*?)(?=\s+and|\s*$|\s*,)/i
  ];
  
  // Multiple item detection
  const multipleItemPattern = /(.*?)(?:\s+and\s+|\s*,\s*)(.*)/i;
  
  // Results storage
  const items = [];
  let remainingText = text;
  
  // Process multiple items (split by 'and' or commas)
  let multipleItems = [];
  if (multipleItemPattern.test(remainingText)) {
    multipleItems = remainingText.split(/(?:\s+and\s+|\s*,\s*)/i)
      .filter(item => item.trim().length > 0);
  } else {
    multipleItems = [remainingText];
  }
  
  // Process each potential item
  multipleItems.forEach(itemText => {
    let quantity = 1;
    let size = null;
    let name = itemText.trim();
    
    // Check for quantity
    for (const pattern of quantityPatterns) {
      const match = itemText.match(pattern);
      if (match) {
        // Convert text numbers to digits if necessary
        const textToNumber = {
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };
        
        quantity = textToNumber[match[1]] || parseInt(match[1], 10);
        name = match[2].trim();
        break;
      }
    }
    
    // Check for size
    for (const pattern of sizePatterns) {
      const match = name.match(pattern);
      if (match) {
        // Normalize size abbreviations
        const sizeMap = {
          'sm': 'small', 
          'md': 'medium', 
          'lg': 'large'
        };
        
        size = sizeMap[match[1]] || match[1];
        name = match[2].trim();
        break;
      }
    }
    
    items.push({
      name,
      quantity,
      size
    });
  });
  
  return items;
}

/**
 * Helper function to find the best menu item match with confidence score
 * @param {string} itemText - The text to match against menu items
 * @param {Array<Object>} menuItems - The list of available menu items
 * @returns {Object|null} - The best matched menu item with confidence, or null
 */
export const findBestMenuItemMatch = (itemText, menuItems) => {
  const searchText = itemText.toLowerCase();
  
  // Exact match
  const exactMatch = menuItems.find(item => 
    item.name.toLowerCase() === searchText
  );
  
  if (exactMatch) {
    return {...exactMatch, confidence: 'high'};
  }
  
  // Contains match (item name contains the search text or vice versa)
  const containsMatch = menuItems.find(item => 
    searchText.includes(item.name.toLowerCase()) ||
    item.name.toLowerCase().includes(searchText)
  );
  
  if (containsMatch) {
    return {...containsMatch, confidence: 'medium'};
  }
  
  // Word match (any word in the item name matches)
  for (const item of menuItems) {
    const itemWords = item.name.toLowerCase().split(/\s+/);
    const searchWords = searchText.split(/\s+/);
    
    const hasCommonWord = itemWords.some(word => 
      searchWords.includes(word) && word.length > 2 // Avoid matching short words
    );
    
    if (hasCommonWord) {
      return {...item, confidence: 'low'};
    }
  }
  
  return null;
};
