// src/app/page.tsx
"use client";

import { useState, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";
import { reverseGeocode, forwardGeocode } from '@/lib/geolocation';

import { Button } from '@/components/ui/Button';
import { MoodFeed } from '@/components/MoodFeed'; // MoodFeed import edildi
import { ViewState, Location, LocationData, Mood, MOOD_OPTIONS, MOCK_MOODS } from '@/types/app';
import { Plus, Map as MapIcon, List, MapPin } from 'lucide-react';

const DynamicMap = dynamic(() => import('@/components/Map/Map'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center bg-slate-800 rounded-lg shadow-xl h-full w-full">
      <p className="text-gray-400">Loading map...</p>
    </div>
  ),
});

const MAX_MOOD_TEXT_LENGTH =48;

export default function Home() {
  const { user, status, error, composeCast } = useFarcasterMiniApp();

  const [currentDeterminedLocationData, setCurrentDeterminedLocationData] = useState<LocationData | null>(null);
  const [userLastMoodLocation, setUserLastMoodLocation] = useState<LocationData | null>(null);
  const [mapRecenterTrigger, setMapRecenterTrigger] = useState<{ coords: [number, number], zoom: number, animate: boolean } | null>(null);
  const [lastLocallyPostedMood, setLastLocallyPostedMood] = useState<Mood | null>(null);

  const [isMapCenteredOnUserLocation, setIsMapCenteredOnUserLocation] = useState(false);

  const [view, setView] = useState<ViewState>(ViewState.ADD);

  const [moods, setMoods] = useState<Mood[]>(MOCK_MOODS);
  const [selectedEmoji, setSelectedEmoji] = useState(MOOD_OPTIONS[0].emoji);
  const [statusText, setStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const defaultZoomLevel = useMemo(() => 14, []);


   const handleInitialLocationDetermined = useCallback(async (locationData: LocationData | null) => {
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
          const geocodedResult = await reverseGeocode(preciseLat, preciseLng);
          if (geocodedResult) {
            finalLocationLabel = geocodedResult;
            const forwardGeocodedResult = await forwardGeocode(geocodedResult);
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

      setIsMapCenteredOnUserLocation(true);
    }, [setCurrentDeterminedLocationData, setIsMapCenteredOnUserLocation, defaultZoomLevel]);


  const handleAddMood = useCallback(async () => {
    if (!currentDeterminedLocationData) {
        alert("Location information is not available to share your mood. Please determine the location.");
        return;
    }

    setIsSubmitting(true);
    setCastError(null);

    // user?.username buraya eklendi
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
    });

    setLastLocallyPostedMood(moodToPost);

    setIsMapCenteredOnUserLocation(true);

    setView(ViewState.MAP);
    setStatusText('');
    setIsSubmitting(false);

  }, [
    currentDeterminedLocationData, 
    user?.fid, 
    user?.username, // 'user?.username' bağımlılığı eklendi
    defaultZoomLevel, 
    moods, selectedEmoji, statusText, setCastError, setIsSubmitting, setMoods, 
    setUserLastMoodLocation, setMapRecenterTrigger, setLastLocallyPostedMood, 
    setIsMapCenteredOnUserLocation, setView, setStatusText
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
    setMapRecenterTrigger(null);
    setIsMapCenteredOnUserLocation(true);
    console.log("[page.tsx] Map recentering complete, trigger reset and map centered status updated.");
  }, [setMapRecenterTrigger, setIsMapCenteredOnUserLocation]);

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
        });
        setIsMapCenteredOnUserLocation(false);
    } else {
        alert("Location information is not yet determined.");
    }
  }, [userLastMoodLocation, currentDeterminedLocationData, setMapRecenterTrigger, setIsMapCenteredOnUserLocation, defaultZoomLevel]);

  const handleRecenterToUserLocation = useCallback(() => {
    if (view !== ViewState.MAP) {
        setView(ViewState.MAP);
        setTimeout(() => {
            triggerRecenter();
        }, 300);
    } else {
        triggerRecenter();
    }
  }, [view, triggerRecenter]);

  const isRecenterButtonDisabled = useMemo(() => {
    const noLocationData = !userLastMoodLocation && !currentDeterminedLocationData;
    const notOnMapView = view !== ViewState.MAP;
    const isCurrentlyCentered = isMapCenteredOnUserLocation;
    return noLocationData || notOnMapView || isCurrentlyCentered;
  }, [userLastMoodLocation, currentDeterminedLocationData, view, isMapCenteredOnUserLocation]);


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

      {/* Header / Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 pointer-events-none">
        {/* BU BÖLÜM KULLANICI ADI VE NAVİGASYON BUTUNU İÇİN GÜNCELLENDİ */}
        <div className="flex justify-end items-start gap-3"> {/* Elemanları sağa yaslamak için justify-end, üstte hizalamak için items-start, aralarında boşluk için gap-3 */}
            {/* Kullanıcı adı - İlk sıraya alındı (solda olması için) */}
            <div className="text-right p-2 bg-slate-900/80 backdrop-blur-md rounded-lg shadow-md border border-slate-700 pointer-events-auto">
                <p className="text-base font-semibold text-purple-100 leading-tight">@{user?.username || "anonymous"}</p>
            </div>
            {/* Konum Navigasyon Butonu - Kullanıcı adının sağına taşındı ve koşullu olarak render edildi */}
            {view !== ViewState.LIST && (
                <button
                    onClick={handleRecenterToUserLocation}
                    disabled={isRecenterButtonDisabled}
                    className={`p-1.5 rounded-full transition-all bg-slate-900/80 backdrop-blur-md shadow-md border border-slate-700 pointer-events-auto
                        ${isRecenterButtonDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-purple-400 hover:text-white hover:bg-slate-700/80'}`}
                    title="Recenter to your location or last mood location"
                    // Artık 'gap-3' ve 'items-start' kullanıldığı için 'marginTop'a gerek yok.
                    // Eğer özel bir dikey offset isterseniz buraya 'mt-X' gibi bir Tailwind sınıfı ekleyebilirsiniz.
                >
                    <MapPin size={24} />
                </button>
            )}
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
            />
        </div>

        {/* List View Overlay */}
        {view === ViewState.LIST && (
            <div
                className="absolute inset-0 z-30 pt-20 px-2 pb-20 bg-black/40 backdrop-blur-sm"
                onClick={() => setView(ViewState.MAP)} // Tüm overlay alanına tıklayınca kapanır
            >
                 <div className="h-full overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-300">
                    <MoodFeed
                        moods={moods}
                        onCloseRequest={() => setView(ViewState.MAP)}
                    />
                 </div>
            </div>
        )}

        {/* Add Mood Overlay */}
        {view === ViewState.ADD && (
             <div className="absolute inset-0 z-30 bg-slate-900/95 flex items-center justify-center p-6 backdrop-blur-xl animate-in zoom-in-95 duration-200">
                 <div className="w-full max-w-md flex flex-col h-full max-h-[600px] justify-center space-y-6">
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
                            <Button variant="secondary" className="flex-1" onClick={() => setView(ViewState.MAP)} disabled={isSubmitting}>
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
      </div>

      {/* --- Bottom Navigation Bar --- */}
      <div className="absolute bottom-0 left-0 right-0 z-40 p-4 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent pb-6">
        <div className="flex items-center justify-around max-w-md mx-auto bg-slate-800/80 backdrop-blur-lg rounded-full p-2 shadow-2xl border border-slate-700/50">

            {/* 1. Harita Görünümüne Geçiş Butonu */}
            <button
                onClick={() => setView(ViewState.MAP)}
                className={`p-3 rounded-full transition-all ${view === ViewState.MAP ? 'bg-slate-700 text-purple-400' : 'text-slate-400 hover:text-white'}`}
                title="Switch to Map View"
            >
                <MapIcon size={24} />
            </button>

            {/* 2. Konum Navigasyon Butonu - Artık yukarıda */}

            {/* 3. Add Mood Butonu (+) - Merkezde */}
            <button
                onClick={() => setView(ViewState.ADD)}
                className="bg-purple-600 hover:bg-purple-500 text-white p-4 rounded-full shadow-lg shadow-purple-600/40 active:scale-95 transition-transform -mt-8 border-4 border-slate-900"
            >
                <Plus size={28} strokeWidth={3} />
            </button>

            {/* 4. Farcaster Cast Butonu (Kaldırıldı - Görsel olarak, yorum satırı içinde duruyor) */}
            {/* ... (yorum satırı halinde bırakıldı) ... */}

            {/* 5. List Görünümüne Geçiş Butonu */}
            <button
                onClick={() => setView(ViewState.LIST)}
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