// src/components/MoodFeed.tsx
import React from 'react';
import { Mood } from '@/types/app';
import { Clock, MapPin } from 'lucide-react';

interface MoodFeedProps {
  moods: Mood[];
  onCloseRequest?: () => void; // Yeni eklendi: Liste kapanma isteğini bildirmek için
}

export const MoodFeed: React.FC<MoodFeedProps> = ({ moods, onCloseRequest }) => { // onCloseRequest eklendi
  return (
    <div className="h-full w-full bg-slate-900/90 backdrop-blur-md rounded-t-3xl p-4 flex flex-col border-t border-slate-700 shadow-2xl">
      {/* Mevcut çizgi div'ine onClick eklendi */}
      <div 
        className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mb-6 shrink-0 cursor-pointer" // cursor-pointer eklendi
        onClick={onCloseRequest} // <<< Buraya onClick eklendi
      />
      
      <h2 className="text-xl font-bold text-white mb-4 flex items-center">
        Recent Vibes
        <span className="ml-2 text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full">
          {moods.length}
        </span>
      </h2>

      <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
        {moods.length === 0 ? (
          <div className="text-center text-slate-500 py-10">
            No vibes yet. Be the first!
          </div>
        ) : (
          moods.map((mood) => (
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
          ))
        )}
      </div>
    </div>
  );
};