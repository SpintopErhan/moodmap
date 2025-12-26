// src/components/Map/Map.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mood } from '@/types/app'; // LocationData import'ı kaldırıldı

// Import Leaflet icon files directly
import defaultIcon from 'leaflet/dist/images/marker-icon.png';
import defaultIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import defaultShadow from 'leaflet/dist/images/marker-shadow.png';

// 1. Gündüz ve Gece Harita Teması URL'leri
const DAY_TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const NIGHT_TILE_URL = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const ATTRIBUTION_TEXT = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';


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

// Haritanın zoom seviyesini dinleyen ve üst bileşene bildiren
function MapZoomUpdater({ onZoomChange }: { onZoomChange: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handleZoomEnd = () => {
      onZoomChange(map.getZoom());
    };
    map.on('zoomend', handleZoomEnd);
    // Bileşen yüklendiğinde mevcut zoom seviyesini başlangıç olarak ayarla
    onZoomChange(map.getZoom());

    return () => {
      map.off('zoomend', handleZoomEnd);
    };
  }, [map, onZoomChange]);
  return null;
}

// --- Custom Emoji Marker for Single Mood ---
// currentZoom parametresi eklendi
const createEmojiIcon = (emoji: string, isCurrentUsersMood: boolean, currentZoom: number) => {
  // Glow efekti güçlendirildi (blur ve spread radius artırıldı, opaklık yükseltildi)
  const glowStyle = isCurrentUsersMood ? 'box-shadow: 0 0 20px 8px rgba(0, 0, 255, 0.8);' : '';
  const animationClass = isCurrentUsersMood ? 'animate-pulse' : '';

  let sizeClasses = 'w-10 h-10'; // Varsayılan boyut (40px)
  let emojiTextSize = 'text-2xl'; // Varsayılan emoji metin boyutu (24px)
  let iconSize: [number, number] = [40, 40];
  let iconAnchor: [number, number] = [20, 20];
  let popupAnchor: [number, number] = [0, -25];

  // Eğer mevcut kullanıcının mood'u ise her zaman varsayılan en büyük boyutu uygula
  if (isCurrentUsersMood) {
    sizeClasses = 'w-10 h-10'; // 40px
    emojiTextSize = 'text-2xl'; // 24px
    iconSize = [40, 40];
    iconAnchor = [20, 20];
    popupAnchor = [0, -25];
  } else {
    // Zoom seviyesine göre boyutlandırma mantığı (diğer mood'lar için)
    if (currentZoom >= 5) { // DEFAULT_ZOOM_LEVEL (page.tsx'te 5 olarak tanımlı)
      sizeClasses = 'w-10 h-10';
      emojiTextSize = 'text-2xl';
      iconSize = [40, 40];
      iconAnchor = [20, 20];
      popupAnchor = [0, -25];
    } else if (currentZoom === 4) {
      sizeClasses = 'w-8 h-8';
      emojiTextSize = 'text-xl';
      iconSize = [32, 32];
      iconAnchor = [16, 16];
      popupAnchor = [0, -20];
    } else if (currentZoom === 3) {
      sizeClasses = 'w-6 h-6';
      emojiTextSize = 'text-base';
      iconSize = [24, 24];
      iconAnchor = [12, 12];
      popupAnchor = [0, -15];
    } else if (currentZoom <= 2) {
      sizeClasses = 'w-5 h-5';
      emojiTextSize = 'text-sm';
      iconSize = [20, 20];
      iconAnchor = [10, 10];
      popupAnchor = [0, -12];
    }
  }


  return L.divIcon({
    className: 'custom-emoji-marker',
    html: `<div class="
      bg-slate-800/95
      border-2 border-blue-600
      rounded-full
      ${sizeClasses}
      flex items-center justify-center
      ${emojiTextSize}
      shadow-md
      transition-transform
      hover:scale-110
      ${animationClass}
    " style="${glowStyle}">${emoji}</div>`,
    iconSize: iconSize,
    iconAnchor: iconAnchor,
    popupAnchor: popupAnchor
  });
};

