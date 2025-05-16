import React from 'react';

export const PesoIconSimple = ({ width = 16, height = 16, color = "currentColor", className = "", ...rest }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={width} 
      height={height}
      viewBox="0 0 24 24" 
      fill="none" 
      className={`feather feather-peso ${className}`}
      {...rest}
    >      <g
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Simplified Peso Symbol - ₱ */}
        <path d="M8 4v16" />
        <line x1="5" y1="7" x2="18" y2="7" />
        <line x1="5" y1="10" x2="18" y2="10" />
        <path d="M8 4h5c2 0 4 1 4 4s-2 4-4 4h-5" />
      </g>
    </svg>
  );
};
