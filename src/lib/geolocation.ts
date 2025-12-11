// src/lib/geolocation.ts

const OPENCAGE_API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

// Cache için sabitler
const REVERSE_GEOCODE_CACHE_KEY = 'reverse_geocode_cache';
const FORWARD_GEOCODE_CACHE_KEY = 'forward_geocode_cache';
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 gün
const COORDINATE_PRECISION = 2; // Önbellek anahtarı için koordinat hassasiyeti (örn. 3 ondalık basamak)

// OpenCage API yanıtları için tip tanımlamaları
interface OpenCageComponents {
  county?: string;      // İlçe/Bölge
  town?: string;        // Kasaba
  suburb?: string;      // Banliyö
  city?: string;        // Şehir
  state?: string;       // Eyalet/İl (örn. "Istanbul")
  province?: string;    // Eyalet/İl (alternatif)
  country?: string;     // Ülke
  village?: string;     // Köy
}

interface OpenCageGeometry {
  lat: number;
  lng: number;
}

interface OpenCageResult {
  components: OpenCageComponents;
  geometry: OpenCageGeometry;
  formatted: string; // OpenCage tarafından sağlanan tam formatlanmış adres
}

interface OpenCageResponse {
  results: OpenCageResult[];
  status: {
    code: number;
    message: string;
    // Diğer status alanları...
  };
  // Diğer meta veriler...
}

// Önbellek yapısı
interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

// Generic önbellek okuma fonksiyonu
function getCache<T>(key: string, cacheKey: string): CacheEntry<T> | null {
  if (typeof window === 'undefined') return null;
  try {
    const fullCache = localStorage.getItem(cacheKey);
    console.log(`[DEBUG Cache] getCache(${cacheKey}, ${key}) - Raw cache:`, fullCache); // Ek log
    if (!fullCache) {
      console.log(`[DEBUG Cache] No full cache found for ${cacheKey}`); // Ek log
      return null;
    }

    const parsedCache = JSON.parse(fullCache);
    const entry = parsedCache[key];

    console.log(`[DEBUG Cache] getCache(${cacheKey}, ${key}) - Parsed cache entry:`, entry); // Ek log
    
    if (entry && (Date.now() - entry.timestamp < CACHE_EXPIRATION_MS)) {
      console.log(`[Geolocation Cache] Hit for ${key} in ${cacheKey}`);
      return entry;
    } else if (entry) {
      console.log(`[DEBUG Cache] Entry for ${key} in ${cacheKey} expired. Timestamp: ${entry.timestamp}, Current: ${Date.now()}`); // Ek log
      delete parsedCache[key];
      localStorage.setItem(cacheKey, JSON.stringify(parsedCache));
      console.log(`[Geolocation Cache] Expired entry for ${key} in ${cacheKey} removed.`);
    } else {
      console.log(`[DEBUG Cache] No valid entry found for key ${key} in ${cacheKey}. (Miss or undefined)`); // Ek log
    }
  } catch (e) {
    console.error(`[Geolocation Cache] Error reading cache ${cacheKey}:`, e);
    // Hatalı veya bozuk önbelleği temizle
    localStorage.removeItem(cacheKey);
  }
  return null;
}

// Generic önbellek yazma fonksiyonu
function setCache<T>(key: string, value: T, cacheKey: string): void {
  if (typeof window === 'undefined') return; // Sadece client tarafında çalışır
  try {
    const fullCache = localStorage.getItem(cacheKey);
    const parsedCache = fullCache ? JSON.parse(fullCache) : {};
    parsedCache[key] = { value, timestamp: Date.now() };
    localStorage.setItem(cacheKey, JSON.stringify(parsedCache));
    console.log(`[Geolocation Cache] Set for ${key} in ${cacheKey}`);
  } catch (e) {
    console.error(`[Geolocation Cache] Error writing cache ${cacheKey}:`, e);
  }
}

/**
 * OpenCage API'ye yapılan çağrıları merkezileştiren ve hata yönetimini sağlayan yardımcı fonksiyon.
 * Sadece istemci tarafında çalışır ve API anahtarının tanımlı olup olmadığını kontrol eder.
 */
async function callOpenCageApi<T>(
  url: string,
  context: string // Log mesajlarında hangi fonksiyonun çağırdığını belirtmek için
): Promise<T | null> {
  // Bu fonksiyonun sadece istemci tarafında (tarayıcıda) çalışmasını sağla
  if (typeof window === 'undefined') {
    console.warn(`[Geolocation] ${context} function called on the server. Skipping browser-specific operations.`);
    return null;
  }

  // API anahtarının tanımlı olup olmadığını kontrol et
  if (!OPENCAGE_API_KEY) {
    console.error(`[Geolocation] OpenCage API key is not defined. Please set NEXT_PUBLIC_OPENCAGE_API_KEY for ${context}.`);
    return null;
  }

  try {
    const response = await fetch(url);

    // HTTP yanıtının başarılı olup olmadığını kontrol et
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})); // JSON olmayan yanıtları da ele al
      console.error(`[Geolocation] OpenCage API error (${context}): ${response.status} - ${response.statusText}`, errorData);
      return null;
    }

    return await response.json(); // Başarılı yanıtı JSON olarak döndür
  } catch (error) {
    // Ağ hataları veya diğer beklenmedik hatalar
    console.error(`[Geolocation] Error during OpenCage API call (${context}):`, error);
    return null;
  }
}

