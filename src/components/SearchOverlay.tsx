'use client';

import { useState } from 'react';

interface SearchOverlayProps {
  isOpen: boolean;
  onSearch: (query: string) => void;
  onClose: () => void;
}

const POPULAR_PLACES = [
  // Bangladesh
  { name: 'Dhaka', lat: 23.8103, lng: 90.4125 },
  { name: 'Chittagong', lat: 22.3569, lng: 91.7832 },
  { name: 'Cox\'s Bazar', lat: 21.4272, lng: 92.006 },
  { name: 'Sylhet', lat: 24.8949, lng: 91.8687 },
  { name: 'Rangamati', lat: 22.6333, lng: 92.2 },
  { name: 'Bandarban', lat: 22.1953, lng: 92.2184 },
  { name: 'Sundarbans', lat: 21.9497, lng: 89.1833 },
  { name: 'Rajshahi', lat: 24.3636, lng: 88.6241 },
  { name: 'Khulna', lat: 22.8456, lng: 89.5403 },
  { name: 'Comilla', lat: 23.461, lng: 91.1809 },
  // World
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357 },
  { name: 'Kathmandu', lat: 27.7172, lng: 85.324 },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639 },
];

export default function SearchOverlay({
  isOpen,
  onSearch,
  onClose,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleQuickSelect = (place: (typeof POPULAR_PLACES)[0]) => {
    onSearch(place.name);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="absolute inset-0 bg-bg-primary/80 backdrop-blur-sm" onClick={onClose} />

      <div className="panel-enter relative w-full max-w-xl mx-4">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center border border-accent/20 bg-bg-primary/90 backdrop-blur-md">
            <svg
              className="ml-4 text-accent/40"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a place..."
              autoFocus
              className="flex-1 bg-transparent px-4 py-4 sm:py-5 text-accent font-mono text-base sm:text-lg placeholder:text-accent/30 outline-none"
            />
            <button
              type="submit"
              className="px-5 py-4 sm:py-5 text-sm font-mono uppercase tracking-wider text-accent/60 hover:text-accent border-l border-accent/10 transition-colors"
            >
              Go
            </button>
          </div>
        </form>

        <div className="mt-4 px-2">
          <p className="text-xs font-mono text-accent/40 uppercase tracking-[0.2em] mb-4">
            Popular destinations
          </p>
          <div className="flex flex-wrap gap-2.5">
            {POPULAR_PLACES.map((place) => (
              <button
                key={place.name}
                onClick={() => handleQuickSelect(place)}
                className="px-4 py-2 border border-accent/10 text-sm font-mono text-accent/50 hover:text-accent hover:border-accent/30 hover:bg-accent/5 transition-all"
              >
                {place.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
