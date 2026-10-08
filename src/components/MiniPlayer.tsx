import React, { useState, useRef } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX, 
  Tv, 
  ChevronUp
} from 'lucide-react';
import { SongTrack } from '../types';
import { MusicVisualizer } from './MusicVisualizer';
import { TrackArtwork } from './TrackArtwork';

interface MiniPlayerProps {
  track: SongTrack;
  isPlaying: boolean;
  onPlayPause: (e: React.MouseEvent) => void;
  onNext: (e: React.MouseEvent) => void;
  onPrev?: (e: React.MouseEvent) => void;
  onExpand: () => void;
  isDesktop?: boolean;
  currentTime?: number;
  duration?: number;
  volume?: number;
  isMuted?: boolean;
  onSeek?: (time: number) => void;
  onVolumeChange?: (vol: number) => void;
  onToggleMute?: () => void;
  isVideoMode?: boolean;
  onToggleVideoMode?: () => void;
  bottomOffset?: number;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  track,
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  onExpand,
  isDesktop = false,
  currentTime = 0,
  duration = 240,
  volume = 85,
  isMuted = false,
  onSeek,
  onVolumeChange,
  onToggleMute,
  isVideoMode = false,
  onToggleVideoMode,
  bottomOffset = 68,
}) => {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPercent, setScrubPercent] = useState(0);
  const scrubTimeRef = useRef(0);
  const desktopBarRef = useRef<HTMLDivElement>(null);

  // Mobile dedicated scrubbing state
  const [isMobileScrubbing, setIsMobileScrubbing] = useState(false);
  const [mobileScrubPercent, setMobileScrubPercent] = useState(0);
  const mobileScrubTimeRef = useRef(0);
  const mobileBarRef = useRef<HTMLDivElement>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const totalSecs = Math.floor(secs);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const safeDuration = duration > 0 ? duration : (track.duration || 240);
  const currentPercent = safeDuration > 0 ? Math.min(100, Math.max(0, (currentTime / safeDuration) * 100)) : 0;
  
  // Desktop timeline calculation
  const effectivePercent = isScrubbing ? scrubPercent : currentPercent;
  const effectiveTime = isScrubbing ? scrubTimeRef.current : currentTime;

  // Mobile timeline calculation
  const mobileEffectivePercent = isMobileScrubbing ? mobileScrubPercent : currentPercent;

  // Desktop Pointer Handlers
  const getDesktopPercent = (clientX: number) => {
    if (!desktopBarRef.current) return 0;
    const rect = desktopBarRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (clampedX / rect.width) * 100;
  };

  const handleDesktopPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(true);
    const pct = getDesktopPercent(e.clientX);
    setScrubPercent(pct);
    const targetTime = (pct / 100) * safeDuration;
    scrubTimeRef.current = targetTime;
  };

  const handleDesktopPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    e.stopPropagation();
    const pct = getDesktopPercent(e.clientX);
    setScrubPercent(pct);
    const targetTime = (pct / 100) * safeDuration;
    scrubTimeRef.current = targetTime;
  };

  const handleDesktopPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const pct = getDesktopPercent(e.clientX);
    const targetTime = (pct / 100) * safeDuration;
    scrubTimeRef.current = targetTime;
    setIsScrubbing(false);
    onSeek?.(targetTime);
  };

  const handleDesktopPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsScrubbing(false);
  };

  const handleDesktopKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      onSeek?.(Math.min(safeDuration, currentTime + 5));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      onSeek?.(Math.max(0, currentTime - 5));
    }
  };

  // Mobile Pointer Handlers
  const getMobilePercent = (clientX: number) => {
    if (!mobileBarRef.current) return 0;
    const rect = mobileBarRef.current.getBoundingClientRect();
    if (rect.width <= 0) return 0;
    const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    return (clampedX / rect.width) * 100;
  };

  const handleMobilePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
    setIsMobileScrubbing(true);
    const pct = getMobilePercent(e.clientX);
    setMobileScrubPercent(pct);
    const targetTime = (pct / 100) * safeDuration;
    mobileScrubTimeRef.current = targetTime;
  };

  const handleMobilePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileScrubbing) return;
    e.preventDefault();
    e.stopPropagation();
    const pct = getMobilePercent(e.clientX);
    setMobileScrubPercent(pct);
    const targetTime = (pct / 100) * safeDuration;
    mobileScrubTimeRef.current = targetTime;
  };

  const handleMobilePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileScrubbing) return;
    e.preventDefault();
    e.stopPropagation();
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    const pct = getMobilePercent(e.clientX);
    const targetTime = (pct / 100) * safeDuration;
    mobileScrubTimeRef.current = targetTime;
    setIsMobileScrubbing(false);
    onSeek?.(targetTime);
  };

  const handleMobilePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isMobileScrubbing) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsMobileScrubbing(false);
  };

  // 1. DESKTOP PLAYBACK BAR (Auto-fits full width of PC screen)
  if (isDesktop) {
    return (
      <div className="relative w-full z-40 shrink-0">
        {/* Ambient light glow behind the desktop player bar */}
        <div 
          className="absolute -top-6 inset-x-0 h-16 opacity-35 blur-2xl pointer-events-none transition-colors duration-700"
          style={{
            background: `radial-gradient(ellipse at 50% 100%, ${track.artworkBgColor} 0%, rgba(250, 45, 72, 0.4) 40%, transparent 80%)`,
          }}
        />

        <div className="h-[76px] w-full border-t border-white/10 bg-[#141416]/95 backdrop-blur-3xl px-6 flex items-center justify-between relative shadow-2xl">
          {/* Left: Track Information & Artwork */}
          <div 
            onClick={onExpand}
            className="flex items-center gap-3.5 w-1/4 min-w-[200px] cursor-pointer group"
            title="Click to expand Apple Music Sheet Player"
          >
            <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-lg shrink-0 bg-neutral-900 border border-white/10">
              <TrackArtwork
                src={track.artwork}
                alt={track.title}
                fallbackColor={track.artworkBgColor}
                title={track.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <MusicVisualizer isPlaying={isPlaying} barColor="#FA2D48" />
            </div>

            <div className="min-w-0 pr-2">
              <div className="text-sm font-semibold text-white truncate leading-tight group-hover:text-[#FA2D48] transition-colors">
                {track.title}
              </div>
              <div className="text-xs text-neutral-400 truncate mt-0.5">
                {track.artist}
              </div>
            </div>
          </div>

          {/* Center: Transport Controls & Scrubber */}
          <div className="flex-1 max-w-lg flex flex-col items-center gap-1.5 px-4">
            <div className="flex items-center gap-4">
              <button
                onClick={onPrev}
                className="p-1.5 rounded-full text-neutral-300 hover:text-white transition-transform active:scale-90 cursor-pointer"
                title="Previous Track"
              >
                <SkipBack className="w-4 h-4 fill-current" />
              </button>

              <button
                onClick={onPlayPause}
                className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center shadow-md transition-transform active:scale-95 hover:scale-105 cursor-pointer"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4 fill-current" />
                ) : (
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                )}
              </button>

              <button
                onClick={onNext}
                className="p-1.5 rounded-full text-neutral-300 hover:text-white transition-transform active:scale-90 cursor-pointer"
                title="Next Track"
              >
                <SkipForward className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Interactive Desktop Timeline Scrubber */}
            <div className="w-full flex items-center gap-2.5 text-[10px] font-mono text-neutral-400 select-none">
              <span className="w-8 text-right font-semibold text-neutral-300">
                {formatTime(effectiveTime)}
              </span>
              <div 
                ref={desktopBarRef}
                role="slider"
                tabIndex={0}
                aria-label="Desktop timeline scrubber"
                aria-valuemin={0}
                aria-valuemax={safeDuration}
                aria-valuenow={Math.round(effectiveTime)}
                onPointerDown={handleDesktopPointerDown}
                onPointerMove={handleDesktopPointerMove}
                onPointerUp={handleDesktopPointerUp}
                onPointerCancel={handleDesktopPointerCancel}
                onKeyDown={handleDesktopKeyDown}
                style={{ touchAction: 'none' }}
                className="flex-1 relative h-3 py-1 group flex items-center cursor-pointer transition-all"
              >
                {/* Track */}
                <div className="w-full h-1.5 group-hover:h-2 bg-white/20 rounded-full overflow-hidden transition-all duration-150">
                  <div 
                    className={`h-full bg-[#FA2D48] rounded-full ${
                      isScrubbing ? '' : 'transition-[width] duration-100 ease-linear'
                    }`}
                    style={{ width: `${effectivePercent}%` }}
                  />
                </div>

                {/* Glowing Thumb on hover or drag */}
                <div 
                  className={`absolute w-3.5 h-3.5 -ml-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none transition-transform opacity-0 group-hover:opacity-100 ${
                    isScrubbing ? 'opacity-100 scale-125' : 'group-hover:scale-110'
                  }`}
                  style={{ 
                    left: `${effectivePercent}%`,
                    transition: isScrubbing ? 'none' : 'left 100ms linear, opacity 150ms ease'
                  }}
                />
              </div>
              <span className="w-8 text-left">{formatTime(safeDuration)}</span>
            </div>
          </div>

          {/* Right: Volume, Live Video Toggle, Expand Sheet */}
          <div className="flex items-center justify-end gap-3 w-1/4 min-w-[200px]">
            {onToggleVideoMode && (
              <button
                onClick={onToggleVideoMode}
                className={`p-2 rounded-xl transition-colors cursor-pointer ${
                  isVideoMode ? 'bg-[#FA2D48] text-white' : 'text-neutral-400 hover:text-white hover:bg-white/10'
                }`}
                title={isVideoMode ? 'Video Mode: Active' : 'Switch to Live YouTube Video'}
              >
                <Tv className="w-4 h-4" />
              </button>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2 w-28">
              <button
                onClick={onToggleMute}
                className="text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="flex-1 relative h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-white rounded-full"
                  style={{ width: `${isMuted ? 0 : volume}%` }}
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  aria-label="Volume slider"
                />
              </div>
            </div>

            {/* Expand Full 3D Sheet Button */}
            <button
              onClick={onExpand}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition-colors ml-1 cursor-pointer"
              title="Open Apple Music Sheet Player"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. MOBILE & TABLET FLOATING LIQUID GLASS PILL
  return (
    <div
      onClick={onExpand}
      style={{ bottom: `${bottomOffset}px` }}
      className="absolute left-2.5 right-2.5 sm:left-4 sm:right-4 md:left-6 md:right-6 h-15 rounded-2xl apple-glass-material flex flex-col justify-between p-2.5 z-40 cursor-pointer shadow-2xl transition-all duration-200 active:scale-[0.99] group max-w-2xl mx-auto relative overflow-hidden"
    >
      {/* Ambient glow behind mobile floating player */}
      <div 
        className="absolute -inset-1 rounded-2xl opacity-40 blur-lg pointer-events-none transition-colors duration-700 -z-10"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, ${track.artworkBgColor} 0%, rgba(250, 45, 72, 0.4) 60%, transparent 100%)`,
        }}
      />

      <div className="flex items-center justify-between w-full flex-1">
        {/* Left: Artwork with Visualizer */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/10">
            <TrackArtwork
              src={track.artwork}
              alt={track.title}
              fallbackColor={track.artworkBgColor}
              title={track.title}
              className="w-full h-full object-cover"
            />
            <MusicVisualizer isPlaying={isPlaying} barColor="#FA2D48" />
          </div>

          {/* Title and Artist */}
          <div className="min-w-0 flex-1 pr-2">
            <div className="text-xs sm:text-sm font-semibold text-white truncate leading-tight group-hover:text-[#FA2D48] transition-colors">
              {track.title}
            </div>
            <div className="text-[11px] text-white/60 truncate mt-0.5">
              {track.artist}
            </div>
          </div>
        </div>

        {/* Right Controls: Play/Pause and Next */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={onPlayPause}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-transform active:scale-90 cursor-pointer"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={onNext}
            className="p-2 rounded-full hover:bg-white/10 text-white/90 hover:text-white transition-transform active:scale-90 cursor-pointer"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5 fill-current" />
          </button>
        </div>
      </div>

      {/* Slim interactive timeline track on bottom of mobile pill */}
      <div 
        ref={mobileBarRef}
        role="slider"
        aria-label="Mobile timeline scrubber"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handleMobilePointerDown}
        onPointerMove={handleMobilePointerMove}
        onPointerUp={handleMobilePointerUp}
        onPointerCancel={handleMobilePointerCancel}
        style={{ touchAction: 'none' }}
        className="w-full h-3 -mb-1 flex items-center relative cursor-pointer group"
        title="Slide or tap to seek"
      >
        <div className="w-full h-1 group-hover:h-1.5 group-active:h-1.5 bg-white/20 rounded-full overflow-hidden transition-all duration-150">
          <div 
            className={`h-full bg-[#FA2D48] rounded-full ${
              isMobileScrubbing ? '' : 'transition-[width] duration-100 ease-linear'
            }`}
            style={{ width: `${mobileEffectivePercent}%` }}
          />
        </div>
        {/* Glow indicator on touch */}
        <div 
          className={`absolute w-2.5 h-2.5 -ml-1 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] pointer-events-none transition-transform opacity-0 group-hover:opacity-100 group-active:opacity-100 ${
            isMobileScrubbing ? 'opacity-100 scale-125' : ''
          }`}
          style={{ 
            left: `${mobileEffectivePercent}%`,
            transition: isMobileScrubbing ? 'none' : 'left 100ms linear, opacity 150ms ease'
          }}
        />
      </div>
    </div>
  );
};
