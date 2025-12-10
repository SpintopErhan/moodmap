// src/components/Map/Map.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mood, LocationData } from '@/types/app'; // LocationData must contain locationType

// Import Leaflet icon files directly
import defaultIcon from 'leaflet/dist/images/marker-icon.png';
import defaultIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import defaultShadow from 'leaflet/dist/images/marker-shadow.png';

// Create default Leaflet icon
const DefaultIcon = L.icon({
  iconUrl: defaultIcon.src,
  iconRetinaUrl: defaultIconRetina.src,
  shadowUrl: defaultShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
});
// BU SATIR KALDIRILDI: L.Marker.prototype.options.icon = DefaultIcon; // Sunucu tarafı hatasına neden oluyordu.
                                                                    // Şimdi Map komponenti içinde useEffect ile atanacak.

// --- Custom Emoji Marker for Single Mood ---
const createEmojiIcon = (emoji: string) => {
  return L.divIcon({
    className: 'custom-emoji-marker',
    html: `<div class="
      bg-slate-800/95 
      border-2 border-purple-600 
      rounded-full 
      w-10 h-10 
      flex items-center justify-center 
      text-2xl 
      shadow-md 
      transition-transform 
      hover:scale-110
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -25]
  });
};

// --- Custom Cluster Marker for Multiple Moods (GÜNCELLENMİŞ HALİ) ---
const createClusterIcon = (emojis: string[]) => {
    const displayedEmojis = emojis.slice(0, 3); // İlk 3 emojiyi al
    
    let stackedEmojisHtml = '';

    // Emojilerin temel stilini ve dikey ortalama ayarını tanımlıyoruz
    // text-lg: emoji boyutu (Yaklaşık 18px). text-xl (20px) yerine daha iyi sığması için düşürüldü.
    const baseInnerEmojiStyle = `
        absolute 
        top-1/2 -translate-y-1/2 
        text-2xl 
        pointer-events-none 
    `; 

    // Emojilerin birbirine göre ne kadar kaydırılacağını belirleyen değişken (piksel cinsinden)
    // Bu değeri değiştirerek kartlar arası mesafeyi ayarlayabilirsin.
    const offsetIncrement = 6; // Her emojinin sağa doğru kayma miktarı (6px, 8px deneyebilirsin)

    // İlk emojinin marker çerçevesine olan uzaklığı (sol taraftan boşluk)
    // Bu değeri değiştirerek tüm emoji grubunun başlangıç noktasını ayarlayabilirsin.
    const initialLeftMargin = -4; // Daha küçük bir değer, ilk emojiyi sola yaklaştırır (2px, 0px, 4px deneyebilirsin)

    // Emoji sayısına göre ofsetleri ve rotasyonları belirliyoruz
    if (displayedEmojis.length === 1) {
        // Tek emoji varsa tamamen ortala
        stackedEmojisHtml = `
            <span class="${baseInnerEmojiStyle}" style="left: 50%; transform: translate(-50%, -50%); z-index: 3;">
                ${displayedEmojis[0]}
            </span>
        `;
    } else if (displayedEmojis.length === 2) {
        stackedEmojisHtml = `
            <span class="${baseInnerEmojiStyle}" style="left: ${initialLeftMargin}px; transform: translateY(-50%) rotate(-7deg); z-index: 2;">
                ${displayedEmojis[0]}
            </span>
            <span class="${baseInnerEmojiStyle}" style="left: ${initialLeftMargin + offsetIncrement}px; transform: translateY(-50%) rotate(7deg); z-index: 3;">
                ${displayedEmojis[1]}
            </span>
        `;
    } else if (displayedEmojis.length >= 3) {
        stackedEmojisHtml = `
            <span class="${baseInnerEmojiStyle}" style="left: ${initialLeftMargin}px; transform: translateY(-50%) rotate(-10deg); z-index: 1;">
                ${displayedEmojis[0]}
            </span>
            <span class="${baseInnerEmojiStyle}" style="left: ${initialLeftMargin + offsetIncrement}px; transform: translateY(-50%) rotate(0deg); z-index: 2;">
                ${displayedEmojis[1]}
            </span>
            <span class="${baseInnerEmojiStyle}" style="left: ${initialLeftMargin + (2 * offsetIncrement)}px; transform: translateY(-50%) rotate(10deg); z-index: 3;">
                ${displayedEmojis[2]}
            </span>
        `;
    }

    return L.divIcon({
      className: 'custom-cluster-marker',
      html: `<div class="
        bg-slate-800/95 
        border-2 border-purple-600 
        rounded-full 
        w-10 h-10 
        relative /* İçindeki elemanlar için konumlandırma referansı */
        overflow-hidden /* Kenarların dışına çıkan emojileri kırp */
        shadow-md /* Tekil emoji ile aynı gölge */
      ">${stackedEmojisHtml}</div>`,
      iconSize: [40, 40], // Tekil emoji ile aynı boyut
      iconAnchor: [20, 20], // Ortalanmış ikon çapası
      popupAnchor: [0, -25] // Tekil emoji ile aynı popup çapası
    });
  };

