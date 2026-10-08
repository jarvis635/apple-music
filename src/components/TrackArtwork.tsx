import React, { useState, useEffect } from 'react';
import { Music } from 'lucide-react';

interface TrackArtworkProps {
  src: string;
  alt: string;
  className?: string;
  fallbackColor?: string;
  title?: string;
}

export const TrackArtwork: React.FC<TrackArtworkProps> = ({
  src,
  alt,
  className = '',
  fallbackColor = '#FA2D48',
  title = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset error/loaded state if src changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [src]);

  if (hasError || !src) {
    return (
      <div 
        className={`relative flex items-center justify-center overflow-hidden bg-neutral-900 border border-white/10 select-none ${className}`}
        style={{
          background: `radial-gradient(circle at 50% 40%, ${fallbackColor}55 0%, #17171a 80%)`,
        }}
        title={title || alt}
      >
        <div className="flex flex-col items-center justify-center p-2 text-center">
          <div className="w-6 h-6 rounded-lg bg-white/15 flex items-center justify-center mb-1 backdrop-blur-sm shadow">
            <Music className="w-3.5 h-3.5 text-white/90" />
          </div>
          {title && (
            <span className="text-[10px] font-bold text-white/80 truncate max-w-full px-1">
              {title.slice(0, 12)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-neutral-900 select-none ${className}`}>
      {/* Skeleton placeholder while loading */}
      {!isLoaded && (
        <div 
          className="absolute inset-0 bg-neutral-800/80 animate-pulse"
          style={{
            background: `radial-gradient(circle at 50% 50%, ${fallbackColor}30 0%, #1c1c1f 100%)`,
          }}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
