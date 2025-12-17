// src/components/Map/Map.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import * as L from 'leaflet';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mood, LocationData } from '@/types/app';

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

// --- Custom Emoji Marker for Single Mood ---
const createEmojiIcon = (emoji: string, isCurrentUsersMood: boolean) => {
  // Kullanıcının mood'u ise glow stili ve pulse animasyon sınıfı ekle
  const glowStyle = isCurrentUsersMood ? 'box-shadow: 0 0 12px 4px rgba(192, 132, 252, 0.7);' : '';
  const animationClass = isCurrentUsersMood ? 'animate-pulse' : ''; // YENİ: animate-pulse sınıfı eklendi

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
      ${animationClass}  // Animasyon sınıfı buraya eklendi
    " style="${glowStyle}">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -25]
  });
};

// --- Custom Cluster Marker for Multiple Moods ---
const createClusterIcon = (emojis: string[], isCurrentUsersCluster: boolean) => {
    const displayedEmojis = emojis.slice(0, 3);
    
    let stackedEmojisHtml = '';

    const baseInnerEmojiStyle = `
        absolute
        top-1/2 -translate-y-1/2
        text-lg
        pointer-events-none
    `; 

    const offsetIncrement = 6;
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

    // Kullanıcının kümesi ise glow stili ve pulse animasyon sınıfı ekle
    const glowStyle = isCurrentUsersCluster ? 'box-shadow: 0 0 12px 4px rgba(192, 132, 252, 0.7);' : '';
    const animationClass = isCurrentUsersCluster ? 'animate-pulse' : ''; // YENİ: animate-pulse sınıfı eklendi

    return L.divIcon({
      className: 'custom-cluster-marker',
      html: `<div class="
        bg-slate-800/95
        border-2 border-purple-600
        rounded-full
        w-10 h-10
        relative
        overflow-hidden
        shadow-md
        ${animationClass}  // Animasyon sınıfı buraya eklendi
      " style="${glowStyle}">${stackedEmojisHtml}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      popupAnchor: [0, -25]
    });
  };

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


// YENİ BİLEŞEN: Harita görünür hale geldiğinde boyutunu güncelleyen
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
  onInitialLocationDetermined?: (locationData: LocationData | null) => void;
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
  onInitialLocationDetermined,
  recenterTrigger,
  onRecenterComplete,
  onMapMove,
  onClusterClick,
  onMapClick, 
  onMapReady, 
  isMapVisible,
  currentFid, // currentFid prop'u
}: MapComponentProps) {
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [hasLocationBeenSet, setHasLocationBeenSet] = useState<boolean>(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined' && L.Marker.prototype.options.icon !== DefaultIcon) {
        L.Marker.prototype.options.icon = DefaultIcon;
        console.log("[Map] Leaflet default marker icon set on client.");
    }
  }, []);

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


  if (!mapCenter) {
    return null; 
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
        style={{ zIndex: 0, touchAction: 'none' }}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
        zoomControl={false} 
        whenReady={() => { 
            onMapReady?.();
            console.log("[Map.tsx] MapContainer created, onMapReady fired.");
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          noWrap={true}
        />
        
        {clusteredMoods.map((clusterData) => { 
            const { clusterKey, moods: group, mainMood, isCluster } = clusterData; 
            
            // Mevcut kullanıcının FID'si ile karşılaştırma yap
            const isCurrentUsersMoodInCluster = group.some(mood => mood.userId === currentFid?.toString());
            
            return (
                <Marker
                    key={clusterKey} 
                    position={[mainMood.location.lat, mainMood.location.lng]}
                    // createEmojiIcon ve createClusterIcon'a yeni parametreyi gönder
                    icon={isCluster 
                        ? createClusterIcon(group.map(m => m.emoji), isCurrentUsersMoodInCluster) 
                        : createEmojiIcon(mainMood.emoji, mainMood.userId === currentFid?.toString()) 
                    }
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