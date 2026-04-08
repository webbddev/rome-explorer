import { type RouteData } from '@/lib/osrm';
import { formatTime, formatDistance, AVG_WALK_SPEED_KMH } from '@/lib/geo';
import { Footprints } from 'lucide-react';

export function RouteInfoContent({
  routeData,
  straightLine,
  pinBName,
}: {
  routeData: RouteData;
  straightLine: number;
  pinBName: string | null;
}) {
  return (
    <div className='space-y-4 animate-in fade-in zoom-in-95 duration-500'>
      <div className='flex items-end justify-between'>
        <div className='space-y-0.5'>
          <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
            Walk Time
          </p>
          <p className='text-3xl font-black text-slate-900 tracking-tighter'>
            {formatTime(routeData.durationSeconds)}
          </p>
        </div>
        <div className='text-right space-y-0.5'>
          <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest'>
            Distance
          </p>
          <p className='text-lg font-bold text-blue-600 tabular-nums'>
            {formatDistance(routeData.distanceMeters)}
          </p>
        </div>
      </div>

      <div className='relative h-1.5 w-full bg-slate-100 rounded-full overflow-hidden'>
        <div className='absolute inset-0 bg-blue-500/10' />
        <div className='relative h-full bg-linear-to-r from-blue-600 to-blue-400 w-1/4 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]' />
      </div>

      <div className='flex flex-col gap-1'>
        <div className='flex items-center justify-between text-[10px] text-slate-500 font-medium italic'>
          <div className='flex items-center gap-1.5'>
            <Footprints className='size-3 text-blue-400' />
            <span>Street network route</span>
          </div>
          <span>{AVG_WALK_SPEED_KMH} km/h pace</span>
        </div>
        <div className='text-[9px] text-slate-300 flex items-center justify-between border-t border-slate-50 pt-1 mt-1'>
          <span>{formatDistance(straightLine)} straight-line</span>
          {pinBName && <span className='truncate ml-2'>to {pinBName}</span>}
        </div>
      </div>
    </div>
  );
}
