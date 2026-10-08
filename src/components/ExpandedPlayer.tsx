import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Star, 
  MessageSquare, 
  Airplay, 
  ListMusic, 
  ChevronDown, 
  Check, 
  Share2, 
  ExternalLink, 
  Shuffle, 
  Repeat,
  Tv
} from 'lucide-react';
import { SongTrack } from '../types';
import { TrackArtwork } from './TrackArtwork';

interface ExpandedPlayerProps {
  track: SongTrack;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  isFavorite: boolean;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isVideoMode?: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFavorite: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleVideoMode?: () => void;
  onDismiss: () => void;
  playlist: SongTrack[];
  onSelectTrack: (track: SongTrack) => void;
  showToast: (msg: string) => void;
}

export const ExpandedPlayer: React.FC<ExpandedPlayerProps> = ({
  track,
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFavorite,
  isShuffle,
  repeatMode,
  isVideoMode = false,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFavorite,
  onToggleShuffle,
  onToggleRepeat,
  onToggleVideoMode,
  onDismiss,
  playlist,
  onSelectTrack,
  showToast,
}) => {
  const [activeSheetTab, setActiveSheetTab] = useState<'main' | 'lyrics' | 'queue'>('main');
  const [showAirPlayModal, setShowAirPlayModal] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState('AirPods Pro (2nd gen)');

  // Local Scrubbing State for silky smooth timeline control without audio jitter
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPercent, setScrubPercent] = useState(0);
  const scrubTimeRef = useRef(0);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Swipe-down to dismiss gesture (scoped to drag handle and header only)
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY.current !== null) {
      const deltaY = e.touches[0].clientY - touchStartY.current;
      if (deltaY > 80) {
        touchStartY.current = null;
        onDismiss();
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartY.current = null;
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const safeDuration = duration > 0 ? duration : (track.duration || 240);
  const currentPercent = safeDuration > 0 ? Math.min(100, Math.max(0, (currentTime / safeDuration) * 100)) : 0;
  const effectivePercent = isScrubbing ? scrubPercent : currentPercent;
  const effectiveTime = isScrubbing ? scrubTimeRef.current : currentTime;
  const remainingTime = safeDuration > effectiveTime ? safeDuration - effectiveTime : 0;

  const getPercentFromPointer = (clientX: number) => {
    if (!progressBarRef.current) return 0;
    const rect = progressBarRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (clampedX / rect.width) * 100;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    const pct = getPercentFromPointer(e.clientX);
    setScrubPercent(pct);
    const targetTime = (pct / 100) * safeDuration;
    scrubTimeRef.current = targetTime;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    e.stopPropagation();
    const pct = getPercentFromPointer(e.clientX);
    setScrubPercent(pct);
    const targetTime = (pct / 100) * safeDuration;
    scrubTimeRef.current = targetTime;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const pct = getPercentFromPointer(e.clientX);
    const targetTime = (pct / 100) * safeDuration;
    scrubTimeRef.current = targetTime;
    setIsScrubbing(false);
    onSeek(targetTime);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(false);
  };

  const handleKeyDownScrub = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek(Math.min(safeDuration, currentTime + 5));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek(Math.max(0, currentTime - 5));
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(`https://youtu.be/${track.youtubeId}`);
    showToast('Track link copied to clipboard!');
  };

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) onDismiss();
      }}
      className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-auto transition-opacity duration-300 animate-backdrop-fade cursor-pointer"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(35px)',
        WebkitBackdropFilter: 'blur(35px)',
      }}
    >
      {/* 
        SOLID OPAQUE SHEET CONTAINER:
        Using solid dark background (#141418) so background search text/content NEVER bleeds through!
      */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full h-[94vh] max-h-[920px] rounded-t-[38px] md:rounded-t-[44px] bg-[#141418] border-t border-white/20 shadow-[0_-25px_80px_rgba(0,0,0,0.98)] flex flex-col overflow-hidden max-w-2xl mx-auto animate-sheet-slide-up hardware-accelerated cursor-default pb-[env(safe-area-inset-bottom,12px)]"
      >
        {/* Ambient Top Glow reflecting current song color */}
        <div 
          className="absolute -top-32 inset-x-0 h-64 opacity-40 blur-3xl pointer-events-none transition-colors duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${track.artworkBgColor} 0%, rgba(250, 45, 72, 0.4) 40%, transparent 80%)`,
          }}
        />

        {/* 1. DRAG HANDLE (Touch-gesture attached here to prevent lyrics/queue scrolling issues) */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={onDismiss}
          className="h-8 w-full flex items-center justify-center cursor-pointer shrink-0 group hover:bg-white/5 transition-colors z-20"
          title="Swipe down to dismiss"
        >
          <div className="w-12 h-1.5 rounded-full bg-white/40 group-hover:bg-white/80 transition-colors" />
        </div>

        {/* 2. TOP HEADER ROW */}
        <div 
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="px-6 h-12 flex items-center justify-between shrink-0 text-white select-none z-20"
        >
          <button 
            onClick={onDismiss}
            className="p-2 -ml-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Collapse Player"
          >
            <ChevronDown className="w-6 h-6" />
          </button>

          <div className="flex-1 text-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              Now Playing
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleVideoMode && (
              <button 
                onClick={onToggleVideoMode}
                className={`p-2 rounded-full transition-all cursor-pointer ${
                  isVideoMode 
                    ? 'bg-[#FA2D48] text-white shadow-lg' 
                    : 'hover:bg-white/10 text-white/70 hover:text-white'
                }`}
                title={isVideoMode ? 'Switch to Artwork' : 'Watch Music Video'}
              >
                <Tv className="w-5 h-5" />
              </button>
            )}

            <button 
              onClick={handleShare}
              className="p-2 -mr-2 rounded-full hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              title="Share Track"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 3. DYNAMIC CENTER STAGE (FLEXIBLE HEIGHT - NEVER OVERFLOWS TIMELINE) */}
        <div className="flex-1 min-h-0 flex flex-col items-center justify-center px-6 overflow-hidden relative z-10">
          {activeSheetTab === 'lyrics' ? (
            /* SYNCED LYRICS VIEW */
            <div className="w-full h-full overflow-y-auto py-4 px-4 space-y-4 text-center select-none no-scrollbar">
              <div className="text-xs font-bold uppercase tracking-widest text-[#FA2D48] mb-3">
                Apple Music Synced Lyrics
              </div>
              {(track.lyrics && track.lyrics.length > 0 ? track.lyrics : [
                "Enjoy the rhythm and high-fidelity sound.",
                "Streamed directly via YouTube & Lossless Audio Engine.",
                "Real-time synchronized controls with full timeline seeking."
              ]).map((line, idx) => (
                <p 
                  key={idx} 
                  className={`text-lg md:text-xl font-bold transition-all ${
                    idx === 1 ? 'text-white scale-105' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  {line || '♫'}
                </p>
              ))}
            </div>
          ) : activeSheetTab === 'queue' ? (
            /* QUEUE LIST VIEW */
            <div className="w-full h-full overflow-y-auto py-2 space-y-2 select-none no-scrollbar">
              <div className="text-xs font-bold uppercase tracking-wider text-white/70 px-2 py-1">
                Up Next ({playlist.length} Tracks)
              </div>
              {playlist.map((item) => {
                const isItemPlaying = item.id === track.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => onSelectTrack(item)}
                    className={`p-2.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all ${
                      isItemPlaying 
                        ? 'bg-[#FA2D48]/30 border border-[#FA2D48]/50 shadow' 
                        : 'bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <TrackArtwork 
                      src={item.artwork} 
                      alt={item.title} 
                      fallbackColor={item.artworkBgColor}
                      title={item.title}
                      className="w-11 h-11 rounded-xl object-cover shadow shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-semibold truncate ${isItemPlaying ? 'text-[#FA2D48]' : 'text-white'}`}>
                        {item.title}
                      </div>
                      <div className="text-xs text-white/60 truncate">
                        {item.artist}
                      </div>
                    </div>
                    <div className="text-xs text-white/40 font-mono">
                      {item.durationFormatted}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : isVideoMode ? (
            /* VIDEO VIEW IN CENTER STAGE */
            <div className="w-full max-w-lg aspect-video rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.85)] border border-white/20 bg-black relative">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${track.youtubeId}?enablejsapi=1&autoplay=1&rel=0&controls=1&playsinline=1`}
                title={`Live Video: ${track.title}`}
                className="w-full h-full border-none"
                allow="autoplay; encrypted-media; picture-in-picture"
              />
            </div>
          ) : (
            /* DEFAULT ALBUM ARTWORK STAGE */
            <div className="relative flex items-center justify-center my-auto">
              {/* Dynamic Radial Ambient Glow */}
              <div 
                className={`absolute -inset-6 rounded-3xl opacity-80 blur-3xl transition-all duration-700 pointer-events-none ${
                  isPlaying ? 'scale-110 opacity-90 animate-ambient-glow' : 'scale-95 opacity-40'
                }`}
                style={{
                  background: `radial-gradient(circle, ${track.artworkBgColor} 0%, rgba(250, 45, 72, 0.55) 50%, transparent 80%)`,
                }}
              />

              {/* Crisp High-Res Apple Music Artwork with Responsive Mobile Bounds */}
              <div 
                className={`w-48 h-48 sm:w-56 sm:h-56 md:w-68 md:h-68 max-h-[30vh] max-w-[30vh] aspect-square rounded-3xl overflow-hidden transition-all duration-500 relative z-10 ${
                  isPlaying 
                    ? 'scale-100 shadow-[0_30px_70px_rgba(0,0,0,0.9)] border border-white/20' 
                    : 'scale-[0.92] opacity-85 shadow-[0_15px_30px_rgba(0,0,0,0.5)] border border-white/10'
                }`}
              >
                <TrackArtwork 
                  src={track.artwork} 
                  alt={track.title} 
                  fallbackColor={track.artworkBgColor}
                  title={track.title}
                  className="w-full h-full object-cover select-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* 
          4. BOTTOM CONTROLS & TIMELINE PANEL (PINNED & NEVER CUT OFF)
          Always fully visible, fixed height, containing the interactive scrubber and buttons!
        */}
        <div className="shrink-0 px-6 pt-2 pb-5 space-y-3.5 z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          {/* Track Details & Star Toggle */}
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 pr-3">
              <h2 className="text-lg md:text-xl font-bold text-white tracking-tight truncate leading-tight">
                {track.title}
              </h2>
              <p className="text-xs md:text-sm font-medium text-white/70 truncate mt-0.5">
                {track.artist}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button 
                onClick={onToggleFavorite}
                className="p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
                title="Favorite Track"
              >
                <Star className={`w-5 h-5 transition-transform active:scale-125 ${
                  isFavorite ? 'fill-[#FA2D48] text-[#FA2D48]' : 'text-white/70'
                }`} />
              </button>
              <a 
                href={`https://www.youtube.com/watch?v=${track.youtubeId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors inline-flex items-center justify-center cursor-pointer"
                title="Open on YouTube"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* 
            INTERACTIVE MUSIC TIMELINE SCRUBBER
            User can drag or click to control any song (native MP3 or YouTube video)!
          */}
          <div className="space-y-1.5 pt-1">
            <div 
              ref={progressBarRef}
              role="slider"
              tabIndex={0}
              aria-label="Timeline Scrubber"
              aria-valuemin={0}
              aria-valuemax={safeDuration}
              aria-valuenow={Math.round(effectiveTime)}
              aria-valuetext={`${formatTime(effectiveTime)} of ${formatTime(safeDuration)}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerCancel}
              onKeyDown={handleKeyDownScrub}
              style={{ touchAction: 'none' }}
              className="relative w-full h-6 flex items-center group cursor-pointer select-none py-2"
            >
              {/* Timeline Track Background */}
              <div className="w-full h-1.5 group-hover:h-2 rounded-full bg-white/20 overflow-hidden transition-all duration-150">
                <div 
                  className={`h-full bg-[#FA2D48] rounded-full ${
                    isScrubbing ? '' : 'transition-[width] duration-100 ease-linear'
                  }`}
                  style={{ width: `${effectivePercent}%` }}
                />
              </div>

              {/* Glowing Timeline Thumb */}
              <div 
                className={`absolute w-3.5 h-3.5 -ml-1.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.95)] pointer-events-none transition-transform ${
                  isScrubbing ? 'scale-125' : 'group-hover:scale-125'
                }`}
                style={{ 
                  left: `${effectivePercent}%`,
                  transition: isScrubbing ? 'none' : 'left 100ms linear, transform 150ms ease'
                }}
              />
            </div>

            {/* Time Indicators */}
            <div className="flex items-center justify-between text-[11px] font-mono text-white/60">
              <span className="font-semibold text-white/90">{formatTime(effectiveTime)}</span>
              <span>-{formatTime(remainingTime)}</span>
            </div>
          </div>

          {/* Transport Controls (Shuffle, Prev, Play/Pause, Next, Repeat) */}
          <div className="flex items-center justify-between max-w-xs mx-auto py-0.5">
            <button 
              onClick={onToggleShuffle}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                isShuffle ? 'text-[#FA2D48] bg-white/10' : 'text-white/40 hover:text-white'
              }`}
              title={isShuffle ? 'Shuffle On' : 'Shuffle Off'}
            >
              <Shuffle className="w-4.5 h-4.5" />
            </button>

            <button 
              onClick={onPrev}
              className="p-2.5 text-white/90 hover:text-white transition-transform active:scale-90 cursor-pointer"
              title="Previous Track"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>

            <button 
              onClick={onTogglePlay}
              className="w-14 h-14 rounded-full bg-white text-black flex items-center justify-center shadow-2xl transition-transform active:scale-90 hover:scale-105 cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </button>

            <button 
              onClick={onNext}
              className="p-2.5 text-white/90 hover:text-white transition-transform active:scale-90 cursor-pointer"
              title="Next Track"
            >
              <SkipForward className="w-7 h-7 fill-current" />
            </button>

            <button 
              onClick={onToggleRepeat}
              className={`p-2 rounded-full transition-colors cursor-pointer relative ${
                repeatMode !== 'off' ? 'text-[#FA2D48] bg-white/10' : 'text-white/40 hover:text-white'
              }`}
              title={`Repeat: ${repeatMode}`}
            >
              <Repeat className="w-4.5 h-4.5" />
              {repeatMode === 'one' && (
                <span className="absolute -top-1 -right-1 text-[9px] font-bold text-[#FA2D48]">1</span>
              )}
            </button>
          </div>

          {/* Volume Slider Bar */}
          <div className="flex items-center gap-3 px-2">
            <button 
              onClick={onToggleMute}
              className="text-white/60 hover:text-white transition-colors cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <div className="flex-1 relative h-1.5 bg-white/20 rounded-full overflow-hidden cursor-pointer group">
              <div 
                className="h-full bg-white group-hover:bg-[#FA2D48] rounded-full transition-all"
                style={{ width: `${isMuted ? 0 : volume}%` }}
              />
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                aria-label="Volume slider"
              />
            </div>
            <Volume2 className="w-4 h-4 text-white/60" />
          </div>

          {/* Bottom Utility Toolbar */}
          <div className="flex items-center justify-around pt-2 border-t border-white/10 text-white/70">
            {/* Synced Lyrics Toggle */}
            <button 
              onClick={() => setActiveSheetTab(activeSheetTab === 'lyrics' ? 'main' : 'lyrics')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeSheetTab === 'lyrics' 
                  ? 'bg-white/20 text-[#FA2D48] shadow-md' 
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
              title="Lyrics"
            >
              <MessageSquare className="w-4.5 h-4.5" />
            </button>

            {/* Audio Route Selector */}
            <button 
              onClick={() => setShowAirPlayModal(!showAirPlayModal)}
              className={`p-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                showAirPlayModal 
                  ? 'bg-white/20 text-white shadow-md' 
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
              title="Audio Output Device"
            >
              <Airplay className="w-4.5 h-4.5" />
              <span className="text-[11px] font-semibold hidden sm:inline">{selectedRoute.split(' ')[0]}</span>
            </button>

            {/* Queue List Toggle */}
            <button 
              onClick={() => setActiveSheetTab(activeSheetTab === 'queue' ? 'main' : 'queue')}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                activeSheetTab === 'queue' 
                  ? 'bg-white/20 text-[#FA2D48] shadow-md' 
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
              title="Queue"
            >
              <ListMusic className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* AirPlay Device Route Modal Popup */}
        {showAirPlayModal && (
          <div className="absolute inset-x-4 bottom-24 p-4 rounded-3xl bg-neutral-900/98 border border-white/20 backdrop-blur-2xl shadow-2xl space-y-2 text-white animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="text-xs font-bold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                <Airplay className="w-3.5 h-3.5 text-[#FA2D48]" />
                Audio Output Route
              </span>
              <button 
                onClick={() => setShowAirPlayModal(false)}
                className="text-xs text-white/50 hover:text-white cursor-pointer"
              >
                Done
              </button>
            </div>
            {['AirPods Pro (2nd gen)', 'MacBook Pro Speakers', 'Studio Display Audio', 'Living Room HomePod'].map((route) => (
              <div 
                key={route}
                onClick={() => {
                  setSelectedRoute(route);
                  setShowAirPlayModal(false);
                  showToast(`Connected to ${route}`);
                }}
                className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors ${
                  selectedRoute === route ? 'bg-[#FA2D48]/20 text-[#FA2D48] font-bold' : 'hover:bg-white/10 text-white/80'
                }`}
              >
                <span className="text-xs">{route}</span>
                {selectedRoute === route && <Check className="w-4 h-4 text-[#FA2D48]" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
