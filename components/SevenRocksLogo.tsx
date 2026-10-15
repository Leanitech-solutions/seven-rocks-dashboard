import React from "react";

export interface SevenRocksLogoProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Seven Rocks Vienna signature logo SVG icon.
 * Vector recreation with gabled roof house shape and three inner pillars.
 */
export const SevenRocksLogo: React.FC<SevenRocksLogoProps> = ({
  className = "h-8 w-8",
  size,
  ...props
}) => {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer Roof Gabled Structure */}
      <path d="M14 38 L50 6 L86 38 H78 L50 17 L22 38 Z" />

      {/* Left Wall */}
      <path d="M14 38 H22 V90 H14 Z" />

      {/* Right Wall */}
      <path d="M78 38 H86 V90 H78 Z" />

      {/* Left Pillar */}
      <path d="M30 38 H38 V90 H30 Z" />

      {/* Right Pillar */}
      <path d="M62 38 H70 V90 H62 Z" />

      {/* Middle Pillar with pitch peak matching the roof slope */}
      <path d="M46 90 V27.5 L50 24 L54 27.5 V90 Z" />

      {/* Bottom Horizontal Base */}
      <path d="M14 90 H86 V98 H14 Z" />
    </svg>
  );
};

export default SevenRocksLogo;
