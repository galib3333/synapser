export interface TouristSpot {
  id: string;
  name: string;
  category: string;
  lat: number;
  lng: number;
  description?: string;
  image?: string;
  tags: Record<string, string>;
  cuisine?: string[];
  localSpecialties?: string[];
  nearbyFood?: string[];
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

const TOURISM_TAGS = [
  'tourism=attraction',
  'tourism=museum',
  'tourism=artwork',
  'tourism=viewpoint',
  'tourism=monument',
  'tourism=ruins',
  'tourism=archaeological_site',
  'tourism=zoo',
  'tourism=aquarium',
  'historic=monument',
  'historic=memorial',
  'historic=castle',
  'historic=ruins',
  'historic=fort',
  'amenity=place_of_worship',
  'amenity=restaurant',
  'amenity=cafe',
  'leisure=park',
  'natural=peak',
  'natural=waterfall',
  'natural=geyser',
  'natural=岩_formation',
  'shop=marketplace',
];

const FOOD_TAGS = [
  'amenity=restaurant',
  'amenity=fast_food',
  'amenity=cafe',
  'amenity=bar',
  'amenity=pub',
  'amenity=marketplace',
  'shop=supermarket',
  'shop=butcher',
  'shop=bakery',
];

function buildOverpassQuery(bounds: MapBounds): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const tagFilters = TOURISM_TAGS.map((tag) => {
    const [key, value] = tag.split('=');
    return `["${key}"="${value}"]`;
  });

  const nodeQueries = tagFilters
    .map((filter) => `node${filter}(${bbox});`)
    .join('\n');

  const wayQueries = tagFilters
    .map((filter) => `way${filter}(${bbox});`)
    .join('\n');

  return `
    [out:json][timeout:30];
    (
      ${nodeQueries}
      ${wayQueries}
    );
    out center body;
  `;
}

function buildFoodQuery(bounds: MapBounds): string {
  const bbox = `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
  const foodFilters = FOOD_TAGS.map((tag) => {
    const [key, value] = tag.split('=');
    return `["${key}"="${value}"]`;
  });

  const nodeQueries = foodFilters
    .map((filter) => `node${filter}(${bbox});`)
    .join('\n');

  return `
    [out:json][timeout:15];
    (
      ${nodeQueries}
    );
    out body;
  `;
}

function getBoundsForRadius(
  lat: number,
  lng: number,
  radiusKm: number
): MapBounds {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta,
  };
}

function parseOverpassResponse(data: unknown): TouristSpot[] {
  const response = data as {
    elements: Array<{
      id: number;
      type: string;
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags: Record<string, string>;
    }>;
  };

  return response.elements
    .filter((el) => el.lat || el.center)
    .map((el) => {
      const lat = el.lat || el.center?.lat || 0;
      const lng = el.lon || el.center?.lon || 0;
      const tags = el.tags || {};
      const name =
        tags.name ||
        tags['name:en'] ||
        tags['name:local'] ||
        tags['name:bn'] ||
        'Unknown Location';

      let category = 'attraction';
      if (tags.tourism) category = tags.tourism;
      else if (tags.historic) category = tags.historic;
      else if (tags.amenity === 'place_of_worship') category = 'place_of_worship';
      else if (tags.amenity) category = tags.amenity;
      else if (tags.leisure) category = tags.leisure;
      else if (tags.natural) category = tags.natural;
      else if (tags.shop) category = 'marketplace';

      const cuisine = tags.cuisine ? tags.cuisine.split(';').map((s) => s.trim()) : [];
      const description = tags.description || tags.wikipedia || tags['tourism:description'] || undefined;

      const imageUrl = tags.image || tags['wikimedia_commons']
        ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(tags['wikimedia_commons']?.replace('File:', '') || '')}`
        : undefined;

      return {
        id: `${el.type}-${el.id}`,
        name,
        category,
        lat,
        lng,
        description,
        image: imageUrl,
        cuisine,
        tags,
      };
    })
    .filter((spot) => spot.name !== 'Unknown Location' || Object.keys(spot.tags).length > 0);
}

function parseFoodResponse(data: unknown): string[] {
  const response = data as {
    elements: Array<{
      tags: Record<string, string>;
    }>;
  };

  const foods = new Set<string>();
  response.elements.forEach((el) => {
    const tags = el.tags;
    if (tags.cuisine) {
      tags.cuisine.split(';').forEach((c) => foods.add(c.trim()));
    }
    if (tags.name) {
      foods.add(tags.name);
    }
  });

  return Array.from(foods).slice(0, 15);
}

export async function fetchTouristSpots(
  lat: number,
  lng: number,
  radiusKm: number = 5
): Promise<TouristSpot[]> {
  const bounds = getBoundsForRadius(lat, lng, radiusKm);
  const query = buildOverpassQuery(bounds);

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    return parseOverpassResponse(data);
  } catch (error) {
    console.error('Failed to fetch tourist spots:', error);
    return [];
  }
}

export async function fetchNearbyFood(
  lat: number,
  lng: number,
  radiusKm: number = 3
): Promise<string[]> {
  const bounds = getBoundsForRadius(lat, lng, radiusKm);
  const query = buildFoodQuery(bounds);

  try {
    const response = await fetch(OVERPASS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) return [];

    const data = await response.json();
    return parseFoodResponse(data);
  } catch {
    return [];
  }
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    attraction: '🏛️',
    museum: '🎨',
    artwork: '🗿',
    viewpoint: '🔭',
    monument: '🏗️',
    ruins: '🏚️',
    archaeological_site: '⚱️',
    memorial: '🗽',
    castle: '🏰',
    fort: '🏯',
    'place_of_worship': '⛪',
    restaurant: '🍽️',
    cafe: '☕',
    fast_food: '🍔',
    bar: '🍸',
    pub: '🍺',
    park: '🌳',
    peak: '⛰️',
    waterfall: '💧',
    geyser: '🌋',
    marketplace: '🛒',
    zoo: '🦁',
    aquarium: '🐠',
  };
  return icons[category] || '📍';
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    attraction: 'Attraction',
    museum: 'Museum',
    artwork: 'Public Art',
    viewpoint: 'Viewpoint',
    monument: 'Monument',
    ruins: 'Ruins',
    archaeological_site: 'Archaeological Site',
    memorial: 'Memorial',
    castle: 'Castle',
    fort: 'Fort',
    'place_of_worship': 'Place of Worship',
    restaurant: 'Restaurant',
    cafe: 'Cafe',
    fast_food: 'Local Eats',
    bar: 'Bar',
    pub: 'Pub',
    park: 'Park & Nature',
    peak: 'Mountain Peak',
    waterfall: 'Waterfall',
    geyser: 'Geyser',
    marketplace: 'Market',
    zoo: 'Zoo',
    aquarium: 'Aquarium',
  };
  return labels[category] || category;
}
