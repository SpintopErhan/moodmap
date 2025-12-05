// src/components/Map/Map.tsx
"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { Mood, LocationData } from '@/types/app';

// Leaflet ikon dosyalarını doğrudan import et
import defaultIcon from 'leaflet/dist/images/marker-icon.png';
import defaultIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import defaultShadow from 'leaflet/dist/images/marker-shadow.png';

// Varsayılan Leaflet ikonunu oluştur ve global olarak ayarla
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
L.Marker.prototype.options.icon = DefaultIcon;

// --- Custom Emoji Marker for Single Mood ---
const createEmojiIcon = (emoji: string) => {
  return L.divIcon({
    className: 'custom-emoji-marker',
    html: `<div style="
      background-color: rgba(30, 41, 59, 0.95);
      border: 2px solid #9333ea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s;
    ">${emoji}</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -25]
  });
};

// --- Custom Cluster Marker for Multiple Moods ---
const createClusterIcon = (count: number) => {
    return L.divIcon({
      className: 'custom-cluster-marker',
      html: `<div style="
        background-color: #7e22ce;
        color: white;
        border: 2px solid rgba(255,255,255,0.3);
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        font-weight: bold;
        box-shadow: 0 0 15px rgba(126, 34, 206, 0.6);
      ">${count}</div>`,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22]
    });
  };

