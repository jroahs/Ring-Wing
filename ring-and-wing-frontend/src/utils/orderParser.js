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
    /(small|medium|large|regular|hot|cold|float)\s+(.*?)(?=\s+and|\s*$|\s*,)/i,
    
    // Abbreviated sizes (sm, md, lg)
    /(sm|md|lg|s|m|l)\s+(.*?)(?=\s+and|\s*$|\s*,)/i
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
        // Normalize size abbreviations and map to menu sizes
        const sizeMap = {
          'sm': 'small', 
          'md': 'medium', 
          'lg': 'large',
          's': 'small',
          'm': 'medium',
          'l': 'large',
          'small': 'small',
          'medium': 'medium',
          'large': 'large',
          'regular': 'medium',
          'hot': 'hot',
          'cold': 'cold',
          'float': 'float'
        };
        
        size = sizeMap[match[1].toLowerCase()] || match[1];
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
 * Maps user-requested size to the best available size in a menu item
 * @param {string} requestedSize - The size the user requested
 * @param {Array<string>} availableSizes - Available sizes for the menu item
 * @returns {string|null} - The best matching available size, or null if no match
 */
export const mapToAvailableSize = (requestedSize, availableSizes) => {
  if (!requestedSize || !availableSizes || availableSizes.length === 0) {
    return availableSizes?.[0] || null; // Return first available size if no preference
  }
  
  const lowerRequested = requestedSize.toLowerCase();
  
  // Direct match (case-insensitive)
  const directMatch = availableSizes.find(size => 
    size.toLowerCase() === lowerRequested
  );
  if (directMatch) return directMatch;
  
  // Size mapping for complex menu sizes (expanded with more variations)
  const sizeMapping = {
    // For simple user requests, map to complex menu sizes
    'small': ['Hot (S)', 'small', 'Small', 'S', 's'],
    'medium': ['Hot (M)', 'Cold (M)', 'Float (M)', 'Medium', 'medium', 'M', 'm'],
    'large': ['Cold (L)', 'Float (L)', 'Large', 'large', 'L', 'l'],
    'hot': ['Hot (S)', 'Hot (M)', 'hot', 'Hot'],
    'cold': ['Cold (M)', 'Cold (L)', 'cold', 'Cold'],
    'float': ['Float (M)', 'Float (L)', 'float', 'Float']
  };
    // Find matching size from mapping (more flexible matching)
  for (const [userSize, menuSizes] of Object.entries(sizeMapping)) {
    // Check if requested size contains or matches this user size category
    if (lowerRequested === userSize || lowerRequested.includes(userSize)) {
      // Try to find a match in available sizes that corresponds to any of the menu sizes for this category
      const match = availableSizes.find(size => 
        menuSizes.some(menuSize => 
          size.toLowerCase().includes(menuSize.toLowerCase()) || 
          menuSize.toLowerCase().includes(size.toLowerCase())
        )
      );
      if (match) return match;
    }
  }
  
  // More flexible partial matching
  // First try to match standard size words like "small", "medium", "large" regardless of case
  const sizeWords = {
    'small': ['s', 'sm', 'small'],
    'medium': ['m', 'md', 'med', 'medium'], 
    'large': ['l', 'lg', 'large']
  };
  
  for (const [standardSize, variations] of Object.entries(sizeWords)) {
    // If user input contains any variation of this size
    if (variations.some(v => lowerRequested.includes(v))) {
      // Find any available size that might match this standard size
      const sizeMatch = availableSizes.find(size => 
        size.toLowerCase().includes(standardSize) || 
        // Try capitalized version too
        size.includes(standardSize.charAt(0).toUpperCase() + standardSize.slice(1))
      );
      if (sizeMatch) return sizeMatch;
    }
  }
  
  // General partial match as fallback
  const partialMatch = availableSizes.find(size => {
    const lowerSize = size.toLowerCase();
    return lowerSize.includes(lowerRequested) || 
           lowerRequested.includes(lowerSize.replace(/[()]/g, '')) ||
           // Handle plural forms (e.g., "larges" -> "large")
           (lowerRequested.endsWith('s') && lowerSize.includes(lowerRequested.slice(0, -1)));
  });
  
  if (partialMatch) return partialMatch;
  
  // If no match found, return the first available size as default
  console.log(`No size match found for "${requestedSize}" in available sizes: ${JSON.stringify(availableSizes)}. Defaulting to first available.`);
  return availableSizes[0];
};

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
    // Fuzzy match for misspellings (using Levenshtein distance)
  const fuzzyMatches = menuItems.map(item => {
    const itemName = item.name.toLowerCase();
    
    // Check full name similarity
    const fullNameDistance = levenshteinDistance(searchText, itemName);
    const fullNameMaxLength = Math.max(searchText.length, itemName.length);
    const fullNameSimilarity = 1 - (fullNameDistance / fullNameMaxLength);
    
    // Check word-level similarity for multi-word items
    const itemWords = itemName.split(/\s+/);
    const bestWordMatch = itemWords.reduce((best, word) => {
      if (word.length < 3) return best; // Skip short words
      
      const wordDistance = levenshteinDistance(searchText, word);
      const wordMaxLength = Math.max(searchText.length, word.length);
      const wordSimilarity = 1 - (wordDistance / wordMaxLength);
      
      return wordSimilarity > best ? wordSimilarity : best;
    }, 0);
    
    // Use the better of full name or best word similarity
    const similarity = Math.max(fullNameSimilarity, bestWordMatch);
    const distance = Math.min(fullNameDistance, 
      itemWords.map(word => levenshteinDistance(searchText, word)).reduce((min, d) => Math.min(min, d), Infinity)
    );
    
    return {
      item,
      similarity,
      distance
    };
  }).filter(match => 
    match.similarity >= 0.6 && // At least 60% similar
    match.distance <= 3 && // Maximum 3 character differences
    Math.abs(searchText.length - match.item.name.length) <= 6 // Allow slightly larger length difference for multi-word items
  ).sort((a, b) => b.similarity - a.similarity); // Sort by highest similarity first
  
  if (fuzzyMatches.length > 0) {
    const bestMatch = fuzzyMatches[0];
    return {...bestMatch.item, confidence: bestMatch.similarity >= 0.8 ? 'medium' : 'low'};
  }
  
  return null;
};

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} - The Levenshtein distance
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create a matrix to store the distances
  const matrix = Array(len1 + 1).fill(null).map(() => Array(len2 + 1).fill(0));
  
  // Initialize the first row and column
  for (let i = 0; i <= len1; i++) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  // Fill in the matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]; // No operation needed
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // Deletion
          matrix[i][j - 1] + 1,     // Insertion
          matrix[i - 1][j - 1] + 1  // Substitution
        );
      }
    }
  }
    return matrix[len1][len2];
}
