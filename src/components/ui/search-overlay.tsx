import { useState, useMemo, useRef } from 'react';
import { Search, X, Loader2, Locate, Trash2, ShoppingBag, LocateFixed } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SIGHTS, ALYA_SHOPPING, HOME_LOCATION, type LocationItem } from '@/lib/data';
import { haversineDistance, formatDistance } from '@/lib/geo';
import { type PinMode } from '@/hooks/use-routing';

interface SearchOverlayProps {
  gpsLocation: [number, number] | null;
  onResultClick: (item: LocationItem) => void;
  pinMode: PinMode;
  setPinMode: (m: PinMode) => void;
  isLocating: boolean;
  handleLocate: () => void;
  hasAnyPin: boolean;
  handleClearRoute: () => void;
  gpsError: string | null;
}

export function SearchOverlay({
  gpsLocation,
  onResultClick,
  pinMode,
  setPinMode,
  isLocating,
  handleLocate,
  hasAnyPin,
  handleClearRoute,
  gpsError
}: SearchOverlayProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
      {/* ── Overlay UI (Search + Date + Pin Controls) ── */}
      <div className='absolute top-0 left-0 right-0 z-10 pointer-events-none'>
        {/* Top-safe padded container */}
        <div className='flex flex-col gap-3 p-4 sm:p-6 sm:max-w-md'>
          {/* Header row: Rome + Date badge */}
          <header className='flex items-center justify-between'>
            <div>
              <h1 className='text-3xl font-black text-black tracking-tighter drop-shadow-sm flex items-center gap-2 italic'>
                Roma Explorer
              </h1>
            </div>
            <div className='flex items-center gap-2'>
              <Badge
                variant='outline'
                className='border-zinc-200 text-zinc-500 bg-white/50 px-3 py-1 text-[10px] uppercase font-bold tracking-wider rounded-full'
              >
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Badge>
            </div>
          </header>

          {/* ── Search Bar ── */}
          <div
            className={`pointer-events-auto self-start relative z-30 transition-all duration-300 ease-in-out ${
              isSearchFocused || searchQuery
                ? 'w-full max-w-md'
                : 'w-11 sm:w-full sm:max-w-md'
            }`}
          >
            <div className='relative'>
              <div
                className={`flex items-center bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-white/60 ring-1 ring-black/5 h-11 transition-all duration-300 ${
                  isSearchFocused || searchQuery ? 'px-4 gap-2.5' : 'px-3 gap-0'
                }`}
              >
                <Search
                  className='size-4 text-slate-400 shrink-0 cursor-pointer'
                  onClick={() => searchInputRef.current?.focus()}
                />
                <input
                  ref={searchInputRef}
                  type='text'
                  placeholder='Search sights...'
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    setSearchOpen(true);
                    setIsSearchFocused(true);
                  }}
                  onBlur={() => setIsSearchFocused(false)}
                  className={`flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 outline-none transition-opacity duration-200 ${
                    isSearchFocused || searchQuery
                      ? 'opacity-100 w-full'
                      : 'opacity-0 w-0 pointer-events-none sm:opacity-100 sm:w-full sm:pointer-events-auto'
                  }`}
                />
                {searchQuery && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSearchOpen(false);
                    }}
                    className='p-0.5 hover:bg-slate-100 rounded-full transition-colors'
                  >
                    <X className='size-3.5 text-slate-400' />
                  </button>
                )}
              </div>

              {/* Search Results Dropdown */}
              {searchOpen && searchResults.length > 0 && (
                <div className='absolute top-full left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-white/60 ring-1 ring-black/5 overflow-hidden max-h-64 overflow-y-auto'>
                  {searchResults.map((item) => {
                    const dist = gpsLocation
                      ? haversineDistance(gpsLocation, item.coords)
                      : null;
                    const isShop =
                      typeof item.id === 'string' && item.id.startsWith('z');

                    return (
                      <button
                        key={item.id}
                        onPointerDown={(e) => {
                          e.preventDefault();
                          handleResultSelect(item);
                        }}
                        className='w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-b-0'
                      >
                        <div className='shrink-0'>
                          {isShop ? (
                            <div className='bg-blue-500 p-2 rounded-xl shadow-sm'>
                              <ShoppingBag className='size-3.5 text-white' />
                            </div>
                          ) : item.id === 'home' ? (
                            <div className='bg-rose-600 p-2 rounded-full shadow-sm'>
                              <svg
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2.5'
                                className='size-3.5 text-white'
                              >
                                <polyline points='5 12 3 12 12 3 21 12 19 12' />
                                <path d='M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7' />
                                <path d='M9 21v-6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v6' />
                              </svg>
                            </div>
                          ) : (
                            <div className='bg-slate-900 p-2 rounded-xl shadow-sm'>
                              <svg
                                viewBox='0 0 24 24'
                                fill='none'
                                stroke='currentColor'
                                strokeWidth='2'
                                className='size-3.5 text-white'
                              >
                                <path d='M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' />
                                <circle cx='12' cy='10' r='3' />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='font-bold text-sm text-slate-800 truncate'>
                            {item.name}
                          </div>
                          {'address' in item && item.address && (
                            <div className='text-[10px] text-slate-400 truncate'>
                              {item.address}
                            </div>
                          )}
                        </div>
                        {dist && (
                          <div className='text-[9px] font-bold text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-0.5 rounded-md'>
                            {formatDistance(dist)} auto
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Toolbar ── */}
          <div className='pointer-events-auto flex flex-wrap gap-2'>
            {/* Start Pin Button */}
            <button
              onClick={() =>
                setPinMode(pinMode === 'setA' ? 'idle' : 'setA')
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all shadow-lg ${
                pinMode === 'setA'
                  ? 'bg-orange-500 text-white border-orange-400 shadow-orange-500/30 scale-105'
                  : 'bg-white/90 backdrop-blur-md text-orange-600 border-white/60 hover:bg-orange-50'
              }`}
            >
              <div
                className={`size-4 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${
                  pinMode === 'setA'
                    ? 'bg-white text-orange-500 border-white'
                    : 'bg-orange-500 text-white border-orange-400'
                }`}
              >
                A
              </div>
              Set Start
            </button>

            {/* End Pin Button */}
            <button
              onClick={() =>
                setPinMode(pinMode === 'setB' ? 'idle' : 'setB')
              }
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold transition-all shadow-lg ${
                pinMode === 'setB'
                  ? 'bg-blue-600 text-white border-blue-500 shadow-blue-600/30 scale-105'
                  : 'bg-white/90 backdrop-blur-md text-blue-600 border-white/60 hover:bg-blue-50'
              }`}
            >
              <div
                className={`size-4 rounded-full flex items-center justify-center text-[9px] font-black border-2 ${
                  pinMode === 'setB'
                    ? 'bg-white text-blue-600 border-white'
                    : 'bg-blue-600 text-white border-blue-500'
                }`}
              >
                B
              </div>
              Set End
            </button>

            {/* Locate Button */}
            <button
              onClick={handleLocate}
              disabled={isLocating}
              className='flex items-center gap-1.5 px-3 py-2 rounded-full text-[11px] font-bold bg-white/90 backdrop-blur-md text-slate-600 border border-white/60 shadow-lg hover:bg-slate-50 transition-all disabled:opacity-50'
            >
              {isLocating ? (
                <Loader2 className='size-3.5 animate-spin' />
              ) : (
                <Locate className='size-3.5' />
              )}
              <span className='hidden sm:inline'>Locate</span>
            </button>

            {/* Clear Button */}
            {hasAnyPin && (
              <button
                onClick={handleClearRoute}
                className='flex items-center gap-1 px-3 py-2 rounded-full text-[11px] font-bold bg-white border border-red-200 text-red-500 shadow-lg hover:bg-red-50 transition-all animate-in fade-in zoom-in-95 duration-200'
              >
                <Trash2 className='size-3' />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* GPS Error Toast */}
        {gpsError && (
          <div className='pointer-events-auto px-4 sm:px-6 w-full max-w-sm mb-3 animate-in slide-in-from-top-4 duration-300'>
            <div className='flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl shadow-lg'>
              <LocateFixed className='size-4 shrink-0 mt-0.5' />
              <div className='flex-1'>
                <p className='text-[11px] font-bold uppercase tracking-wider mb-0.5'>
                  Location Error
                </p>
                <p className='text-[13px] font-medium leading-relaxed opacity-90'>
                  {gpsError}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {searchOpen && (
        <div
          className='fixed inset-0 z-5'
          onClick={() => setSearchOpen(false)}
        />
      )}
    </>
  );
}
