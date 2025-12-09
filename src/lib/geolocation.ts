// src/lib/geolocation.ts

const OPENCAGE_API_KEY = process.env.NEXT_PUBLIC_OPENCAGE_API_KEY;

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // YENİ EKLENDİ: Bu fonksiyonun sadece istemci tarafında (tarayıcıda) çalışmasını sağla
  if (typeof window === 'undefined') {
    console.warn("reverseGeocode function called on the server. Skipping browser-specific operations.");
    return null; // Sunucu tarafında null dön
  }

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
          return true;
        }
        return false;
      };

      // 1. İlçe (District) - "Karasu" gibi
      let districtFound = false;
      if (addUniqueComponent(components.county)) {
        districtFound = true;
      } else if (addUniqueComponent(components.town)) {
        districtFound = true;
      } else if (addUniqueComponent(components.suburb)) {
        districtFound = true;
      }

      if (!districtFound && components.city && components.state && components.city !== components.state) {
        if (addUniqueComponent(components.city)) {
          districtFound = true;
        }
      } else if (!districtFound && components.city && !components.state) {
          if (addUniqueComponent(components.city)) {
              districtFound = true;
          }
      }

      // 2. İl (Province) - "Sakarya" gibi
      // 'provinceFound' değişkeni artık kullanılmıyor ve kaldırıldı.
      if (addUniqueComponent(components.state)) {
        // Doğrudan addUniqueComponent çağrısı yeterli
      } else if (components.city && !addedParts.has(components.city)) {
        if (addUniqueComponent(components.city)) {
          // Doğrudan addUniqueComponent çağrısı yeterli
        }
      }

      // 3. Ülke (Country) - "Türkiye" gibi
      addUniqueComponent(components.country);

      if (formattedAddressParts.length < 2 && data.results[0].formatted) {
        return data.results[0].formatted;
      }

      return formattedAddressParts.join(', ');
    }
    return null;
  } catch (error) {
    console.error("Error during reverse geocoding:", error);
    return null;
  }
}

export async function forwardGeocode(address: string): Promise<[number, number] | null> {
  // YENİ EKLENDİ: Bu fonksiyonun sadece istemci tarafında (tarayıcıda) çalışmasını sağla
  if (typeof window === 'undefined') {
    console.warn("forwardGeocode function called on the server. Skipping browser-specific operations.");
    return null; // Sunucu tarafında null dön
  }

  if (!OPENCAGE_API_KEY) {
    console.error("OpenCage API key is not defined. Please set NEXT_PUBLIC_OPENCAGE_API_KEY in your environment variables.");
    return null;
  }
  if (!address || address.trim() === '') {
    console.warn("Forward geocoding called with empty address.");
    return null;
  }

  const encodedAddress = encodeURIComponent(address);
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodedAddress}&key=${OPENCAGE_API_KEY}&pretty=1&no_annotations=1&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`OpenCage API error (forward geocode): ${response.status} - ${response.statusText}`);
      const errorData = await response.json();
      console.error("API Response Error:", errorData);
      return null;
    }

    const data = await response.json();

    if (data.results && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry;
      console.log(`Forward geocoded "${address}" to [${lat}, ${lng}]`);
      return [lat, lng];
    }
    console.warn(`No forward geocoding results found for address: "${address}"`);
    return null;
  } catch (error) {
    console.error("Error during forward geocoding:", error);
    return null;
  }
}