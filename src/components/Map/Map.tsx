"use client";

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Mood, LocationData } from '@/types/app'; // Location kaldırıldı

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    setStartY(e.pageY);
    if (scrollRef.current) {
      setStartScrollTop(scrollRef.current.scrollTop);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const y = e.pageY;
    const walk = (y - startY) * 2;
    scrollRef.current.scrollTop = startScrollTop - walk;
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleMouseLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div
      ref={scrollRef}
      className={`max-h-[250px] overflow-y-auto custom-scrollbar p-2 bg-slate-100 rounded-b-lg select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onWheel={(e) => e.stopPropagation()}
    >
        {moods.map((m) => (
            <div key={m.id} className="flex items-start gap-2 mb-2 last:mb-0 border-b border-slate-200 pb-2 last:border-0 last:pb-0">
                <div className="text-2xl shrink-0">{m.emoji}</div>
                <div>
                    <div className="text-xs font-bold text-slate-800">{m.username}</div>
                    {m.text && <div className="text-xs text-slate-600 italic break-words">&quot;{m.text}&quot;</div>} {/* Hata düzeltildi */}
                    <div className="text-[9px] text-slate-400 mt-0.5">
                        {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                </div>
            </div>
        ))}
    </div>
  );
};

// --- Recenter butonu için yeni bileşen ---
interface RecenterControlProps {
  targetLocationData: LocationData | null; // LocationData tipini kullanıyoruz
}

function RecenterControl({ targetLocationData }: RecenterControlProps) {
  const map = useMap();

  const handleRecenter = () => {
    if (targetLocationData?.coords) {
      map.flyTo(targetLocationData.coords, targetLocationData.zoom, {
        animate: true,
        duration: 1.5
      });
    }
  };

  if (!targetLocationData) return null;

  return (
    <div className="leaflet-bottom leaflet-right">
      <div className="leaflet-control leaflet-bar">
        <button
          onClick={handleRecenter}
          className="bg-purple-600 hover:bg-purple-500 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center m-2"
          aria-label="Konuma geri dön"
          title="Başlangıç konuma geri dön"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0Z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Rastgele uzak konumlar listesi
const REMOTE_LOCATIONS: LocationData[] = [
  { name: "Sahra Çölü", coords: [23.4514, 15.5369], zoom: 5, popupText: "Konum izni verilmedi: Sahra Çölü" },
  { name: "Antarktika", coords: [-82.8628, 135.0000], zoom: 3, popupText: "Konum izni verilmedi: Antarktika" },
  { name: "Grönland", coords: [71.7069, -42.6043], zoom: 4, popupText: "Konum izni verilmedi: Grönland" },
  { name: "Mariana Çukuru", coords: [11.3650, 142.2500], zoom: 7, popupText: "Konum izni verilmedi: Mariana Çukuru" },
];

// Rastgele bir uzak konum seçen yardımcı fonksiyon
const getRandomRemoteLocation = (): LocationData => {
  const randomIndex = Math.floor(Math.random() * REMOTE_LOCATIONS.length);
  return REMOTE_LOCATIONS[randomIndex];
};

// --- Ana Harita Bileşeni ---
interface MapComponentProps {
  height?: string;
  moods: Mood[]; // page.tsx'ten gelecek mood'lar
  onInitialLocationDetermined?: (locationData: LocationData | null) => void; // page.tsx'e LocationData göndermek için callback
}

export default function Map({
  height = '100%',
  moods,
  onInitialLocationDetermined,
}: MapComponentProps) {
  // Haritanın merkezini ve zoom'unu tutan state'ler
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapZoom, setMapZoom] = useState<number>(1);
  
  // Başlangıçta belirlenen konumu ve zoom seviyesini saklamak için yeni state
  const [initialDeterminedLocationData, setInitialDeterminedLocationData] = useState<LocationData | null>(null);

  // Bu bayrak, konumun (gerçek veya rastgele) ayarlanıp ayarlanmadığını takip eder.
  const [hasLocationBeenSet, setHasLocationBeenSet] = useState<boolean>(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const setLocation = (location: LocationData) => {
      if (!hasLocationBeenSet) {
        setMapCenter(location.coords);
        setMapZoom(location.zoom);
        setInitialDeterminedLocationData(location); // İlk belirlenen konumu sakla
        setHasLocationBeenSet(true);
        console.log(`[Map] Konum ayarlandı: ${location.name} (Zoom: ${location.zoom})`);
        if (onInitialLocationDetermined) {
          onInitialLocationDetermined(location); // page.tsx'e tam LocationData gönder
        }
      }
    };

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
  }, [hasLocationBeenSet, onInitialLocationDetermined]); // 'onInitialLocationDetermined' bağımlılıklara eklendi

  // Clustering Logic
  const clusteredMoods = useMemo(() => {
    // Add a null/undefined check for 'moods' before iterating
    if (!moods || !Array.isArray(moods)) {
      return [];
    }

    const groups: { [key: string]: Mood[] } = {};

    moods.forEach((mood) => {
        const key = mood.locationLabel
            ? mood.locationLabel
            : `${mood.location.lat.toFixed(4)},${mood.location.lng.toFixed(4)}`;
        
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(mood);
    });

    return Object.values(groups);
  }, [moods]); // Dependency array is correct


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
        scrollWheelZoom={true}
        className="h-full w-full"
        style={{ zIndex: 0 }}
        maxBounds={bounds}
        maxBoundsViscosity={1.0}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          noWrap={true}
        />
        
        {/* Mood marker'ları ve cluster'ları */}
        {clusteredMoods.map((group, index) => {
            const isCluster = group.length > 1;
            const mainMood = group[0];
            
            return (
                <Marker
                    key={isCluster ? `cluster-${index}` : mainMood.id}
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
                                    <div className="text-xs text-slate-600 mt-1 italic break-words">&quot;{mainMood.text}&quot;</div> // Hata düzeltildi
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
        
        {/* Navigasyon butonu */}
        <RecenterControl targetLocationData={initialDeterminedLocationData} />
      </MapContainer>
    </div>
  );
}