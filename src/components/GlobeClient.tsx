'use client';

import ReactGlobe from 'react-globe.gl';
import { useRef, useCallback, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GlobeMethods = any;

const TEXTURE_LEVELS = [
  { maxAlt: 3.5, url: '//unpkg.com/three-globe/example/img/earth-night.jpg' },
  { maxAlt: 2.0, url: '//unpkg.com/three-globe/example/img/earth-blue-marble.jpg' },
  { maxAlt: 1.0, url: '//unpkg.com/three-globe/example/img/earth-topology.png' },
];

const TILE_SERVER = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const tileCache = new Map<string, HTMLImageElement>();

function getTileUrl(z: number, x: number, y: number): string {
  return TILE_SERVER.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
}

function latLngToEquiPixel(lat: number, lng: number, imgW: number, imgH: number) {
  return {
    x: ((lng + 180) / 360) * imgW,
    y: ((90 - lat) / 180) * imgH,
  };
}

function tileToLatLng(z: number, x: number, y: number) {
  const n = Math.pow(2, z);
  const lng = (x / n) * 360 - 180;
  const lat = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 0.5)) / n))) * (180 / Math.PI);
  return { lat, lng };
}

function getTileZoom(altitude: number): number {
  if (altitude < 0.1) return 18;
  if (altitude < 0.18) return 16;
  if (altitude < 0.3) return 14;
  if (altitude < 0.5) return 12;
  if (altitude < 0.8) return 10;
  return 8;
}

function getVisibleArea(altitude: number) {
  const viewDeg = Math.max(3, altitude * 60);
  return viewDeg;
}

async function loadTileImage(url: string): Promise<HTMLImageElement> {
  if (tileCache.has(url)) return tileCache.get(url)!;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('Tile load failed'));
    i.src = url;
  });
  tileCache.set(url, img);
  return img;
}

