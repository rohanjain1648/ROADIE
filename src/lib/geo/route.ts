// Tour routing: nearest-neighbour seed + 2-opt improvement, then spread show
// dates across the window with travel-aware gaps.

export interface Point {
  lat: number;
  lon: number;
}

export function haversineKm(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pathLength<T extends Point>(path: T[]): number {
  let d = 0;
  for (let i = 1; i < path.length; i++) d += haversineKm(path[i - 1], path[i]);
  return d;
}

/** Open-path TSP heuristic. Starts from the westernmost-ish extreme so tours sweep. */
export function orderRoute<T extends Point>(stops: T[]): T[] {
  if (stops.length <= 2) return [...stops];

  // Try each stop as a starting point, keep the shortest nearest-neighbour path.
  let best: T[] = [];
  let bestLen = Infinity;
  for (let s = 0; s < stops.length; s++) {
    const remaining = stops.filter((_, i) => i !== s);
    const path: T[] = [stops[s]];
    while (remaining.length) {
      const last = path[path.length - 1];
      let idx = 0;
      let min = Infinity;
      remaining.forEach((p, i) => {
        const d = haversineKm(last, p);
        if (d < min) {
          min = d;
          idx = i;
        }
      });
      path.push(remaining.splice(idx, 1)[0]);
    }
    const len = pathLength(path);
    if (len < bestLen) {
      bestLen = len;
      best = path;
    }
  }

  // 2-opt
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < best.length - 1; i++) {
      for (let k = i + 1; k < best.length; k++) {
        const candidate = [...best.slice(0, i), ...best.slice(i, k + 1).reverse(), ...best.slice(k + 1)];
        const len = pathLength(candidate);
        if (len + 1e-6 < bestLen) {
          best = candidate;
          bestLen = len;
          improved = true;
        }
      }
    }
  }
  return best;
}

export function totalKm<T extends Point>(path: T[]): number {
  return Math.round(pathLength(path));
}

/**
 * Spread shows across [start, end]. Long hops (> 800 km) get an extra travel
 * day when the window allows it. Returns ISO dates (YYYY-MM-DD).
 */
export function scheduleDates<T extends Point>(path: T[], start: string, end: string): string[] {
  const startD = new Date(start + "T00:00:00Z");
  const endD = new Date(end + "T00:00:00Z");
  const windowDays = Math.max(0, Math.round((endD.getTime() - startD.getTime()) / 86400000));
  if (path.length === 0) return [];
  if (path.length === 1) return [start];

  const weights = [0];
  for (let i = 1; i < path.length; i++) {
    const km = haversineKm(path[i - 1], path[i]);
    weights.push(1 + (km > 800 ? 1 : 0) + (km > 2500 ? 1 : 0));
  }
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const scale = windowDays / totalWeight;

  const dates: string[] = [];
  let cursor = 0;
  let lastDay = -1;
  for (let i = 0; i < path.length; i++) {
    cursor += weights[i] * scale;
    let day = Math.round(cursor);
    if (day <= lastDay) day = lastDay + 1; // never two shows on one day
    lastDay = day;
    const d = new Date(startD.getTime() + day * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}
