// src/components/MoodFeed.tsx
import React, { useRef, useCallback } from 'react';
import { Mood } from '@/types/app'; // Mood type'ının 'fid?: number;' içerdiğinden emin olun!
import { X, MapPin } from 'lucide-react';
import { useFarcasterMiniApp } from '@/hooks/useFarcasterMiniApp';

interface MoodFeedProps {
  moods: Mood[];
  onCloseRequest?: () => void;
  hideHeader?: boolean;
  hideLocationDetails?: boolean;
}

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${day}.${month}.${year} ${hours}:${minutes}`;
};

export const MoodFeed: React.FC<MoodFeedProps> = ({ moods, onCloseRequest, hideHeader = false, hideLocationDetails = false }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.stopPropagation();
  }, []);

  const { viewProfile } = useFarcasterMiniApp();

  const handleViewProfileClick = useCallback(async (fid: number, username: string) => {
    try {
      console.log(`[MoodFeed] Viewing profile for FID: ${fid} (${username})...`);
      await viewProfile(fid);
    } catch (error) {
      console.error(`FID ${fid} profilini görüntüleme başarısız oldu:`, error);
      // Hata durumunda kullanıcıya bildirim verebiliriz, ancak SDK'nın her zaman hazır olduğunu varsayarsak bu daha nadir olmalı.
    }
  }, [viewProfile]);

  if (!moods || moods.length === 0) {
    return (
      <div className="p-4 bg-slate-800 rounded-lg shadow-xl flex flex-col items-center justify-center text-gray-400 h-full">
        <p className="text-xl font-semibold">No vibes yet!</p>
        <p className="text-sm mt-2">Be the first to share your mood.</p>
        {onCloseRequest && (
          <button
            onClick={onCloseRequest}
            className="mt-4 px-4 py-2 bg-[#0000FF] text-white rounded-md hover:bg-[#0000CC] transition-colors"
          >
            Close
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative bg-slate-900 rounded-lg shadow-xl h-full flex flex-col overflow-hidden">
      {!hideHeader && (
        <div className="flex justify-between items-center p-4 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 shrink-0">
          <h2 className="text-xl font-bold text-blue-400">
            Recent Vibes
            <span className="ml-2 text-xs bg-[#2563EB] text-white px-2 py-0.5 rounded-full">
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

      <div
        ref={scrollRef}
        className="overflow-y-auto custom-scrollbar flex-1 pt-1 px-2 pb-2 space-y-2"
        onWheel={handleWheel}
        style={{ touchAction: 'pan-y' }}
      >
        {moods.map((mood) => (
          <div key={mood.id} className="bg-slate-800/50 p-3 rounded-lg border border-slate-700 flex items-start gap-3">
            <div className="text-3xl bg-slate-700/30 w-12 h-12 flex items-center justify-center rounded-full shrink-0">
              {mood.emoji}
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              {mood.text && <p className="text-slate-200 text-sm break-words">{mood.text}</p>}

              {/* Kullanıcı adı: Eğer FID varsa tıklanabilir bir buton, yoksa sadece metin */}
              {mood.username && mood.fid !== undefined ? ( // FID'nin varlığını kontrol ediyoruz
                <button
                  onClick={() => handleViewProfileClick(mood.fid!, mood.username)}
                  className={`font-semibold text-blue-400 text-sm truncate text-left
                              ${mood.text ? 'mt-2' : ''}
                              cursor-pointer hover:underline`}
                  title={`${mood.username}'ın profilini görüntüle`}
                >
                  {mood.username}
                </button>
              ) : ( // FID yoksa veya tanımsızsa sadece kullanıcı adını göster
                <p className={`font-semibold text-blue-400 text-sm truncate ${mood.text ? 'mt-2' : ''}`}>
                   {mood.username}
                </p>
              )}

              <p className="text-xs text-gray-500 mt-0.5">{formatTimestamp(mood.timestamp)}</p>

              {!hideLocationDetails && mood.locationLabel && (
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-1">
                  <MapPin size={12} className="shrink-0" />
                  <span className="truncate">{mood.locationLabel}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};