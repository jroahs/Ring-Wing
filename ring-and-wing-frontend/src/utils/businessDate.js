export const BUSINESS_TIMEZONE = 'Asia/Manila';

// Returns YYYY-MM-DD for the business timezone (PH).
export function businessDateKey(date = new Date(), timeZone = BUSINESS_TIMEZONE) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(date);
}