// --- ClusterPopupList Component (TUT-SÜRÜKLE KAYDIRMA KALDIRILDI) ---
const ClusterPopupList: React.FC<{ moods: Mood[] }> = ({ moods }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation(); // Fare tekerleğiyle kaydırmanın olay yayılımını durdur
  }, []);

  return (
    <div
      ref={scrollRef}
      className={`max-h-[250px] overflow-y-auto custom-scrollbar p-2 bg-slate-800 rounded-b-lg select-none`} 
      onWheel={handleWheel} 
      style={{ touchAction: 'pan-y' }} 
    >
        {moods.map((m) => (
            <div key={m.id} className="flex items-start gap-2 mb-2 last:mb-0 border-b border-slate-700 pb-2 last:border-0 last:pb-0">
                <div className="text-2xl shrink-0">{m.emoji}</div>
                <div>
                    <div className="text-xs font-bold text-white">{m.username}</div>
                    {m.text && <div className="text-xs text-gray-300 italic break-words">&quot;{m.text}&quot;</div>}
                    <div className="text-[9px] text-gray-400 mt-0.5">
                        {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        ))}
    </div>
  );
};

// REMOTE_LOCATIONS updated: locationType added to each
const REMOTE_LOCATIONS: LocationData[] = [
  { name: "Sahara Desert", coords: [23.4514, 15.5369], zoom: 5, popupText: "Location permission denied: Sahara Desert", locationType: 'fallback' },
  { name: "Antarctica", coords: [-75.0000, 25.0000], zoom: 3, popupText: "Location permission denied: Antarctica", locationType: 'fallback' },
  { name: "Greenland", coords: [71.7069, -42.6043], zoom: 4, popupText: "Location permission denied: Greenland", locationType: 'fallback' },
  { name: "Mariana Trench", coords: [11.3650, 142.2500], zoom: 7, popupText: "Location permission denied: Mariana Trench", locationType: 'fallback' },
];

const getRandomRemoteLocation = (): LocationData => {
  const randomIndex = Math.floor(Math.random() * REMOTE_LOCATIONS.length);
  return REMOTE_LOCATIONS[randomIndex];
};

interface MapRecenterHandlerProps {
    recenterTrigger?: { coords: [number, number], zoom: number, animate: boolean, purpose: 'userLocation' | 'presetLocation' } | null; // 'purpose' eklendi
    onRecenterComplete?: () => void;
}