// --- Draggable List Component for Popup ---
const ClusterPopupList: React.FC<{ moods: Mood[] }> = ({ moods }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startScrollTop, setStartScrollTop] = useState(0);

  // Mouse olaylarını dokunma olaylarına dönüştürmek için de kullanılabilir
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    // Mouse veya ilk dokunma noktasını al
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setStartY(clientY);
    if (scrollRef.current) {
      setStartScrollTop(scrollRef.current.scrollTop);
    }
  };

  const handleMove = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault(); // Varsayılan tarayıcı kaydırma ve zoom davranışını engelle

    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const walk = (clientY - startY) * 2;
    scrollRef.current.scrollTop = startScrollTop - walk;
  };

  const handleEnd = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };
  
  // `onWheel` ile birlikte mobil için `touchAction: 'pan-y'` ekleniyor
  return (
    <div
      ref={scrollRef}
      className={`max-h-[250px] overflow-y-auto custom-scrollbar p-2 bg-slate-100 rounded-b-lg select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd} // mouseLeave'de de sürüklemeyi bitir
      onTouchStart={handleStart} // Dokunma olayları eklendi
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      onWheel={(e) => e.stopPropagation()}
      style={{ touchAction: 'pan-y' }} // Sadece dikey kaydırmaya izin ver. Bu, pop-up içinde dikey kaydırmayı etkinleştirir.
    >
        {moods.map((m) => (
            <div key={m.id} className="flex items-start gap-2 mb-2 last:mb-0 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                <div className="text-2xl shrink-0">{m.emoji}</div>
                <div>
                    <div className="text-xs font-bold text-slate-800">{m.username}</div>
                    {m.text && <div className="text-xs text-slate-600 italic break-words">&quot;{m.text}&quot;</div>}
                    <div className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        ))}
    </div>
  );
};


// Rastgele uzak konumlar listesi
const REMOTE_LOCATIONS: LocationData[] = [
  { name: "Sahra Çölü", coords: [23.4514, 15.5369], zoom: 5, popupText: "Konum izni verilmedi: Sahra Çölü" },
  { name: "Antarktika", coords: [-75.0000, 25.0000], zoom: 3, popupText: "Konum izni verilmedi: Antarktika" },
  { name: "Grönland", coords: [71.7069, -42.6043], zoom: 4, popupText: "Konum izni verilmedi: Grönland" },
  { name: "Mariana Çukuru", coords: [11.3650, 142.2500], zoom: 7, popupText: "Konum izni verilmedi: Mariana Çukuru" },
];

// Rastgele bir uzak konum seçen yardımcı fonksiyon
const getRandomRemoteLocation = (): LocationData => {
  const randomIndex = Math.floor(Math.random() * REMOTE_LOCATIONS.length);
  return REMOTE_LOCATIONS[randomIndex];
};

// Harita hareketini programatik olarak yönetmek için yardımcı bileşen
interface MapRecenterHandlerProps {
    recenterTrigger?: { coords: [number, number], zoom: number, animate: boolean } | null;
    onRecenterComplete?: () => void;
}

function MapRecenterHandler({ recenterTrigger, onRecenterComplete }: MapRecenterHandlerProps) {
    const map = useMap();
    const isProgrammaticMoveRef = useRef(false);
    // lastProcessedTrigger ref'i, aynı tetikleyicinin birden fazla kez işlenmesini engellemek içindir.
    // Kullanıcının tıklama aksiyonlarını engellememeli, sadece gereksiz tekrarı önlemelidir.
    const lastProcessedTrigger = useRef<{ coords: [number, number], zoom: number, animate: boolean } | null>(null);

    useEffect(() => {
        if (!recenterTrigger) {
            // Trigger yoksa, önceki işlem tamamlanmıştır veya hiç yoktu.
            // Bu durumda, son işlenen trigger'ı sıfırlayabiliriz ki, bir sonraki trigger yeni bir işlem olarak görünsün.
            lastProcessedTrigger.current = null;
            return;
        }

        const { coords, zoom, animate } = recenterTrigger;

        // DEĞİŞİKLİK 1: Eğer gelen trigger, son işlenen trigger ile içerik olarak aynıysa atla.
        // Bu, `page.tsx`'in aynı referansla veya aynı değerlerle sürekli `setMapRecenterTrigger` çağırmasını engeller.
        // `page.tsx`'teki `setMapRecenterTrigger({ coords, zoom: 16, animate: true });` her zaman yeni bir obje yaratacaktır.
        // Ancak objenin içeriği (coords, zoom, animate) aynıysa ve zaten bu işlemi yapmışsak tekrar yapmaya gerek yoktur.
        if (lastProcessedTrigger.current &&
            lastProcessedTrigger.current.coords[0] === coords[0] &&
            lastProcessedTrigger.current.coords[1] === coords[1] &&
            lastProcessedTrigger.current.zoom === zoom &&
            lastProcessedTrigger.current.animate === animate) {
            console.log("[MapRecenterHandler] Aynı recenter trigger tekrar geldi, atlanıyor.");
            onRecenterComplete?.(); // Yine de tamamlandığını bildir
            return;
        }
        
        // DEĞİŞİKLİK 2: Önceki 5 metrelik uzaklık kontrolünü kaldırdık.
        // Bu kontrol, navigasyon butonunun işlevini engelliyordu çünkü kullanıcının zaten konumuna yakın olması durumunda hareket etmiyordu.
        // Kullanıcının butona basması, haritanın o konuma gitme isteğidir ve bu her zaman yerine getirilmelidir.
        // Titreme sorununu çözmek için daha iyi bir yer, `page.tsx` içinde `recenterTrigger` state'ini güncelleyen kısımdır.

        // Yeni trigger'ı işlediğimizi işaretle
        lastProcessedTrigger.current = recenterTrigger;

        if (animate) {
            isProgrammaticMoveRef.current = true;
            map.flyTo(coords, zoom, {
                animate: true,
                duration: 1.5
            });

            const handleMoveEnd = () => {
                if (isProgrammaticMoveRef.current) {
                    isProgrammaticMoveRef.current = false;
                    onRecenterComplete?.();
                }
            };

            const handleUserInteraction = () => {
                if (isProgrammaticMoveRef.current) {
                    console.log("[MapRecenterHandler] Kullanıcı etkileşimi algılandı, programatik hareket durduruluyor.");
                    (map as L.Map).stop();
                    isProgrammaticMoveRef.current = false;
                    onRecenterComplete?.();
                }
            };

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

    }, [recenterTrigger, map, onRecenterComplete]);

    return null;
}


// --- Ana Harita Bileşeni ---
interface MapComponentProps {
  height?: string;
  moods: Mood[];
  onInitialLocationDetermined?: (locationData: LocationData | null) => void;
  recenterTrigger?: { coords: [number, number], zoom: number, animate: boolean } | null;
  onRecenterComplete?: () => void;
}

export default function Map({
  height = '100%',
  moods,
  onInitialLocationDetermined,
  recenterTrigger,
  onRecenterComplete,
}: MapComponentProps) {
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);
  const [hasLocationBeenSet, setHasLocationBeenSet] = useState<boolean>(false);

  // setLocation'ı useCallback ile sarmala
  const setLocation = useCallback((location: LocationData) => {
    if (!hasLocationBeenSet) {
      setMapCenter(location.coords);
      setMapZoom(location.zoom);
      setHasLocationBeenSet(true);
      console.log(`[Map] Konum ayarlandı: ${location.name} (Zoom: ${location.zoom})`);
      if (onInitialLocationDetermined) {
        onInitialLocationDetermined(location);
      }
    }
  }, [hasLocationBeenSet, onInitialLocationDetermined]);


  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (navigator.geolocation) {
      timeoutId = setTimeout(() => {
        if (!hasLocationBeenSet) {
          console.warn("[Map] Konum izni süresi doldu (5s). Rastgele konuma ayarlanıyor...");
          setLocation(getRandomRemoteLocation());
        }
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          const { latitude, longitude } = position.coords;

          setLocation({
            name: "Mevcut Konumunuz",
            coords: [latitude, longitude],
            zoom: 14,
            popupText: "Mevcut Konumunuz"
          });

          console.log("[Map] Konum izni verildi:", latitude, longitude);
        },
        (error) => {
          clearTimeout(timeoutId);
          console.error("[Map] Konum izni reddedildi veya hata oluştu:", error);
          if (!hasLocationBeenSet) {
            console.log("[Map] Konum izni reddedildi, rastgele konuma ayarlanıyor...");
            setLocation(getRandomRemoteLocation());
          }
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      console.warn("[Map] Tarayıcı konum servislerini desteklemiyor. Rastgele konuma ayarlanıyor...");
      setLocation(getRandomRemoteLocation());
    }

    return () => clearTimeout(timeoutId);
  }, [hasLocationBeenSet, setLocation]); // setLocation bağımlılığı eklendi

  // Clustering Logic with stable keys
  const clusteredMoods = useMemo(() => {
    if (!moods || !Array.isArray(moods)) {
      return [];
    }

    const groups: { [key: string]: Mood[] } = {};

    moods.forEach((mood) => {
        const locationCoordsKey = `${mood.location.lat.toFixed(6)},${mood.location.lng.toFixed(6)}`;
        const key = mood.locationLabel && mood.locationLabel !== "Bilinmeyen Konum"
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
        <p className="text-gray-400">Harita başlatılıyor...</p>
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
        // touchZoom ayarı (önceki öneriden kalma, mobil zoom sorununa yönelik)
        touchZoom={'center'} // Öncelikle bunu deneyin. Eğer hala sorun varsa `false` yapın.
        dragging={true}
        className="h-full w-full"
        // touchAction ayarı (önceki öneriden kalma, mobil zoom sorununa yönelik)
        style={{ zIndex: 0, touchAction: 'pan-x pan-y' }}
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
                    icon={isCluster ? createClusterIcon(group.length) : createEmojiIcon(mainMood.emoji)}
                >
                    <Popup className="custom-popup p-0" minWidth={isCluster ? 220 : 120}>
                        {isCluster ? (
                            <div className="min-w-[220px] max-w-[260px]">
                                <div className="bg-purple-600 text-white text-xs font-bold px-3 py-2 rounded-t-lg text-center">
                                    {mainMood.locationLabel || "Bu Alan"} ({group.length})
                                </div>
                                <ClusterPopupList moods={group} />
                            </div>
                        ) : (
                            <div className="text-center min-w-[120px]">
                                <div className="text-3xl mb-2">{mainMood.emoji}</div>
                                <div className="font-bold text-slate-800 text-sm">{mainMood.username}</div>
                                {mainMood.text && (
                                    <div className="text-xs text-slate-600 mt-1 italic break-words">&quot;{mainMood.text}&quot;</div>
                                )}
                                <div className="text-[10px] text-slate-400 mt-2">
                                    {mainMood.locationLabel ? mainMood.locationLabel : new Date(mainMood.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        )}
                    </Popup>
                </Marker>
            );
        })}

        <MapRecenterHandler recenterTrigger={recenterTrigger} onRecenterComplete={onRecenterComplete} />

      </MapContainer>
    </div>
  );
}