// --- Custom Cluster Marker for Multiple Moods ---
// currentZoom parametresi eklendi
const createClusterIcon = (emojis: string[], isCurrentUsersCluster: boolean, currentZoom: number) => {
    const displayedEmojis = emojis.slice(0, 3);
    
    let stackedEmojisHtml = '';
    
    // Küme içindeki emojilerin metin boyutunu zoom'a göre ayarla
    let innerEmojiTextSize = 'text-lg'; // Varsayılan (18px)
    let offsetIncrement = 6; // Varsayılan ofset

    // Glow efekti güçlendirildi (blur ve spread radius artırıldı, opaklık yükseltildi)
    const glowStyle = isCurrentUsersCluster ? 'box-shadow: 0 0 20px 8px rgba(0, 0, 255, 0.8);' : '';
    const animationClass = isCurrentUsersCluster ? 'animate-pulse' : '';

    // Küme kapsayıcısının boyutunu zoom'a göre ayarla
    let sizeClasses = 'w-10 h-10'; // Varsayılan (40px)
    let iconSize: [number, number] = [40, 40];
    let iconAnchor: [number, number] = [20, 20];
    let popupAnchor: [number, number] = [0, -25];


    // Eğer mevcut kullanıcının kümesi ise her zaman varsayılan en büyük boyutu uygula
    if (isCurrentUsersCluster) {
        innerEmojiTextSize = 'text-lg'; // 18px
        offsetIncrement = 6;
        sizeClasses = 'w-10 h-10'; // 40px
        iconSize = [40, 40];
        iconAnchor = [20, 20];
        popupAnchor = [0, -25];
    } else {
        // Zoom seviyesine göre boyutlandırma mantığı (diğer kümeler için)
        if (currentZoom >= 5) {
          innerEmojiTextSize = 'text-lg';
          offsetIncrement = 6;
          sizeClasses = 'w-10 h-10';
          iconSize = [40, 40];
          iconAnchor = [20, 20];
          popupAnchor = [0, -25];
        } else if (currentZoom === 4) {
          innerEmojiTextSize = 'text-base';
          offsetIncrement = 5;
          sizeClasses = 'w-8 h-8';
          iconSize = [32, 32];
          iconAnchor = [16, 16];
          popupAnchor = [0, -20];
        } else if (currentZoom === 3) {
          innerEmojiTextSize = 'text-xs';
          offsetIncrement = 4;
          sizeClasses = 'w-6 h-6';
          iconSize = [24, 24];
          iconAnchor = [12, 12];
          popupAnchor = [0, -15];
        } else if (currentZoom <= 2) {
          innerEmojiTextSize = 'text-[10px]';
          offsetIncrement = 3;
          sizeClasses = 'w-5 h-5';
          iconSize = [20, 20];
          iconAnchor = [10, 10];
          popupAnchor = [0, -12];
        }
    }


    const baseInnerEmojiStyle = `
        absolute
        top-1/2 -translate-y-1/2
        ${innerEmojiTextSize}
        pointer-events-none
    `; 
    
    const initialLeftMargin = 0; 

    if (displayedEmojis.length === 1) {
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
        border-2 border-blue-600
        rounded-full
        ${sizeClasses}
        relative
        overflow-hidden
        shadow-md
        ${animationClass}
      " style="${glowStyle}">${stackedEmojisHtml}</div>`,
      iconSize: iconSize,
      iconAnchor: iconAnchor,
      popupAnchor: popupAnchor
    });
  };

interface MapRecenterHandlerProps {
    recenterTrigger?: { coords: [number, number], zoom: number, animate: boolean, purpose: 'userLocation' | 'presetLocation' } | null;
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
  onMapMove?: () => void; 
  onMapClick?: () => void; 
}

