// src/utils/location.ts
import { Location } from '@/types/app'; // Yeni tanımladığımız Location tipini kullan

// Helper function to get human readable address
export const getLocationName = async (lat: number, lng: number): Promise<string> => {
    try {
        // Nominatim API'si kullanım koşullarına uygun bir User-Agent eklemek iyi bir pratik
        // Eğer bu uygulama bir sunucuda çalışıyorsa (örn. Next.js API route), User-Agent eklemek önemlidir.
        // Client-side'da tarayıcı otomatik ekler, ancak yine de belirtmek zarar vermez.
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&accept-language=en`, {
            headers: {
                'User-Agent': 'ModdMapMiniApp/1.0 (contact@your-domain.com)' // Kendi uygulama ve iletişim bilgilerini buraya yaz
            }
        });
        const data = await response.json();
        
        if (data && data.address) {
            const parts = [];
            if (data.address.town || data.address.city || data.address.village) {
                parts.push(data.address.town || data.address.city || data.address.village);
            }
            if (data.address.province || data.address.state) {
                parts.push(data.address.province || data.address.state);
            }
            if (data.address.country) {
                parts.push(data.address.country);
            }
            return parts.join(', ');
        }
        return "Unknown Location";
    } catch (error) {
        console.error("Reverse geocoding failed", error);
        return "Unknown Location";
    }
};