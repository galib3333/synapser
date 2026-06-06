'use client';

import { TouristSpot, getCategoryIcon, getCategoryLabel, fetchNearbyFood } from '@/lib/api';
import { useState, useEffect } from 'react';

interface LocationPanelProps {
  spots: TouristSpot[];
  loading: boolean;
  locationName: string;
  onClose: () => void;
  onSpotSelect: (spot: TouristSpot) => void;
  selectedSpot: TouristSpot | null;
  onSpotDeselect: () => void;
}

function SpotDetail({ spot, onBack, locationName }: { spot: TouristSpot; onBack: () => void; locationName: string }) {
  const [nearbyFood, setNearbyFood] = useState<string[]>([]);
  const [foodLoading, setFoodLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setFoodLoading(true);
    fetchNearbyFood(spot.lat, spot.lng, 2).then((food) => {
      setNearbyFood(food);
      setFoodLoading(false);
    });
  }, [spot.lat, spot.lng]);

  const getWikipediaUrl = (): string | null => {
    const wikiKey = Object.keys(spot.tags).find((k) => k.startsWith('wikipedia'));
    if (wikiKey && spot.tags[wikiKey]) {
      const val = spot.tags[wikiKey];
      if (val.startsWith('http')) return val;
      return `https://en.wikipedia.org/wiki/${encodeURIComponent(val.replace(' ', '_'))}`;
    }
    return null;
  };

  const wikiUrl = getWikipediaUrl();

  const tagEntries = Object.entries(spot.tags)
    .filter(([k]) => !k.startsWith('name') && !k.startsWith('description') && k !== 'image' && !k.startsWith('wikipedia') && !k.startsWith('wikimedia'))
    .slice(0, 10);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg-primary overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg-primary/80 backdrop-blur-xl border-b border-accent/5 px-6 sm:px-10 py-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-mono text-accent/50 hover:text-accent transition-colors uppercase tracking-wider group"
        >
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            className="group-hover:-translate-x-0.5 transition-transform"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </button>
        <span className="text-xs font-mono text-accent/20 truncate max-w-[200px] sm:max-w-none">
          {locationName}
        </span>
      </div>

      <div className="w-full max-w-4xl mx-auto px-6 sm:px-10 py-6 sm:py-10">
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] mb-10 overflow-hidden bg-bg-secondary border border-accent/5 group">
          {spot.image ? (
            <>
              <img
                src={spot.image}
                alt={spot.name}
                className={`w-full h-full object-cover transition-all duration-700 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                onLoad={() => setImageLoaded(true)}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg-primary via-bg-primary/10 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-bg-secondary to-bg-primary">
              <span className="text-7xl sm:text-8xl opacity-10 select-none">
                {getCategoryIcon(spot.category)}
              </span>
            </div>
          )}
          <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 flex items-center gap-3">
            <span className="px-3 py-1.5 bg-bg-primary/90 backdrop-blur-sm text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-accent/70 border border-accent/5 flex items-center gap-1.5">
              {getCategoryIcon(spot.category)} {getCategoryLabel(spot.category)}
            </span>
          </div>
        </div>

        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-accent font-sans tracking-tight leading-tight mb-4">
            {spot.name}
          </h1>
          <p className="text-sm font-mono text-accent/30 tracking-wider flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8 mb-10">
          <div className="sm:col-span-2">
            {spot.description && (
              <div className="mb-8">
                <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent/30 mb-3">About</h2>
                <p className="text-base sm:text-lg text-accent/70 leading-relaxed font-sans">
                  {spot.description}
                </p>
              </div>
            )}

            {wikiUrl && (
              <a
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-mono text-accent/40 hover:text-accent transition-colors border border-accent/10 hover:border-accent/30 px-4 py-2.5 group"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Read on Wikipedia
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </a>
            )}
          </div>

          <div className="space-y-4">
            <a
              href={`https://www.google.com/maps?q=${spot.lat},${spot.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 border border-accent/5 hover:border-accent/20 bg-accent/5 group transition-all duration-300"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <p className="text-sm font-mono text-accent/60 group-hover:text-accent transition-colors">Open in Maps</p>
                <p className="text-[10px] font-mono text-accent/20">Google Maps</p>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto shrink-0 group-hover:translate-x-0.5 transition-transform">
                <path d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
            </a>
          </div>
        </div>

        {spot.cuisine && spot.cuisine.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent/30 mb-3 flex items-center gap-2">
              <span>Cuisine</span>
              <span className="flex-1 h-px bg-accent/5" />
            </h2>
            <div className="flex flex-wrap gap-2">
              {spot.cuisine.map((food, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 text-sm font-mono text-accent/60 border border-accent/10 bg-accent/5"
                >
                  {food}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mb-10">
          <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent/30 mb-3 flex items-center gap-2">
            <span>Nearby Food & Eats</span>
            <span className="flex-1 h-px bg-accent/5" />
          </h2>
          {foodLoading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-32 h-[1px] bg-accent/10 overflow-hidden">
                <div className="load-bar h-full bg-accent/40" />
              </div>
              <span className="text-[10px] font-mono text-accent/20">Discovering local food...</span>
            </div>
          ) : nearbyFood.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {nearbyFood.map((food, i) => (
                <div
                  key={i}
                  className="px-3 py-2.5 border border-accent/5 bg-accent/5 text-sm font-mono text-accent/50 hover:bg-accent/10 hover:border-accent/20 transition-all duration-200"
                >
                  {food}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-sm font-mono text-accent/20 italic">
                No food data found nearby. This area may have local gems not yet mapped!
              </p>
            </div>
          )}
        </div>

        {tagEntries.length > 0 && (
          <div className="mb-10">
            <h2 className="text-[10px] font-mono uppercase tracking-[0.25em] text-accent/30 mb-3 flex items-center gap-2">
              <span>Map Data</span>
              <span className="flex-1 h-px bg-accent/5" />
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tagEntries.map(([key, value]) => (
                <div key={key} className="flex items-center gap-2 py-2 px-3 border border-accent/5 bg-bg-secondary/30">
                  <span className="text-[10px] font-mono text-accent/20 uppercase tracking-wider shrink-0">{key}</span>
                  <span className="text-sm font-mono text-accent/50 truncate">{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sticky bottom-0 bg-bg-primary/80 backdrop-blur-xl border-t border-accent/5 px-6 sm:px-10 py-3 flex justify-center">
        <button
          onClick={onBack}
          className="text-xs font-mono text-accent/30 hover:text-accent/60 transition-colors uppercase tracking-[0.2em]"
        >
          ← Back to all spots
        </button>
      </div>
    </div>
  );
}

export default function LocationPanel({
  spots,
  loading,
  locationName,
  onClose,
  onSpotSelect,
  selectedSpot,
  onSpotDeselect,
}: LocationPanelProps) {
  if (selectedSpot) {
    return <SpotDetail spot={selectedSpot} onBack={onSpotDeselect} locationName={locationName} />;
  }

  const groupedSpots = spots.reduce(
    (acc, spot) => {
      if (!acc[spot.category]) acc[spot.category] = [];
      acc[spot.category].push(spot);
      return acc;
    },
    {} as Record<string, TouristSpot[]>
  );

  const categories = Object.keys(groupedSpots).sort(
    (a, b) => groupedSpots[b].length - groupedSpots[a].length
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 max-h-[65vh] overflow-hidden">
      <div className="absolute inset-0 bg-bg-primary/95 backdrop-blur-xl border-t border-accent/5" />

      <div className="relative h-full flex flex-col">
        <div className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-accent/5">
          <div className="flex items-center gap-4 min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-tight text-accent font-sans truncate">
              {locationName || 'Exploring'}
            </h2>
            <span className="text-xs font-mono text-accent/20 tracking-wider shrink-0">
              {spots.length} {spots.length === 1 ? 'spot' : 'spots'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center border border-accent/10 text-accent/40 hover:text-accent hover:border-accent/30 transition-all shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-4 sm:px-10 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-48 h-[2px] bg-accent/5 overflow-hidden">
                <div className="load-bar h-full bg-accent/40" />
              </div>
              <span className="text-xs font-mono text-accent/20 tracking-wider uppercase">
                Discovering places...
              </span>
            </div>
          ) : spots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <span className="text-3xl opacity-20">⊙</span>
              <p className="text-sm text-accent/30 font-mono">No tourist spots found in this area</p>
              <p className="text-xs text-accent/20 font-mono">Try clicking a city or town on the globe</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <span className="text-sm">{getCategoryIcon(category)}</span>
                    <h3 className="text-[10px] uppercase tracking-[0.2em] font-mono text-accent/30">
                      {getCategoryLabel(category)}
                    </h3>
                    <span className="text-[10px] font-mono text-accent/10">
                      {groupedSpots[category].length}
                    </span>
                    <span className="flex-1 h-px bg-accent/5" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {groupedSpots[category].slice(0, 9).map((spot) => (
                      <button
                        key={spot.id}
                        className="group flex items-start gap-3 p-3 border border-accent/5 hover:border-accent/20 hover:bg-accent/[0.03] transition-all duration-200 text-left cursor-pointer"
                        onClick={() => onSpotSelect(spot)}
                      >
                        <div className="w-9 h-9 flex items-center justify-center bg-accent/5 shrink-0 mt-0.5">
                          <span className="text-sm">{getCategoryIcon(spot.category)}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-semibold text-accent/80 truncate group-hover:text-accent transition-colors">
                            {spot.name}
                          </h4>
                          {spot.description && (
                            <p className="text-xs text-accent/20 truncate mt-0.5">
                              {spot.description}
                            </p>
                          )}
                          <span className="text-[10px] text-accent/10 font-mono mt-1 inline-block group-hover:text-accent/30 transition-colors">
                            View →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {groupedSpots[category].length > 9 && (
                    <p className="text-[10px] font-mono text-accent/10 mt-1.5">
                      +{groupedSpots[category].length - 9} more
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
