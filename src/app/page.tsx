// src/app/page.tsx
"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/Button';
import { MoodFeed } from '@/components/MoodFeed';
import { ViewState, Location, LocationData, Mood, MOOD_OPTIONS } from '@/types/app';
import { Plus, Map as MapIcon, List, MapPin } from 'lucide-react'; 

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
  { id: 'marrakech', name: 'Marrakech', coords: [31.6295, -7.9813], zoom: 10 }, 
  { id: 'cape_town', name: 'Cape Town', coords: [-33.9249, 18.4241], zoom: 9 }, 
  { id: 'new_york', name: 'New York', coords: [40.7128, -74.0060], zoom: 9 },
  { id: 'world', name: 'World', coords: [0, 0], zoom: 3 }, 
];

// Supabase'den gelen veriyi uygulama Mood tipine dönüştüren yardımcı fonksiyon
interface SupabaseMood {
  uuid: string;
  username: string;
  display_name: string;
  fid: number;
  location_label: string;
  center_lat: number;
  center_lng: number;
  emoji: string;
  user_note: string;
  mood_date: string; // ISO string formatında
}

const mapSupabaseMoodToAppMood = (dbMood: SupabaseMood): Mood => {
  return {
    id: dbMood.uuid, // Supabase UUID'sini Mood id olarak kullan
    emoji: dbMood.emoji,
    text: dbMood.user_note,
    location: { lat: dbMood.center_lat, lng: dbMood.center_lng },
    locationLabel: dbMood.location_label,
    timestamp: new Date(dbMood.mood_date).getTime(), // ISO string'i timestamp'e çevir
    userId: dbMood.fid.toString(), // fid'yi string olarak sakla
    username: dbMood.username,
  };
};

