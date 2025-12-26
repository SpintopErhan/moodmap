// src/lib/randomloc.ts

// PresetLocation arayüzü, LocationData'dan türetilebilir veya ayrı tutulabilir.
// Bu arayüz, random_locations.ts dosyası için özeldir ve page.tsx'e import edilir.
export interface PresetLocation {
    id: string;
    name: string;
    coords: [number, number]; // [latitude, longitude]
    zoom: number; // Bu konuma gidildiğinde haritanın zoom seviyesi
}

// Dünya miraslarından veya önemli noktalardan rastgele konumlar
export const RANDOM_LOCATIONS: PresetLocation[] = [
  { id: 'great_pyramid', name: 'Great Pyramid of Giza', coords: [29.9792, 31.1342], zoom: 12 },
  { id: 'colosseum', name: 'Colosseum, Rome', coords: [41.8902, 12.4922], zoom: 14 },
  { id: 'taj_mahal', name: 'Taj Mahal, India', coords: [27.1751, 78.0421], zoom: 13 },
  { id: 'machu_picchu', name: 'Machu Picchu, Peru', coords: [-13.1631, -72.5450], zoom: 12 },
  { id: 'great_wall', name: 'Great Wall of China', coords: [40.4319, 116.5704], zoom: 10 },
  { id: 'chichen_itza', name: 'Chichen Itza, Mexico', coords: [20.6843, -88.5678], zoom: 13 },
  { id: 'petra', name: 'Petra, Jordan', coords: [30.3285, 35.4444], zoom: 12 },
  { id: 'christ_redeemer', name: 'Christ the Redeemer, Brazil', coords: [-22.9519, -43.2105], zoom: 14 },
  { id: 'eiffel_tower', name: 'Eiffel Tower, Paris', coords: [48.8584, 2.2945], zoom: 15 },
  { id: 'statue_liberty', name: 'Statue of Liberty, NYC', coords: [40.6892, -74.0445], zoom: 15 },
  { id: 'sydney_opera', name: 'Sydney Opera House', coords: [-33.8568, 151.2153], zoom: 14 },
  { id: 'acropolis', name: 'Acropolis of Athens', coords: [37.9715, 23.7257], zoom: 15 },
  { id: 'easter_island', name: 'Easter Island, Chile', coords: [-27.1167, -109.3667], zoom: 9 },
  { id: 'angel_falls', name: 'Angel Falls, Venezuela', coords: [5.9710, -62.5367], zoom: 10 },
  { id: 'halong_bay', name: 'Ha Long Bay, Vietnam', coords: [20.9000, 107.0000], zoom: 9 },
  { id: 'victoria_falls', name: 'Victoria Falls, Zambia/Zimbabwe', coords: [-17.9243, 25.8572], zoom: 11 },
  { id: 'amazon_rainforest', name: 'Amazon Rainforest', coords: [-3.4653, -62.2159], zoom: 5 },
  { id: 'grand_canyon', name: 'Grand Canyon, USA', coords: [36.1000, -112.1000], zoom: 9 },
  { id: 'galapagos_islands', name: 'Galapagos Islands, Ecuador', coords: [-0.9400, -90.6500], zoom: 8 },
  { id: 'kyoto_temples', name: 'Historic Kyoto, Japan', coords: [35.0116, 135.7681], zoom: 12 },
];