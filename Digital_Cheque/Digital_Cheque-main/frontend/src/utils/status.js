/**
 * Map backend Cheque.status enum → display label + color tokens.
 *
 * Backend statuses (from app/models/cheque.py):
 *   ISSUED, PENDING_COSIGN, PRESENTED, OTP_PENDING,
 *   OTP_APPROVED, CLEARED, REJECTED, CANCELLED, EXPIRED
 *
 * Spec from the user (Screen 2):
 *   green  = CLEARED
 *   yellow = OTP_PENDING
 *   red    = REJECTED
 *   blue   = ISSUED
 *   grey   = anything else
 */

export const STATUS_LABELS = {
  ISSUED: 'ISSUED',
  PENDING_COSIGN: 'PENDING',
  PRESENTED: 'PRESENTED',
  OTP_PENDING: 'OTP_PENDING',
  OTP_APPROVED: 'OTP_APPROVED',
  CLEARED: 'CLEARED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  EXPIRED: 'EXPIRED',
};

const PALETTE = {
  CLEARED:        { bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500',  border: 'border-green-200' },
  OTP_PENDING:    { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', border: 'border-yellow-200' },
  REJECTED:       { bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500',    border: 'border-red-200' },
  ISSUED:         { bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500',   border: 'border-blue-200' },
  PRESENTED:      { bg: 'bg-indigo-100', text: 'text-indigo-700', dot: 'bg-indigo-500', border: 'border-indigo-200' },
  OTP_APPROVED:   { bg: 'bg-teal-100',   text: 'text-teal-700',   dot: 'bg-teal-500',   border: 'border-teal-200' },
  PENDING_COSIGN: { bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500',  border: 'border-amber-200' },
  CANCELLED:      { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-500',   border: 'border-gray-200' },
  EXPIRED:        { bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-500',   border: 'border-gray-200' },
};

export function getStatusColors(status) {
  return PALETTE[status] || PALETTE.ISSUED;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status || 'UNKNOWN';
}

/** Risk score (0-100) → color tokens. */
export function getRiskColors(score) {
  const s = Number(score || 0);
  if (s <= 30) return { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/30', label: 'Low' };
  if (s <= 70) return { bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/30', label: 'Med' };
  return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', label: 'High' };
}