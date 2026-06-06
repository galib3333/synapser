'use client';

import ReactGlobe from 'react-globe.gl';
import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { feature } from 'topojson-client';

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

interface GlobeClientProps {
  markers: GlobeMarker[];
  labels: GlobeLabel[];
  highlightedMarkerId: string | null;
  onMarkerClick: (marker: GlobeMarker) => void;
  onGlobeClick: (lat: number, lng: number) => void;
  selectedLocation: { lat: number; lng: number } | null;
  isZoomed: boolean;
  currentAltitude: number;
}

type GlobeMethods = any;

interface CountryFeature {
  type: string;
  properties: { name: string };
  geometry: { type: string; coordinates: any };
  id?: string | number;
  centroid: [number, number];
}

interface Admin1Feature {
  type: string;
  properties: {
    name: string;
    admin: string;
    iso_a2?: string;
  };
  geometry: { type: string; coordinates: any };
  centroid: [number, number];
}

const TEXTURE_LEVELS = [
  { maxAlt: 3.5, url: '//unpkg.com/three-globe/example/img/earth-night.jpg' },
  { maxAlt: 2.0, url: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg' },
  { maxAlt: 1.0, url: '//unpkg.com/three-globe/example/img/earth-topology.png' },
];




const Globe = ReactGlobe as any;

const GlobeClient = forwardRef<{ flyTo: (lat: number, lng: number) => void }, GlobeClientProps>(function GlobeClient({
  markers,
  labels,
  highlightedMarkerId,
  onMarkerClick,
  onGlobeClick,
  selectedLocation,
  isZoomed,
  currentAltitude,
}, ref) {
  const globeRef = useRef<GlobeMethods>(undefined);
  const [globeReady, setGlobeReady] = useState(false);
  const lastTextureRef = useRef<string>('');
  const [dimensions, setDimensions] = useState({ w: 1200, h: 800 });
  const highlightedRef = useRef<HTMLDivElement>(null);
  const [highlightedPos, setHighlightedPos] = useState({ x: 0, y: 0, visible: false });
  const globeReadyPoller = useRef<ReturnType<typeof setInterval> | null>(null);

  const [countriesFeatures, setCountriesFeatures] = useState<CountryFeature[]>([]);
  const [countriesLoaded, setCountriesLoaded] = useState(false);
  const [admin1Features, setAdmin1Features] = useState<Admin1Feature[]>([]);
  const [admin1Loaded, setAdmin1Loaded] = useState(false);
  const admin1LoadingRef = useRef(false);
  const [allPolygons, setAllPolygons] = useState<any[]>([]);
  const countriesRef = useRef<CountryFeature[]>([]);

  useImperativeHandle(ref, () => ({
    flyTo: (lat: number, lng: number) => {
      if (globeRef.current && globeReady) {
        globeRef.current.pointOfView({ lat, lng, altitude: 0.4 }, 1000);
      }
    },
  }));

  useEffect(() => {
    const update = () => setDimensions({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch('https://unpkg.com/world-atlas@2/countries-50m.json');
        const world = await res.json();
        const countries = feature(world, world.objects.countries) as any;
        if (cancelled) return;

        const data: CountryFeature[] = countries.features
          .filter((f: any) => f.geometry)
          .map((f: any) => {
            const allCoords: number[][] = [];
            const processCoords = (coords: any[][]) => {
              coords.forEach((ring: any[]) => {
                ring.forEach((c: number[]) => allCoords.push(c));
              });
            };
            if (f.geometry.type === 'Polygon') {
              processCoords(f.geometry.coordinates);
            } else if (f.geometry.type === 'MultiPolygon') {
              f.geometry.coordinates.forEach((poly: any) => processCoords(poly));
            }
            const centroid: [number, number] = [
              allCoords.reduce((s, c) => s + c[1] / allCoords.length, 0),
              allCoords.reduce((s, c) => s + c[0] / allCoords.length, 0),
            ];
            return { ...f, centroid };
          });

        const tagged = data.map((d: any) => ({ ...d, _level: 'country' }));
        countriesRef.current = tagged;
        setCountriesFeatures(tagged);
        setCountriesLoaded(true);
        setAllPolygons(tagged);
      } catch (err) {
        console.error('Failed to load country data:', err);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!globeRef.current || !globeReady) return;

    const url = TEXTURE_LEVELS.find((t) => currentAltitude <= t.maxAlt)?.url
      || TEXTURE_LEVELS[0].url;

    if (url !== lastTextureRef.current) {
      lastTextureRef.current = url;
      const globe = globeRef.current;
      if (globe.globeImageUrl !== undefined) {
        globe.globeImageUrl(url);
      }
    }
  }, [currentAltitude, globeReady]);

  useEffect(() => {
    if (!globeRef.current || !globeReady || !highlightedMarkerId) return;
    const marker = markers.find((m) => m.id === highlightedMarkerId);
    if (marker) {
      globeRef.current.pointOfView({ lat: marker.lat, lng: marker.lng, altitude: 0.3 }, 800);
    }
  }, [highlightedMarkerId, markers, globeReady]);

  useEffect(() => {
    if (!globeRef.current || !globeReady) return;
    const globe = globeRef.current;

    if (isZoomed && selectedLocation) {
      globe.pointOfView(
        { lat: selectedLocation.lat, lng: selectedLocation.lng, altitude: 0.8 },
        1500
      );
      const controls = globe.controls();
      controls.autoRotate = false;
    } else if (!isZoomed) {
      globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 1500);
      const controls = globe.controls();
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
    }
  }, [isZoomed, selectedLocation, globeReady]);

  useEffect(() => {
    if (!highlightedMarkerId || !globeReady) {
      setHighlightedPos((p) => ({ ...p, visible: false }));
      return;
    }
    const marker = markers.find((m) => m.id === highlightedMarkerId);
    if (!marker) {
      setHighlightedPos((p) => ({ ...p, visible: false }));
      return;
    }

    const interval = setInterval(() => {
      if (!globeRef.current) return;
      const phi = (90 - marker.lat) * (Math.PI / 180);
      const theta = (marker.lng + 180) * (Math.PI / 180);
      const radius = 100;
      const x3d = radius * Math.sin(phi) * Math.cos(theta);
      const y3d = -radius * Math.cos(phi);
      const z3d = radius * Math.sin(phi) * Math.sin(theta);

      const fov = 45;
      const aspect = dimensions.w / dimensions.h;
      const camZ = 300;
      const scale = fov / (camZ - z3d);
      const sx = (x3d * scale * dimensions.w) / 2 / fov + dimensions.w / 2;
      const sy = (y3d * scale * dimensions.h) / 2 / fov + dimensions.h / 2;

      if (z3d > 0) {
        setHighlightedPos((p) => ({ ...p, visible: false }));
      } else {
        setHighlightedPos({ x: sx, y: sy, visible: true });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [highlightedMarkerId, markers, globeReady, dimensions]);

  const handleGlobeClick = useCallback(
    (event: any) => {
      if (!isZoomed && event?.lat !== undefined && event?.lng !== undefined) {
        onGlobeClick(event.lat, event.lng);
      }
    },
    [isZoomed, onGlobeClick]
  );

  const handlePointClick = useCallback(
    (marker: any) => {
      onMarkerClick(marker as GlobeMarker);
    },
    [onMarkerClick]
  );

  const handlePolygonClick = useCallback(
    (polygon: any) => {
      if (polygon.centroid) {
        onGlobeClick(polygon.centroid[0], polygon.centroid[1]);
      }
    },
    [onGlobeClick]
  );

  const getCountryName = useCallback((lat: number, lng: number): string | null => {
    for (const country of countriesFeatures) {
      if (!country.geometry) continue;
      const coords = country.geometry.coordinates;
      if (!coords) continue;

      const rings: number[][][] = [];
      if (country.geometry.type === 'Polygon') {
        rings.push(...coords.map((ring: any) => ring.map((c: number[]) => [c[1], c[0]])));
      } else if (country.geometry.type === 'MultiPolygon') {
        coords.forEach((poly: any) => {
          rings.push(...poly.map((ring: any) => ring.map((c: number[]) => [c[1], c[0]])));
        });
      }

      for (const ring of rings) {
        let inside = false;
        for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          const [latI, lngI] = ring[i];
          const [latJ, lngJ] = ring[j];
          if ((lngI > lng) !== (lngJ > lng) &&
              lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI) + latI) {
            inside = !inside;
          }
        }
        if (inside) return country.properties?.name || null;
      }
    }
    return null;
  }, [countriesFeatures]);

  useEffect(() => {
    if (!isZoomed || !selectedLocation || admin1LoadingRef.current || admin1Features.length > 0) return;

    const countryName = getCountryName(selectedLocation.lat, selectedLocation.lng);
    if (!countryName) return;

    admin1LoadingRef.current = true;

    async function loadAdmin1() {
      try {
        const res = await fetch(
          'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_1_states_provinces.geojson'
        );
        const geoJson = await res.json();

          const filtered = geoJson.features
          .filter((f: any) =>
            f.properties?.admin === countryName &&
            f.geometry
          )
          .map((f: any) => {
            const allCoords: number[][] = [];
            const processCoords = (coords: any[][]) => {
              coords.forEach((ring: any[]) => {
                ring.forEach((c: number[]) => allCoords.push(c));
              });
            };
            if (f.geometry.type === 'Polygon') {
              processCoords(f.geometry.coordinates);
            } else if (f.geometry.type === 'MultiPolygon') {
              f.geometry.coordinates.forEach((poly: any) => processCoords(poly));
            }
            const centroid: [number, number] = [
              allCoords.reduce((s, c) => s + c[1] / allCoords.length, 0),
              allCoords.reduce((s, c) => s + c[0] / allCoords.length, 0),
            ];
            return { ...f, centroid, _level: 'admin1' };
          });

        setAdmin1Features(filtered);
        setAdmin1Loaded(true);
        setAllPolygons([...countriesRef.current, ...filtered]);
        admin1LoadingRef.current = false;
      } catch (err) {
        console.error('Failed to load admin-1 data:', err);
        admin1LoadingRef.current = false;
      }
    }

    loadAdmin1();
  }, [isZoomed, selectedLocation, getCountryName, admin1Features.length]);

  useEffect(() => {
    if (!isZoomed) {
      setAdmin1Features([]);
      setAdmin1Loaded(false);
    }
  }, [isZoomed]);

  useEffect(() => {
    const poll = setInterval(() => {
      if (globeRef.current?.renderer && !globeReady) {
        clearInterval(poll);
        setGlobeReady(true);
        const globe = globeRef.current;
        globe.pointOfView({ lat: 20, lng: 0, altitude: 2.5 });
        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 0.3;
        controls.enableZoom = true;
        controls.enablePan = false;
        controls.minDistance = 80;
        controls.maxDistance = 500;
        const scene = globe.scene();
        scene.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.MeshPhongMaterial;
            if (material.emissive) {
              material.emissiveIntensity = 0.15;
            }
          }
        });
        const renderer = globe.renderer();
        if (renderer?.raycaster) {
          renderer.raycaster.params.Points.threshold = 20;
        }
      }
    }, 50);
    return () => clearInterval(poll);
  }, [globeReady]);

  const tileUrlFn = useCallback((x: number, y: number, level: number) => {
    return `https://tile.openstreetmap.org/${level}/${x}/${y}.png`;
  }, []);

  const showTiles = isZoomed && currentAltitude < 1.0;

  const borderOpacity = Math.min(1, Math.max(0.18, 0.55 - currentAltitude * 0.12));
  const admin1Opacity = Math.min(1, Math.max(0, 0.35 - currentAltitude * 0.25));
  const countryLabelsVisible = isZoomed && currentAltitude < 1.2 && countriesLoaded;
  const admin1LabelsVisible = isZoomed && currentAltitude < 0.9 && admin1Loaded && admin1Features.length > 0;

  const categoryColorMap: Record<string, string> = {
    attraction: '#dcd8c0',
    museum: '#e8b4b8',
    artwork: '#b8d4e3',
    viewpoint: '#60a060',
    monument: '#d4b8e3',
    castle: '#e3d4b8',
    fort: '#c4a060',
    park: '#4a8a4a',
    peak: '#8c8c8c',
    'place_of_worship': '#c4a878',
    restaurant: '#e8a060',
    cafe: '#c49060',
    fast_food: '#d4a050',
    memorial: '#b8a8c4',
    ruins: '#8a7a6a',
    archaeological_site: '#9a8a70',
    waterfall: '#5090d0',
    marketplace: '#b08040',
  };

  return (
    <div className="globe-container absolute inset-0 z-10">
      <Globe
        ref={globeRef}
        globeImageUrl={TEXTURE_LEVELS[0].url}
        backgroundImageUrl=""
        backgroundColor="rgba(0,0,0,0)"
        width={dimensions.w}
        height={dimensions.h}
        pointsData={markers}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d: any) => {
          const marker = d as GlobeMarker;
          const isHighlighted = marker.id === highlightedMarkerId;
          if (isHighlighted) return '#ffffff';
          return categoryColorMap[marker.category] || '#dcd8c0';
        }}
        pointAltitude={(d: any) => {
          const marker = d as GlobeMarker;
          return marker.id === highlightedMarkerId ? 0.06 : (isZoomed ? 0.03 : 0.01);
        }}
        pointRadius={(d: any) => {
          const marker = d as GlobeMarker;
          const base = isZoomed ? Math.max(marker.size * 1.5, 0.5) : marker.size * 0.6;
          return marker.id === highlightedMarkerId ? base * 2.5 : base;
        }}
        pointLabel={(d: any) => {
          const marker = d as GlobeMarker;
          return `<div style="background:rgba(13,13,13,0.92);padding:8px 14px;border:1px solid rgba(220,216,192,0.25);font-family:'General Sans',sans-serif;font-size:13px;color:#dcd8c0;white-space:nowrap;backdrop-filter:blur(8px);border-radius:2px;">${marker.name}</div>`;
        }}
        onPointClick={handlePointClick}
        onGlobeClick={handleGlobeClick}
        polygonsData={allPolygons}
        polygonGeoJsonGeometry="geometry"
        polygonCapColor={() => 'rgba(0,0,0,0)'}
        polygonStrokeColor={(d: any) => {
          if (d._level === 'admin1') {
            return `rgba(180, 210, 180, ${admin1Opacity})`;
          }
          return `rgba(235, 228, 210, ${borderOpacity})`;
        }}
        polygonAltitude={(d: any) => d._level === 'admin1' ? 0.004 : 0.002}
        polygonLabel={(d: any) => `<div style="background:rgba(13,13,13,0.88);padding:6px 12px;border:1px solid rgba(220,216,192,0.2);font-family:'General Sans',sans-serif;font-size:12px;color:#dcd8c0;white-space:nowrap;border-radius:2px;">${d.properties?.name || d.name}</div>`}
        onPolygonClick={handlePolygonClick}
        onGlobeReady={() => {}}
        atmosphereColor="#dcd8c0"
        atmosphereAltitude={0.15}
        globeTileEngineUrl={showTiles ? tileUrlFn : null}
        globeTileEngineMaxLevel={19}
      />

      {admin1LabelsVisible && (
        <div className="absolute inset-0 pointer-events-none z-13">
          {admin1Features.map((admin1: any, i: number) => {
            const name = admin1.properties?.name;
            if (!name) return null;
            const [lat, lng] = admin1.centroid;
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);
            const radius = 100.007;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = -radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            const fov = 45;
            const aspect = dimensions.w / dimensions.h;
            const camZ = 300;
            const scale = fov / (camZ - z);
            const screenX = (x * scale * dimensions.w) / 2 / fov + dimensions.w / 2;
            const screenY = (y * scale * dimensions.h) / 2 / fov + dimensions.h / 2;

            if (z > 0) return null;

            const labelOpacity = Math.min(1, Math.max(0, (0.9 - currentAltitude) * 1.8));

            return (
              <div
                key={i}
                className="absolute transition-opacity duration-700"
                style={{
                  left: screenX,
                  top: screenY,
                  transform: 'translate(-50%, -50%)',
                  opacity: labelOpacity,
                  fontSize: `${Math.max(9, 11 - currentAltitude * 3)}px`,
                }}
              >
                <span className="font-mono text-accent/20 uppercase tracking-[0.2em] whitespace-nowrap">
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {highlightedPos.visible && (
        <div
          ref={highlightedRef}
          className="absolute pointer-events-none z-20"
          style={{
            left: highlightedPos.x,
            top: highlightedPos.y,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div className="w-8 h-8 rounded-full border-2 border-white/80 animate-ping opacity-60" />
          <div className="w-3 h-3 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_12px_rgba(255,255,255,0.6)]" />
        </div>
      )}

      {isZoomed && globeReady && labels.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-15">
          {labels.map((label, i) => {
            const phi = (90 - label.lat) * (Math.PI / 180);
            const theta = (label.lng + 180) * (Math.PI / 180);
            const radius = 100;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = -radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            const fov = 45;
            const aspect = dimensions.w / dimensions.h;
            const camZ = 300;
            const scale = fov / (camZ - z);
            const screenX = (x * scale * dimensions.w) / 2 / fov + dimensions.w / 2;
            const screenY = (y * scale * dimensions.h) / 2 / fov + dimensions.h / 2;

            if (z > 0) return null;

            return (
              <div
                key={i}
                className="absolute transition-opacity duration-500"
                style={{
                  left: screenX,
                  top: screenY,
                  transform: 'translate(-50%, -50%)',
                  fontSize: `${Math.max(label.size * 0.9, 11)}px`,
                  opacity: Math.min(1, Math.max(0, (1.0 - currentAltitude) * 2)),
                }}
              >
                <span className="font-mono text-accent/40 uppercase tracking-[0.15em] whitespace-nowrap">
                  {label.text}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {countryLabelsVisible && (
        <div className="absolute inset-0 pointer-events-none z-14">
          {countriesFeatures.map((country, i) => {
            const name = country.properties?.name;
            const [lat, lng] = country.centroid;
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lng + 180) * (Math.PI / 180);
            const radius = 100.005;
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = -radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            const fov = 45;
            const aspect = dimensions.w / dimensions.h;
            const camZ = 300;
            const scale = fov / (camZ - z);
            const screenX = (x * scale * dimensions.w) / 2 / fov + dimensions.w / 2;
            const screenY = (y * scale * dimensions.h) / 2 / fov + dimensions.h / 2;

            if (z > 0) return null;

            const labelOpacity = Math.min(1, Math.max(0, (1.2 - currentAltitude) * 1.5));

            return (
              <div
                key={i}
                className="absolute transition-opacity duration-700"
                style={{
                  left: screenX,
                  top: screenY,
                  transform: 'translate(-50%, -50%)',
                  opacity: labelOpacity,
                  fontSize: `${Math.max(10, 13 - currentAltitude * 4)}px`,
                }}
              >
                <span className="font-mono text-accent/25 uppercase tracking-[0.25em] whitespace-nowrap">
                  {name}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {!isZoomed && globeReady && (
        <div className="absolute bottom-10 w-full text-center z-20 pointer-events-none">
          <span className="uppercase text-xs sm:text-sm tracking-[0.3em] opacity-40 text-accent font-mono">
            Click anywhere on the globe to explore
          </span>
        </div>
      )}
    </div>
  );
});

export default GlobeClient;
