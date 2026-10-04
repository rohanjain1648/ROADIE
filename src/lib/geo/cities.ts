// Candidate tour markets. Heatmap points from Qloo are snapped onto these
// cities so every recommendation lands on a real, routable market.

export interface City {
  name: string;
  country: string;
  lat: number;
  lon: number;
  pop: number; // millions (city proper, approximate)
}

export interface Region {
  id: string;
  label: string;
  /** Location strings sent to Qloo's heatmap (`filter.location.query`). */
  heatmapQueries: string[];
  center: [number, number]; // [lon, lat] for the map
  zoom: number;
  languages: string[];
  cities: City[];
}

const c = (name: string, country: string, lat: number, lon: number, pop: number): City => ({
  name,
  country,
  lat,
  lon,
  pop,
});

export const REGIONS: Region[] = [
  {
    id: "north-america",
    label: "North America",
    heatmapQueries: ["United States", "Canada"],
    center: [-96, 40],
    zoom: 3,
    languages: ["English", "Spanish", "French"],
    cities: [
      c("New York", "US", 40.7128, -74.006, 8.3),
      c("Los Angeles", "US", 34.0522, -118.2437, 3.9),
      c("Chicago", "US", 41.8781, -87.6298, 2.7),
      c("Houston", "US", 29.7604, -95.3698, 2.3),
      c("Phoenix", "US", 33.4484, -112.074, 1.6),
      c("Philadelphia", "US", 39.9526, -75.1652, 1.6),
      c("San Diego", "US", 32.7157, -117.1611, 1.4),
      c("Dallas", "US", 32.7767, -96.797, 1.3),
      c("Austin", "US", 30.2672, -97.7431, 0.97),
      c("San Francisco", "US", 37.7749, -122.4194, 0.81),
      c("Seattle", "US", 47.6062, -122.3321, 0.75),
      c("Denver", "US", 39.7392, -104.9903, 0.71),
      c("Nashville", "US", 36.1627, -86.7816, 0.69),
      c("Washington", "US", 38.9072, -77.0369, 0.69),
      c("Boston", "US", 42.3601, -71.0589, 0.65),
      c("Portland", "US", 45.5152, -122.6784, 0.65),
      c("Las Vegas", "US", 36.1699, -115.1398, 0.66),
      c("Detroit", "US", 42.3314, -83.0458, 0.63),
      c("Atlanta", "US", 33.749, -84.388, 0.5),
      c("Minneapolis", "US", 44.9778, -93.265, 0.43),
      c("New Orleans", "US", 29.9511, -90.0715, 0.38),
      c("Miami", "US", 25.7617, -80.1918, 0.44),
      c("Kansas City", "US", 39.0997, -94.5786, 0.51),
      c("Salt Lake City", "US", 40.7608, -111.891, 0.2),
      c("Pittsburgh", "US", 40.4406, -79.9959, 0.3),
      c("Columbus", "US", 39.9612, -82.9988, 0.9),
      c("Charlotte", "US", 35.2271, -80.8431, 0.87),
      c("St. Louis", "US", 38.627, -90.1994, 0.29),
      c("Milwaukee", "US", 43.0389, -87.9065, 0.57),
      c("Asheville", "US", 35.5951, -82.5515, 0.09),
      c("Toronto", "CA", 43.6532, -79.3832, 2.8),
      c("Montreal", "CA", 45.5017, -73.5673, 1.8),
      c("Vancouver", "CA", 49.2827, -123.1207, 0.66),
      c("Calgary", "CA", 51.0447, -114.0719, 1.3),
    ],
  },
  {
    id: "uk-europe",
    label: "UK & Europe",
    heatmapQueries: [
      "United Kingdom", "Ireland", "France", "Germany", "Netherlands", "Belgium", "Spain", "Portugal",
      "Italy", "Austria", "Czechia", "Denmark", "Sweden", "Norway", "Poland", "Switzerland",
    ],
    center: [8, 50],
    zoom: 3.4,
    languages: ["English", "French", "German", "Spanish", "Italian", "Dutch"],
    cities: [
      c("London", "GB", 51.5074, -0.1278, 8.9),
      c("Manchester", "GB", 53.4808, -2.2426, 0.55),
      c("Glasgow", "GB", 55.8642, -4.2518, 0.63),
      c("Birmingham", "GB", 52.4862, -1.8904, 1.1),
      c("Bristol", "GB", 51.4545, -2.5879, 0.47),
      c("Leeds", "GB", 53.8008, -1.5491, 0.79),
      c("Dublin", "IE", 53.3498, -6.2603, 0.59),
      c("Paris", "FR", 48.8566, 2.3522, 2.1),
      c("Berlin", "DE", 52.52, 13.405, 3.6),
      c("Hamburg", "DE", 53.5511, 9.9937, 1.8),
      c("Munich", "DE", 48.1351, 11.582, 1.5),
      c("Amsterdam", "NL", 52.3676, 4.9041, 0.87),
      c("Brussels", "BE", 50.8503, 4.3517, 1.2),
      c("Barcelona", "ES", 41.3874, 2.1686, 1.6),
      c("Madrid", "ES", 40.4168, -3.7038, 3.3),
      c("Lisbon", "PT", 38.7223, -9.1393, 0.55),
      c("Milan", "IT", 45.4642, 9.19, 1.4),
      c("Rome", "IT", 41.9028, 12.4964, 2.8),
      c("Vienna", "AT", 48.2082, 16.3738, 1.9),
      c("Prague", "CZ", 50.0755, 14.4378, 1.3),
      c("Copenhagen", "DK", 55.6761, 12.5683, 0.64),
      c("Stockholm", "SE", 59.3293, 18.0686, 0.98),
      c("Oslo", "NO", 59.9139, 10.7522, 0.7),
      c("Warsaw", "PL", 52.2297, 21.0122, 1.8),
      c("Zurich", "CH", 47.3769, 8.5417, 0.42),
    ],
  },
  {
    id: "india",
    label: "India",
    heatmapQueries: ["India"],
    center: [79, 22],
    zoom: 3.8,
    languages: ["English", "Hindi", "Hinglish", "Marathi", "Tamil", "Telugu", "Kannada", "Bengali", "Malayalam"],
    cities: [
      c("Mumbai", "IN", 19.076, 72.8777, 12.4),
      c("Delhi", "IN", 28.7041, 77.1025, 16.8),
      c("Bengaluru", "IN", 12.9716, 77.5946, 8.4),
      c("Hyderabad", "IN", 17.385, 78.4867, 6.8),
      c("Chennai", "IN", 13.0827, 80.2707, 7.1),
      c("Kolkata", "IN", 22.5726, 88.3639, 4.5),
      c("Pune", "IN", 18.5204, 73.8567, 3.1),
      c("Ahmedabad", "IN", 23.0225, 72.5714, 5.6),
      c("Jaipur", "IN", 26.9124, 75.7873, 3.0),
      c("Goa", "IN", 15.4909, 73.8278, 0.11),
      c("Chandigarh", "IN", 30.7333, 76.7794, 1.0),
      c("Kochi", "IN", 9.9312, 76.2673, 0.6),
      c("Lucknow", "IN", 26.8467, 80.9462, 2.8),
      c("Shillong", "IN", 25.5788, 91.8933, 0.14),
      c("Indore", "IN", 22.7196, 75.8577, 1.9),
      c("Gurugram", "IN", 28.4595, 77.0266, 0.88),
    ],
  },
  {
    id: "australia-nz",
    label: "Australia & NZ",
    heatmapQueries: ["Australia", "New Zealand"],
    center: [150, -32],
    zoom: 3.2,
    languages: ["English"],
    cities: [
      c("Sydney", "AU", -33.8688, 151.2093, 5.3),
      c("Melbourne", "AU", -37.8136, 144.9631, 5.0),
      c("Brisbane", "AU", -27.4698, 153.0251, 2.5),
      c("Perth", "AU", -31.9505, 115.8605, 2.1),
      c("Adelaide", "AU", -34.9285, 138.6007, 1.4),
      c("Canberra", "AU", -35.2809, 149.13, 0.43),
      c("Hobart", "AU", -42.8821, 147.3272, 0.25),
      c("Auckland", "NZ", -36.8485, 174.7633, 1.7),
      c("Wellington", "NZ", -41.2865, 174.7762, 0.21),
    ],
  },
  {
    id: "latin-america",
    label: "Latin America",
    heatmapQueries: ["Mexico", "Colombia", "Peru", "Chile", "Argentina", "Brazil"],
    center: [-75, -5],
    zoom: 2.4,
    languages: ["Spanish", "Portuguese", "English"],
    cities: [
      c("Mexico City", "MX", 19.4326, -99.1332, 9.2),
      c("Guadalajara", "MX", 20.6597, -103.3496, 1.5),
      c("Monterrey", "MX", 25.6866, -100.3161, 1.1),
      c("Bogotá", "CO", 4.711, -74.0721, 7.4),
      c("Medellín", "CO", 6.2442, -75.5812, 2.5),
      c("Lima", "PE", -12.0464, -77.0428, 9.7),
      c("Santiago", "CL", -33.4489, -70.6693, 6.2),
      c("Buenos Aires", "AR", -34.6037, -58.3816, 3.0),
      c("São Paulo", "BR", -23.5505, -46.6333, 12.3),
      c("Rio de Janeiro", "BR", -22.9068, -43.1729, 6.7),
    ],
  },
];

export function getRegion(id: string): Region {
  return REGIONS.find((r) => r.id === id) ?? REGIONS[0];
}

export function findCity(name: string): City | undefined {
  const needle = name.toLowerCase().trim();
  for (const r of REGIONS) {
    const hit = r.cities.find((ct) => ct.name.toLowerCase() === needle);
    if (hit) return hit;
  }
  return undefined;
}

export function regionForCountryQuery(query: string): Region | undefined {
  const q = query.toLowerCase();
  return REGIONS.find((r) => r.heatmapQueries.some((h) => h.toLowerCase() === q) || r.label.toLowerCase() === q);
}
