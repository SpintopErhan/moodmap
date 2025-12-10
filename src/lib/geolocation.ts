// src/lib/geolocation.ts

const OPENCAGE_API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

// OpenCage API yanıtları için tip tanımlamaları
// Sadece kullanılan alanları veya gelecekte kullanılabilecek önemli alanları dahil ediyoruz.
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
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1`;

  // Ortak API çağrı helper fonksiyonunu kullan
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
  // Bu, "ilçe" seviyesindeki anonimliği sağlar.
  const specificLocationFound = 
    addUniquePart(components.county) ||
    addUniquePart(components.town) ||
    addUniquePart(components.suburb) ||
    addUniquePart(components.village);

  // 2. Şehir ekle (yalnızca daha spesifik bir yerleşim birimi bulunamadıysa veya farklıysa)
  if (components.city && !addedParts.has(components.city)) {
    // Eğer henüz hiç bir yerleşim birimi eklenmediyse veya eklenenlerden farklıysa şehri ekle
    if (!specificLocationFound || (specificLocationFound && !formattedAddressParts.includes(components.city))) {
        addUniquePart(components.city);
    }
  }

  // 3. Eyalet/İl ekle (şehirden farklıysa veya şehir yoksa)
  // "state" ve "province" OpenCage'de il/eyalet anlamına gelir.
  const stateOrProvince = components.state || components.province;
  if (stateOrProvince && !addedParts.has(stateOrProvince)) {
    // Eğer bir şehir veya daha spesifik bir yerleşim birimi eklendiyse,
    // ve bu il/eyalet bunlardan farklıysa ekle.
    // Örneğin "Kadıköy, İstanbul, Türkiye" -> "İstanbul" iki kere eklenmesin.
    if (!formattedAddressParts.includes(stateOrProvince)) {
        addUniquePart(stateOrProvince);
    }
  }

  // 4. Ülke ekle (her zaman en sona)
  addUniquePart(components.country);

  // Eğer çok az bilgi bulabildiysek (örn. sadece ülke), OpenCage'in tam formatlı adresini kullan
  // Bu, her zaman anlamlı bir adres dönmesini sağlar.
  if (formattedAddressParts.length < 2 && data.results[0].formatted) {
    console.log(`[Geolocation] Not enough specific parts found for [${lat}, ${lng}]. Using full formatted address as fallback: "${data.results[0].formatted}"`);
    return data.results[0].formatted;
  }
  
  const result = formattedAddressParts.join(', ');
  console.log(`[Geolocation] Reverse geocoded [${lat}, ${lng}] to "${result}"`);
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

  const encodedAddress = encodeURIComponent(address);
  // `limit=1` en alakalı tek bir sonucun dönmesini sağlar.
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1&limit=1`;

  // Ortak API çağrı helper fonksiyonunu kullan
  const data = await callOpenCageApi<OpenCageResponse>(url, "Forward Geocoding");
  if (!data || !data.results || data.results.length === 0) {
    console.warn(`[Geolocation] No forward geocoding results found for address: "${address}"`);
    return null;
  }

  const { lat, lng } = data.results[0].geometry;
  console.log(`[Geolocation] Forward geocoded "${address}" to [${lat}, ${lng}]`);
  return [lat, lng];
}