function MapRecenterHandler({ recenterTrigger, onRecenterComplete }: MapRecenterHandlerProps) {
    const map = useMap();
    const isProgrammaticMoveRef = useRef(false);

    const handleMoveEnd = useCallback(() => {
        if (isProgrammaticMoveRef.current) {
            isProgrammaticMoveRef.current = false;
            onRecenterComplete?.();
        }
    }, [onRecenterComplete]);

    const handleUserInteraction = useCallback(() => {
        if (isProgrammaticMoveRef.current) {
            console.log("[MapRecenterHandler] User interaction detected, stopping programmatic movement.");
            if (map && typeof map.stop === 'function') {
                map.stop();
            }
            isProgrammaticMoveRef.current = false;
            onRecenterComplete?.();
        }
    }, [map, onRecenterComplete]);

    useEffect(() => {
        if (!recenterTrigger) {
            return;
        }

        const { coords, zoom, animate } = recenterTrigger;

        if (animate) {
            isProgrammaticMoveRef.current = true;
            map.flyTo(coords, zoom, {
                animate: true,
                duration: 1.5
            });

            map.on('moveend', handleMoveEnd);
            map.on('mousedown', handleUserInteraction);
            map.on('touchstart', handleUserInteraction);
            map.on('zoomstart', handleUserInteraction);
            map.on('dragstart', handleUserInteraction);

            return () => {
                map.off('moveend', handleMoveEnd);
                map.off('mousedown', handleUserInteraction);
                map.off('touchstart', handleUserInteraction);
                map.off('zoomstart', handleUserInteraction);
                map.off('dragstart', handleUserInteraction);
                isProgrammaticMoveRef.current = false;
            };
        } else {
            map.setView(coords, zoom, { animate: false });
            onRecenterComplete?.();
        }

    }, [recenterTrigger, map, onRecenterComplete, handleMoveEnd, handleUserInteraction]);

    return null;
}

interface MapUserInteractionWatcherProps {
  onMapMove: () => void;
}

const MapUserInteractionWatcher: React.FC<MapUserInteractionWatcherProps> = ({ onMapMove }) => {
  useMapEvents({
    dragstart: () => {
      console.log("[MapUserInteractionWatcher] User started dragging map.");
      onMapMove();
    },
    zoomstart: () => {
      console.log("[MapUserInteractionWatcher] User started zooming map.");
      onMapMove();
    },
  });
  return null;
};

const MapTouchFixer: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    const handleZoomEnd = () => {
      console.log("[MapTouchFixer] Zoom ended, resetting dragging...");
      map.dragging.disable();
      setTimeout(() => {
        map.dragging.enable();
        console.log("[MapTouchFixer] Dragging re-enabled.");
      }, 50);
    };

    map.on('zoomend', handleZoomEnd);

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map]);

  return null;
};


interface MapComponentProps {
  height?: string;
  moods: Mood[];
  onInitialLocationDetermined?: (locationData: LocationData | null) => void;
  // GÜNCELLENDİ: recenterTrigger tipi 'purpose' alanını içeriyor
  recenterTrigger?: { coords: [number, number], zoom: number, animate: boolean, purpose: 'userLocation' | 'presetLocation' } | null;
  onRecenterComplete?: () => void;
  onMapMove?: () => void;
}

