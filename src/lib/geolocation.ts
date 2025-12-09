// src/lib/geolocation.ts

const OPENCAGE_API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

/**
 * Verilen enlem ve boylam koordinatları için reverse geocoding yapar.
 * OpenCage Geocoding API'sini kullanır.
 * @param lat - Enlem
 * @param lng - Boylam
 * @returns İlçe, il, Ülke formatında bir string veya null
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!OPENCAGE_API_KEY) {
    console.error("OpenCage API key is not defined. Please set NEXT_PUBLIC_OPENCAGE_API_KEY in your environment variables.");
    return null;
  }

  const url = `https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`OpenCage API error: ${response.status} - ${response.statusText}`);
      const errorData = await response.json();
      console.error("API Response Error:", errorData);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const components = data.results[0].components;
      const formattedAddressParts: string[] = [];
      const addedParts = new Set<string>(); // Tekrar eden bilgileri önlemek için

      // Helper to add a part if it's valid and not a duplicate
      const addUniqueComponent = (component: string | undefined) => {
        if (component && component.trim() !== '' && !addedParts.has(component)) {
          formattedAddressParts.push(component);
          addedParts.add(component);
          return true; // Bileşen eklendi
        }
        return false; // Bileşen eklenmedi (ya undefined/boştu ya da zaten eklenmişti)
      };

      // 1. İlçe (District) - "Karasu" gibi
      let districtFound = false;
      if (addUniqueComponent(components.county)) { // 'county' genellikle en doğru "ilçe" bilgisidir
        districtFound = true;
      } else if (addUniqueComponent(components.town)) { // 'town' küçük bir ilçe veya kasaba olabilir
        districtFound = true;
      } else if (addUniqueComponent(components.suburb)) { // Büyük şehirlerde 'suburb' ilçe karşılığı olabilir (örn: Kadıköy)
        districtFound = true;
      }
      // Eğer yukarıdakilerden hiçbiri bulunamadıysa ve `city` alanı `state`'ten farklı ve belirginse,
      // `city`'yi ilçe olarak kabul et. Bu, küçük yerleşim yerleri için faydalı olabilir.
      if (!districtFound && components.city && components.state && components.city !== components.state) {
        if (addUniqueComponent(components.city)) {
          districtFound = true;
        }
      } else if (!districtFound && components.city && !components.state) { // Sadece city bilgisi varsa
          if (addUniqueComponent(components.city)) {
              districtFound = true;
          }
      }


      // 2. İl (Province) - "Sakarya" gibi
      let provinceFound = false;
      if (addUniqueComponent(components.state)) { // 'state' genellikle il bilgisidir
        provinceFound = true;
      } else if (components.city && !addedParts.has(components.city)) { // 'state' yoksa veya farklıysa 'city' kullan
        if (addUniqueComponent(components.city)) {
          provinceFound = true;
        }
      }


      // 3. Ülke (Country) - "Türkiye" gibi
      addUniqueComponent(components.country);

      // Son kontrol: Eğer formatladığımız adres çok kısa (örn: sadece "Türkiye" veya "Sakarya")
      // ve OpenCage'in tam formatlı adresi daha fazla bağlam sağlıyorsa, onu kullan.
      // Kullanıcı "ilçe, il, ülke" istediği için, en az iki parçanın (ilçe, il) veya (il, ülke) olması tercih edilir.
      if (formattedAddressParts.length < 2 && data.results[0].formatted) {
        return data.results[0].formatted;
      }

      return formattedAddressParts.join(', ');
    }
    return null; // Sonuç bulunamadı
  } catch (error) {
    console.error("Error during reverse geocoding:", error);
    return null;
  }
}