/**
 * Status badge — driven by the backend's status enum.
 * Uses utils/status.js for color tokens (instead of mock data).
 */
import React from 'react';
import { getStatusColors, statusLabel } from '../utils/status';

export default function StatusBadge({ status, size = 'md' }) {
  const colors = getStatusColors(status);
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs';

  return (
    <span
      className={`${padding} rounded-full font-bold ${colors.bg} ${colors.text} flex items-center gap-1.5 w-fit border ${colors.border}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
      {statusLabel(status)}
    </span>
  );
}