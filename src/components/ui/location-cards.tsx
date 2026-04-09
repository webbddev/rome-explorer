import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, X, MapPin, Footprints, Locate, ShoppingBag, ExternalLink, Home as HomeIcon, Sparkles, Loader2 } from 'lucide-react';
import { formatDistance, haversineDistance } from '@/lib/geo';
import { HOME_LOCATION, type Sight, type Shop } from '@/lib/data';

interface LocationCardsProps {
  selectedSight: Sight | null;
  setSelectedSight: (s: Sight | null) => void;
  selectedShop: Shop | null;
  setSelectedShop: (s: Shop | null) => void;
  selectedHome: typeof HOME_LOCATION | null;
  setSelectedHome: (s: typeof HOME_LOCATION | null) => void;
  gpsLocation: [number, number] | null;
  handleStartHere: (coords: [number, number]) => void;
  handleWalkTo: (name: string, coords: [number, number]) => void;
}

export function LocationCards({
  selectedSight,
  setSelectedSight,
  selectedShop,
  setSelectedShop,
  selectedHome,
  setSelectedHome,
  gpsLocation,
  handleStartHere,
  handleWalkTo
}: LocationCardsProps) {
  const [funFacts, setFunFacts] = useState<Record<number | string, string>>({});
  const [isGenerating, setIsGenerating] = useState<number | string | null>(null);

  const handleGenerateFact = async (locationName: string, id: number | string) => {
    if (isGenerating) return;
    
    setIsGenerating(id);
    try {
      const response = await fetch('/api/fun-fact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locationName }),
      });

      if (!response.ok) throw new Error('Archives busy');

      const reader = response.body?.getReader();
      if (!reader) return;

      setFunFacts(prev => ({ ...prev, [id]: '' }));

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        
        // Parse Standard OpenAI SSE format: data: {"choices": [{"delta": {"content": "..."}}]}
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const data = JSON.parse(dataStr);
              const content = data.choices[0]?.delta?.content || '';
              if (content) {
                setFunFacts(prev => ({
                  ...prev,
                  [id]: (prev[id] || '') + content
                }));
              }
            } catch (e) {
              // Ignore partial JSON chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setFunFacts(prev => ({ ...prev, [id]: 'The archives are temporarily busy.' }));
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <>
          {/* Selected Sight Card */}
          {selectedSight ? (
            <Card className='w-full max-w-[24rem] mx-auto rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300'>
              <div className='relative h-40 sm:h-48 w-full group'>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedSight.image}
                  alt={selectedSight.name}
                  className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                />
                <div className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent' />
                <Badge
                  variant={selectedSight.isFree ? 'secondary' : 'destructive'}
                  className='absolute top-3 right-3 text-[9px] font-black px-2 py-0.5 h-5 bg-white/20 backdrop-blur-md border-white/30 text-white leading-none'
                >
                  {selectedSight.isFree ? 'FREE ENTRY' : 'PREMIUM'}
                </Badge>
                <button
                  onClick={() => setSelectedSight(null)}
                  className='absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-2 text-white/90 shadow-sm ring-1 ring-white/30 hover:bg-white/40 hover:text-white transition-all scale-100 hover:scale-105 active:scale-95 leading-none flex items-center justify-center'
                >
                  <X className='size-4' />
                </button>
                <div className='absolute bottom-4 left-4 right-4'>
                  <div className='flex items-center gap-2 mb-1.5'>
                    <h3 className='font-black text-xl text-white tracking-tight leading-tight'>
                      {selectedSight.name}
                    </h3>
                    {selectedSight.tripadvisorRating && (
                      <Badge className='bg-emerald-500/90 text-white border-none text-[8px] font-black px-1.5 py-0.5 h-auto leading-none'>
                        {selectedSight.tripadvisorRating >= 4.5
                          ? 'EXCEPTIONAL'
                          : 'TOP RATED'}
                      </Badge>
                    )}
                  </div>
                  {/* Rating info */}
                  {selectedSight.tripadvisorRating && (
                    <div className='flex items-center gap-2 mb-2'>
                      <div className='flex items-center gap-0.5'>
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`size-2.5 ${
                              i <
                              Math.floor(
                                selectedSight.tripadvisorRating ?? 0,
                              )
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      <span className='text-[10px] font-black text-white/90 tabular-nums'>
                        {selectedSight.tripadvisorRating}
                      </span>
                    </div>
                  )}
                  {/* Near Me distance */}
                  {gpsLocation && (
                    <span className='inline-flex items-center gap-1 text-[10px] font-bold text-white/80 bg-white/15 backdrop-blur-md px-2 py-0.5 rounded-full'>
                      <Locate className='size-2.5' />
                      {formatDistance(
                        haversineDistance(gpsLocation, selectedSight.coords),
                      )}{' '}
                      from you
                    </span>
                  )}
                </div>
              </div>
              <div className='p-5 sm:p-6 bg-white'>
                <p className='text-slate-600 text-[13px] leading-relaxed mb-4 italic font-medium'>
                  &quot;{selectedSight.description}&quot;
                </p>

                {/* AI Fun Fact Section */}
                <div className='mb-6 p-4 rounded-2xl bg-slate-50 border border-slate-100/50 group/fact relative overflow-hidden'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='flex items-center gap-2'>
                      <Sparkles className='size-3.5 text-amber-500 animate-pulse' />
                      <span className='text-[10px] font-black text-slate-400 uppercase tracking-widest'>
                        Интересный факт
                      </span>
                    </div>
                    {!funFacts[selectedSight.id] && !isGenerating && (
                      <button
                        onClick={() => handleGenerateFact(selectedSight.name, selectedSight.id)}
                        className='text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1'
                      >
                        Узнать <span className='hidden sm:inline'>факт</span>
                      </button>
                    )}
                  </div>
                  
                  {isGenerating === selectedSight.id ? (
                    <div className='flex items-center gap-2 py-1'>
                      <Loader2 className='size-3 animate-spin text-slate-400' />
                      <span className='text-xs text-slate-400 font-medium animate-pulse'>
                        Ищем в архивах...
                      </span>
                    </div>
                  ) : funFacts[selectedSight.id] ? (
                    <p className='text-[12px] text-slate-700 font-serif italic leading-relaxed animate-in fade-in slide-in-from-left-2 duration-700'>
                      &quot;{funFacts[selectedSight.id]}&quot;
                    </p>
                  ) : (
                    <p className='text-[11px] text-slate-300 font-medium italic'>
                      Нажмите, чтобы раскрыть тайную историю этого места...
                    </p>
                  )}
                </div>

                {/* TripAdvisor Link */}
                {selectedSight.tripadvisorUrl && (
                  <a
                    href={selectedSight.tripadvisorUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-6 border-b border-emerald-100 hover:border-emerald-600 transition-all pb-0.5'
                  >
                    <ExternalLink className='size-3' />
                    Visit on TripAdvisor
                  </a>
                )}
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='flex-1 h-9 sm:h-10 text-[11px] font-bold rounded-xl border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm'
                    onClick={() => handleStartHere(selectedSight.coords)}
                  >
                    <MapPin className='size-3.5 mr-1.5 text-orange-500' /> Start
                    Here
                  </Button>
                  <Button
                    size='sm'
                    className='flex-1 h-9 sm:h-10 text-[11px] font-bold rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/25'
                    onClick={() => {
                      handleWalkTo(selectedSight.name, selectedSight.coords);
                      setSelectedSight(null);
                    }}
                  >
                    <Footprints className='size-3.5 mr-1.5' /> Walk To
                  </Button>
                </div>
              </div>
            </Card>
          ) : selectedShop ? (
            <Card className='w-full max-w-[24rem] mx-auto rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300'>
              {selectedShop.image ? (
                <div className='relative h-40 sm:h-48 w-full group'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedShop.image}
                    alt={selectedShop.name}
                    className='w-full h-full object-cover transition-transform duration-700 group-hover:scale-105'
                  />
                  <div className='absolute inset-0 bg-linear-to-t from-black/60 to-transparent' />
                  <Badge className='absolute top-3 right-3 bg-white/90 text-black text-[9px] font-black tracking-widest px-1.5 py-0.5 h-auto leading-none border-none shadow-md'>
                    LIMITED ED
                  </Badge>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className='absolute top-3 left-3 bg-white/20 backdrop-blur-md rounded-full p-2 text-white/90 shadow-sm ring-1 ring-white/30 hover:bg-white/40 hover:text-white transition-all scale-100 hover:scale-105 active:scale-95 leading-none flex items-center justify-center'
                  >
                    <X className='size-4' />
                  </button>
                  <div className='absolute bottom-4 left-4 right-4'>
                    <div className='flex items-center gap-3'>
                      <div className='bg-white/20 p-2 rounded-xl backdrop-blur-md shadow-inner border border-white/20'>
                        <ShoppingBag className='size-4 text-white' />
                      </div>
                      <div className='flex flex-col'>
                        <h3 className='font-black text-lg text-white tracking-tight leading-tight italic'>
                          {selectedShop.name}
                        </h3>
                        {gpsLocation && (
                          <span className='text-[10px] font-bold text-white/70'>
                            {formatDistance(
                              haversineDistance(
                                gpsLocation,
                                selectedShop.coords,
                              ),
                            )}{' '}
                            away
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='bg-black p-4 sm:p-5 flex items-center justify-between relative text-white group'>
                  <div className='absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none' />
                  <div className='flex items-center gap-3'>
                    <div className='bg-white/20 p-2.5 rounded-xl backdrop-blur-md shadow-inner'>
                      <ShoppingBag className='size-4.5 text-white' />
                    </div>
                    <div className='flex flex-col'>
                      <h3 className='font-black text-sm sm:text-base uppercase italic tracking-[0.2em] text-white pr-4'>
                        {selectedShop.name}
                      </h3>
                      <div className='flex items-center gap-2 mt-1'>
                        <Badge className='bg-white/90 text-black text-[8px] sm:text-[9px] font-black tracking-widest px-1.5 py-0 w-fit shadow-sm'>
                          LIMITED ED
                        </Badge>
                        {gpsLocation && (
                          <span className='text-[9px] font-bold text-white/60'>
                            {formatDistance(
                              haversineDistance(
                                gpsLocation,
                                selectedShop.coords,
                              ),
                            )}{' '}
                            away
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedShop(null)}
                    className='absolute top-2 right-2 rounded-full p-1.5 text-white/50 hover:text-white bg-white/0 hover:bg-white/10 transition-all scale-100 hover:scale-105 active:scale-95 flex items-center justify-center'
                  >
                    <X className='size-4' />
                  </button>
                </div>
              )}
              <div className='p-5 sm:p-6 bg-white'>
                <p className='text-zinc-600 text-[13px] italic mb-6 leading-relaxed font-medium'>
                  &quot;{selectedShop.description}&quot;
                </p>
                <div className='flex gap-2'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='flex-1 h-9 sm:h-10 text-[10px] font-black uppercase tracking-widest rounded-xl border-zinc-200 shadow-sm'
                    onClick={() => handleStartHere(selectedShop.coords)}
                  >
                    <MapPin className='size-3.5 mr-1.5 text-orange-500' /> Start
                  </Button>
                  <Button
                    size='sm'
                    className='flex-1 h-9 sm:h-10 text-[10px] font-black uppercase tracking-widest rounded-xl bg-black text-white hover:bg-zinc-800 shadow-lg shadow-black/20'
                    onClick={() => {
                      handleWalkTo(selectedShop.name, selectedShop.coords);
                      setSelectedShop(null);
                    }}
                  >
                    <Footprints className='size-3.5 mr-1.5' /> Walk To
                  </Button>
                </div>
              </div>
            </Card>
          ) : selectedHome ? (
            <Card className='pointer-events-auto w-full max-w-[24rem] mx-auto rounded-[2rem] overflow-hidden shadow-2xl bg-white border-none ring-1 ring-black/5 animate-in slide-in-from-bottom-8 duration-300'>
              <div className='p-6 flex flex-col'>
                <div className='flex items-start justify-between mb-1'>
                  <div className='flex items-center gap-3'>
                    <div className='bg-rose-50 p-2.5 rounded-2xl border border-rose-100 shadow-sm'>
                      <HomeIcon className='size-5 text-rose-600' />
                    </div>
                    <div className='flex flex-col'>
                      <h3 className='font-black text-xl text-slate-800 tracking-tight leading-none italic'>
                        {selectedHome.name === 'Home' ? 'La Nostra Casa' : selectedHome.name}
                      </h3>
                      <span className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5'>
                        Home sweet home
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedHome(null)}
                    className='bg-slate-50 text-slate-400 hover:text-slate-600 p-2 rounded-full transition-colors'
                  >
                    <X className='size-4' />
                  </button>
                </div>

                <p className='text-xs text-slate-500 font-medium my-5 leading-relaxed italic'>
                  {selectedHome.address}
                </p>

                <div className='flex gap-2.5'>
                  <Button
                    size='sm'
                    variant='outline'
                    className='flex-1 h-11 text-[11px] font-bold rounded-2xl border-slate-200 hover:bg-slate-50 shadow-sm'
                    onClick={() => {
                      handleStartHere(selectedHome.coords);
                      setSelectedHome(null);
                    }}
                  >
                    <MapPin className='size-3.5 mr-1.5 text-rose-500' /> Start Here
                  </Button>
                  <Button
                    size='sm'
                    className='flex-1 h-11 text-[11px] font-bold rounded-2xl bg-slate-900 hover:bg-black text-white shadow-lg shadow-black/10'
                    onClick={() => {
                      handleWalkTo('Home', selectedHome.coords);
                      setSelectedHome(null);
                    }}
                  >
                    <Footprints className='size-3.5 mr-1.5 text-rose-400' /> Walk To Home
                  </Button>
                </div>
              </div>
            </Card>
          ) : null}
    </>
  );
}
