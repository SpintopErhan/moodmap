// src/app/page.tsx
"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFarcasterMiniApp } from "@/hooks/useFarcasterMiniApp";
import { supabase } from '@/lib/supabase';

import { Button } from '@/components/ui/Button';
import { MoodFeed } from '@/components/MoodFeed';
import { ViewState, Location, LocationData, Mood, MOOD_OPTIONS } from '@/types/app';
import { Plus, Map as MapIcon, List, MapPin, XCircle, RotateCw } from 'lucide-react'; 

// YENİ: RANDOM_LOCATIONS'ı ve PresetLocation arayüzünü src/lib/randomloc'tan import ediyoruz.
import { RANDOM_LOCATIONS, PresetLocation } from '@/lib/randomloc';

const DynamicMap = dynamic(() => import('@/components/Map/Map'), {
  ssr: false,
});

const MAX_MOOD_TEXT_LENGTH = 48;

const BASE_TRANSLUCENT_PANEL_CLASSES = "bg-slate-900/80 backdrop-blur-md rounded-lg shadow-md border border-slate-700";
const BOTTOM_NAV_PANEL_CLASSES = "bg-slate-800/80 backdrop-blur-lg rounded-full p-2 shadow-2xl border border-slate-700/50";
const PRESET_LOCATION_MENU_CLASSES = "bg-slate-800/90 backdrop-blur-lg rounded-lg shadow-xl border border-slate-700 py-2";

// Debounce yardımcı fonksiyonu - ESLint 'any' hatası düzeltildi
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => { 
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

// KALDIRILDI: PresetLocation interface'i artık src/lib/randomloc'tan geliyor.
// interface PresetLocation {
//   id: string;
//   name: string;
//   coords: [number, number]; // [latitude, longitude]
//   zoom: number; // Bu konuma gidildiğinde haritanın zoom seviyesi
// }

// KALDIRILDI: PRESET_LOCATIONS dizisi artık src/lib/randomloc'tan geliyor (RANDOM_LOCATIONS adıyla).
// const PRESET_LOCATIONS: PresetLocation[] = [
//   { id: 'world', name: 'World', coords: [0, 0], zoom: 1 }, 
//   { id: 'north_america', name: 'North America', coords: [40.0, -100.0], zoom: 5 },
//   { id: 'south_america', name: 'South America', coords: [-20.0, -60.0], zoom: 5 },
//   { id: 'western_europe', name: 'Western Europe', coords: [48.0, 4.0], zoom: 5 },
//   { id: 'central_eastern_europe', name: 'Central Europe', coords: [50.0, 20.0], zoom: 5 },
//   { id: 'middle_east_north_africa', name: 'North Africa', coords: [28.0, 38.0], zoom: 5 },
//   { id: 'sub_saharan_africa', name: 'Saharan Africa', coords: [0.0, 20.0], zoom: 5 },
//   { id: 'south_asia', name: 'South Asia', coords: [22.0, 78.0], zoom: 5 },
//   { id: 'east_asia', name: 'East Asia', coords: [35.0, 125.0], zoom: 5 },
//   { id: 'southeast_asia', name: 'Southeast Asia', coords: [10.0, 105.0], zoom: 5 },
//   { id: 'oceania', name: 'Oceania', coords: [-25.0, 135.0], zoom: 5 },
// ];

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
  mood_date: string; 
  cast: boolean; 
  randomloc: boolean; 
}

const mapSupabaseMoodToAppMood = (dbMood: SupabaseMood): Mood => {
  return {
    id: dbMood.uuid, 
    emoji: dbMood.emoji,
    text: dbMood.user_note,
    location: { lat: dbMood.center_lat, lng: dbMood.center_lng },
    locationLabel: dbMood.location_label,
    timestamp: new Date(dbMood.mood_date).getTime(), 
    userId: dbMood.fid.toString(), 
    username: dbMood.username,
    fid: dbMood.fid, 
    cast: dbMood.cast,      
    randomloc: dbMood.randomloc, 
  };
};

const DEFAULT_ZOOM_LEVEL = 5;

