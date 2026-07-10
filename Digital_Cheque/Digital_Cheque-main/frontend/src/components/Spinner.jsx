/**
 * Reusable loading spinner. Three sizes + color variants.
 */
import React from 'react';

export default function Spinner({ size = 'md', className = '', tone = 'navy' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5 border-2'
    : size === 'lg' ? 'w-8 h-8 border-[3px]'
    : 'w-5 h-5 border-2';

  const toneClass =
    tone === 'white' ? 'border-white/30 border-t-white'
    : tone === 'gold'  ? 'border-[#1c104b]/30 border-t-[#1c104b]'
    : tone === 'violet'? 'border-[#7547ac]/30 border-t-[#7547ac]'
    : 'border-[#1c104b]/30 border-t-[#1c104b]';

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`${sizeClass} ${toneClass} rounded-full animate-spin inline-block ${className}`}
    />
  );
}