import React, { useEffect, useRef } from 'react';
import { SongTrack } from '../types';

interface BackgroundYouTubePlayerProps {
  track: SongTrack;
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  seekTarget?: { time: number; timestamp: number } | null;
  onEnded: () => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onStateChange?: (playing: boolean) => void;
  ambientEnabled?: boolean;
  blurLevel?: number;
  saturation?: number;
  brightness?: number;
  liveVideoBg?: boolean;
  hasNativeAudio?: boolean;
}

export const BackgroundYouTubePlayer: React.FC<BackgroundYouTubePlayerProps> = ({
  track,
  isPlaying,
  volume,
  isMuted,
  seekTarget,
  onEnded,
  onTimeUpdate,
  onStateChange,
  ambientEnabled = true,
  blurLevel = 50,
  saturation = 180,
  brightness = 65,
  liveVideoBg = true,
  hasNativeAudio = false,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Send commands to YouTube iframe via postMessage API
  const sendCommand = (func: string, args: any[] = []) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*'
      );
    }
  };

  // Handle seekTarget changes for YouTube audio and video sync
  useEffect(() => {
    if (seekTarget) {
      sendCommand('seekTo', [seekTarget.time, true]);
      if (isPlaying) {
        sendCommand('playVideo');
      }
    }
  }, [seekTarget, isPlaying]);

  // Periodic polling for YouTube player state & currentTime
  useEffect(() => {
    if (!isPlaying || hasNativeAudio) return;
    const interval = setInterval(() => {
      sendCommand('getCurrentTime');
      sendCommand('getDuration');
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, hasNativeAudio]);

  // Play / Pause sync
  useEffect(() => {
    if (isPlaying) {
      sendCommand('playVideo');
    } else {
      sendCommand('pauseVideo');
    }
  }, [isPlaying]);

  // Volume sync: mute YouTube iframe when native audio is active to prevent echo
  useEffect(() => {
    if (hasNativeAudio) {
      sendCommand('mute');
      sendCommand('setVolume', [0]);
    } else if (isMuted) {
      sendCommand('mute');
    } else {
      sendCommand('unMute');
      sendCommand('setVolume', [volume]);
    }
  }, [volume, isMuted, hasNativeAudio]);

  // Listen for YouTube IFrame player events
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (typeof e.data === 'string') {
          const data = JSON.parse(e.data);
          // Player state changed: 0 = ended, 1 = playing, 2 = paused
          if (data.event === 'onStateChange') {
            // When native HTML5 audio is playing, YouTube iframe is only an ambient visual backdrop
            if (!hasNativeAudio) {
              if (data.info === 0) {
                onEnded();
              } else if (data.info === 1) {
                onStateChange?.(true);
              } else if (data.info === 2) {
                onStateChange?.(false);
              }
            }
          }
          // Info delivery with currentTime (only report if pure YouTube audio)
          if (!hasNativeAudio && data.event === 'infoDelivery' && data.info) {
            if (typeof data.info.currentTime === 'number') {
              onTimeUpdate?.(data.info.currentTime, data.info.duration || track.duration);
            }
          }
        }
      } catch {
        // Non-JSON message from other origins
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnded, onStateChange, onTimeUpdate, track.duration, hasNativeAudio]);

  const handleIframeLoad = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'listening' }),
        '*'
      );
    }
    if (isPlaying) {
      sendCommand('playVideo');
    }
    if (hasNativeAudio) {
      sendCommand('mute');
      sendCommand('setVolume', [0]);
    } else {
      if (isMuted) sendCommand('mute');
      else {
        sendCommand('unMute');
        sendCommand('setVolume', [volume]);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden select-none"
      aria-hidden="true"
    >
      {/* 
        FULL-SCREEN BLURRED LIVE VIDEO CANVAS:
        "the video shuld play at the background with a blur effect at full screen covering all things"
      */}
      {ambientEnabled && liveVideoBg ? (
        <div className="absolute inset-[-15%] w-[130%] h-[130%] overflow-hidden transition-all duration-700 pointer-events-none">
          <iframe
            ref={iframeRef}
            key={track.youtubeId}
            src={`https://www.youtube-nocookie.com/embed/${track.youtubeId}?enablejsapi=1&autoplay=1&rel=0&controls=0&playsinline=1&modestbranding=1&loop=1`}
            title={`YouTube Ambient Stream: ${track.title}`}
            onLoad={handleIframeLoad}
            className="w-full h-full border-none pointer-events-none transform scale-125"
            style={{
              filter: `blur(${blurLevel}px) saturate(${saturation}%) brightness(${brightness}%)`,
              willChange: 'filter, transform',
            }}
            allow="autoplay; encrypted-media"
          />
          {/* Liquid Dark Glass Vignette Overlay for crisp typography readability */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/60" />
          {/* Subtle Ambient Radial Lighting tint matching track color */}
          <div 
            className="absolute inset-0 opacity-40 mix-blend-screen pointer-events-none"
            style={{
              background: `radial-gradient(circle at 50% 35%, ${track.artworkBgColor} 0%, transparent 75%)`,
            }}
          />
        </div>
      ) : (
        /* Hidden background playback container when live video ambient is off */
        <div className="fixed -bottom-96 -right-96 w-32 h-32 opacity-0 pointer-events-none z-[-100] overflow-hidden">
          <iframe
            ref={iframeRef}
            key={track.youtubeId}
            src={`https://www.youtube-nocookie.com/embed/${track.youtubeId}?enablejsapi=1&autoplay=1&rel=0&controls=0&playsinline=1`}
            title={`YouTube Stream: ${track.title}`}
            onLoad={handleIframeLoad}
            className="w-full h-full border-none"
            allow="autoplay; encrypted-media"
          />
        </div>
      )}
    </div>
  );
};
