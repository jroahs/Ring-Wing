/**
 * Business time utilities (Asia/Manila)
 *
 * Render containers commonly run in UTC; any logic that relies on server-local Date()
 * for “today”, daily resets, or date filtering will drift by 8 hours vs PH time.
 *
 * This module centralizes Manila day boundary calculations.
 */

const BUSINESS_TIMEZONE = process.env.BUSINESS_TIMEZONE || 'Asia/Manila';

// Manila (PHT) is fixed UTC+08:00 (no DST).
const MANILA_OFFSET = '+08:00';

function getBusinessTimeZone() {
  return BUSINESS_TIMEZONE;
}

function formatBusinessDateKey(date = new Date(), timeZone = BUSINESS_TIMEZONE) {
  // en-CA reliably formats as YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}

function formatBusinessDateCompact(date = new Date(), timeZone = BUSINESS_TIMEZONE) {
  const key = formatBusinessDateKey(date, timeZone);
  return key.replace(/-/g, '');
}

function getBusinessDayRangeUtc(date = new Date(), timeZone = BUSINESS_TIMEZONE) {
  if (timeZone !== 'Asia/Manila') {
    // We can support additional IANA zones later if needed.
    console.warn(
      `[businessTime] BUSINESS_TIMEZONE=${timeZone} not supported for boundary math; using Asia/Manila.`
    );
    timeZone = 'Asia/Manila';
  }

  const dateKey = formatBusinessDateKey(date, timeZone);

  const startOfDayUtc = new Date(`${dateKey}T00:00:00.000${MANILA_OFFSET}`);
  const startOfNextDayUtc = new Date(startOfDayUtc.getTime() + 24 * 60 * 60 * 1000);
  const endOfDayUtc = new Date(startOfNextDayUtc.getTime() - 1);

  return {
    timeZone,
    dateKey,
    startOfDayUtc,
    startOfNextDayUtc,
    endOfDayUtc
  };
}

function businessDateTimeUtc(dateKey, hours = 0, minutes = 0, seconds = 0, ms = 0, timeZone = BUSINESS_TIMEZONE) {
  if (timeZone !== 'Asia/Manila') {
    console.warn(
      `[businessTime] businessDateTimeUtc only supports Asia/Manila today; using Asia/Manila.`
    );
    timeZone = 'Asia/Manila';
  }

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  const mmm = String(ms).padStart(3, '0');

  return new Date(`${dateKey}T${hh}:${mm}:${ss}.${mmm}${MANILA_OFFSET}`);
}

function isDateOnlyString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

module.exports = {
  getBusinessTimeZone,
  formatBusinessDateKey,
  formatBusinessDateCompact,
  getBusinessDayRangeUtc,
  businessDateTimeUtc,
  isDateOnlyString
};
