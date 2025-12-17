// src/components/MoodFeed.tsx
import React, { useRef, useCallback } from 'react';
import { Mood } from '@/types/app';
import { X, MapPin } from 'lucide-react'; 

interface MoodFeedProps {
  moods: Mood[];
  onCloseRequest?: () => void;
  hideHeader?: boolean;
  hideLocationDetails?: boolean;
}

// Zaman damgasını istenen formata çeviren yardımcı fonksiyon
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Aylar 0-indexed olduğu için +1
  const year = date.getFullYear().toString().slice(-2); // Yılın son iki hanesi
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

export const MoodFeed: React.FC<MoodFeedProps> = ({ moods, onCloseRequest, hideHeader = false, hideLocationDetails = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  if (!moods || moods.length === 0) {
    return (
      <div className="p-4 bg-slate-800 rounded-lg shadow-xl flex flex-col items-center justify-center text-gray-400 h-full">
        <p className="text-xl font-semibold">No vibes yet!</p>
        <p className="text-sm mt-2">Be the first to share your mood.</p>
        {onCloseRequest && (
          <button
            onClick={onCloseRequest}
            // "Close" butonu rengi direkt #0000FF ve hover için biraz daha koyusu (#0000CC) olarak güncellendi
            className="mt-4 px-4 py-2 bg-[#0000FF] text-white rounded-md hover:bg-[#0000CC] transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    // Dış kutu rengi ve gölge
    <div className="relative bg-slate-900 rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
      {!hideHeader && (
        // Başlık çubuğu rengi ve kenarlık
        <div className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 shrink-0">
          {/* "Recent Vibes" başlık rengi direkt #0000FF olarak ayarlandı */}
          <h2 className="text-xl font-bold text-[#0000FF]"> 
            Recent Vibes
            {/* Mood sayısı etiketi rengi direkt #0000FF olarak ayarlandı */}
            <span className="ml-2 text-xs bg-[#0000FF] text-white px-2 py-0.5 rounded-full"> 
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

      {/* Kaydırılabilir alan ve kartlar arası boşluk */}
      <div 
        ref={scrollRef}
        // DEĞİŞİKLİK: pt-4'ü pt-1 olarak geri değiştirelim
        className="overflow-y-auto custom-scrollbar flex-1 pt-1 px-2 pb-2 space-y-2" 
        onWheel={handleWheel}
        style={{ touchAction: 'pan-y' }}
      >
        {moods.map((mood) => (
          // Her bir mood kartı stili
          <div key={mood.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex items-start gap-3"> {/* gap-3 artırıldı */}
            {/* Emoji kapsayıcı stili */}
            <div className="text-3xl bg-slate-700/30 w-12 h-12 flex items-center justify-center rounded-full shrink-0"> {/* emoji boyutu ve kapsayıcı boyutu ayarlandı */}
              {mood.emoji}
            </div>
            {/* Metin içeriğini sarmalayan div, min-w-0 ve flex-1 ile truncation sağlar */}
            <div className="flex-1 min-w-0 flex flex-col"> 
              {/* YENİ SIRALAMA */}
              {/* 1. Mood Text (Status Text) */}
              {mood.text && <p className="text-slate-200 text-sm break-words">{mood.text}</p>} {/* text-sm ve break-words eklendi */}
              
              {/* 2. Username */}
              {/* Kullanıcı adı rengi direkt #0000FF olarak ayarlandı */}
              <p className={`font-semibold text-[#0000FF] text-sm truncate ${mood.text ? 'mt-2' : ''}`}>{mood.username}</p> 
              
              {/* 3. Zaman Damgası */}
              <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(mood.timestamp)}</p> {/* text-xs ve renk ayarlandı */}
              
              {/* 4. Konum Bilgisi */}
              {!hideLocationDetails && mood.locationLabel && ( 
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-1"> {/* text-xs ve renk ayarlandı */}
                  <MapPin size={12} className="shrink-0" /> {/* Konum ikonu */}
                  <span className="truncate">{mood.locationLabel}</span> {/* Konum bilgisi */}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};