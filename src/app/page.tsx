// src/app/page.tsx
"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";

import { Button } from '@/components/ui/Button';
import { MoodFeed } from '@/components/MoodFeed';
import { ViewState, Location, LocationData, Mood, MOOD_OPTIONS, MOCK_MOODS } from '@/types/app';
// X ikonu MoodFeed içinde kullanıldığı için page.tsx'ten kaldırıldı
import { Plus, Map as MapIcon, List, MapPin } from 'lucide-react'; 

// ÖNEMLİ: types/app.ts dosyanızda ViewState enum'ına aşağıdaki değeri eklemelisiniz:
// export enum ViewState {
//   MAP = 'map',
//   ADD = 'add',
//   LIST = 'list',
//   CLUSTER_LIST = 'cluster_list', // <-- BU SATIRI EKLEYİN
// }

const DynamicMap = dynamic(() => import('@/components/Map/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-slate-800 rounded-lg shadow-xl h-full w-full">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

const MAX_MOOD_TEXT_LENGTH = 48;

interface PresetLocation {
  id: string;
  name: string;
  coords: [number, number]; // [latitude, longitude]
  zoom: number; // Bu konuma gidildiğinde haritanın zoom seviyesi
}

const PRESET_LOCATIONS: PresetLocation[] = [
  { id: 'istanbul', name: 'Istanbul', coords: [41.0082, 28.9784], zoom: 9 },
  { id: 'berlin', name: 'Berlin', coords: [52.5200, 13.4050], zoom: 9 },
  { id: 'paris', name: 'Paris', coords: [48.8566, 2.3522], zoom: 9 },
  { id: 'london', name: 'London', coords: [51.5074, 0.1278], zoom: 9 },
  { id: 'barcelona', name: 'Barcelona', coords: [41.3851, 2.1734], zoom: 9 },
  { id: 'moscow', name: 'Moscow', coords: [55.7558, 37.6173], zoom: 8 },
  { id: 'beijing', name: 'Beijing', coords: [39.9042, 116.4074], zoom: 8 },
  { id: 'tokyo', name: 'Tokyo', coords: [35.6762, 139.6503], zoom: 9 },
  { id: 'marrakech', name: 'Marrakech', coords: [31.6295, -7.9813], zoom: 10 }, // Fas için Marrakech
  { id: 'cape_town', name: 'Cape Town', coords: [-33.9249, 18.4241], zoom: 9 }, // Güney Afrika için Cape Town
  { id: 'new_york', name: 'New York', coords: [40.7128, -74.0060], zoom: 9 },
  { id: 'world', name: 'World', coords: [0, 0], zoom: 3 }, // Yeni eklendi: Tüm dünyayı gösterir, zoom 3
];


export default function Home() {
  const { user, status, error, composeCast } = useFarcasterMiniApp();

  const [currentDeterminedLocationData, setCurrentDeterminedLocationData] = useState<LocationData | null>(null);
  const [userLastMoodLocation, setUserLastMoodLocation] = useState<LocationData | null>(null);
  const [mapRecenterTrigger, setMapRecenterTrigger] = useState<{ 
    coords: [number, number], 
    zoom: number, 
    animate: boolean,
    purpose: 'userLocation' | 'presetLocation' 
  } | null>(null);
  const [lastLocallyPostedMood, setLastLocallyPostedMood] = useState<Mood | null>(null);

  const [isMapCenteredOnUserLocation, setIsMapCenteredOnUserLocation] = useState(false);
  
  const [showPresetLocations, setShowPresetLocations] = useState(false);

  const [view, setView] = useState<ViewState>(ViewState.ADD);

  const [moods, setMoods] = useState<Mood[]>(MOCK_MOODS);
  const [selectedEmoji, setSelectedEmoji] = useState(MOOD_OPTIONS[0].emoji);
  const [statusText, setStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);

  const [selectedClusterMoods, setSelectedClusterMoods] = useState<Mood[] | null>(null); 

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const defaultZoomLevel = useMemo(() => 14, []);

  const [geolocationFunctions, setGeolocationFunctions] = useState<{
    reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
    forwardGeocode: (address: string) => Promise<[number, number] | null>;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('@/lib/geolocation').then(mod => {
        setGeolocationFunctions({
          reverseGeocode: mod.reverseGeocode,
          forwardGeocode: mod.forwardGeocode,
        });
        console.log("[page.tsx] Geolocation module loaded dynamically.");
      }).catch(err => {
        console.error("Failed to load geolocation module dynamically:", err);
      });
    }
  }, []);

  // Tüm açık panelleri ve ilgili state'leri anında sıfırlayan merkezi fonksiyon (basit versiyon)
  const handleCloseAllPanels = useCallback(() => {
    // Eğer harita görünümündeyken çağrıldıysa, sadece presetleri ve küme moodlarını kapat
    if (view === ViewState.MAP) { 
        setSelectedClusterMoods(null);
        setShowPresetLocations(false);
        console.log("[page.tsx] Already on map, direct close of residual panels.");
        return;
    }
    
    setView(ViewState.MAP); // Her zaman harita görünümüne dön
    setSelectedClusterMoods(null); // Küme listesini kapat
    setShowPresetLocations(false); // Ön tanımlı konumlar menüsünü kapat
    setSelectedEmoji(MOOD_OPTIONS[0].emoji); // Seçili emojiyi varsayılana sıfırla
    setStatusText(''); // Mood metnini temizle
    setIsSubmitting(false); // Gönderim durumunu sıfırla
    setCastError(null); // Hata mesajını temizle
    console.log("[page.tsx] All panels closed and states reset to map view.");
  }, [view, setSelectedClusterMoods, setShowPresetLocations, setSelectedEmoji, setStatusText, setIsSubmitting, setCastError]);


   const handleInitialLocationDetermined = useCallback(async (locationData: LocationData | null) => {
      if (!geolocationFunctions) {
        console.warn("[page.tsx] Geolocation functions not yet loaded, skipping initial location determination.");
        return; 
      }

      if (!locationData) {
        setCurrentDeterminedLocationData(null);
        console.log("[page.tsx] Location determination failed or denied.");
        return;
      }

      console.log("[page.tsx] Initial location data from Map:", locationData);

      const [preciseLat, preciseLng] = locationData.coords;
      let finalLocationLabel: string = "Unknown Location";
      let geocodedCoords: [number, number] = locationData.coords;

      if (locationData.locationType === 'user') {
        try {
          const geocodedResult = await geolocationFunctions.reverseGeocode(preciseLat, preciseLng);
          if (geocodedResult) {
            finalLocationLabel = geocodedResult;
            const forwardGeocodedResult = await geolocationFunctions.forwardGeocode(geocodedResult);
            if (forwardGeocodedResult) {
              geocodedCoords = forwardGeocodedResult;
            } else {
              console.warn("[page.tsx] Forward geocoding failed for user location, using precise coords.");
            }
          } else {
            console.warn("[page.tsx] Reverse geocoding returned no label for user location, using 'Unknown Location'.");
          }
        } catch (error) {
          console.error("[page.tsx] Error during geocoding process for user location:", error);
        }
      } else {
        finalLocationLabel = locationData.name || "Unknown Location";
        geocodedCoords = locationData.coords;
      }

      setCurrentDeterminedLocationData({
        coords: geocodedCoords,
        timestamp: locationData.timestamp,
        accuracy: locationData.accuracy,
        locationLabel: finalLocationLabel,
        zoom: locationData.zoom ?? defaultZoomLevel,
        locationType: locationData.locationType,
      });

      // Başlangıçta kullanıcı konumuna odaklandığı için true
      setIsMapCenteredOnUserLocation(true); 
    }, [geolocationFunctions, setCurrentDeterminedLocationData, setIsMapCenteredOnUserLocation, defaultZoomLevel]);


  const handleAddMood = useCallback(async () => {
    if (!currentDeterminedLocationData) {
        alert("Location information is not available to share your mood. Please determine the location.");
        return;
    }

    setIsSubmitting(true);
    setCastError(null);

    const currentUserId = user?.fid ? user.fid.toString() : 'anon';
    const currentUsername = user?.username || 'Anonymous User'; 

    const existingMoodIndex = moods.findIndex(mood => mood.userId === currentUserId);

    const newLocation: Location = { lat: currentDeterminedLocationData.coords[0], lng: currentDeterminedLocationData.coords[1] };
    const newLocationLabel = currentDeterminedLocationData.locationLabel || "Unknown Location";

    let moodToPost: Mood;

    if (existingMoodIndex !== -1) {
      const existingMood = moods[existingMoodIndex];
      moodToPost = {
        ...existingMood,
        emoji: selectedEmoji,
        text: statusText.trim(),
        location: newLocation,
        locationLabel: newLocationLabel,
        timestamp: Date.now(),
      };

      setMoods(prev => {
        const updatedMoods = [...(prev || [])];
        updatedMoods[existingMoodIndex] = moodToPost;
        return updatedMoods;
      });

    } else {
      moodToPost = {
          id: Math.random().toString(36).substr(2, 9),
          emoji: selectedEmoji,
          text: statusText.trim(),
          location: newLocation,
          locationLabel: newLocationLabel,
          timestamp: Date.now(),
          userId: currentUserId,
          username: currentUsername
      };

      setMoods(prev => [moodToPost, ...(prev || [])]);
    }

    setUserLastMoodLocation({
        name: moodToPost.locationLabel || "Unknown Location",
        coords: [moodToPost.location.lat, moodToPost.location.lng],
        zoom: currentDeterminedLocationData?.zoom || defaultZoomLevel,
        popupText: moodToPost.text || moodToPost.emoji,
    });
    setMapRecenterTrigger({
        coords: [moodToPost.location.lat, moodToPost.location.lng],
        zoom: currentDeterminedLocationData?.zoom || defaultZoomLevel,
        animate: false,
        purpose: 'userLocation', 
    });

    setLastLocallyPostedMood(moodToPost);

    setIsMapCenteredOnUserLocation(true); 

    handleCloseAllPanels(); // Mood eklendikten sonra tüm panelleri kapat
  }, [
    currentDeterminedLocationData, 
    user?.fid, 
    user?.username,
    defaultZoomLevel, 
    moods, selectedEmoji, statusText, setCastError, setIsSubmitting, setMoods, 
    setUserLastMoodLocation, setMapRecenterTrigger, setLastLocallyPostedMood, 
    setIsMapCenteredOnUserLocation, handleCloseAllPanels 
  ]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleCastLastMoodToFarcaster = useCallback(async () => {
    if (!lastLocallyPostedMood) {
        setCastError("No mood found to share on Farcaster.");
        return;
    }
    if (!user?.fid) {
        setCastError("You must be logged in as a Farcaster user to create a cast.");
        return;
    }

    setIsSubmitting(true);
    setCastError(null);

    try {
        const castContent = lastLocallyPostedMood.text
            ? `${lastLocallyPostedMood.emoji} ${lastLocallyPostedMood.text} at ${lastLocallyPostedMood.locationLabel || "a location"}`
            : `${lastLocallyPostedMood.emoji} at ${lastLocallyPostedMood.locationLabel || "a location"}`;

        await composeCast(castContent);
        console.log("Mood successfully cast to Farcaster.");
    } catch (castErr) {
        console.error("Error sharing mood on Farcaster:", castErr);
        setCastError("Failed to share on Farcaster. Please try again.");
    } finally {
        setIsSubmitting(false);
    }
  }, [lastLocallyPostedMood, user?.fid, composeCast, setCastError, setIsSubmitting]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMapRecenterComplete = useCallback(() => {
    if (mapRecenterTrigger?.purpose === 'userLocation') {
      setIsMapCenteredOnUserLocation(true); 
    } else {
      setIsMapCenteredOnUserLocation(false); 
    }
    setMapRecenterTrigger(null); 
    console.log("[page.tsx] Map recentering complete, trigger reset and map centered status updated.");
  }, [setMapRecenterTrigger, setIsMapCenteredOnUserLocation, mapRecenterTrigger]); 

  const handleMapUserMove = useCallback(() => {
    setIsMapCenteredOnUserLocation(false); 
    console.log("[page.tsx] Map moved by user, recenter status reset.");
  }, [setIsMapCenteredOnUserLocation]);

  const triggerRecenter = useCallback(() => {
    const targetLocationData = userLastMoodLocation || currentDeterminedLocationData;
    if (targetLocationData) {
        setMapRecenterTrigger({
            coords: targetLocationData.coords,
            zoom: targetLocationData.zoom || defaultZoomLevel,
            animate: true,
            purpose: 'userLocation', 
        });
        setIsMapCenteredOnUserLocation(false); 
    } else {
        alert("Location information is not yet determined.");
    }
  }, [userLastMoodLocation, currentDeterminedLocationData, setMapRecenterTrigger, setIsMapCenteredOnUserLocation, defaultZoomLevel]);

  const handleRecenterToUserLocation = useCallback(() => {
    handleCloseAllPanels(); 
    triggerRecenter();
  }, [triggerRecenter, handleCloseAllPanels]); 

  const isRecenterButtonDisabled = useMemo(() => {
    const noLocationData = !userLastMoodLocation && !currentDeterminedLocationData;
    const isCurrentlyCentered = isMapCenteredOnUserLocation; 
    return noLocationData || isCurrentlyCentered; 
  }, [userLastMoodLocation, currentDeterminedLocationData, isMapCenteredOnUserLocation]);

  const handleMapButtonClick = useCallback(() => {
    if (view !== ViewState.MAP) {
      handleCloseAllPanels();
    }
    setShowPresetLocations(prev => !prev);
    setSelectedClusterMoods(null); 
  }, [view, setShowPresetLocations, setSelectedClusterMoods, handleCloseAllPanels]);


  const handlePresetLocationClick = useCallback((preset: PresetLocation) => {
    const targetCoords = preset.coords; 
    const targetZoom = preset.zoom;    

    setMapRecenterTrigger({
        coords: targetCoords,
        zoom: targetZoom,
        animate: true,
        purpose: 'presetLocation', 
    });
    handleCloseAllPanels(); 
  }, [setMapRecenterTrigger, handleCloseAllPanels]); 

  const handleListViewToggle = useCallback(() => {
    setShowPresetLocations(false); 
    setSelectedClusterMoods(null); 

    if (view === ViewState.LIST) {
      setView(ViewState.MAP); 
    } else {
      setView(ViewState.LIST); 
    }
  }, [view, setView, setShowPresetLocations, setSelectedClusterMoods]);


  const handleClusterMarkerClick = useCallback((moodsInCluster: Mood[]) => {
    if (view !== ViewState.MAP) {
      handleCloseAllPanels(); 
    }
    setSelectedClusterMoods(moodsInCluster); 
    setView(ViewState.CLUSTER_LIST); 
    setShowPresetLocations(false); 
    console.log("[page.tsx] Cluster clicked, showing moods:", moodsInCluster);
  }, [setSelectedClusterMoods, setView, setShowPresetLocations, view, handleCloseAllPanels]);


  if (status === "loading") {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-2xl animate-pulse">Loading Farcaster MiniApp...</p>
        <p className="text-lg text-gray-400 mt-2">Awaiting user permission...</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-2xl text-red-500 font-bold">An error occurred!</p>
        <p className="text-xl text-red-300 mt-2">{error?.message || "SDK failed to initialize."}</p>
        <p className="mt-4 text-lg">Please check app permissions or refresh your browser.</p>
      </main>
    );
  }

  return (
    <div className="relative w-full h-screen flex flex-col bg-slate-950 text-white overflow-hidden font-sans">

      {/* Full-screen backdrop for closing only Preset Locations (Diğer paneller onMapClick ile kapanır) */}
      {showPresetLocations && (
        <div
          className="absolute inset-0 z-[50] pointer-events-auto" // Backdrop z-index'i eski halinde
          onClick={() => setShowPresetLocations(false)} // Sadece preset menüsünü kapatır
        ></div>
      )}

      {/* Header / Top Bar (En üstte olmalı, Z-index en yüksek) */}
      <div className="absolute top-0 left-0 right-0 z-[60] p-4 pointer-events-none">
        <div className="flex justify-end items-start gap-3">
            {/* Kullanıcı adı kutusu */}
            <div className="text-right p-2 bg-slate-900/80 backdrop-blur-md rounded-lg shadow-md border border-slate-700 pointer-events-auto">
                <p className="text-base font-semibold text-purple-100 leading-tight">@{user?.username || "anonymous"}</p>
            </div>
            {/* Konum Navigasyon Butonu (kullanıcı adının sağında) */}
            <button
                onClick={handleRecenterToUserLocation}
                disabled={isRecenterButtonDisabled} 
                className={`p-1.5 rounded-full transition-all bg-slate-900/80 backdrop-blur-md shadow-md border border-slate-700 pointer-events-auto
                    ${isRecenterButtonDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-purple-400 hover:text-white hover:bg-slate-700/80'}`}
                title="Recenter to your location or last mood location"
            >
                <MapPin size={24} />
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative z-0">
        <div className="absolute inset-0">
            <DynamicMap
                moods={moods}
                onInitialLocationDetermined={handleInitialLocationDetermined}
                height="100%"
                recenterTrigger={mapRecenterTrigger}
                onRecenterComplete={handleMapRecenterComplete}
                onMapMove={handleMapUserMove}
                onClusterClick={handleClusterMarkerClick}
                onMapClick={handleCloseAllPanels} // <<< Harita tıklamalarında tüm panelleri kapatır
            />
        </div>

        {/* List View Overlay */}
        { view === ViewState.LIST && (
            <div
                className={`absolute inset-0 z-[55] pt-20 px-2 pb-20 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300`}
                onClick={handleCloseAllPanels} 
            >
                 <div
                    className="h-full overflow-hidden" 
                    onClick={(e) => e.stopPropagation()} 
                 >
                    <MoodFeed
                        moods={moods}
                        onCloseRequest={handleCloseAllPanels} 
                    />
                 </div>
            </div>
        )}

        {/* Add Mood Overlay */}
        { view === ViewState.ADD && (
             <div 
                 className={`absolute inset-0 z-[55] bg-slate-900/95 flex items-center justify-center p-6 backdrop-blur-xl pointer-events-auto animate-in zoom-in-95 duration-200`}
                 onClick={handleCloseAllPanels} 
             >
                 <div 
                    className="w-full max-w-md flex flex-col h-full max-h-[600px] justify-center space-y-6"
                    onClick={(e) => e.stopPropagation()} 
                 >
                    <h2 className="text-2xl font-bold text-center shrink-0">What&apos;s your vibe?</h2>

                    <div className="min-h-[24px] flex items-center justify-center mt-2">
                        {!currentDeterminedLocationData && (
                            <p className="text-sm text-yellow-400 text-center animate-pulse">Location is not yet determined. Please wait...</p>
                        )}
                        {currentDeterminedLocationData && currentDeterminedLocationData.locationType === 'user' && (
                            <p className="text-sm text-green-400 text-center">
                                Location found: {currentDeterminedLocationData.locationLabel}
                            </p>
                        )}
                        {currentDeterminedLocationData && currentDeterminedLocationData.locationType === 'fallback' && (
                            <p className="text-sm text-red-400 text-center font-bold animate-pulse">
                                Unauthorized access detected, Location: {currentDeterminedLocationData.locationLabel}
                            </p>
                        )}
                        {castError && (
                            <p className="text-sm text-red-400 text-center mt-2">{castError}</p>
                        )}
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className={`w-full overflow-x-auto custom-scrollbar py-6 -mx-3 px-3 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                    >
                        <div className="grid grid-rows-3 grid-flow-col gap-3 w-max">
                            {MOOD_OPTIONS.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => setSelectedEmoji(opt.emoji)}
                                    className={`w-16 h-16 rounded-2xl text-3xl flex items-center justify-center transition-all duration-200 border-2 ${
                                        selectedEmoji === opt.emoji
                                        ? 'bg-purple-600/20 border-purple-500 scale-110 shadow-[0_0_15px_rgba(168,85,247,0.5)] z-10'
                                        : 'bg-slate-800 border-transparent hover:bg-slate-700 opacity-80 hover:opacity-100'
                                    }`}
                                >
                                    <div className="pointer-events-none">{opt.emoji}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4 shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={MAX_MOOD_TEXT_LENGTH}
                                placeholder="Add a note... (optional)"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-14 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none transition-all"
                                value={statusText}
                                onChange={(e) => setStatusText(e.target.value)}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                                {statusText.length}/{MAX_MOOD_TEXT_LENGTH}
                            </span>
                        </div>

                        <div className="flex gap-3">
                            <Button variant="secondary" className="flex-1" onClick={handleCloseAllPanels} disabled={isSubmitting}>
                                Cancel
                            </Button>
                            <Button className="flex-1" onClick={handleAddMood} isLoading={isSubmitting} disabled={!currentDeterminedLocationData}>
                                Post Vibe
                            </Button>
                        </div>
                    </div>
                 </div>
             </div>
        )}

        {/* YENİ: Küme Listesi Yan Paneli (Y ekseni konumu ayarlandı ve kaydırma aktif edildi) */}
        { view === ViewState.CLUSTER_LIST && selectedClusterMoods && (
            <div 
                // top-24 ve bottom-24 ile dikey konum ve yükseklik ayarlandı.
                // flex flex-col eklendi.
                className={`absolute top-24 bottom-24 right-0 w-[240px] sm:w-80 md:w-96 z-[55] bg-transparent pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300 flex flex-col`}
                onClick={handleCloseAllPanels} 
            >
                {/* Konum başlığı şimdi MoodFeed'in üstünde, ortalanmış bir şekilde */}
                {/* shrink-0 sayesinde başlık sabit yüksekliğini koruyacak */}
                <h3 className="text-base font-bold text-purple-300 text-center truncate px-4 pb-2 shrink-0 md:text-md"> 
                    {selectedClusterMoods[0]?.locationLabel || "Unknown Location"} ({selectedClusterMoods.length})
                </h3>
                {/* MoodFeed bileşenini yeniden kullanıyoruz */}
                {/* flex-1 ile kalan alanı dolduracak, overflow-y-auto ile kaydırılabilir olacak */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4" onClick={(e) => e.stopPropagation()}>
                    <MoodFeed
                        moods={selectedClusterMoods}
                        onCloseRequest={handleCloseAllPanels} 
                        hideHeader={true} 
                    />
                </div>
            </div>
        )}
      </div>

      {/* --- Bottom Navigation Bar --- */}
      <div className="absolute bottom-0 left-0 right-0 z-[50] p-4 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent pb-6">
        <div className="flex items-center justify-around max-w-md mx-auto bg-slate-800/80 backdrop-blur-lg rounded-full p-2 shadow-2xl border border-slate-700/50 pointer-events-auto">

            {/* 1. Harita Görünümüne Geçiş Butonu ve Konum Listesi */}
            <div className="relative">
              <button
                  onClick={handleMapButtonClick} 
                  className={`p-1.5 rounded-full transition-all ${view === ViewState.MAP || view === ViewState.CLUSTER_LIST ? 'bg-slate-700 text-purple-400' : 'text-slate-400 hover:text-white'}`}
                  title="Switch to Map View / Open Preset Locations"
              >
                  <MapIcon size={24} />
              </button>

              {/* Preset Locations Menu - Burası harita butonuyla ilişkili, orijinal konumunda kaldı */}
              {showPresetLocations && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-5 w-40 bg-slate-800/90 backdrop-blur-lg rounded-lg shadow-xl border border-slate-700 py-2 z-[51] pointer-events-auto"> 
                  <ul className="text-sm text-slate-300">
                    {PRESET_LOCATIONS.map(preset => (
                      <li
                        key={preset.id}
                        className="px-4 py-2 hover:bg-slate-700/50 cursor-pointer flex items-center gap-2"
                        onClick={(e) => { e.stopPropagation(); handlePresetLocationClick(preset); }}
                      >
                        <MapPin size={16} /> {preset.name}
                      </li>
                    ))}
                  </ul>
                  <div className="absolute left-1/2 -translate-x-1/2 bottom-[-8px] w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-slate-800/90"></div>
                </div>
              )}
            </div>

            {/* 3. Add Mood Butonu (+) - Merkezde */}
            <button
                onClick={() => { 
                    if (view !== ViewState.MAP) { // Eğer harita görünümünde değilsek
                      handleCloseAllPanels(); // Açık olan diğer panelleri kapat
                    }
                    setView(ViewState.ADD); // Add Mood görünümüne geç
                    setShowPresetLocations(false); // Presetleri kapat
                    setSelectedClusterMoods(null); // Küme listesini kapat
                }}
                className={`bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-full shadow-lg shadow-purple-600/40 active:scale-95 transition-transform -mt-8 border-4 border-slate-900`}
            >
                <Plus size={28} strokeWidth={3} />
            </button>

            {/* 5. List Görünümüne Geçiş Butonu */}
            <button
                onClick={handleListViewToggle} 
                className={`p-3 rounded-full transition-all ${view === ViewState.LIST ? 'bg-slate-700 text-purple-400' : 'text-slate-400 hover:text-white'}`}
                title="Switch to List View"
            >
                <List size={24} />
            </button>

        </div>
      </div>
    </div>
  );
}