export default function Home() {
  const { user, status, error, composeCast } = useFarcasterMiniApp(); // eslint-disable-line @typescript-eslint/no-unused-vars

  const [currentDeterminedLocationData, setCurrentDeterminedLocationData] = useState<LocationData | null>(null);
  const [userLastMoodLocation, setUserLastMoodLocation] = useState<LocationData | null>(null);
  const [mapRecenterTrigger, setMapRecenterTrigger] = useState<{ 
    coords: [number, number], 
    zoom: number, 
    animate: boolean,
    purpose: 'userLocation' | 'presetLocation' 
  } | null>(null);
  const [lastLocallyPostedMood, setLastLocallyPostedMood] = useState<Mood | null>(null); // eslint-disable-line @typescript-eslint/no-unused-vars

  const [isMapCenteredOnUserLocation, setIsMapCenteredOnUserLocation] = useState(false);
  
  const [showPresetLocations, setShowPresetLocations] = useState(false);

  const [view, setView] = useState<ViewState | null>(null); 

  const [moods, setMoods] = useState<Mood[]>([]);
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

  const [anonFid, setAnonFid] = useState<number | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false); 


  // Geolocation ve Anonim FID yükleme
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

      const storedAnonFid = localStorage.getItem('farcatser_anon_fid'); // <-- BURASI DÜZELTİLDİ: 'let' -> 'const'
      if (storedAnonFid) { 
        setAnonFid(parseInt(storedAnonFid, 10));
        console.log("[page.tsx] Loaded anonymous FID from localStorage:", storedAnonFid);
      } else {
        const newAnonFid = -(Math.floor(Math.random() * 2_000_000_000) + 1);
        localStorage.setItem('farcatser_anon_fid', newAnonFid.toString());
        setAnonFid(newAnonFid);
        console.log("[page.tsx] Generated new anonymous FID and stored in localStorage:", newAnonFid);
      }
    }
  }, []);

  // Tüm mood'ları Supabase'den çeken yardımcı fonksiyon
  const fetchAllMoods = useCallback(async () => {
    console.log("[page.tsx] Fetching all moods from Supabase...");
    const { data, error } = await supabase
      .from('moods')
      .select('*');

    if (error) {
      console.error("Error fetching all moods:", error);
      setCastError(`Failed to load moods: ${error.message}`);
      return [];
    }

    if (data) {
      const appMoods = data.map(mapSupabaseMoodToAppMood);
      // YENİ: Mood'ları zaman damgasına göre azalan düzende sırala (en yeni önce)
      return appMoods.sort((a, b) => b.timestamp - a.timestamp); 
    }
    return [];
  }, []);

  // YENİ useEffect: Uygulamanın ilk yüklenmesinde mood'ları çek ve başlangıç görünümünü ayarla
  useEffect(() => {
    const initializeAppData = async () => {
      // Sadece Farcaster SDK hala yüklüyorsa VEYA anonim FID henüz belirlenmediyse bekle.
      // `status` değeri `useFarcasterMiniApp` tarafından 'loaded' veya 'error' olarak ayarlanır.
      if (status === 'loading' || anonFid === null) { 
        console.log("[page.tsx] Waiting for Farcaster status to be loaded or anonFid to be set...", { status, anonFid });
        return;
      }

      // `useFarcasterMiniApp` hook'u status 'loaded' olduğunda user objesini (gerçek veya ANONYMOUS_USER) ayarlar.
      // `ANONYMOUS_USER.fid` 0 olduğu için, `user?.fid` bu durumda 0 olacaktır.
      // Kullanıcının isteği üzerine, Farcaster'dan gelen fid 0 ise kendi ürettiğimiz negatif anonFid'yi kullanacağız.
      let effectiveFid: number | null = null;
      if (user?.fid && user.fid > 0) { // Eğer Farcaster kullanıcısı bağlıysa (gerçek FID > 0)
        effectiveFid = user.fid;
        console.log("[page.tsx] Using Farcaster FID:", effectiveFid);
      } else if (anonFid !== null) { // Eğer Farcaster anonim kullanıcıysa (user.fid 0) VEYA Farcaster bağlantısı başarısızsa (user undefined), yerel anonim FID'yi kullan
        effectiveFid = anonFid;
        console.log("[page.tsx] Using Anonymous FID from localStorage:", effectiveFid);
      } else { 
        // Bu durum, teorik olarak yukarıdaki `if (status === 'loading' || anonFid === null)` kontrolü sayesinde yakalanmış olmalıydı.
        // Yine de bir fallback ekleyelim, hata ayıklama için.
        console.error("[page.tsx] Critical: effectiveFid could not be determined. Using 0 as fallback.");
        effectiveFid = 0; // Son çare fallback
      }
      
      // Eğer efektif FID hala null ise (çok nadir, yukarıdaki kontrolü geçse bile)
      if (effectiveFid === null) {
          console.error("[page.tsx] Critical: effectiveFid is null after determination logic. Setting error.");
          setCastError("Critical error: User ID is missing for database operations.");
          setIsInitialLoadComplete(true); 
          setView(ViewState.ADD); // Ekleme ekranına düşür
          return;
      }


      // 1. Kullanıcının kendi mood'unu kontrol et
      console.log(`[page.tsx] Checking for user's mood with FID: ${effectiveFid}`);
      const { data: userMoodData, error: userMoodError } = await supabase
        .from('moods')
        .select('*')
        .eq('fid', effectiveFid)
        .single(); 

      if (userMoodError && userMoodError.code !== 'PGRST116') { // PGRST116: "No rows found" hatası
        console.error("Error fetching user's initial mood:", userMoodError);
        setCastError(`Failed to load your mood: ${userMoodError.message}`);
        setView(ViewState.ADD); 
      } else if (userMoodData) {
        console.log("[page.tsx] User's initial mood found:", userMoodData);
        const userAppMood = mapSupabaseMoodToAppMood(userMoodData);
        setLastLocallyPostedMood(userAppMood); 
        setUserLastMoodLocation({ 
            name: userAppMood.locationLabel || "Unknown Location",
            coords: [userAppMood.location.lat, userAppMood.location.lng],
            zoom: defaultZoomLevel, 
            popupText: userAppMood.text || userAppMood.emoji,
            locationType: 'user' 
        });
        setMapRecenterTrigger({
            coords: [userAppMood.location.lat, userAppMood.location.lng],
            zoom: defaultZoomLevel,
            animate: false,
            purpose: 'userLocation',
        });
        setView(ViewState.MAP); 
      } else {
        console.log("[page.tsx] No mood found for current user, opening Add Mood screen.");
        setView(ViewState.ADD); 
      }

      // 2. Tüm mood'ları harita için çek
      const allMoods = await fetchAllMoods();
      setMoods(allMoods);

      setIsInitialLoadComplete(true); 
      console.log("[page.tsx] Initial app data loading complete.");
    };

    initializeAppData();
  }, [status, anonFid, user?.fid, fetchAllMoods, defaultZoomLevel, setCastError, setLastLocallyPostedMood, setUserLastMoodLocation, setMapRecenterTrigger]); // Düzeltildi: setLastLocallyPostedMood, setUserLastMoodLocation, setMapRecenterTrigger eklendi


  const handleCloseAllPanels = useCallback(() => {
    if (view === ViewState.MAP) { 
        setSelectedClusterMoods(null);
        setShowPresetLocations(false);
        console.log("[page.tsx] Already on map, direct close of residual panels.");
        return;
    }
    
    setView(ViewState.MAP); 
    setSelectedClusterMoods(null); 
    setShowPresetLocations(false); 
    setSelectedEmoji(MOOD_OPTIONS[0].emoji); 
    setStatusText(''); 
    setIsSubmitting(false); 
    setCastError(null); 
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
      let geocodedCoords: [number, number] = [preciseLat, preciseLng]; 

      if (locationData.locationType === 'user') {
        try {
          const geocodedResult = await geolocationFunctions.reverseGeocode(preciseLat, preciseLng);
          if (geocodedResult) {
            finalLocationLabel = geocodedResult;
            const forwardGeocodedResult = await geolocationFunctions.forwardGeocode(geocodedResult);
            if (forwardGeocodedResult) {
              geocodedCoords = forwardGeocodedResult; 
            } else {
              console.warn("[page.tsx] Forward geocoding failed for user location label, falling back to precise coordinates.");
            }
          } else {
            console.warn("[page.tsx] Reverse geocoding returned no label for user location, using 'Unknown Location'. Falling back to precise coordinates.");
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
    }, [geolocationFunctions, setCurrentDeterminedLocationData, setIsMapCenteredOnUserLocation, defaultZoomLevel]);


  const handleAddMood = useCallback(async () => {
    if (!currentDeterminedLocationData) {
        setCastError("Location information is not available to share your mood. Please determine the location."); 
        return;
    }

    if (user?.fid === undefined && anonFid === null) { 
        setCastError("User ID is not yet determined. Please wait a moment.");
        return;
    }

    setIsSubmitting(true);
    setCastError(null);

    let actualFid: number | null = null;
    if (user?.fid && user.fid > 0) { 
        actualFid = user.fid;
    } else if (anonFid !== null) { 
        actualFid = anonFid;
    } else {
        setCastError("Could not determine user ID for database operations.");
        setIsSubmitting(false);
        return;
    }

    if (actualFid === null) {
        setCastError("User ID is missing for database operations.");
        setIsSubmitting(false);
        return;
    }

    const currentUserIdForLocalState = actualFid.toString(); 

    const currentUsername = user?.username || 'Anonymous User'; 
    const currentUserDisplayName = user?.displayName || user?.username || 'Anonymous User'; 

    const newLocation: Location = { lat: currentDeterminedLocationData.coords[0], lng: currentDeterminedLocationData.coords[1] };
    const newLocationLabel = currentDeterminedLocationData.locationLabel || "Unknown Location";
    const moodTimestamp = Date.now(); 

    let moodToPost: Mood;

    const existingMoodIndex = moods.findIndex(mood => mood.userId === currentUserIdForLocalState);

    if (existingMoodIndex !== -1) {
      const existingMood = moods[existingMoodIndex];
      moodToPost = {
        ...existingMood,
        emoji: selectedEmoji,
        text: statusText.trim(),
        location: newLocation,
        locationLabel: newLocationLabel,
        timestamp: moodTimestamp, 
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
          timestamp: moodTimestamp, 
          userId: currentUserIdForLocalState, 
          username: currentUsername
      };

      setMoods(prev => [moodToPost, ...(prev || [])]);
    }
    
    // --- Supabase Veritabanı Kayıt İşlemi ---
    const fidForSupabase = actualFid; 

    try {
        const supabaseData = {
            username: currentUsername,
            display_name: currentUserDisplayName,
            fid: fidForSupabase, 
            location_label: newLocationLabel,
            center_lat: newLocation.lat,
            center_lng: newLocation.lng,
            emoji: moodToPost.emoji,
            user_note: moodToPost.text,
            mood_date: new Date(moodToPost.timestamp).toISOString(), 
        };

        console.log("Attempting to upsert to Supabase with data:", supabaseData);

        const { data, error: dbError } = await supabase
            .from('moods') 
            .upsert(supabaseData, {
                onConflict: 'fid', 
                ignoreDuplicates: false, 
            })
            .select(); 

        if (dbError) {
            console.error("Supabase upsert error:", dbError);
            setCastError(`Failed to save mood to database: ${dbError.message}`);
        } else {
            console.log("Mood successfully saved/updated in Supabase:", data);
            const updatedAllMoods = await fetchAllMoods();
            setMoods(updatedAllMoods);

            const updatedUserMood = updatedAllMoods.find(m => m.userId === currentUserIdForLocalState);
            if (updatedUserMood) {
                setLastLocallyPostedMood(updatedUserMood);
            }
        }

    } catch (unexpectedError) {
        console.error("An unexpected error occurred during Supabase operation:", unexpectedError);
        setCastError(`An unexpected database error occurred.`);
    } finally {
        setUserLastMoodLocation({
            name: moodToPost.locationLabel || "Unknown Location",
            coords: [moodToPost.location.lat, moodToPost.location.lng],
            zoom: currentDeterminedLocationData?.zoom || defaultZoomLevel,
            popupText: moodToPost.text || moodToPost.emoji,
            locationType: currentDeterminedLocationData?.locationType || 'fallback'
        });
        setMapRecenterTrigger({
            coords: [moodToPost.location.lat, moodToPost.location.lng],
            zoom: currentDeterminedLocationData?.zoom || defaultZoomLevel,
            animate: false,
            purpose: 'userLocation', 
        });

        setLastLocallyPostedMood(moodToPost);
        setIsMapCenteredOnUserLocation(true); 

        setIsSubmitting(false);
        handleCloseAllPanels(); 
    }
  }, [
    currentDeterminedLocationData, 
    user?.fid, 
    anonFid, 
    user?.username,
    user?.displayName, 
    defaultZoomLevel, 
    moods, selectedEmoji, statusText, setCastError, setIsSubmitting, setMoods, 
    setUserLastMoodLocation, setMapRecenterTrigger, setLastLocallyPostedMood, 
    setIsMapCenteredOnUserLocation, handleCloseAllPanels, fetchAllMoods 
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
    // YENİ: Küme moodlarını da zaman damgasına göre azalan düzende sırala
    const sortedClusterMoods = moodsInCluster.sort((a, b) => b.timestamp - a.timestamp);
    setSelectedClusterMoods(sortedClusterMoods); 
    setView(ViewState.CLUSTER_LIST); 
    setShowPresetLocations(false); 
    console.log("[page.tsx] Cluster clicked, showing moods:", sortedClusterMoods); // Log güncellendi
  }, [setSelectedClusterMoods, setView, setShowPresetLocations, view, handleCloseAllPanels]);


  const isPostVibeButtonDisabled = !currentDeterminedLocationData || (user?.fid === undefined && anonFid === null); 

  // Başlangıç yükleme ekranı
  if (status === "loading" || !isInitialLoadComplete || view === null) {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-2xl animate-pulse">Loading Farcaster MiniApp...</p>
        <p className="text-lg text-gray-400 mt-2">Initializing data and location...</p>
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
          className="absolute inset-0 z-[50] pointer-events-auto" 
          onClick={() => setShowPresetLocations(false)} 
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
                onMapClick={handleCloseAllPanels} 
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

         {/* YENİ: Küme Listesi Yan Paneli (Y ekseni konumu ayarlandı ve kaydırma aktif edildi) */}
        { view === ViewState.CLUSTER_LIST && selectedClusterMoods && (
            <div 
                className={`absolute top-24 bottom-48 right-0 w-[240px] sm:w-80 md:w-96 z-[55] bg-transparent pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300 flex flex-col`}
                onClick={handleCloseAllPanels} 
            >
                <h3 className="text-base font-bold text-purple-300 text-center truncate px-4 pb-2 shrink-0 md:text-sm"> 
                    {selectedClusterMoods[0]?.locationLabel || "Unknown Location"} ({selectedClusterMoods.length})
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4" onClick={(e) => e.stopPropagation()}>
                    <MoodFeed
                        moods={selectedClusterMoods}
                        onCloseRequest={handleCloseAllPanels} 
                        hideHeader={true} 
                        hideLocationDetails={true} 
                    />
                </div>
            </div>
        )}

        {/* Add Mood Overlay (Mood girişi burası) */}
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
                            <Button className="flex-1" onClick={handleAddMood} isLoading={isSubmitting} disabled={isPostVibeButtonDisabled}>
                                Post Vibe
                            </Button>
                        </div>
                    </div>
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
                    if (view !== ViewState.MAP) { 
                      handleCloseAllPanels(); 
                    }
                    setView(ViewState.ADD); 
                    setShowPresetLocations(false); 
                    setSelectedClusterMoods(null); 
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