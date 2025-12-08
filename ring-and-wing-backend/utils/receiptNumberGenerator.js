/**
 * Receipt Number Generator Utility
 * 
 * Generates unified receipt numbers in the format: YYYYMMDD-###
 * Example: 20251208-001, 20251208-002, etc.
 * 
 * The counter resets daily and automatically expands beyond 3 digits if needed.
 */

const Order = require('../models/Order');

/**
 * Generate a new receipt number for today
 * @returns {Promise<string>} Receipt number in format YYYYMMDD-###
 */
async function generateReceiptNumber() {
  try {
    // Get current date in YYYYMMDD format
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const datePrefix = `${year}${month}${day}`;

    // Get start and end of today
    const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59);

    // Find the highest receipt number for today
    const todaysOrders = await Order.find({
      receiptNumber: { $regex: `^${datePrefix}-` },
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    })
    .sort({ receiptNumber: -1 })
    .limit(1);

    let counter = 1;

    if (todaysOrders.length > 0) {
      // Extract counter from last receipt number
      const lastReceiptNumber = todaysOrders[0].receiptNumber;
      const lastCounter = parseInt(lastReceiptNumber.split('-')[1]);
      counter = lastCounter + 1;
    }

    // Format counter with at least 3 digits, but allow expansion
    const counterStr = String(counter).padStart(3, '0');
    const receiptNumber = `${datePrefix}-${counterStr}`;

    console.log(`[Receipt Number Generator] Generated: ${receiptNumber}`);
    return receiptNumber;

  } catch (error) {
    console.error('[Receipt Number Generator] Error:', error);
    // Fallback to timestamp-based number
    const timestamp = Date.now();
    return `${timestamp}`;
  }
}

/**
 * Validate receipt number format
 * @param {string} receiptNumber 
 * @returns {boolean}
 */
function isValidReceiptNumber(receiptNumber) {
  // Format: YYYYMMDD-###
  const pattern = /^\d{8}-\d{3,}$/;
  return pattern.test(receiptNumber);
}

/**
 * Parse receipt number to get date and counter
 * @param {string} receiptNumber 
 * @returns {{date: Date, counter: number} | null}
 */
function parseReceiptNumber(receiptNumber) {
  if (!isValidReceiptNumber(receiptNumber)) {
    return null;
  }

  const [datePart, counterPart] = receiptNumber.split('-');
  
  const year = parseInt(datePart.substring(0, 4));
  const month = parseInt(datePart.substring(4, 6)) - 1; // JS months are 0-indexed
  const day = parseInt(datePart.substring(6, 8));
  const counter = parseInt(counterPart);

  return {
    date: new Date(year, month, day),
    counter: counter
  };
}

module.exports = {
  generateReceiptNumber,
  isValidReceiptNumber,
  parseReceiptNumber
};
