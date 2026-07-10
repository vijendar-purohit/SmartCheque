/**
 * Indian-locale formatters for amounts, dates, and status badges.
 *
 * Backend stores amounts in paise (integer BigInteger). We divide by 100 here.
 */

/** Convert paise → "₹10,00,000.00" (Indian grouping, 2 decimals). */
export function formatRupeesFromPaise(paise) {
  const n = Number(paise || 0) / 100;
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Convert paise → "10,00,000.00" (no symbol, for placeholders). */
export function formatNumberFromPaise(paise) {
  const n = Number(paise || 0) / 100;
  return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Strip ₹ symbol and commas → Number (for re-typing back into the field). */
export function parseRupeesToPaise(text) {
  if (!text) return 0;
  const cleaned = String(text).replace(/[₹,\s]/g, '').trim();
  if (!cleaned) return 0;
  const num = Number(cleaned);
  if (Number.isNaN(num)) return 0;
  // Be tolerant of "5000" or "5000.50" or "5000.5".
  return Math.round(num * 100);
}

/**
 * Auto-derive the 7 expanded-amount boxes from a paise value, matching
 * what the backend validator expects.
 *
 * Boxes: [crores, lakhs, thousands, hundreds, tens, ones, paise]
 *   crores = amount_paise / (10^7 * 100)
 *   lakhs   = (remaining) / (10^5 * 100)
 *   ...
 */
export function deriveExpandedBoxes(amountPaise) {
  const paise = Number(amountPaise || 0);
  let remaining = Math.floor(paise); // total paise

  const crores = Math.floor(remaining / (100 * 10000000));
  remaining -= crores * 100 * 10000000;

  const lakhs = Math.floor(remaining / (100 * 100000));
  remaining -= lakhs * 100 * 100000;

  const thousands = Math.floor(remaining / (100 * 1000));
  remaining -= thousands * 100 * 1000;

  const hundreds = Math.floor(remaining / (100 * 100));
  remaining -= hundreds * 100 * 100;

  const tens = Math.floor(remaining / (100 * 10));
  remaining -= tens * 100 * 10;

  const ones = Math.floor(remaining / 100);
  remaining -= ones * 100;

  const paiseOnly = remaining; // 0..99

  return { crores, lakhs, thousands, hundreds, tens, ones, paise: paiseOnly };
}

/** ISO timestamp → "12 Mar 2026" or "12 Mar 2026, 14:30". */
export function formatDate(iso, withTime = false) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const opts = withTime
      ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { day: '2-digit', month: 'short', year: 'numeric' };
    return d.toLocaleString('en-IN', opts);
  } catch (_) {
    return '—';
  }
}

/** ISO date (YYYY-MM-DD) for <input type="date">. Falls back to today. */
export function todayIsoDate() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export function truncateMiddle(str, len = 8) {
  if (!str) return '';
  if (str.length <= len * 2 + 3) return str;
  return `${str.slice(0, len)}...${str.slice(-len)}`;
}