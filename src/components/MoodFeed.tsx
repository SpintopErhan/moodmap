// src/components/MoodFeed.tsx
import React, { useRef, useCallback } from 'react'; // useRef ve useCallback hook'ları eklendi
import { Mood } from '@/types/app';
import { Clock, MapPin, X } from 'lucide-react'; // X ikonu eklendi

interface MoodFeedProps {
  moods: Mood[];
  onCloseRequest?: () => void;
  hideHeader?: boolean; // <<< BU SATIR EKLENDİ: hideHeader prop'u eklendi
}

export const MoodFeed: React.FC<MoodFeedProps> = ({ moods, onCloseRequest, hideHeader }) => { // hideHeader buraya eklendi
  // Scrollbar yönetimi için gerekli hook'lar
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation(); // Fare tekerleğiyle kaydırmanın olay yayılımını durdur
  }, []);

  return (
    <div className="relative bg-slate-800 rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
      {/* Sadece hideHeader false ise veya tanımlı değilse başlığı göster */}
      {!hideHeader && ( // hideHeader prop'una göre başlık gösterimi
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
          ref={scrollRef} // scrollRef eklendi
          className="overflow-y-auto custom-scrollbar flex-1 p-4 space-y-3" // pr-2 yerine p-4 ve space-y-3
          onWheel={handleWheel} // onWheel eklendi
          style={{ touchAction: 'pan-y' }} // touchAction eklendi
        >
          {moods.map((mood) => (
            <div key={mood.id} className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50 flex items-start gap-3">
              <div className="text-3xl bg-slate-700/30 w-12 h-12 flex items-center justify-center rounded-full shrink-0">
                {mood.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-slate-200 truncate">{mood.username}</span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(mood.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {mood.text && (
                  <p className="text-slate-300 text-sm mt-1 break-words">{mood.text}</p>
                )}
                <div className="mt-2 flex items-center gap-1 text-xs text-purple-400/80">
                    <MapPin size={10} />
                    <span>
                        {mood.locationLabel || `${mood.location.lat.toFixed(3)}, ${mood.location.lng.toFixed(3)}`}
                    </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};