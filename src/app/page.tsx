'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { fetchTouristSpots, TouristSpot } from '@/lib/api';
import Navbar from '@/components/Navbar';
import LocationPanel from '@/components/LocationPanel';
import FloatingWords from '@/components/FloatingWords';
import Preloader from '@/components/Preloader';
import SearchOverlay from '@/components/SearchOverlay';

const GlobeClient = dynamic(() => import('@/components/GlobeClient'), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center bg-bg-primary">
      <div className="flex flex-col items-center gap-4">
        <div className="w-32 h-[1px] bg-accent/10 overflow-hidden">
          <div className="load-bar h-full bg-accent/60" />
        </div>
        <span className="text-xs font-mono text-accent/30 tracking-[0.3em] uppercase">
          Loading Globe
        </span>
      </div>
    </div>
  ),
});

interface GlobeMarker {
  id: string;
  lat: number;
  lng: number;
  size: number;
  color: string;
  name: string;
  category: string;
}

interface GlobeLabel {
  lat: number;
  lng: number;
  text: string;
  size: number;
}

const GEOCODE_API = 'https://nominatim.openstreetmap.org/search';

async function geocodePlace(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const res = await fetch(
      `${GEOCODE_API}?q=${encodeURIComponent(query)}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: data[0].display_name.split(',')[0],
      };
    }
  } catch {
    console.error('Geocoding failed');
  }
  return null;
}

async function reverseGeocode(lat: number, lng: number): Promise<{ city: string; country: string; state: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json();
    return {
      city: data.address?.city || data.address?.town || data.address?.village || data.address?.county || '',
      country: data.address?.country || '',
      state: data.address?.state || '',
    };
  } catch {
    return { city: 'Unknown Location', country: '', state: '' };
  }
}

// Major world labels for the globe
const WORLD_LABELS: GlobeLabel[] = [
  { lat: 48.8566, lng: 2.3522, text: 'Paris', size: 12 },
  { lat: 51.5074, lng: -0.1278, text: 'London', size: 12 },
  { lat: 40.7128, lng: -74.006, text: 'New York', size: 12 },
  { lat: 35.6762, lng: 139.6503, text: 'Tokyo', size: 12 },
  { lat: -33.8688, lng: 151.2093, text: 'Sydney', size: 11 },
  { lat: 55.7558, lng: 37.6173, text: 'Moscow', size: 11 },
  { lat: 39.9042, lng: 116.4074, text: 'Beijing', size: 12 },
  { lat: 28.6139, lng: 77.209, text: 'New Delhi', size: 11 },
  { lat: 19.076, lng: 72.8777, text: 'Mumbai', size: 11 },
  { lat: 23.8103, lng: 90.4125, text: 'Dhaka', size: 11 },
  { lat: 22.3569, lng: 91.7832, text: 'Chittagong', size: 10 },
  { lat: 30.0444, lng: 31.2357, text: 'Cairo', size: 11 },
  { lat: -1.2921, lng: 36.8219, text: 'Nairobi', size: 10 },
  { lat: -22.9068, lng: -43.1729, text: 'Rio', size: 11 },
  { lat: -23.5505, lng: -46.6333, text: 'São Paulo', size: 11 },
  { lat: 41.9028, lng: 12.4964, text: 'Rome', size: 11 },
  { lat: 40.4168, lng: -3.7038, text: 'Madrid', size: 10 },
  { lat: 52.52, lng: 13.405, text: 'Berlin', size: 10 },
  { lat: 35.1796, lng: 33.3823, text: 'Nicosia', size: 9 },
  { lat: 13.7563, lng: 100.5018, text: 'Bangkok', size: 11 },
  { lat: 1.3521, lng: 103.8198, text: 'Singapore', size: 10 },
  { lat: 3.139, lng: 101.6869, text: 'Kuala Lumpur', size: 10 },
  { lat: -6.2088, lng: 106.8456, text: 'Jakarta', size: 11 },
  { lat: 14.5995, lng: 120.9842, text: 'Manila', size: 10 },
  { lat: 21.0278, lng: 105.8342, text: 'Hanoi', size: 10 },
  { lat: 25.2048, lng: 55.2708, text: 'Dubai', size: 10 },
  { lat: 24.7136, lng: 46.6753, text: 'Riyadh', size: 10 },
  { lat: 39.9334, lng: 32.8597, text: 'Ankara', size: 10 },
  { lat: 41.0082, lng: 28.9784, text: 'Istanbul', size: 11 },
  { lat: 50.4501, lng: 30.5234, text: 'Kyiv', size: 10 },
  { lat: 33.8938, lng: 35.5018, text: 'Beirut', size: 9 },
  { lat: 32.0853, lng: 34.7818, text: 'Tel Aviv', size: 9 },
  { lat: 31.7683, lng: 35.2137, text: 'Jerusalem', size: 9 },
  { lat: 35.6892, lng: 51.389, text: 'Tehran', size: 10 },
  { lat: 33.3152, lng: 44.3661, text: 'Baghdad', size: 10 },
  { lat: 34.0522, lng: -118.2437, text: 'Los Angeles', size: 11 },
  { lat: 41.8781, lng: -87.6298, text: 'Chicago', size: 10 },
  { lat: 29.7604, lng: -95.3698, text: 'Houston', size: 10 },
  { lat: 25.7617, lng: -80.1918, text: 'Miami', size: 10 },
  { lat: 49.2827, lng: -123.1207, text: 'Vancouver', size: 10 },
  { lat: 43.6532, lng: -79.3832, text: 'Toronto', size: 10 },
  { lat: -34.6037, lng: -58.3816, text: 'Buenos Aires', size: 11 },
  { lat: -33.4489, lng: -70.6693, text: 'Santiago', size: 10 },
  { lat: 4.711, lng: -74.0721, text: 'Bogotá', size: 10 },
  { lat: 10.4806, lng: -66.9036, text: 'Caracas', size: 9 },
  { lat: 23.1136, lng: -82.3666, text: 'Havana', size: 9 },
  { lat: -26.2041, lng: 28.0473, text: 'Johannesburg', size: 10 },
  { lat: -33.9249, lng: 18.4241, text: 'Cape Town', size: 10 },
  { lat: 6.5244, lng: 3.3792, text: 'Lagos', size: 10 },
  { lat: 9.0579, lng: 7.4951, text: 'Abuja', size: 9 },
  { lat: 23.7041, lng: 90.3792, text: 'Dhaka', size: 11 },
  { lat: 22.5726, lng: 88.3639, text: 'Kolkata', size: 10 },
  { lat: 11.0168, lng: 76.9558, text: 'Coimbatore', size: 9 },
  { lat: 13.0827, lng: 80.2707, text: 'Chennai', size: 10 },
  { lat: 12.9716, lng: 77.5946, text: 'Bangalore', size: 10 },
  { lat: 17.385, lng: 78.4867, text: 'Hyderabad', size: 10 },
  { lat: 8.5241, lng: 76.9366, text: 'Thiruvananthapuram', size: 9 },
  { lat: 9.9312, lng: 76.2673, text: 'Kochi', size: 9 },
  { lat: 15.2993, lng: 74.124, text: 'Goa', size: 9 },
  { lat: 26.9124, lng: 75.7873, text: 'Jaipur', size: 9 },
  { lat: 19.076, lng: 72.8777, text: 'Mumbai', size: 11 },
  { lat: 28.6139, lng: 77.209, text: 'Delhi', size: 12 },
  { lat: 27.7172, lng: 85.324, text: 'Kathmandu', size: 9 },
  { lat: 6.9271, lng: 79.8612, text: 'Colombo', size: 9 },
  { lat: 4.1755, lng: 73.5093, text: 'Malé', size: 8 },
  { lat: 16.8661, lng: 96.1951, text: 'Yangon', size: 9 },
  { lat: 17.9757, lng: 102.6331, text: 'Vientiane', size: 8 },
  { lat: 11.5564, lng: 104.9282, text: 'Phnom Penh', size: 9 },
  { lat: 34.0522, lng: -118.2437, text: 'LA', size: 10 },
  { lat: 37.7749, lng: -122.4194, text: 'San Francisco', size: 10 },
  { lat: 47.6062, lng: -122.3321, text: 'Seattle', size: 9 },
  { lat: 45.5152, lng: -122.6784, text: 'Portland', size: 9 },
  { lat: 36.1699, lng: -115.1398, text: 'Las Vegas', size: 9 },
  { lat: 33.4484, lng: -112.074, text: 'Phoenix', size: 9 },
  { lat: 32.7157, lng: -117.1611, text: 'San Diego', size: 9 },
  { lat: 37.3382, lng: -121.8863, text: 'San Jose', size: 9 },
  { lat: 38.9072, lng: -77.0369, text: 'Washington DC', size: 10 },
  { lat: 42.3601, lng: -71.0589, text: 'Boston', size: 9 },
  { lat: 39.7392, lng: -104.9903, text: 'Denver', size: 9 },
  { lat: 29.4241, lng: -98.4936, text: 'San Antonio', size: 9 },
  { lat: 35.2271, lng: -80.8431, text: 'Charlotte', size: 9 },
  { lat: 33.749, lng: -84.388, text: 'Atlanta', size: 9 },
  { lat: 39.9612, lng: -82.9988, text: 'Columbus', size: 9 },
  { lat: 42.3314, lng: -83.0458, text: 'Detroit', size: 9 },
  { lat: 29.9511, lng: -90.0715, text: 'New Orleans', size: 9 },
  { lat: 32.7767, lng: -96.797, text: 'Dallas', size: 10 },
  { lat: 29.7604, lng: -95.3698, text: 'Houston', size: 10 },
  { lat: 35.1495, lng: -90.049, text: 'Memphis', size: 9 },
  { lat: 36.1627, lng: -86.7816, text: 'Nashville', size: 9 },
  { lat: 38.627, lng: -90.1994, text: 'St. Louis', size: 9 },
  { lat: 44.9778, lng: -93.265, text: 'Minneapolis', size: 9 },
  { lat: 43.0389, lng: -87.9065, text: 'Milwaukee', size: 9 },
  { lat: 41.2524, lng: -95.998, text: 'Omaha', size: 8 },
  { lat: 39.1031, lng: -94.5786, text: 'Kansas City', size: 9 },
  { lat: 35.4676, lng: -97.5164, text: 'Oklahoma City', size: 9 },
  { lat: 31.7683, lng: -106.485, text: 'El Paso', size: 8 },
  { lat: 32.2217, lng: -110.9265, text: 'Tucson', size: 8 },
  { lat: 36.1699, lng: -115.1398, text: 'Vegas', size: 9 },
  { lat: 61.2181, lng: -149.9003, text: 'Anchorage', size: 8 },
  { lat: 21.3069, lng: -157.8583, text: 'Honolulu', size: 9 },
];

export default function Home() {
  const [preloaded, setPreloaded] = useState(false);
  const [spots, setSpots] = useState<TouristSpot[]>([]);
  const [markers, setMarkers] = useState<GlobeMarker[]>([]);
  const [labels, setLabels] = useState<GlobeLabel[]>([]);
  const [loading, setLoading] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationName, setLocationName] = useState('');
  const [showPanel, setShowPanel] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<TouristSpot | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [currentAltitude, setCurrentAltitude] = useState(2.5);
  const [highlightedMarkerId, setHighlightedMarkerId] = useState<string | null>(null);
  const globeClientRef = useRef<{ flyTo: (lat: number, lng: number) => void } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Poll altitude from globe
  useEffect(() => {
    if (!isZoomed) {
      setCurrentAltitude(2.5);
      return;
    }
    const interval = setInterval(() => {
      const globeEl = document.querySelector('.globe-container canvas');
      if (globeEl) {
        // Try to read altitude from globe controls
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const globe = (window as any).__globeRef;
        if (globe?.current) {
          const pov = globe.current.pointOfView();
          if (pov?.altitude !== undefined) {
            setCurrentAltitude(pov.altitude);
          }
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [isZoomed]);

  const handleGlobeClick = useCallback(async (lat: number, lng: number) => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsZoomed(true);
    setSelectedLocation({ lat, lng });
    setLoading(true);
    setShowPanel(true);
    setSpots([]);
    setMarkers([]);
    setSelectedSpot(null);

    // Reverse geocode for location name
    const geo = await reverseGeocode(lat, lng);
    const locationDisplayName = geo.city || geo.state || geo.country || 'Unknown Location';
    if (!controller.signal.aborted) {
      setLocationName(locationDisplayName);
    }

    // Fly globe to this location
    globeClientRef.current?.flyTo(lat, lng);

    // Fetch tourist spots
    try {
      const touristSpots = await fetchTouristSpots(lat, lng, 10);
      if (!controller.signal.aborted) {
        setSpots(touristSpots);
        setMarkers(
          touristSpots.map((spot) => ({
            id: spot.id,
            lat: spot.lat,
            lng: spot.lng,
            size: 0.35,
            color: '#dcd8c0',
            name: spot.name,
            category: spot.category,
          }))
        );

        // Add labels for the zoomed region
        const regionLabels: GlobeLabel[] = [
          { lat, lng, text: locationDisplayName.toUpperCase(), size: 14 },
        ];
        // Add nearby city labels
        const nearbyLabels = WORLD_LABELS.filter((l) => {
          const dist = Math.sqrt(
            Math.pow((l.lat - lat) * 111, 2) + Math.pow((l.lng - lng) * 111 * Math.cos((lat * Math.PI) / 180), 2)
          );
          return dist < 200 && dist > 5;
        });
        regionLabels.push(...nearbyLabels.map((l) => ({ ...l, size: 10 })));
        setLabels(regionLabels);

        setLoading(false);
      }
    } catch {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  const handleSpotSelect = useCallback((spot: TouristSpot) => {
    setHighlightedMarkerId(spot.id);
    setSelectedSpot(spot);
    globeClientRef.current?.flyTo(spot.lat, spot.lng);
  }, []);

  const handleSpotDeselect = useCallback(() => {
    setSelectedSpot(null);
    setHighlightedMarkerId(null);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    setSearchOpen(false);
    const result = await geocodePlace(query);
    if (result) {
      handleGlobeClick(result.lat, result.lng);
    }
  }, [handleGlobeClick]);

  const handleBack = useCallback(() => {
    setIsZoomed(false);
    setSelectedLocation(null);
    setShowPanel(false);
    setSpots([]);
    setMarkers([]);
    setLabels([]);
    setLocationName('');
    setSelectedSpot(null);
    setHighlightedMarkerId(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedSpot) handleSpotDeselect();
        else if (searchOpen) setSearchOpen(false);
        else if (isZoomed) handleBack();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, isZoomed, handleBack, selectedSpot]);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-bg-primary">
      <Preloader onComplete={() => setPreloaded(true)} />

      {preloaded && (
        <>
          <Navbar isZoomed={isZoomed} onBack={handleBack} />

          {!isZoomed && <FloatingWords visible={!isZoomed} />}

          <div className="absolute inset-0 z-10">
            <GlobeClient
              ref={globeClientRef}
              markers={markers}
              labels={labels}
              highlightedMarkerId={highlightedMarkerId}
              onMarkerClick={(marker) => {
                const spot = spots.find((s) => s.id === marker.id);
                if (spot) handleSpotSelect(spot);
              }}
              onGlobeClick={handleGlobeClick}
              selectedLocation={selectedLocation}
              isZoomed={isZoomed}
              currentAltitude={currentAltitude}
            />
          </div>

          {!isZoomed && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none">
              <div className="text-center">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold uppercase tracking-tight text-accent font-sans opacity-90 mb-4">
                  Terra
                </h1>
                <p className="text-sm sm:text-base font-mono text-accent/40 tracking-[0.3em] uppercase mb-8">
                  Explore every corner of the world
                </p>
                <button
                  onClick={() => setSearchOpen(true)}
                  className="pointer-events-auto px-6 sm:px-8 py-3.5 border border-accent/20 text-sm font-mono uppercase tracking-[0.2em] text-accent/60 hover:text-accent hover:border-accent/40 hover:bg-accent/5 transition-all duration-300"
                >
                  Search a place...
                  <span className="ml-2 text-xs opacity-40">⌘K</span>
                </button>
              </div>
            </div>
          )}

          {showPanel && (
            <LocationPanel
              spots={spots}
              loading={loading}
              locationName={locationName}
              onClose={handleBack}
              onSpotSelect={handleSpotSelect}
              selectedSpot={selectedSpot}
              onSpotDeselect={handleSpotDeselect}
            />
          )}

          <SearchOverlay
            isOpen={searchOpen}
            onSearch={handleSearch}
            onClose={() => setSearchOpen(false)}
          />
        </>
      )}
    </main>
  );
}
