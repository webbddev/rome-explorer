import React from 'react';
import { Landmark, MountainSnow, Palette, Cross, Anchor } from 'lucide-react';

interface IconProps {
  className?: string;
  type: "ruin" | "temple" | "fountain" | "museum" | "basilica" | "square" | "castle";
}

export function MapMonumentIcon({ type, className = "" }: IconProps) {
  // Apple/Google Maps often use slightly 3D-feeling or very distinct flat icons with shadows
  const baseStyle = "flex items-center justify-center rounded-full shadow-lg border-2 border-white overflow-hidden";
  
  if (type === "ruin") {
    return (
      <div className={`${baseStyle} bg-amber-700 w-7 h-7 ${className}`}>
        <MountainSnow className="w-4 h-4 text-white" />
      </div>
    );
  }

  if (type === "temple") {
    return (
      <div className={`${baseStyle} bg-orange-600 w-7 h-7 ${className}`}>
        <Landmark className="w-4 h-4 text-white" />
      </div>
    );
  }

  if (type === "fountain") {
    return (
      <div className={`${baseStyle} bg-cyan-500 w-7 h-7 ${className}`}>
        <Anchor className="w-4 h-4 text-white" />
      </div>
    );
  }

  if (type === "museum") {
    return (
      <div className={`${baseStyle} bg-purple-600 w-7 h-7 ${className}`}>
        <Palette className="w-4 h-4 text-white" />
      </div>
    );
  }

  if (type === "basilica" || type === "square") {
    return (
      <div className={`${baseStyle} bg-indigo-500 w-7 h-7 ${className}`}>
        <Cross className="w-4 h-4 text-white" />
      </div>
    );
  }

  if (type === "castle") {
    return (
      <div className={`${baseStyle} bg-slate-700 w-7 h-7 ${className}`}>
        <Landmark className="w-4 h-4 text-white" />
      </div>
    );
  }

  return (
    <div className={`${baseStyle} bg-gray-500 w-7 h-7 ${className}`}>
      <div className="w-2 h-2 bg-white rounded-full" />
    </div>
  );
}
