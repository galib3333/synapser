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

  const getGoogleMapsUrl = (): string => {
    return `https://www.google.com/maps?q=${spot.lat},${spot.lng}`;
  };

  const wikiUrl = getWikipediaUrl();

  return (
    <div className="panel-enter fixed inset-0 z-50 flex flex-col bg-bg-primary/98 backdrop-blur-md overflow-y-auto">
      <div className="sticky top-0 z-10 bg-bg-primary/90 backdrop-blur-sm border-b border-accent/10 px-6 sm:px-10 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-mono text-accent/60 hover:text-accent transition-colors uppercase tracking-wider"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to list
          </button>
          <span className="text-xs font-mono text-accent/30">{locationName}</span>
      </div>

      <div className="flex-1 px-6 sm:px-10 py-8 max-w-3xl mx-auto w-full">
        {/* Hero image area */}
        <div className="w-full aspect-video bg-bg-secondary border border-accent/5 mb-8 overflow-hidden relative">
          {spot.image ? (
            <img
              src={spot.image}
              alt={spot.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl opacity-20">{getCategoryIcon(spot.category)}</span>
            </div>
          )}
          <div className="absolute top-4 left-4 flex items-center gap-2">
            <span className="px-3 py-1.5 bg-bg-primary/80 backdrop-blur-sm text-xs font-mono uppercase tracking-wider text-accent/70 border border-accent/10">
              {getCategoryIcon(spot.category)} {getCategoryLabel(spot.category)}
            </span>
          </div>
        </div>

        {/* Title & Info */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-accent font-sans tracking-tight mb-3">
            {spot.name}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm font-mono text-accent/40">
            <span className="flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              {spot.lat.toFixed(4)}, {spot.lng.toFixed(4)}
            </span>
            <a
              href={getGoogleMapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-accent/60 hover:text-accent transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
              Open in Maps
            </a>
            {wikiUrl && (
              <a
                href={wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-accent/60 hover:text-accent transition-colors"
              >
                Wikipedia →
              </a>
            )}
          </div>
        </div>

        {/* Description */}
        {spot.description && (
          <div className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-accent/40 mb-3">About</h2>
            <p className="text-base text-accent/70 leading-relaxed font-sans">
              {spot.description}
            </p>
          </div>
        )}

        {/* Cuisine / Food tags */}
        {spot.cuisine && spot.cuisine.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-accent/40 mb-3">🍳 Cuisine & Food Here</h2>
            <div className="flex flex-wrap gap-2">
              {spot.cuisine.map((food, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-accent/5 border border-accent/10 text-sm font-mono text-accent/60"
                >
                  {food}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Nearby Food */}
        <div className="mb-8">
          <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-accent/40 mb-3">🍽️ Nearby Food & Local Eats</h2>
          {foodLoading ? (
            <div className="flex items-center gap-2 py-4">
              <div className="w-32 h-[1px] bg-accent/10 overflow-hidden">
                <div className="load-bar h-full bg-accent/40" />
              </div>
              <span className="text-[10px] font-mono text-accent/30">Finding local food...</span>
            </div>
          ) : nearbyFood.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {nearbyFood.map((food, i) => (
                <span
                  key={i}
                  className="px-3 py-1.5 bg-bg-secondary border border-accent/5 text-sm font-mono text-accent/50"
                >
                  {food}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm font-mono text-accent/30 py-2">
              No food data found nearby. This area may have local gems not yet mapped!
            </p>
          )}
        </div>

        {/* Tags */}
        {Object.keys(spot.tags).length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs font-mono uppercase tracking-[0.2em] text-accent/40 mb-3">📍 Map Data</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(spot.tags)
                .filter(([k]) => !k.startsWith('name') && !k.startsWith('description') && k !== 'image' && !k.startsWith('wikipedia') && !k.startsWith('wikimedia'))
                .slice(0, 12)
                .map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 py-1.5 border-b border-accent/5">
                    <span className="text-xs font-mono text-accent/30 shrink-0">{key}:</span>
                    <span className="text-sm font-mono text-accent/50 break-all">{value}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
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
    <div className="panel-enter fixed bottom-0 left-0 right-0 z-40 max-h-[65vh] overflow-hidden">
      <div className="absolute inset-0 bg-bg-primary/95 backdrop-blur-md border-t border-accent/10" />

      <div className="relative h-full flex flex-col">
        <div className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-accent/10">
          <div className="flex items-center gap-4">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-accent font-sans">
              {locationName || 'Exploring'}
            </h2>
            <span className="text-sm font-mono text-accent/40 tracking-wider">
              {spots.length} spots
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border border-accent/20 text-accent/60 hover:text-accent hover:border-accent/40 transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 sm:px-10 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="w-48 h-[2px] bg-accent/10 overflow-hidden">
                <div className="load-bar h-full bg-accent/60" />
              </div>
              <span className="text-sm font-mono text-accent/40 tracking-wider uppercase">
                Discovering places...
              </span>
            </div>
          ) : spots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <span className="text-4xl">🌍</span>
              <p className="text-base text-accent/40 font-mono">
                No tourist spots found in this area
              </p>
              <p className="text-sm text-accent/30 font-mono">
                Try clicking a city or town on the globe
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {categories.map((category) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-base">{getCategoryIcon(category)}</span>
                    <h3 className="text-sm uppercase tracking-[0.2em] font-mono text-accent/50">
                      {getCategoryLabel(category)}
                    </h3>
                    <span className="text-xs font-mono text-accent/30">
                      ({groupedSpots[category].length})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {groupedSpots[category].slice(0, 9).map((spot) => (
                      <button
                        key={spot.id}
                        className="group flex items-start gap-3 p-3 border border-accent/5 hover:border-accent/20 hover:bg-accent/5 transition-all duration-300 text-left cursor-pointer"
                        onClick={() => onSpotSelect(spot)}
                      >
                        <div className="w-10 h-10 flex items-center justify-center bg-accent/5 shrink-0 mt-0.5">
                          <span className="text-base">{getCategoryIcon(spot.category)}</span>
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-base font-semibold text-accent truncate group-hover:text-white transition-colors">
                            {spot.name}
                          </h4>
                          {spot.description && (
                            <p className="text-sm text-accent/30 truncate mt-0.5 line-clamp-1">
                              {spot.description}
                            </p>
                          )}
                          <span className="text-xs text-accent/20 font-mono mt-1 inline-block">
                            View details →
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                  {groupedSpots[category].length > 9 && (
                    <p className="text-xs font-mono text-accent/20 mt-2">
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