export default function Map({
  height = '100%',
  moods,
  onInitialLocationDetermined,
  recenterTrigger,
  onRecenterComplete,
  onMapMove,
}: MapComponentProps) {
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [hasLocationBeenSet, setHasLocationBeenSet] = useState<boolean>(false);
  
  // YENİ EKLENDİ: Leaflet varsayılan marker ikonunu istemci tarafında ayarlar
  // Bu, L.Marker.prototype.options.icon = DefaultIcon; satırının sunucu tarafı derleme hatası vermesini engeller.
  useEffect(() => {
    // Bu kodun sadece tarayıcı ortamında çalıştığından emin oluyoruz
    if (typeof window !== 'undefined' && L.Marker.prototype.options.icon !== DefaultIcon) {
        L.Marker.prototype.options.icon = DefaultIcon;
        console.log("[Map] Leaflet default marker icon set on client.");
    }
  }, []); // Boş bağımlılık dizisi, bileşen yüklendiğinde bir kez çalışmasını sağlar.


  const setInitialLocation = useCallback((location: LocationData) => {
    if (!hasLocationBeenSet) {
      setMapCenter(location.coords);
      setMapZoom(location.zoom ?? 14); 
      setHasLocationBeenSet(true);
      console.log(`[Map] Location set: ${location.name} (Zoom: ${location.zoom ?? 14}), Type: ${location.locationType}`);
      onInitialLocationDetermined?.(location);
    }
  }, [hasLocationBeenSet, onInitialLocationDetermined]);


  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

   if (navigator.geolocation) {
      timeoutId = setTimeout(() => {
        if (!hasLocationBeenSet) {
          console.warn("[Map] Location permission timed out (5s). Setting to random location...");
          setInitialLocation(getRandomRemoteLocation());
        }
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          setInitialLocation({
            name: "Your Current Location",
            coords: [position.coords.latitude, position.coords.longitude],
            zoom: 14, 
            popupText: "Your Current Location",
            locationType: 'user'
          });
          console.log("[Map] Location permission granted:", position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error("[Map] Location permission denied or error occurred:", error);
          if (!hasLocationBeenSet) {
            console.log("[Map] Location permission denied, setting to random location...");
            setInitialLocation(getRandomRemoteLocation());
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.warn("[Map] Browser does not support location services. Setting to random location...");
      setInitialLocation(getRandomRemoteLocation());
    }

    return () => clearTimeout(timeoutId);
  }, [hasLocationBeenSet, setInitialLocation]);


  // Clustering Logic with stable keys
  const clusteredMoods = useMemo(() => {
    if (!moods || !Array.isArray(moods)) {
      return [];
    }

    const groups: { [key: string]: Mood[] } = {};

    moods.forEach((mood) => {
        const locationCoordsKey = `${mood.location.lat.toFixed(6)},${mood.location.lng.toFixed(6)}`;
        const key = mood.locationLabel && mood.locationLabel !== "Unknown Location"
            ? `${mood.locationLabel}-${locationCoordsKey}` 
            : locationCoordsKey; 
        
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(mood);
    });

    return Object.keys(groups).map(key => ({
      clusterKey: key, 
      moods: groups[key],
      mainMood: groups[key][0],
      isCluster: groups[key].length > 1,
    }));
  }, [moods]);


  if (!mapCenter) {
    return (
      <div style={{ height, width: '100%' }} className="flex items-center justify-center bg-slate-800 rounded-lg shadow-xl">
        <p className="text-gray-400">Initializing map...</p>
      </div>
    );
  }

  const bounds = L.latLngBounds([-90, -180], [90, 180]);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        minZoom={1}
        scrollWheelZoom={false} 
        doubleClickZoom={false} 
        touchZoom={true} 
        dragging={true} 
        className="h-full w-full"
        style={{ zIndex: 0, touchAction: 'none' }} // touchAction: 'none' burada kalacak, harita sürüklemesi için
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        zoomControl={false} 
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          noWrap={true}
        />
        
        {clusteredMoods.map((clusterData) => { 
            const { clusterKey, moods: group, mainMood, isCluster } = clusterData; 
            
            return (
                <Marker
                    key={clusterKey} 
                    position={[mainMood.location.lat, mainMood.location.lng]}
                    // BURASI GÜNCELLENDİ: createClusterIcon artık emoji dizisi alıyor
                    icon={isCluster ? createClusterIcon(group.map(m => m.emoji)) : createEmojiIcon(mainMood.emoji)}
                >
                    <Popup className="dark-theme-popup" minWidth={220} maxWidth={280}>
                        {isCluster ? (
                            <div className="min-w-[200px] max-w-[260px]">
                                <div className="bg-slate-700 text-purple-300 text-xs font-bold px-3 py-2 rounded-t-lg text-center">
                                    {mainMood.locationLabel || "This Area"} ({group.length})
                                </div>
                                <ClusterPopupList moods={group} />
                            </div>
                        ) : (
                            <div className="text-center min-w-[150px] bg-slate-800 p-4 rounded-lg"> 
                                <div className="text-3xl mb-2">{mainMood.emoji}</div>
                                <div className="font-bold text-white text-sm">{mainMood.username}</div>
                                {mainMood.text && (
                                    <div className="text-xs text-gray-300 mt-1 italic break-words">&quot;{mainMood.text}&quot;</div>
                                )}
                                <div className="text-[10px] text-gray-400 mt-2">
                                    {mainMood.locationLabel || new Date(mainMood.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        )}
                    </Popup>
                </Marker>
            );
        })}
        
        <MapRecenterHandler recenterTrigger={recenterTrigger} onRecenterComplete={onRecenterComplete} />
        {onMapMove && <MapUserInteractionWatcher onMapMove={onMapMove} />}
        <MapTouchFixer />
        
      </MapContainer>
    </div>
  );
}