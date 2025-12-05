/**
 * Text Formatting Utilities for AI Assistant
 * Converts markdown-like formatting to React elements
 */
import React from 'react';

/**
 * Parses text with **bold** markers and returns React elements
 * @param {string} text - Text containing **bold** markers
 * @returns {React.ReactNode[]} Array of React elements
 */
export const formatBoldText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Split by **text** pattern
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, index) => {
    // Check if this part is a bold section
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <span key={index} className="font-bold text-orange-700">
          {boldText}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

/**
 * Formats price text with special styling
 * @param {string} text - Text containing prices like ₱100
 * @returns {React.ReactNode[]} Array of React elements
 */
export const formatPriceText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // First handle bold formatting
  const boldFormatted = formatBoldText(text);
  
  // If it's just a string (no bold), also highlight prices
  if (typeof boldFormatted === 'string') {
    const parts = text.split(/(₱\d+(?:,\d{3})*(?:\.\d{2})?)/g);
    
    return parts.map((part, index) => {
      if (part.match(/^₱\d+/)) {
        return (
          <span key={index} className="font-bold text-orange-600">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  }
  
  return boldFormatted;
};

/**
 * Comprehensive text formatter for AI responses
 * Handles: **bold**, prices (₱), and other formatting
 * @param {string} text - Raw text from AI
 * @returns {React.ReactNode} Formatted React element
 */
export const formatAIResponse = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  // Pattern to match **bold** and ₱prices
  const combinedPattern = /(\*\*[^*]+\*\*)|(₱\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  
  const parts = [];
  let lastIndex = 0;
  let match;
  
  while ((match = combinedPattern.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }
    
    // Determine what type of match this is
    if (match[1]) {
      // Bold text
      parts.push({
        type: 'bold',
        content: match[1].slice(2, -2) // Remove ** markers
      });
    } else if (match[2]) {
      // Price
      parts.push({
        type: 'price',
        content: match[2]
      });
    }
    
    lastIndex = match.index + match[0].length;
  }
  
  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }
  
  // If no special formatting found, return original text
  if (parts.length === 0) return text;
  
  return (
    <>
      {parts.map((part, index) => {
        switch (part.type) {
          case 'bold':
            return (
              <span key={index} className="font-semibold text-gray-900">
                {part.content}
              </span>
            );
          case 'price':
            return (
              <span key={index} className="font-bold text-orange-600">
                {part.content}
              </span>
            );
          default:
            return <span key={index}>{part.content}</span>;
        }
      })}
    </>
  );
};

export default formatAIResponse;