/**
 * Verilen enlem ve boylam koordinatları için insan tarafından okunabilir bir adres döndürür.
 * Adres, ilçe, il/eyalet ve ülke bilgilerini içerecek şekilde formatlanır.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // Koordinatları belirli bir hassasiyete yuvarlayarak önbellek anahtarı oluştur
  const cacheKeyRounded = `${lat.toFixed(COORDINATE_PRECISION)},${lng.toFixed(COORDINATE_PRECISION)}`;
  const cached = getCache<string>(cacheKeyRounded, REVERSE_GEOCODE_CACHE_KEY);
  if (cached) {
    return cached.value;
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1`;

  const data = await callOpenCageApi<OpenCageResponse>(url, "Reverse Geocoding");
  if (!data || !data.results || data.results.length === 0) {
    console.warn(`[Geolocation] No reverse geocoding results found for [${lat}, ${lng}]`);
    return null;
  }

  const components = data.results[0].components;
  const formattedAddressParts: string[] = [];
  const addedParts = new Set<string>(); // Tekrar eden adres parçalarını önlemek için

  // Yardımcı fonksiyon: Bir adresi listeye ekler, geçerliyse ve daha önce eklenmediyse
  const addUniquePart = (part: string | undefined): boolean => {
    if (part && part.trim() !== '' && !addedParts.has(part)) {
      formattedAddressParts.push(part);
      addedParts.add(part);
      return true;
    }
    return false;
  };

  // 1. En spesifik yerleşim birimini bulmaya çalış (ilçe, kasaba, banliyö, köy)
  // 'specificLocationAdded' değişkenini atamaktan vazgeçiyoruz.
  // Sadece addUniquePart çağrılarını yapıyoruz.
  addUniquePart(components.county) ||
  addUniquePart(components.town) ||
  addUniquePart(components.suburb) ||
  addUniquePart(components.village);

  // 2. Şehir ekle
  addUniquePart(components.city);

  // 3. Eyalet/İl ekle
  const stateOrProvince = components.state || components.province;
  addUniquePart(stateOrProvince);

  // 4. Ülke ekle (her zaman en sona)
  addUniquePart(components.country);

  // Eğer çok az bilgi bulabildiysek (örn. sadece ülke), OpenCage'in tam formatlı adresini kullan
  if (formattedAddressParts.length < 2 && data.results[0].formatted) {
    console.log(`[Geolocation] Not enough specific parts found for [${lat}, ${lng}]. Using full formatted address as fallback: "${data.results[0].formatted}"`);
    const resultFallback = data.results[0].formatted;
    setCache(cacheKeyRounded, resultFallback, REVERSE_GEOCODE_CACHE_KEY); // Önbelleğe kaydet
    return resultFallback;
  }
  
  const result = formattedAddressParts.join(', ');
  console.log(`[Geolocation] Reverse geocoded [${lat}, ${lng}] to "${result}"`);
  setCache(cacheKeyRounded, result, REVERSE_GEOCODE_CACHE_KEY); // Önbelleğe kaydet
  return result;
}

/**
 * Verilen adres dizesi için coğrafi koordinatları (enlem ve boylam) döndürür.
 */
export async function forwardGeocode(address: string): Promise<[number, number] | null> {
  if (!address || address.trim() === '') {
    console.warn("[Geolocation] Forward geocoding called with empty address. Returning null.");
    return null;
  }

  const cacheKey = address.toLowerCase(); // Adres case-insensitive olabilir
  const cached = getCache<[number, number]>(cacheKey, FORWARD_GEOCODE_CACHE_KEY);
  if (cached) {
    return cached.value;
  }

  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1&limit=1`;

  const data = await callOpenCageApi<OpenCageResponse>(url, "Forward Geocoding");
  if (!data || !data.results || data.results.length === 0) {
    console.warn(`[Geolocation] No forward geocoding results found for address: "${address}"`);
    return null;
  }

  const { lat, lng } = data.results[0].geometry;
  const result: [number, number] = [lat, lng];
  console.log(`[Geolocation] Forward geocoded "${address}" to [${lat}, ${lng}]`);
  setCache(cacheKey, result, FORWARD_GEOCODE_CACHE_KEY); // Önbelleğe kaydet
  return result;
}