export default function Home() {
  const { user, status, error, composeCast } = useFarcasterMiniApp(); 

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

  const [view, setView] = useState<ViewState | null>(null); 

  const [moods, setMoods] = useState<Mood[]>([]);
  const [selectedEmoji, setSelectedEmoji] = useState(MOOD_OPTIONS[0].emoji);
  const [statusText, setStatusText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [castError, setCastError] = useState<string | null>(null); 
  const [sendCast, setSendCast] = useState(true); 
  const [isRandomLocation, setIsRandomLocation] = useState(false); 

  const [selectedClusterMoods, setSelectedClusterMoods] = useState<Mood[] | null>(null); 

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const [geolocationFunctions, setGeolocationFunctions] = useState<{
    reverseGeocode: (lat: number, lng: number) => Promise<string | null>;
    forwardGeocode: (address: string) => Promise<[number, number] | null>;
  } | null>(null);

  const [anonFid, setAnonFid] = useState<number | null>(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false); 
  const [isMapReady, setIsMapReady] = useState(false); 
  const [userEffectiveFid, setUserEffectiveFid] = useState<number | null>(null); 

  const [customLocationInput, setCustomLocationInput] = useState<string>('');
  const [geocodedInputLocationData, setGeocodedInputLocationData] = useState<LocationData | null>(null);


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

      const storedAnonFid = localStorage.getItem('farcaster_anon_fid'); 
      if (storedAnonFid) { 
        setAnonFid(parseInt(storedAnonFid, 10));
        console.log("[page.tsx] Loaded anonymous FID from localStorage:", storedAnonFid);
      } else {
        const newAnonFid = -(Math.floor(Math.random() * 2_000_000_000) + 1);
        localStorage.setItem('farcaster_anon_fid', newAnonFid.toString());
        setAnonFid(newAnonFid);
        console.log("[page.tsx] Generated new anonymous FID and stored in localStorage:", newAnonFid);
      }
    }
  }, []);

  const fetchAllMoods = useCallback(async () => {
    console.log("[page.tsx] Fetching all moods from Supabase...");
    
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3); 
    const threeDaysAgoISO = threeDaysAgo.toISOString(); 

    const { data, error } = await supabase
      .from('moods')
      .select('*, cast, randomloc') 
      .gte('mood_date', threeDaysAgoISO); 

    if (error) {
      console.error("Error fetching all moods:", error);
      setCastError(`Failed to load moods: ${error.message}`);
      return [];
    }

    if (data) {
      const appMoods = data.map(mapSupabaseMoodToAppMood);
      return appMoods.sort((a, b) => b.timestamp - a.timestamp); 
    }
    return [];
  }, []);

  useEffect(() => {
    const initializeAppData = async () => {
      if (status === 'loading' || anonFid === null) { 
        console.log("[page.tsx] Waiting for Farcaster status to be loaded or anonFid to be set...", { status, anonFid });
        return; 
      }
      
      console.log("[page.tsx] Starting initializeAppData logic.");

      let effectiveFid: number | null = null;
      if (user?.fid && user.fid > 0) { 
        effectiveFid = user.fid;
        console.log("[page.tsx] Using Farcaster FID:", effectiveFid);
      } else if (anonFid !== null) { 
        effectiveFid = anonFid;
        console.log("[page.tsx] Using Anonymous FID from localStorage:", effectiveFid);
      } else { 
        console.error("[page.tsx] Critical: effectiveFid could not be determined. Using 0 as fallback.");
        effectiveFid = 0; 
      }
      
      setUserEffectiveFid(effectiveFid);

      if (effectiveFid === null) {
          console.error("[page.tsx] Critical: effectiveFid is null after determination logic. Setting error.");
          setCastError("Critical error: User ID is missing for database operations.");
          setIsDataLoaded(true); 
          setView(ViewState.ADD); 
          return;
      }

      console.log(`[page.tsx] Checking for user's mood with FID: ${effectiveFid}`);
      const { data: userMoodData, error: userMoodError } = await supabase
        .from('moods')
        .select('*, cast, randomloc') 
        .eq('fid', effectiveFid)
        .single(); 

      if (userMoodError && userMoodError.code !== 'PGRST116') { 
        console.error("Error fetching user's initial mood:", userMoodError);
        setCastError(`Failed to load your mood: ${userMoodError.message}`);
        setView(ViewState.ADD); 
      } else if (userMoodData) {
        console.log("[page.tsx] User's initial mood found:", userMoodData);
        const userAppMood = mapSupabaseMoodToAppMood(userMoodData);
        setLastLocallyPostedMood(userAppMood); 
        setSendCast(userMoodData.cast); 
        setIsRandomLocation(userMoodData.randomloc ?? false); 

        setUserLastMoodLocation({ 
            name: userAppMood.locationLabel || "Unknown Location",
            coords: [userAppMood.location.lat, userAppMood.location.lng],
            zoom: DEFAULT_ZOOM_LEVEL, 
            popupText: userAppMood.text || userAppMood.emoji,
            locationType: userMoodData.randomloc ? 'preset' : 'user' 
        });
        setMapRecenterTrigger({
            coords: [userAppMood.location.lat, userAppMood.location.lng],
            zoom: DEFAULT_ZOOM_LEVEL, 
            animate: false,
            purpose: 'userLocation',
        });
        setView(ViewState.MAP); 
      } else {
        console.log("[page.tsx] No mood found for current user, opening Add Mood screen.");
        setView(ViewState.ADD); 
        setSendCast(true); 
        setIsRandomLocation(false); 
      }

      const allMoods = await fetchAllMoods();
      setMoods(allMoods);

      setIsDataLoaded(true); 
      console.log("[page.tsx] Initial app data loading complete (excluding map readiness).");
    };

    initializeAppData();
  }, [
    status, 
    anonFid, 
    user?.fid, 
    fetchAllMoods, 
    setCastError, 
    setLastLocallyPostedMood, 
    setUserLastMoodLocation, 
    setMapRecenterTrigger, 
    setView, 
    setIsDataLoaded, 
    setMoods,
    setSendCast,       
    setIsRandomLocation, 
    setUserEffectiveFid, 
  ]);


  const handleCloseAllPanels = useCallback(() => {
    if (view === ViewState.MAP) { 
        setSelectedClusterMoods(null);
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
    setSendCast(true); 
    setIsRandomLocation(false); 
    setCustomLocationInput('');
    setGeocodedInputLocationData(null);
  }, [view, setSelectedClusterMoods, setSelectedEmoji, setStatusText, setIsSubmitting, setCastError, setSendCast, setIsRandomLocation, setCustomLocationInput, setGeocodedInputLocationData]); 


  const searchLocationFromInput = useCallback(async (locationText: string) => {
    if (!geolocationFunctions || !locationText.trim()) {
      setGeocodedInputLocationData(null);
      setCastError(null); 
      return;
    }

    console.log(`[page.tsx] Searching for location: "${locationText}"`);
    setCastError(null); 

    try {
      const coords = await geolocationFunctions.forwardGeocode(locationText.trim());

      if (coords) {
        console.log(`[page.tsx] Forward geocoded "${locationText}" to:`, coords);
        const reversedLabel = await geolocationFunctions.reverseGeocode(coords[0], coords[1]);

        setGeocodedInputLocationData({
          coords: coords,
          timestamp: Date.now(),
          locationLabel: reversedLabel || locationText.trim(), 
          zoom: DEFAULT_ZOOM_LEVEL,
          locationType: 'input', 
        });
        console.log(`[page.tsx] Geocoded input location set: ${reversedLabel || locationText.trim()}`);
      } else {
        console.warn(`[page.tsx] No coordinates found for "${locationText}".`);
        setGeocodedInputLocationData(null);
        setCastError("Location not found. Please try a different name.");
      }
    } catch (err) {
      console.error(`[page.tsx] Error during geocoding input "${locationText}":`, err);
      setGeocodedInputLocationData(null);
      setCastError("Error searching for location. Please try again.");
    }
  }, [geolocationFunctions, setCastError]);

  const debouncedSearchLocation = useMemo(() => debounce(searchLocationFromInput, 800), [searchLocationFromInput]);

  // YENİ REVİZYON: RANDOM_LOCATIONS'ı kullanıyoruz
  const handleSelectRandomPresetLocation = useCallback(() => {
    if (RANDOM_LOCATIONS.length === 0) { 
        setCastError("No random locations available.");
        setGeocodedInputLocationData(null);
        setCustomLocationInput('');
        return;
    }
    const randomIndex = Math.floor(Math.random() * RANDOM_LOCATIONS.length); 
    const randomPreset = RANDOM_LOCATIONS[randomIndex]; 

    setCustomLocationInput(randomPreset.name);
    setGeocodedInputLocationData({
        coords: randomPreset.coords,
        timestamp: Date.now(),
        locationLabel: randomPreset.name,
        zoom: randomPreset.zoom,
        locationType: 'preset',
    });
    setCastError(null);
  }, [setCustomLocationInput, setGeocodedInputLocationData, setCastError]);


  useEffect(() => {
    if (view === ViewState.ADD) {
      setCastError(null); 

      if (lastLocallyPostedMood) {
        setCustomLocationInput(lastLocallyPostedMood.locationLabel || '');
        setGeocodedInputLocationData({
          coords: [lastLocallyPostedMood.location.lat, lastLocallyPostedMood.location.lng],
          timestamp: lastLocallyPostedMood.timestamp,
          locationLabel: lastLocallyPostedMood.locationLabel,
          zoom: DEFAULT_ZOOM_LEVEL,
          locationType: lastLocallyPostedMood.randomloc ? 'preset' : 'user', 
        });
        setStatusText(lastLocallyPostedMood.text || ''); 
        setSelectedEmoji(lastLocallyPostedMood.emoji); 
        setSendCast(lastLocallyPostedMood.cast ?? true); 
        setIsRandomLocation(lastLocallyPostedMood.randomloc ?? false); 

      } else {
        setCustomLocationInput('');
        setStatusText('');
        setSelectedEmoji(MOOD_OPTIONS[0].emoji);
        setGeocodedInputLocationData(null);
        setSendCast(true); 
        setIsRandomLocation(false); 
      }
    } 
  }, [
    view, 
    lastLocallyPostedMood, 
    setCustomLocationInput, 
    setStatusText, 
    setSelectedEmoji, 
    setGeocodedInputLocationData, 
    setSendCast, 
    setIsRandomLocation, 
    setCastError,
  ]);

  const handleClearLocationInput = useCallback(() => {
    setCustomLocationInput('');
    setGeocodedInputLocationData(null);
    setCastError(null);
  }, [setCustomLocationInput, setGeocodedInputLocationData, setCastError]);

  const handleAddMood = useCallback(async () => {
    if (!isRandomLocation && !customLocationInput.trim()) {
        setCastError("Please enter a location to share your mood.");
        return;
    }

    if (!geocodedInputLocationData) {
        setCastError("Please enter a valid location and wait for it to be identified.");
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

    const newLocation: Location = { lat: geocodedInputLocationData.coords[0], lng: geocodedInputLocationData.coords[1] };
    const newLocationLabel = (geocodedInputLocationData.locationLabel ?? customLocationInput.trim()) || "Unknown Location";
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
        fid: actualFid, 
        cast: sendCast,        
        randomloc: isRandomLocation, 
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
          username: currentUsername,
          fid: actualFid, 
          cast: sendCast,        
          randomloc: isRandomLocation, 
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
            cast: sendCast, 
            randomloc: isRandomLocation, 
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

            if (sendCast && user?.fid) { 
                try {
                    const castContent = moodToPost.text
                        ? `${moodToPost.text} ${moodToPost.emoji} via MoodMap`
                        : `${moodToPost.emoji} via MoodMap`;
                    await composeCast(castContent);
                    console.log("Mood successfully cast to Farcaster.");
                } catch (castErr: unknown) { 
                    console.error("Error sharing mood on Farcaster during add:", castErr);
                    setCastError(`Failed to share on Farcaster: ${castErr instanceof Error ? castErr.message : "Unknown error"}. You can try again later.`);
                }
            }
        }

    } catch (unexpectedError: unknown) { 
        console.error("An unexpected error occurred during Supabase operation:", unexpectedError);
        setCastError(`An unexpected database error occurred: ${unexpectedError instanceof Error ? unexpectedError.message : "Unknown error"}.`);
    } finally {
        setUserLastMoodLocation({
            name: newLocationLabel, 
            coords: [moodToPost.location.lat, moodToPost.location.lng],
            zoom: DEFAULT_ZOOM_LEVEL, 
            popupText: moodToPost.text || moodToPost.emoji,
            locationType: isRandomLocation ? 'preset' : 'input' 
        });
        setMapRecenterTrigger({
            coords: [moodToPost.location.lat, moodToPost.location.lng],
            zoom: DEFAULT_ZOOM_LEVEL, 
            animate: false,
            purpose: 'userLocation', 
        });

        setLastLocallyPostedMood(moodToPost);
        setIsMapCenteredOnUserLocation(true); 

        setIsSubmitting(false);
        handleCloseAllPanels(); 
    }
  }, [
    user?.fid, 
    anonFid, 
    user?.username,
    user?.displayName, 
    moods, selectedEmoji, statusText, setCastError, setIsSubmitting, setMoods, 
    setUserLastMoodLocation, setMapRecenterTrigger, setLastLocallyPostedMood, 
    setIsMapCenteredOnUserLocation, handleCloseAllPanels, fetchAllMoods,
    sendCast, 
    isRandomLocation, 
    composeCast,
    customLocationInput, 
    geocodedInputLocationData, 
  ]); 

  const handleCastLastMoodToFarcaster = useCallback(async () => {
    console.warn("handleCastLastMoodToFarcaster is deprecated and not actively used in current flow.");
  }, []);

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
    const targetLocationData = geocodedInputLocationData || userLastMoodLocation;

    if (targetLocationData) {
        setMapRecenterTrigger({
            coords: targetLocationData.coords,
            zoom: targetLocationData.zoom || DEFAULT_ZOOM_LEVEL, 
            animate: true,
            purpose: 'userLocation', 
        });
        setIsMapCenteredOnUserLocation(false); 
    } else {
        alert("Location information is not yet determined. Please enter a location.");
    }
  }, [
    userLastMoodLocation, 
    geocodedInputLocationData, 
    setMapRecenterTrigger, 
    setIsMapCenteredOnUserLocation, 
  ]);

  const handleRecenterToUserLocation = useCallback(() => {
    handleCloseAllPanels(); 
    triggerRecenter();
  }, [triggerRecenter, handleCloseAllPanels]); 

  const isRecenterButtonDisabled = useMemo(() => {
    const noLocationData = !userLastMoodLocation && !geocodedInputLocationData;
    const isCurrentlyCentered = isMapCenteredOnUserLocation; 
    return noLocationData || isCurrentlyCentered; 
  }, [userLastMoodLocation, geocodedInputLocationData, isMapCenteredOnUserLocation]); 


  const handleMapButtonClick = useCallback(() => {
    if (view !== ViewState.MAP) { 
      handleCloseAllPanels();
    }
    setShowPresetLocations(prev => !prev);
    setSelectedClusterMoods(null); 
  }, [view, setSelectedClusterMoods, handleCloseAllPanels, setShowPresetLocations]); 


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
    const sortedClusterMoods = moodsInCluster.sort((a, b) => b.timestamp - a.timestamp);
    setSelectedClusterMoods(sortedClusterMoods); 
    setView(ViewState.CLUSTER_LIST); 
  }, [setSelectedClusterMoods, setView, setShowPresetLocations, view, handleCloseAllPanels]); 


  const isPostVibeButtonDisabled = (!isRandomLocation && !customLocationInput.trim()) || !geocodedInputLocationData || (user?.fid === undefined && anonFid === null); 

  const isOverallLoading = status === "loading" || !isDataLoaded || !isMapReady;

  let loadingMessage = "";
  if (status === "loading") {
      loadingMessage = "Initializing Farcaster SDK..."; 
  } else if (!isDataLoaded) { 
      loadingMessage = "Initializing data and location...";
  } else if (!isMapReady) { 
      loadingMessage = "Initializing map...";
  }
  
  if (status === "error") {
    return (
      <main className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white p-4">
        <p className="text-2xl text-red-500 font-bold">An error occurred!</p>
        <p className="text-xl text-red-300 mt-2">{error?.message || "SDK failed to initialize."}</p>
      </main>
    );
  }

  return (
    <div className="relative w-full h-screen flex flex-col bg-slate-950 text-white overflow-hidden font-sans">

      {showPresetLocations && (
        <div
          className="absolute inset-0 z-[50] pointer-events-auto" 
          onClick={() => setShowPresetLocations(false)} 
        ></div>
      )}

      {view === ViewState.MAP && (
        <div className="absolute top-0 left-0 right-0 z-[60] p-4 pointer-events-none">
          <div className="flex flex-col items-start gap-2"> 
              <div className="flex items-center gap-2 pointer-events-auto">
                  <div className={`p-2 ${BASE_TRANSLUCENT_PANEL_CLASSES}`}>
                      <p className="text-sm font-semibold text-blue-400 leading-tight">{user?.username || "anonymous"}</p>
                  </div>
                  <button
                      onClick={handleRecenterToUserLocation}
                      disabled={isRecenterButtonDisabled} 
                      className={`p-1.5 rounded-full transition-all ${BASE_TRANSLUCENT_PANEL_CLASSES.replace('rounded-lg', 'rounded-full')}
                          ${isRecenterButtonDisabled ? 'text-slate-600 cursor-not-allowed' : 'text-blue-400 hover:text-white hover:bg-slate-700/80'}`}
                      title="Recenter to your location or last mood location"
                  >
                      <MapPin size={18} />
                  </button>
              </div>

              {lastLocallyPostedMood && (
                  <div className={`flex items-center gap-1 px-2 py-1 ${BASE_TRANSLUCENT_PANEL_CLASSES} pointer-events-auto max-w-[calc(100vw-32px)]`}>
                      <span className="text-xl">{lastLocallyPostedMood.emoji}</span>
                      {lastLocallyPostedMood.text && (
                          <span className="text-sm text-blue-400 truncate max-w-full">
                              {lastLocallyPostedMood.text}
                          </span>
                      )}
                  </div>
              )}
          </div>
        </div>
      )}

      <div className={`flex-1 relative z-0 transition-opacity duration-500 ${isOverallLoading ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}`}>
        <div className="absolute inset-0">
            <DynamicMap
                moods={moods}
                height="100%"
                recenterTrigger={mapRecenterTrigger}
                onRecenterComplete={handleMapRecenterComplete}
                onMapMove={handleMapUserMove}
                onClusterClick={handleClusterMarkerClick}
                onMapClick={handleCloseAllPanels} 
                onMapReady={() => {
                    if (!isMapReady) {
                        console.log("[page.tsx] DynamicMap reported itself ready! Setting isMapReady(true).");
                        setIsMapReady(true);
                    } else {
                        console.log("[page.tsx] DynamicMap was already ready (redundant onMapReady call or component re-render).");
                    }
                }} 
                isMapVisible={!isOverallLoading}
                currentFid={userEffectiveFid} 
            />
        </div>

        { view === ViewState.LIST && (
            <div
                className={`absolute inset-0 z-[65] px-2 pb-20 bg-black/40 backdrop-blur-sm pointer-events-auto animate-in slide-in-from-bottom-10 fade-in duration-300`}
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

        { view === ViewState.CLUSTER_LIST && selectedClusterMoods && (
            <div 
                className={`absolute top-32 bottom-48 right-0 w-[240px] sm:w-80 md:w-96 z-[65] bg-transparent pointer-events-auto animate-in slide-in-from-right-full fade-in duration-300 flex flex-col`}
                onClick={handleCloseAllPanels} 
            >
                <h3 className={`text-base font-bold text-blue-400 text-center truncate shrink-0 md:text-sm py-2`}> 
                    <span className={`inline-block 
                                bg-slate-900/80 backdrop-blur-sm 
                                px-3 py-1 rounded-md shadow-sm border border-slate-700`}>
                        {selectedClusterMoods[0]?.locationLabel || "Unknown Location"} ({selectedClusterMoods.length})
                    </span>
                </h3>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-4 pt-1" onClick={(e) => e.stopPropagation()}>
                    <MoodFeed
                        moods={selectedClusterMoods}
                        onCloseRequest={handleCloseAllPanels} 
                        hideHeader={true} 
                        hideLocationDetails={true} 
                    />
                </div>
            </div>
        )}

        { view === ViewState.ADD && (
             <div 
                 className={`absolute inset-0 z-[55] bg-slate-900/95 flex items-center justify-center p-6 backdrop-blur-xl pointer-events-auto animate-in zoom-in-95 duration-200`}
                 onClick={handleCloseAllPanels} 
             >
                 <div 
                    className="w-full max-w-md flex flex-col h-full max-h-[600px] space-y-4 transform-gpu -translate-y-12"
                    onClick={(e) => e.stopPropagation()} 
                 >
                    <h2 className="text-xl font-bold text-center shrink-0">What&apos;s your Mood?</h2>

                    <div className="min-h-[24px] flex items-center justify-center">
                        {castError && (
                            <p className="text-sm text-red-400 text-center mt-2">{castError}</p>
                        )}
                        {/* Konum inputu boş değil ve henüz geocodedInputLocationData yoksa "Searching..." göster */}
                        {!castError && customLocationInput.trim() && !geocodedInputLocationData && !isRandomLocation && (
                            <p className="text-sm text-yellow-400 text-center animate-pulse">Searching for &quot;{customLocationInput}&quot;...</p> 
                        )}
                        {/* Konum inputu boş değil ve geocodedInputLocationData varsa "Location identified" göster */}
                        {!castError && customLocationInput.trim() && geocodedInputLocationData && !isRandomLocation && (
                            <p className="text-sm text-green-400 text-center">
                                Location identified: {geocodedInputLocationData.locationLabel ?? customLocationInput.trim()} 
                            </p>
                        )}
                        {/* isRandomLocation aktifse özel mesaj göster */}
                         {!castError && isRandomLocation && (
                            <p className="text-sm text-green-400 text-center">Random location selected: {customLocationInput}</p>
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <label htmlFor="locationInput" className="text-slate-300 text-sm font-semibold whitespace-nowrap">Location:</label>
                        <div className="relative flex-1"> 
                            <input
                                type="text"
                                id="locationInput"
                                placeholder="Enter a location..."
                                className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 pr-10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all ${isRandomLocation ? 'text-slate-500' : 'text-white'}`}
                                value={customLocationInput}
                                onChange={(e) => {
                                    setCustomLocationInput(e.target.value);
                                    if (e.target.value.trim().length > 2) { 
                                        debouncedSearchLocation(e.target.value);
                                    } else {
                                        setGeocodedInputLocationData(null); 
                                        setCastError(null); 
                                    }
                                }}
                                disabled={isRandomLocation} 
                            />
                            {customLocationInput && !isRandomLocation && ( 
                                <button
                                    type="button"
                                    onClick={handleClearLocationInput}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-white focus:outline-none"
                                    aria-label="Clear location input"
                                >
                                    <XCircle size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div
                        ref={scrollContainerRef}
                        className={`w-full overflow-x-auto custom-scrollbar py-6 -mx-3 px-3 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                        onMouseDown={handleMouseDown}
                        onMouseLeave={handleMouseLeave}
                        onMouseUp={handleMouseUp}
                        onMouseMove={handleMouseMove}
                        style={{
                            maskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)',
                            WebkitMaskImage: 'linear-gradient(to right, transparent, black 20px, black calc(100% - 20px), transparent)'
                        }}
                    >
                        <div className="grid grid-rows-3 grid-flow-col gap-3 w-max">
                            {MOOD_OPTIONS.map((opt) => (
                                <button
                                    key={opt.label}
                                    onClick={() => setSelectedEmoji(opt.emoji)}
                                    className={`w-16 h-16 rounded-2xl text-3xl flex items-center justify-center transition-all duration-200 border-2 ${
                                        selectedEmoji === opt.emoji
                                        ? 'bg-blue-600/20 border-blue-500 scale-110 shadow-[0_0_15px_rgba(0,0,255,0.5)] z-10'
                                        : 'bg-slate-800 border-transparent hover:bg-slate-700 opacity-80 hover:opacity-100'
                                    }`}
                                >
                                    <div className="pointer-events-none">{opt.emoji}</div>
                                
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between space-x-4 shrink-0"> 
                        <div className="flex items-center space-x-2"> 
                            <input
                                type="checkbox"
                                id="sendCastCheckbox"
                                checked={sendCast}
                                onChange={(e) => setSendCast(e.target.checked)}
                                className="form-checkbox h-4 w-4 text-blue-600 bg-slate-700 border-slate-600 rounded focus:ring-blue-500"
                            />
                            <label htmlFor="sendCastCheckbox" className="text-slate-300 select-none">Send cast</label>
                        </div>
                        {/* Random konum checkbox'ı ve yenileme butonu */}
                        <div className="flex items-center space-x-2">
                            <input
                                type="checkbox"
                                id="randomLocationCheckbox"
                                checked={isRandomLocation}
                                onChange={(e) => {
                                    const checked = e.target.checked;
                                    setIsRandomLocation(checked); 

                                    if (checked) {
                                        handleSelectRandomPresetLocation(); 
                                        setCastError(null); 
                                    } else {
                                        // Randomloc devre dışı bırakıldığında inputu temizle
                                        setCustomLocationInput('');
                                        setGeocodedInputLocationData(null);
                                        setCastError(null);
                                    }
                                }}
                                className="form-checkbox h-4 w-4 text-purple-600 bg-slate-700 border-slate-600 rounded focus:ring-purple-500"
                            />
                            <label htmlFor="randomLocationCheckbox" className="text-slate-300 select-none">Random location</label>
                            {isRandomLocation && ( 
                                <button
                                    type="button"
                                    onClick={handleSelectRandomPresetLocation}
                                    className="ml-2 p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 focus:outline-none transition-colors"
                                    title="Select a new random location"
                                >
                                    <RotateCw size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4 shrink-0">
                        <div className="relative">
                            <input
                                type="text"
                                maxLength={MAX_MOOD_TEXT_LENGTH}
                                placeholder="Add a note... (optional)"
                                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 pr-14 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all" 
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
                            <Button className="flex-1 bg-blue-600 hover:bg-blue-500" onClick={handleAddMood} isLoading={isSubmitting} disabled={isPostVibeButtonDisabled}>
                                Add to Map
                            </Button>
                        </div>
                    </div>
                 </div>
             </div>
        )}
      </div> 

      <div className="absolute bottom-0 left-0 right-0 z-[50] p-4 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent pb-6">
        <div className={`flex items-center justify-around max-w-md mx-auto ${BOTTOM_NAV_PANEL_CLASSES} pointer-events-auto`}>

            <div className="relative">
              <button
                  onClick={handleMapButtonClick} 
                  className={`p-1.5 rounded-full transition-all ${view === ViewState.MAP || view === ViewState.CLUSTER_LIST ? 'bg-slate-700 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                  title="Switch to Map View / Open Preset Locations"
              >
                  <MapIcon size={24} />
              </button>

              {showPresetLocations && (
                <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-5 w-40 z-[51] pointer-events-auto ${PRESET_LOCATION_MENU_CLASSES}`}> 
                  <ul className="text-sm text-slate-300">
                            {/* PRESET_LOCATIONS yerine RANDOM_LOCATIONS kullanıldı */}
                            {RANDOM_LOCATIONS.map(preset => (
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

            <button
                onClick={() => { 
                    if (view !== ViewState.MAP) { 
                      handleCloseAllPanels(); 
                    }
                    setView(ViewState.ADD); 
                    setShowPresetLocations(false); 
                    setSelectedClusterMoods(null); 
                }}
                className={`bg-blue-600 hover:bg-blue-500 text-white p-4 rounded-full shadow-lg shadow-blue-600/40 active:scale-95 transition-transform -mt-8 border-4 border-slate-900`}
            >
                <Plus size={28} strokeWidth={3} />
            </button>

            <button
                onClick={handleListViewToggle} 
                className={`p-3 rounded-full transition-all ${view === ViewState.LIST ? 'bg-slate-700 text-blue-400' : 'text-slate-400 hover:text-white'}`}
                title="Switch to List View"
            >
                <List size={24} />
            </button>

        </div>
      </div>

      {isOverallLoading && (
        <div 
          style={{ backgroundImage: `url('https://moodmap-lake.vercel.app/MoodMap%20Loading%20Screen.png')` }}
          className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-cover bg-center bg-no-repeat text-white transition-opacity duration-500" 
        >
          <div className="absolute bottom-4 w-full text-center"> 
            <p className="text-lg text-slate-400 animate-pulse">
              {loadingMessage}
            </p> 
          </div>
        </div>
      )}
    </div>
  );
}