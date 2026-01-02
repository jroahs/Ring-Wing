/**
 * Receipt Number Generator Utility
 * 
 * Generates unified receipt numbers in the format: YYYYMMDD-###
 * Example: 20251208-001, 20251208-002, etc.
 * 
 * The counter resets daily and automatically expands beyond 3 digits if needed.
 */

const Order = require('../models/Order');

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Manila';
const MANILA_OFFSET = '+08:00';

function getDatePartsInTimeZone(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) {
    throw new Error(`Failed to derive date parts for timezone ${timeZone}`);
  }

  return { year, month, day };
}

function getBusinessDayRangeUtc(date, timeZone) {
  // This app’s business timezone is Asia/Manila (PHT, UTC+08:00).
  // Render containers typically run in UTC; relying on server-local Date() causes
  // “day rollover” bugs around midnight PHT.
  if (timeZone !== 'Asia/Manila') {
    console.warn(
      `[Receipt Number Generator] BUSINESS_TIMEZONE=${timeZone} is not supported for day-boundary math; falling back to Asia/Manila.`
    );
    timeZone = 'Asia/Manila';
  }

  const { year, month, day } = getDatePartsInTimeZone(date, timeZone);

  const startOfDayUtc = new Date(`${year}-${month}-${day}T00:00:00.000${MANILA_OFFSET}`);
  const endOfDayUtc = new Date(`${year}-${month}-${day}T23:59:59.999${MANILA_OFFSET}`);

  return { startOfDayUtc, endOfDayUtc, year, month, day };
}

/**
 * Generate a new receipt number for today
 * @returns {Promise<string>} Receipt number in format YYYYMMDD-###
 */
async function generateReceiptNumber() {
  try {
    const now = new Date();
    const { startOfDayUtc, endOfDayUtc, year, month, day } = getBusinessDayRangeUtc(
      now,
      BUSINESS_TIMEZONE
    );

    // Get business date in YYYYMMDD format (Asia/Manila)
    const datePrefix = `${year}${month}${day}`;

    // Find the highest receipt number for today
    const todaysOrders = await Order.find({
      receiptNumber: { $regex: `^${datePrefix}-` },
      createdAt: { $gte: startOfDayUtc, $lte: endOfDayUtc }
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