const MapUserInteractionWatcher: React.FC<MapUserInteractionWatcherProps> = ({ onMapMove, onMapClick }) => {
  useMapEvents({
    dragstart: () => {
      console.log("[MapUserInteractionWatcher] User started dragging map.");
      onMapMove?.();
    },
    zoomstart: () => {
      console.log("[MapUserInteractionWatcher] User started zooming map.");
      onMapMove?.();
    },
    click: (event) => { 
      console.log("[MapUserInteractionWatcher] Map clicked.", event);
      onMapClick?.(); 
    }
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


// Harita görünür hale geldiğinde boyutunu güncelleyen
function MapVisibilityUpdater({ isMapVisible }: { isMapVisible?: boolean }) {
  const map = useMap(); // Leaflet harita örneğini al

  useEffect(() => {
    if (isMapVisible && map) {
      // Harita görünür hale geldiğinde boyutunu yeniden hesapla
      // setTimeout kullanmak, DOM'un tam olarak güncellenmesini beklemek için küçük bir gecikme sağlar.
      const timeout = setTimeout(() => {
        map.invalidateSize({ pan: false }); // `pan: false` haritanın merkezini değiştirmemesi için
        console.log("[Map.tsx -> MapVisibilityUpdater] map.invalidateSize() called.");
      }, 100); // Küçük bir gecikme ekleyelim

      return () => clearTimeout(timeout);
    }
  }, [isMapVisible, map]);

  return null;
}


interface MapComponentProps {
  height?: string;
  moods: Mood[];
  recenterTrigger?: { coords: [number, number], zoom: number, animate: boolean, purpose: 'userLocation' | 'presetLocation' } | null;
  onRecenterComplete?: () => void;
  onMapMove?: () => void;
  onClusterClick?: (moods: Mood[]) => void;
  onMapClick?: () => void; 
  onMapReady?: () => void; 
  isMapVisible?: boolean; // Haritanın ana kapsayıcısının görünürlük durumu
  currentFid: number | null; // Mevcut kullanıcının FID'si (number)
}

export default function Map({
  height = '100%',
  moods,
  recenterTrigger,
  onRecenterComplete,
  onMapMove,
  onClusterClick,
  onMapClick, 
  onMapReady, 
  isMapVisible,
  currentFid, // currentFid prop'u
}: MapComponentProps) {
  // mapCenter ve mapZoom artık doğrudan default değerlerle başlatılıyor.
  // Bu state'ler kullanılmadığı için kaldırıldı.
  // const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]); 
  // const [mapZoom, setMapZoom] = useState<number>(1); 
  
  // Haritanın anlık zoom seviyesini tutar
  const [currentZoom, setCurrentZoom] = useState(1); // Başlangıç zoom seviyesiyle veya varsayılanla başlat

  // Dinamik tema için state
  const [currentTileUrl, setCurrentTileUrl] = useState(NIGHT_TILE_URL); 

  useEffect(() => {
    if (typeof window !== 'undefined' && L.Marker.prototype.options.icon !== DefaultIcon) {
        L.Marker.prototype.options.icon = DefaultIcon;
        console.log("[Map] Leaflet default marker icon set on client.");
    }
  }, []);

  // Zamanı kontrol eden ve temayı BİR KEZ ayarlayan useEffect
  useEffect(() => {
    const updateTheme = () => {
        const hour = new Date().getHours();
        // Gündüz saatleri: 06:00 (dahil) - 18:00 (hariç)
        const isDayTime = hour >= 6 && hour < 18;
        const newThemeUrl = isDayTime ? DAY_TILE_URL : NIGHT_TILE_URL;

        setCurrentTileUrl(newThemeUrl); 
        console.log(`[Map] Tema ayarlandı: Yerel saat ${hour}:00, Tema: ${isDayTime ? 'GÜNDÜZ' : 'GECE'}`);
    };

    updateTheme();

  }, []); // Boş dependency array, sadece mount'ta çalışır ve bir kez ayarlar

  // Clustering Logic with stable keys
  const clusteredMoods = useMemo(() => {
    if (!moods || !Array.isArray(moods)) {
      return [];
    }

    const groups: { [key: string]: Mood[] } = {};

    moods.forEach((mood) => {
        const locationCoordsKey = `${mood.location.lat.toFixed(6)},${mood.location.lng.toFixed(6)}`;
        
        const key = mood.locationLabel && mood.locationLabel !== "Unknown Location"
            ? mood.locationLabel 
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


  const bounds = L.latLngBounds([-90, -180], [90, 180]);

  return (
    <div style={{ height, width: '100%' }}>
      <MapContainer
        center={[0, 0]} // Varsayılan dünya merkezi
        zoom={1} // Varsayılan global zoom seviyesi
        minZoom={1}
        scrollWheelZoom={false} 
        doubleClickZoom={false} 
        touchZoom={true} 
        dragging={true} 
        className="h-full w-full"
        style={{ zIndex: 0, touchAction: 'none' }}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        zoomControl={false} 
        whenReady={() => { 
            onMapReady?.();
            console.log("[Map.tsx] MapContainer created, onMapReady fired.");
            // Harita hazır olduğunda da ilk zoom seviyesini kaydet
            setCurrentZoom(1); // Varsayılan başlangıç zoom seviyesi
        }}
      >
        <TileLayer
          attribution={ATTRIBUTION_TEXT} 
          url={currentTileUrl} 
          noWrap={true}
        />
        
        {/* Zoom seviyesini güncelleyen bileşen */}
        <MapZoomUpdater onZoomChange={setCurrentZoom} />

        {clusteredMoods.map((clusterData) => { 
            const { clusterKey, moods: group, mainMood, isCluster } = clusterData; 
            
            // Mevcut kullanıcının FID'si ile karşılaştırma yap
            const isCurrentUsersMoodForSingle = mainMood.userId === currentFid?.toString();
            const isCurrentUsersMoodInCluster = group.some(mood => mood.userId === currentFid?.toString());
            
            // Marker'ın zIndexOffset değerini belirle. Kullanıcının moduysa yüksek bir değer ver.
            const zIndexOffset = (isCurrentUsersMoodForSingle || isCurrentUsersMoodInCluster) ? 1000 : 0;
            
            return (
                <Marker
                    key={clusterKey} 
                    position={[mainMood.location.lat, mainMood.location.lng]}
                    // createEmojiIcon ve createClusterIcon'a yeni currentZoom parametresini gönder
                    icon={isCluster 
                        ? createClusterIcon(group.map(m => m.emoji), isCurrentUsersMoodInCluster, currentZoom) 
                        : createEmojiIcon(mainMood.emoji, isCurrentUsersMoodForSingle, currentZoom) 
                    }
                    zIndexOffset={zIndexOffset} 
                    eventHandlers={isCluster ? {
                        click: () => onClusterClick?.(group) 
                    } : undefined}
                >
                    {!isCluster && (
                        <Popup className="dark-theme-popup" minWidth={220} maxWidth={280}>
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
                        </Popup>
                    )}
                </Marker>
            );
        })}
        
        <MapRecenterHandler recenterTrigger={recenterTrigger} onRecenterComplete={onRecenterComplete} />
        {(onMapMove || onMapClick) && <MapUserInteractionWatcher onMapMove={onMapMove} onMapClick={onMapClick} />} 
        <MapTouchFixer />
        <MapVisibilityUpdater isMapVisible={isMapVisible} />
        
      </MapContainer>
    </div>
  );
}