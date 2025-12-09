// src/types/app.ts

export interface Location {
  lat: number;
  lng: number;
}

export interface LocationData {
  coords: [number, number]; // Haritanın merkez koordinatları [latitude, longitude]

  // navigator.geolocation API'sinden gelen alanlar:
  timestamp?: number; // <<< Bu satır eklendi ve isteğe bağlı hale getirildi
  accuracy?: number;  // <<< Bu satır eklendi ve isteğe bağlı hale getirildi

  // Reverse Geocoding ile elde edilen konum etiketi:
  locationLabel?: string; // Konumun insan tarafından okunabilir adı (isteğe bağlı)

  // Harita/Marker konfigürasyonu için kullanılan (isteğe bağlı) alanlar:
  name?: string;      // İsteğe bağlı hale getirildi
  zoom?: number;      // İsteğe bağlı hale getirildi
  popupText?: string; // İsteğe bağlı hale getirildi
}

export interface Mood {
  id: string;
  emoji: string;
  text: string;
  location: Location;
  locationLabel?: string; // e.g. "Karasu, Sakarya, Turkey"
  timestamp: number;
  userId: string;
  username: string;
}

export enum ViewState {
  MAP = 'MAP',
  LIST = 'LIST',
  ADD = 'ADD'
}

export const MOOD_OPTIONS = [
  // Status / Vibe
  { emoji: '🔥', label: 'Lit' },
  { emoji: '✨', label: 'Sparkle' },
  { emoji: '🚀', label: 'Productive' },
  { emoji: '🦄', label: 'Unique' },
  { emoji: '🌈', label: 'Happy' },
  { emoji: '💩', label: 'Crap' },
  { emoji: '👻', label: 'Ghosting' },
  { emoji: '🤡', label: 'Clown' },
  
  // Drinks & Food
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🍺', label: 'Beer' },
  { emoji: '🍷', label: 'Wine' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🍔', label: 'Burger' },
  { emoji: '🥗', label: 'Healthy' },
  { emoji: '🍿', label: 'Movie' },
  
  // Activities
  { emoji: '💻', label: 'Coding' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🧘', label: 'Zen' },
  { emoji: '📚', label: 'Reading' },
  { emoji: '🛁', label: 'Bath' },
  { emoji: '💤', label: 'Sleeping' },
  
  // Feelings
  { emoji: '😴', label: 'Sleepy' },
  { emoji: '🤬', label: 'Angry' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '🎉', label: 'Party' },
  { emoji: '😭', label: 'Crying' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '😎', label: 'Cool' },
  { emoji: '🥺', label: 'Pleading' },
  { emoji: '🤯', label: 'Mindblown' },
  
  // Travel
  { emoji: '🚗', label: 'Driving' },
  { emoji: '✈️', label: 'Flying' },
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '🏖️', label: 'Beach' },
  { emoji: '💸', label: 'Spending' },
  { emoji: '👀', label: 'Looking' },
];

export const MOCK_MOODS: Mood[] = [
  // Cluster Simulation: Kadikoy
  { id: 'k1', emoji: '🍻', text: 'Kadikoy nights!', location: { lat: 40.9901, lng: 29.0292 }, locationLabel: 'Kadıköy, İstanbul, Turkey', timestamp: Date.now() - 10000, userId: 'u10', username: 'Barış' },
  { id: 'k2', emoji: '🎸', text: 'Rock concert vibe', location: { lat: 40.9901, lng: 29.0292 }, locationLabel: 'Kadıköy, İstanbul, Turkey', timestamp: Date.now() - 20000, userId: 'u11', username: 'Selin' },
  { id: 'k3', emoji: '🍕', text: 'Late night pizza', location: { lat: 40.9901, lng: 29.0292 }, locationLabel: 'Kadıköy, İstanbul, Turkey', timestamp: Date.now() - 30000, userId: 'u12', username: 'Can' },
  { id: 'k4', emoji: '😽', text: 'Feeding stray cats', location: { lat: 40.9901, lng: 29.0292 }, locationLabel: 'Kadıköy, İstanbul, Turkey', timestamp: Date.now() - 40000, userId: 'u13', username: 'Zeynep' },
  { id: 'k5', emoji: '🚢', text: 'Ferry ride', location: { lat: 40.9901, lng: 29.0292 }, locationLabel: 'Kadıköy, İstanbul, Turkey', timestamp: Date.now() - 50000, userId: 'u14', username: 'Deniz' },

  // Other locations
  { id: '1', emoji: '🔥', text: 'Coding marathon!', location: { lat: 41.0082, lng: 28.9784 }, locationLabel: 'Fatih, Istanbul, Turkey', timestamp: Date.now() - 100000, userId: 'u1', username: 'Erhan' },
  { id: '2', emoji: '☕', text: 'Need more coffee...', location: { lat: 41.0122, lng: 28.9854 }, locationLabel: 'Beyoğlu, Istanbul, Turkey', timestamp: Date.now() - 500000, userId: 'u2', username: 'Dev_Jane' },
];