// src/components/MoodFeed.tsx
import React, { useRef, useCallback } from 'react';
import { Mood } from '@/types/app';
import { X, MapPin } from 'lucide-react'; 

interface MoodFeedProps {
  moods: Mood[];
  onCloseRequest?: () => void;
  hideHeader?: boolean;
  hideLocationDetails?: boolean; // <<< BURASI ÇOK ÖNEMLİ: Bu satırın MoodFeedProps içinde olduğundan emin olun!
}

export const MoodFeed: React.FC<MoodFeedProps> = ({ moods, onCloseRequest, hideHeader, hideLocationDetails }) => { // <<< hideLocationDetails buraya eklendi
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div className="relative bg-slate-800 rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
      {!hideHeader && (
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-purple-300">
            Recent Vibes
            <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
                {moods.length}
            </span>
          </h2>
          {onCloseRequest && (
            <button
              onClick={onCloseRequest}
              className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors"
              title="Close list"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      {moods.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <p>No vibes yet. Be the first!</p>
        </div>
      ) : (
        <div 
          ref={scrollRef}
          className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2" 
          onWheel={handleWheel}
          style={{ touchAction: 'pan-y' }}
        >
          {moods.map((mood) => (
            <div key={mood.id} className="bg-slate-800/50 p-2 rounded-2xl border border-slate-700/50 flex items-start gap-2"> 
              <div className="text-2xl bg-slate-700/30 w-10 h-10 flex items-center justify-center rounded-full shrink-0"> 
                {mood.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-200 truncate text-sm">{mood.username}</span> 
                  {/* SAAT BELİRTECİ (timestamp) isterseniz buraya eklenebilir */}
                  {/* Örneğin: <span className="text-xs text-slate-500 ml-2">{new Date(mood.timestamp).toLocaleTimeString()}</span> */}
                </div>
                {mood.text && (
                  <p className="text-slate-300 text-xs mt-0.5 break-words">{mood.text}</p>
                )}
                {/* Konum bilgisi, hideLocationDetails prop'u true DEĞİLSE ve konum etiketi varsa gösterilir */}
                {!hideLocationDetails && mood.locationLabel && ( 
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                    <MapPin size={12} className="shrink-0" /> {/* Konum ikonu */}
                    <span className="truncate">{mood.locationLabel}</span> {/* Konum bilgisi */}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};