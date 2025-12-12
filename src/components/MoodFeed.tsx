// src/components/MoodFeed.tsx
import React from 'react';
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

export const MoodFeed: React.FC<MoodFeedProps> = ({
  moods,
  onCloseRequest,
  hideHeader = false,
  hideLocationDetails = false,
}) => {
  if (!moods || moods.length === 0) {
    return (
      <div className="p-4 bg-slate-800 rounded-lg shadow-xl flex flex-col items-center justify-center text-gray-400 h-full">
        <p className="text-xl font-semibold">No vibes yet!</p>
        <p className="text-sm mt-2">Be the first to share your mood.</p>
        {onCloseRequest && (
          <button
            onClick={onCloseRequest}
            className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-slate-800/80 rounded-lg shadow-xl flex flex-col overflow-hidden">
      {!hideHeader && (
        <div className="flex items-center justify-between p-4 bg-slate-900 backdrop-blur-sm border-b border-slate-700 shrink-0">
          <h2 className="text-xl font-bold text-purple-300">Recent Vibes</h2>
          {onCloseRequest && (
            <button
              onClick={onCloseRequest}
              className="p-2 rounded-full hover:bg-slate-600 text-slate-300 transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2"> 
        {moods.map((mood) => (
          <div
            key={mood.id}
            className="flex items-center gap-4 bg-slate-800/80 rounded-lg p-3 shadow-md border border-slate-700" 
          >
            <div className="text-4xl shrink-0">{mood.emoji}</div>
            <div className="flex flex-col flex-1">
              {/* 1. Mood Text (Status Text) */}
              {mood.text && <p className="text-slate-200">{mood.text}</p>} 
              
              {/* 2. Username - YENİ: truncate sınıfı eklendi */}
              <p className={`font-semibold text-purple-300 ${mood.text ? 'mt-2' : ''} truncate`}>@{mood.username}</p> 
              
              {/* 3. Zaman Damgası */}
              <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(mood.timestamp)}</p> 
              
              {/* 4. Konum Bilgisi */}
              {!hideLocationDetails && mood.locationLabel && (
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1 truncate"> {/* Konum etiketine de truncate eklenebilir */}
                  <MapPin size={14} className="text-purple-400" />
                  {mood.locationLabel}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};