// src/types/app.ts

export interface Location {
  lat: number;
  lng: number;
}

export interface LocationData {
  coords: [number, number]; // Haritanın merkez koordinatları [latitude, longitude]

  // navigator.geolocation API'sinden gelen alanlar:
  timestamp?: number;
  accuracy?: number;

  // Reverse Geocoding ile elde edilen konum etiketi:
  locationLabel?: string; // Konumun insan tarafından okunabilir adı (isteğe bağlı)

  // Harita/Marker konfigürasyonu için kullanılan (isteğe bağlı) alanlar:
  name?: string;
  zoom?: number;
  popupText?: string;

  // Yeni eklenen alan: Konumun türünü belirtir
  // 'preset' tipi eklendi.
  locationType?: 'user' | 'fallback' | 'preset' | 'input'; 
}

export interface Mood {
  id: string;
  emoji: string;
  // 'text' alanı isteğe bağlı yapıldı.
  text?: string; 
  location: Location;
  locationLabel?: string; // e.g. "Karasu, Sakarya, Turkey"
  timestamp: number;
  userId: string;
  username: string;
  fid?: number;
  cast?: boolean;      // Bu özellik Mood arayüzünde OLMALIDIR
  randomloc?: boolean; // Bu özellik Mood arayüzünde OLMALIDIR
}

export enum ViewState {
  MAP = 'map', 
  LIST = 'list', 
  ADD = 'add', 
  CLUSTER_LIST = 'cluster_list', 
}

export interface MoodOption {
  emoji: string;
  label: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  // Status / Vibe
  // Feelings
  { emoji: '😂', label: 'Laughing' },
  { emoji: '😊', label: 'Smiling' }, 
  { emoji: '😏', label: 'Smirking' }, 
  { emoji: '😴', label: 'Sleepy' },
  { emoji: '🤬', label: 'Angry' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '🎉', label: 'Party' }, 
  { emoji: '😭', label: 'Crying' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '😎', label: 'Cool' },
  { emoji: '🥺', label: 'Pleading' },
  { emoji: '🤯', label: 'Mindblown' }, 
  { emoji: '🥰', label: 'In Love' }, 
  { emoji: '😇', label: 'Blissful' }, 
  { emoji: '😈', label: 'Mischievous' }, 
  { emoji: '😶‍🌫️', label: 'Confused' }, 
  { emoji: '🤩', label: 'Star-struck' }, 
  { emoji: '😤', label: 'Frustrated' }, 
  { emoji: '😌', label: 'Relaxed' }, 
  { emoji: '🤓', label: 'Focused' }, 
  { emoji: '🥳', label: 'Celebrating' }, 
  { emoji: '😩', label: 'Stressed' }, 
  { emoji: '🫠', label: 'Melting' }, 
  { emoji: '💩', label: 'Crap' },
  { emoji: '🔥', label: 'Lit' },
  { emoji: '✨', label: 'Sparkle' },
  { emoji: '🚀', label: 'Productive' },
  { emoji: '👻', label: 'Ghosting' },
  
  // Drinks & Food
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🍺', label: 'Beer' },
  { emoji: '🍷', label: 'Wine' },
  { emoji: '🍕', label: 'Pizza' },
  { emoji: '🍔', label: 'Burger' },
  { emoji: '🥗', label: 'Healthy' },
  { emoji: '🍿', label: 'Movie Night' }, 
  { emoji: '🍹', label: 'Cocktail' }, 
  { emoji: '🍦', label: 'Ice Cream' }, 
  { emoji: '🍣', label: 'Sushi' }, 
  { emoji: '🍜', label: 'Noodles' }, 
  { emoji: '🍩', label: 'Donut' }, 
  { emoji: '🍓', label: 'Fresh Fruit' }, 
  
  // Activities
  { emoji: '💻', label: 'Coding' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🧘', label: 'Zen' },
  { emoji: '📚', label: 'Reading' },
  { emoji: '🛁', label: 'Bath' },
  { emoji: '💤', label: 'Sleeping' },
  { emoji: '🎶', label: 'Listening to Music' }, 
  { emoji: '🎨', label: 'Art/Painting' }, 
  { emoji: '✍️', label: 'Writing' }, 
  { emoji: '🎬', label: 'Watching TV' }, 
  { emoji: '🛍️', label: 'Shopping' }, 
  { emoji: '🚶‍♀️', label: 'Walking' }, 
  { emoji: '🧑‍💻', label: 'Working' }, 
  { emoji: '🧹', label: 'Cleaning' }, 

  // Travel & Exploration
  { emoji: '🚗', label: 'Driving' },
  { emoji: '✈️', label: 'Flying' },
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '🏖️', label: 'Beach' },
  { emoji: '💸', label: 'Spending' },
  { emoji: '👀', label: 'Looking' },
  { emoji: '🗺️', label: 'Exploring' }, 
  { emoji: '🚄', label: 'Train Ride' }, 
  { emoji: '🚲', label: 'Cycling' }, 
  { emoji: '⛵', label: 'Sailing' }, 
  { emoji: '🏔️', label: 'Hiking' }, 

  // Nature & Weather (YENİ KATEGORİ)
  { emoji: '☀️', label: 'Sunny Day' },
  { emoji: '🌧️', label: 'Rainy Day' },
  { emoji: '❄️', label: 'Snowy' },
  { emoji: '🌳', label: 'In Nature' },
  { emoji: '🌊', label: 'By the Ocean' },
];