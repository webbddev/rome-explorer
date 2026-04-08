import { useState, useMemo, useRef } from 'react';
import { Search, X, ShoppingBag, LocateFixed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  SIGHTS,
  ALYA_SHOPPING,
  HOME_LOCATION,
  type LocationItem,
} from '@/lib/data';
import { haversineDistance, formatDistance } from '@/lib/geo';

interface SearchOverlayProps {
  gpsLocation: [number, number] | null;
  onResultClick: (item: LocationItem) => void;
  gpsError: string | null;
}

export function SearchOverlay({
  gpsLocation,
  onResultClick,
  gpsError,
}: SearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const allLocations = [...SIGHTS, ...ALYA_SHOPPING, HOME_LOCATION];
    return allLocations.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        ('description' in s && s.description.toLowerCase().includes(q)) ||
        ('address' in s && s.address?.toLowerCase().includes(q)),
    );
  }, [searchQuery]);

  const handleResultSelect = (item: LocationItem) => {
    onResultClick(item);
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <>
      <div className='absolute top-0 left-0 right-0 z-50 pointer-events-none p-4 pb-0'>
        <div className='max-w-xl mx-auto flex flex-col items-start gap-3'>
          
          {/* Header Area: Restored simple style */}
          <div className='flex items-center justify-between w-full'>
            <div className='flex flex-col'>
              <h1 className='text-3xl font-black text-black/80 tracking-tighter italic drop-shadow-sm'>
                Roma Explorer
              </h1>
              <span className='text-[9px] font-black text-slate-600/80 uppercase tracking-[0.3em] mt-0.5 ml-0.5'>
                Donna Alevtonna edition
              </span>
            </div>
            <div className='px-4 py-1.5 bg-white/40 backdrop-blur-md rounded-full border border-white/40 shadow-sm'>
              <span className='text-[10px] font-black text-slate-500 uppercase tracking-wider'>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>

          {/* Search Wrapper: Stays LEFT on all screens */}
          <div className={`pointer-events-auto relative z-30 transition-all duration-300 ease-in-out ${
            searchOpen || searchQuery ? 'w-full' : 'w-11'
          }`}>
            <div 
              className={`
                relative flex items-center bg-white shadow-xl border border-black/5 h-11 transition-all duration-300 
                ${searchOpen || searchQuery ? 'px-4 gap-2.5 rounded-full' : 'px-0 justify-center rounded-full'}
              `}
              onClick={() => {
                if (!searchOpen) {
                  setSearchOpen(true);
                  setTimeout(() => searchInputRef.current?.focus(), 150);
                }
              }}
            >
              <Search className={`size-6 shrink-0 transition-colors duration-300 ${searchOpen ? 'text-slate-400' : 'text-slate-500'}`} />
              
              <input
                ref={searchInputRef}
                type='text'
                placeholder='Search sights...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
                className={`
                  bg-transparent text-lg font-medium text-slate-800 placeholder:text-slate-300 outline-none transition-all duration-300
                  ${searchOpen || searchQuery ? 'opacity-100 w-full ml-2' : 'opacity-0 w-0 pointer-events-none'}
                `}
              />

              {(searchOpen || searchQuery) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    setSearchOpen(false);
                  }}
                  className='p-1.5 hover:bg-slate-100 rounded-full transition-colors shrink-0'
                >
                  <X className='size-5 text-slate-400' />
                </button>
              )}
            </div>

            {/* Results Dropdown: Restored simple style */}
            {searchOpen && searchResults.length > 0 && (
              <div className='absolute top-full left-0 right-0 mt-3 bg-white/98 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-black/5 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-top-4 duration-300 z-50'>
                <div className='max-h-[60vh] overflow-y-auto py-3 overscroll-contain'>
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        handleResultSelect(item);
                      }}
                      className='w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0'
                    >
                      <div className='shrink-0'>
                        {typeof item.id === 'string' && item.id.startsWith('z') ? (
                          <div className='bg-blue-500 p-2.5 rounded-2xl'>
                            <ShoppingBag className='size-4.5 text-white' />
                          </div>
                        ) : item.id === 'home' ? (
                          <div className='bg-rose-600 p-2.5 rounded-2xl'>
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3.5' className='size-4.5 text-white'>
                              <polyline points='5 12 3 12 12 3 21 12 19 12' /><path d='M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7' /><path d='M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6' />
                            </svg>
                          </div>
                        ) : (
                          <div className='bg-slate-900 p-2.5 rounded-2xl'>
                            <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2.5' className='size-4.5 text-white'>
                              <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' /><circle cx='12' cy='10' r='3' />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='font-bold text-base text-slate-800 truncate'>{item.name}</div>
                        {'address' in item && item.address && (
                          <div className='text-xs text-slate-400 font-medium truncate mt-0.5'>{item.address}</div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {searchOpen && (
        <div
          className='fixed inset-0 z-40 bg-slate-900/5 backdrop-blur-[2px] animate-in fade-in duration-500'
          onClick={() => setSearchOpen(false)}
        />
      )}
    </>

  );
}
