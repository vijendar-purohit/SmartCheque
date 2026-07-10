import React from 'react';

// Deterministic SVG QR-like pattern from a seed string
const QRPattern = ({ seed = 'A', size = 64, label = '' }) => {
  const cells = 9;
  const cellSize = size / cells;
  // Simple hash to determine pattern
  const hash = (str) => {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = (h * 31 + str.charCodeAt(i)) & 0xFFFFFFFF;
    }
    return h;
  };
  const h = hash(seed + label);
  const grid = Array.from({ length: cells * cells }, (_, i) => {
    const bit = (h >> (i % 32)) & 1;
    return bit || (i % 5 === 0) || (i % 7 === 0);
  });

  // Always fill corners (finder patterns)
  const finderTopLeft = [0,1,2,9,10,11,18,19,20];
  const finderTopRight = [6,7,8,15,16,17,24,25,26];
  const finderBottomLeft = [54,55,56,63,64,65,72,73,74];
  [...finderTopLeft, ...finderTopRight, ...finderBottomLeft].forEach(i => {
    if (i < grid.length) grid[i] = true;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <rect width={size} height={size} fill="white" />
      {grid.map((filled, i) => {
        if (!filled) return null;
        const row = Math.floor(i / cells);
        const col = i % cells;
        return (
          <rect
            key={i}
            x={col * cellSize}
            y={row * cellSize}
            width={cellSize - 0.5}
            height={cellSize - 0.5}
            fill="#1B0F4A"
          />
        );
      })}
    </svg>
  );
};

export default QRPattern;
