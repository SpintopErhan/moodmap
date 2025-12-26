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
}

export enum ViewState {
  MAP = 'map', // Küçük harfe çevrildi
  LIST = 'list', // Küçük harfe çevrildi
  ADD = 'add', // Küçük harfe çevrildi
  CLUSTER_LIST = 'cluster_list', // <<< BU SATIR EKLENDİ
}

// Mood seçeneklerini daha genel bir tip olarak tanımlayalım,
// MoodFeed içinde kullanılıyor ve label'ı da içeriyor.
export interface MoodOption {
  emoji: string;
  label: string;
}

export const MOOD_OPTIONS: MoodOption[] = [
  // Status / Vibe

  // Feelings
  { emoji: '😂', label: 'Laughing' },
  { emoji: '😊', label: 'Smiling' }, // <<< YENİ EKLENDİ
  { emoji: '😏', label: 'Smirking' }, // 
  { emoji: '😴', label: 'Sleepy' },
  { emoji: '🤬', label: 'Angry' },
  { emoji: '🤔', label: 'Thinking' },
  { emoji: '🎉', label: 'Party' }, // Zaten Vibe'da var, ama buraya da uygun. Çift olabilir, karar sana kalmış.
  { emoji: '😭', label: 'Crying' },
  { emoji: '🤒', label: 'Sick' },
  { emoji: '😎', label: 'Cool' },
  { emoji: '🥺', label: 'Pleading' },
  { emoji: '🤯', label: 'Mindblown' }, // Zaten Vibe'da var, ama buraya da uygun. Çift olabilir.
  { emoji: '🥰', label: 'In Love' }, // YENİ
  { emoji: '😇', label: 'Blissful' }, // YENİ
  { emoji: '😈', label: 'Mischievous' }, // YENİ
  { emoji: '😶‍🌫️', label: 'Confused' }, // YENİ
  { emoji: '🤩', label: 'Star-struck' }, // YENİ
  { emoji: '😤', label: 'Frustrated' }, // YENİ
  { emoji: '😌', label: 'Relaxed' }, // YENİ
  { emoji: '🤓', label: 'Focused' }, // YENİ
  { emoji: '🥳', label: 'Celebrating' }, // YENİ
  { emoji: '😩', label: 'Stressed' }, // YENİ
  { emoji: '🫠', label: 'Melting' }, // YENİ
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
  { emoji: '🍿', label: 'Movie Night' }, // Label güncellendi
  { emoji: '🍹', label: 'Cocktail' }, // YENİ
  { emoji: '🍦', label: 'Ice Cream' }, // YENİ
  { emoji: '🍣', label: 'Sushi' }, // YENİ
  { emoji: '🍜', label: 'Noodles' }, // YENİ
  { emoji: '🍩', label: 'Donut' }, // YENİ
  { emoji: '🍓', label: 'Fresh Fruit' }, // YENİ
  
  // Activities
  { emoji: '💻', label: 'Coding' },
  { emoji: '🎮', label: 'Gaming' },
  { emoji: '⚽', label: 'Sports' },
  { emoji: '🏋️', label: 'Gym' },
  { emoji: '🧘', label: 'Zen' },
  { emoji: '📚', label: 'Reading' },
  { emoji: '🛁', label: 'Bath' },
  { emoji: '💤', label: 'Sleeping' },
  { emoji: '🎶', label: 'Listening to Music' }, // YENİ
  { emoji: '🎨', label: 'Art/Painting' }, // YENİ
  { emoji: '✍️', label: 'Writing' }, // YENİ
  { emoji: '🎬', label: 'Watching TV' }, // YENİ
  { emoji: '🛍️', label: 'Shopping' }, // YENİ
  { emoji: '🚶‍♀️', label: 'Walking' }, // YENİ
  { emoji: '🧑‍💻', label: 'Working' }, // YENİ
  { emoji: '🧹', label: 'Cleaning' }, // YENİ

   
  // Travel & Exploration
  { emoji: '🚗', label: 'Driving' },
  { emoji: '✈️', label: 'Flying' },
  { emoji: '🏕️', label: 'Camping' },
  { emoji: '🏖️', label: 'Beach' },
  { emoji: '💸', label: 'Spending' },
  { emoji: '👀', label: 'Looking' },
  { emoji: '🗺️', label: 'Exploring' }, // YENİ
  { emoji: '🚄', label: 'Train Ride' }, // YENİ
  { emoji: '🚲', label: 'Cycling' }, // YENİ
  { emoji: '⛵', label: 'Sailing' }, // YENİ
  { emoji: '🏔️', label: 'Hiking' }, // YENİ

  // Nature & Weather (YENİ KATEGORİ)
  { emoji: '☀️', label: 'Sunny Day' },
  { emoji: '🌧️', label: 'Rainy Day' },
  { emoji: '❄️', label: 'Snowy' },
  { emoji: '🌳', label: 'In Nature' },
  { emoji: '🌊', label: 'By the Ocean' },
];

