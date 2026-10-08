import React from 'react';

interface Props {
  isPlaying: boolean;
  barColor?: string;
}

export const MusicVisualizer: React.FC<Props> = ({ isPlaying, barColor = '#ffffff' }) => {
  if (!isPlaying) return null;

  return (
    <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center gap-[2.5px] rounded-[inherit] z-10 pointer-events-none">
      <div 
        className="w-[2.5px] bg-white rounded-full animate-music-bar-1" 
        style={{ backgroundColor: barColor }} 
      />
      <div 
        className="w-[2.5px] bg-white rounded-full animate-music-bar-2" 
        style={{ backgroundColor: barColor }} 
      />
      <div 
        className="w-[2.5px] bg-white rounded-full animate-music-bar-3" 
        style={{ backgroundColor: barColor }} 
      />
      <div 
        className="w-[2.5px] bg-white rounded-full animate-music-bar-4" 
        style={{ backgroundColor: barColor }} 
      />
      <div 
        className="w-[2.5px] bg-white rounded-full animate-music-bar-5" 
        style={{ backgroundColor: barColor }} 
      />
    </div>
  );
};
