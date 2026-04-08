import React from 'react';
import {
  Landmark,
  Palette,
  History,
  Building2,
  Church,
  TowerControl as Castle,
  Waves,
  Trees,
} from 'lucide-react';

interface IconProps {
  className?: string;
  type: string;
  name?: string;
  isActive?: boolean;
}

export function MapMonumentIcon({
  type,
  name,
  isActive = false,
  className = '',
}: IconProps) {
  // Google Maps Landmark Style: #70757a background, white icon, rounded square
  const landmarkStyle = `relative flex flex-col items-center group transition-all duration-300 ${isActive ? 'scale-110 z-50' : 'z-10'}`;

  const iconContainerStyle = `
    flex items-center justify-center 
    w-8 h-8 rounded-[10px] 
    shadow-[0_2px_4px_rgba(0,0,0,0.3),0_0_2px_rgba(0,0,0,0.2)] 
    border-[1.5px] border-white
    transition-transform duration-300
    ${isActive ? 'bg-indigo-600 scale-110' : 'bg-[#70757a] group-hover:bg-[#5f6368]'}
  `;

  const renderIcon = () => {
    const iconSize = 'size-5 text-white';

    switch (type) {
      case 'ruin':
        return <History className={iconSize} />;
      case 'temple':
        return <Landmark className={iconSize} />;
      case 'fountain':
        return <Waves className={iconSize} />;
      case 'museum':
        return <Palette className={iconSize} />;
      case 'basilica':
        return <Church className={iconSize} />;
      case 'square':
        return <Trees className={iconSize} />;
      case 'castle':
        return <Castle className={iconSize} />;
      default:
        return <Building2 className={iconSize} />;
    }
  };

  return (
    <div className={`${landmarkStyle} ${className}`}>
      {/* The Icon Box */}
      <div className={iconContainerStyle}>{renderIcon()}</div>

      {/* The Label (Google Maps style) */}
      {name && (
        <div className='mt-1.5 flex flex-col items-center pointer-events-none'>
          <span
            className='text-[11px] font-black text-black text-center whitespace-nowrap'
            style={{
              textShadow:
                '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0 1px 2px rgba(0,0,0,0.3)',
              letterSpacing: '-0.01em',
            }}
          >
            {name}
          </span>
          {isActive && (
            <span className='text-[8px] font-bold text-gray-500 bg-white/90 px-1 rounded-sm shadow-xs mt-0.5 leading-none'>
              Selected
            </span>
          )}
        </div>
      )}

      {/* Selected Indicator Pin Stem (subtle) */}
      {isActive && (
        <div className='absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-1 bg-indigo-600 rounded-full' />
      )}
    </div>
  );
}