async function compositeTiles(
  centerLat: number,
  centerLng: number,
  altitude: number
): Promise<HTMLCanvasElement | null> {
  const zoom = getTileZoom(altitude);
  const viewDeg = getVisibleArea(altitude);
  const imgW = 2048;
  const imgH = 1024;

  const lngMin = centerLng - viewDeg;
  const lngMax = centerLng + viewDeg;
  const latMin = Math.max(-85, centerLat - viewDeg * 0.6);
  const latMax = Math.min(85, centerLat + viewDeg * 0.6);

  const n = Math.pow(2, zoom);
  const xMin = Math.max(0, Math.floor(((lngMin + 180) / 360) * n));
  const xMax = Math.min(n - 1, Math.floor(((lngMax + 180) / 360) * n));
  const latRadMax = latMax * (Math.PI / 180);
  const yMin = Math.max(0, Math.floor((1 - Math.log(Math.tan(latRadMax) + 1 / Math.cos(latRadMax)) / Math.PI) / 2 * n));
  const latRadMin = latMin * (Math.PI / 180);
  const yMax = Math.min(n - 1, Math.floor((1 - Math.log(Math.tan(latRadMin) + 1 / Math.cos(latRadMin)) / Math.PI) / 2 * n));

  const tileCount = (xMax - xMin + 1) * (yMax - yMin + 1);
  if (tileCount < 1 || tileCount > 64) return null;

  const canvas = document.createElement('canvas');
  canvas.width = imgW;
  canvas.height = imgH;

  const baseTexture = await new Promise<HTMLImageElement>((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.src = TEXTURE_LEVELS[2].url;
  });

  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(baseTexture, 0, 0, imgW, imgH);

  const promises: Promise<void>[] = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      const url = getTileUrl(zoom, x, y);
      const tileLatLng = tileToLatLng(zoom, x, y);
      const nextTile = tileToLatLng(zoom, x + 1, y + 1);

      const topLeft = latLngToEquiPixel(tileLatLng.lat, tileLatLng.lng, imgW, imgH);
      const bottomRight = latLngToEquiPixel(nextTile.lat, nextTile.lng, imgW, imgH);

      const tw = Math.abs(bottomRight.x - topLeft.x);
      const th = Math.abs(bottomRight.y - topLeft.y);

      if (tw < 1 || th < 1) continue;

      promises.push(
        loadTileImage(url).then((tileImg) => {
          ctx.drawImage(tileImg, topLeft.x, topLeft.y, tw, th);
        }).catch(() => {})
      );
    }
  }

  await Promise.all(promises);
  return canvas;
}

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
  const isGeneratingRef = useRef(false);
  const lastTileGenRef = useRef(0);

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

  // Progressive texture loading
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

  // Tile compositing for Google-Earth detail when very zoomed in
  useEffect(() => {
    if (!globeRef.current || !globeReady || !isZoomed || !selectedLocation) return;
    if (currentAltitude > 0.6) return;

    const now = Date.now();
    if (now - lastTileGenRef.current < 2000) return;
    lastTileGenRef.current = now;

    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    compositeTiles(selectedLocation.lat, selectedLocation.lng, currentAltitude)
      .then((canvas) => {
        if (canvas && globeRef.current) {
          globeRef.current.globeImageUrl(canvas);
        }
        isGeneratingRef.current = false;
      })
      .catch(() => {
        isGeneratingRef.current = false;
      });
  }, [currentAltitude, selectedLocation, isZoomed, globeReady]);

  // Fly to highlighted marker
  useEffect(() => {
    if (!globeRef.current || !globeReady || !highlightedMarkerId) return;
    const marker = markers.find((m) => m.id === highlightedMarkerId);
    if (marker) {
      globeRef.current.pointOfView({ lat: marker.lat, lng: marker.lng, altitude: 0.3 }, 800);
    }
  }, [highlightedMarkerId, markers, globeReady]);

  // Camera control
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

  // Update highlighted marker screen position
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleGlobeClick = useCallback(
    (event: any) => {
      if (!isZoomed && event?.lat !== undefined && event?.lng !== undefined) {
        onGlobeClick(event.lat, event.lng);
      }
    },
    [isZoomed, onGlobeClick]
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePointClick = useCallback(
    (marker: any) => {
      onMarkerClick(marker as GlobeMarker);
    },
    [onMarkerClick]
  );

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
      <ReactGlobe
        ref={globeRef}
        globeImageUrl={TEXTURE_LEVELS[0].url}
        backgroundImageUrl=""
        backgroundColor="rgba(0,0,0,0)"
        width={dimensions.w}
        height={dimensions.h}
        pointsData={markers}
        pointLat="lat"
        pointLng="lng"
        pointColor={(d) => {
          const marker = d as GlobeMarker;
          const isHighlighted = marker.id === highlightedMarkerId;
          if (isHighlighted) return '#ffffff';
          return categoryColorMap[marker.category] || '#dcd8c0';
        }}
        pointAltitude={(d) => {
          const marker = d as GlobeMarker;
          return marker.id === highlightedMarkerId ? 0.06 : (isZoomed ? 0.03 : 0.01);
        }}
        pointRadius={(d) => {
          const marker = d as GlobeMarker;
          const base = isZoomed ? Math.max(marker.size * 1.5, 0.5) : marker.size * 0.6;
          return marker.id === highlightedMarkerId ? base * 2.5 : base;
        }}
        pointLabel={(d) => {
          const marker = d as GlobeMarker;
          return `<div style="background:rgba(13,13,13,0.92);padding:8px 14px;border:1px solid rgba(220,216,192,0.25);font-family:'General Sans',sans-serif;font-size:13px;color:#dcd8c0;white-space:nowrap;backdrop-filter:blur(8px);border-radius:2px;">${marker.name}</div>`;
        }}
        onPointClick={handlePointClick}
        onGlobeClick={handleGlobeClick}
        onGlobeReady={() => {
          setGlobeReady(true);
          if (globeRef.current) {
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
        }}
        atmosphereColor="#dcd8c0"
        atmosphereAltitude={0.15}
      />

      {/* Highlighted marker pulse ring */}
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

      {/* Country/Region labels layer */}
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
