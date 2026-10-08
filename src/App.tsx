import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Search, 
  X, 
  Compass, 
  Radio as RadioIcon, 
  Library as LibraryIcon, 
  Home, 
  Music, 
  SlidersHorizontal, 
  Loader2, 
  Shuffle, 
  Star, 
  Volume2, 
  VolumeX, 
  Tv, 
  Maximize2,
  Download,
  ListMusic,
  Heart,
  History,
  Trash2,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { SongTrack, AppleMusicTab, AmbientSettings } from './types';
import { BILLBOARD_TOP_TRACKS, CATEGORY_CARDS, RADIO_STATIONS } from './data/appleMusicSongs';
import { MiniPlayer } from './components/MiniPlayer';
import { ExpandedPlayer } from './components/ExpandedPlayer';
import { BackgroundYouTubePlayer } from './components/BackgroundYouTubePlayer';
import { SettingsModal } from './components/SettingsModal';
import { TrackArtwork } from './components/TrackArtwork';
import { MusicVisualizer } from './components/MusicVisualizer';

export default function App() {
  // Screen Auto-Detection (phone, tablet, desktop)
  const [detectedType, setDetectedType] = useState<'phone' | 'tablet' | 'desktop'>(() => {
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w < 768) return 'phone';
      if (w <= 1024) return 'tablet';
      return 'desktop';
    }
    return 'desktop';
  });

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 768) {
        setDetectedType('phone');
      } else if (w <= 1024) {
        setDetectedType('tablet');
      } else {
        setDetectedType('desktop');
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  const isDesktop = detectedType === 'desktop';
  const isPhone = detectedType === 'phone';

  // Navigation & Player State
  const [activeTab, setActiveTab] = useState<AppleMusicTab>('listen-now');
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isVideoMode, setIsVideoMode] = useState(false);

  // Playback control states
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');

  // Ambient Light Settings state
  const [ambientSettings, setAmbientSettings] = useState<AmbientSettings>(() => {
    try {
      const saved = localStorage.getItem('apple_music_ambient_settings');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      enabled: true,
      blurLevel: 50,
      saturation: 180,
      brightness: 65,
      liveVideoBg: true,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('apple_music_ambient_settings', JSON.stringify(ambientSettings));
    } catch {}
  }, [ambientSettings]);

  // User Library (Liked Tracks & Recently Played History)
  const [likedTracks, setLikedTracks] = useState<SongTrack[]>(() => {
    try {
      const saved = localStorage.getItem('apple_music_liked_tracks');
      if (saved) return JSON.parse(saved);
      // Initialize with favorite tracks from verified list if available
      return [BILLBOARD_TOP_TRACKS[0], BILLBOARD_TOP_TRACKS[1]];
    } catch {
      return [BILLBOARD_TOP_TRACKS[0], BILLBOARD_TOP_TRACKS[1]];
    }
  });

  const [favorites, setFavorites] = useState<string[]>(() => {
    return likedTracks.map((t) => t.id);
  });

  const [recentlyPlayed, setRecentlyPlayed] = useState<SongTrack[]>(() => {
    try {
      const saved = localStorage.getItem('apple_music_history');
      if (saved) return JSON.parse(saved);
      return [BILLBOARD_TOP_TRACKS[0]];
    } catch {
      return [BILLBOARD_TOP_TRACKS[0]];
    }
  });

  // Active playlist and currently playing track
  const [playlist, setPlaylist] = useState<SongTrack[]>(() => {
    return likedTracks.length > 0 ? likedTracks : BILLBOARD_TOP_TRACKS;
  });

  const [currentTrack, setCurrentTrack] = useState<SongTrack>(() => {
    return playlist[0] || BILLBOARD_TOP_TRACKS[0];
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(currentTrack.duration || 228);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [seekTarget, setSeekTarget] = useState<{ time: number; timestamp: number } | null>(null);

  // Search & YouTube
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SongTrack[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // HTML5 Native Audio element for crisp 320kbps local MP3 playback
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Toasts
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Save liked tracks & history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('apple_music_liked_tracks', JSON.stringify(likedTracks));
      localStorage.setItem('apple_music_favorites', JSON.stringify(favorites));
    } catch {}
  }, [likedTracks, favorites]);

  useEffect(() => {
    try {
      localStorage.setItem('apple_music_history', JSON.stringify(recentlyPlayed));
    } catch {}
  }, [recentlyPlayed]);

  // Debounce guard to prevent accidental multi-skipping
  const skipCooldownRef = useRef(false);

  // High-precision timeline tracking references to eliminate jitter & glitch
  const lastSeekTimeRef = useRef<number>(0);
  const lastYtTimeRef = useRef<number>(0);
  const lastYtUpdateRef = useRef<number>(0);

  // Play a selected track
  const handleSelectTrack = useCallback((track: SongTrack) => {
    lastSeekTimeRef.current = Date.now();
    lastYtTimeRef.current = 0;
    lastYtUpdateRef.current = performance.now();
    setCurrentTrack(track);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(track.duration || 240);
    setRecentlyPlayed((prev) => {
      const filtered = prev.filter((t) => t.id !== track.id);
      return [track, ...filtered].slice(0, 30);
    });
    showToast(`Playing: ${track.title}`);
  }, [showToast]);

  // Full Interactive Timeline Scrubber & Seek Controller
  const handleSeek = useCallback((time: number) => {
    const safeDuration = duration > 0 ? duration : (currentTrack.duration || 240);
    const clampedTime = Math.max(0, Math.min(safeDuration, time));
    lastSeekTimeRef.current = Date.now();
    lastYtTimeRef.current = clampedTime;
    lastYtUpdateRef.current = performance.now();
    setCurrentTime(clampedTime);

    // 1. If HTML5 audio is playing, seek instantly
    if (audioRef.current && currentTrack.audioUrl) {
      try {
        audioRef.current.currentTime = clampedTime;
        if (isPlaying && audioRef.current.paused) {
          audioRef.current.play().catch(() => {});
        }
      } catch {}
    }

    // 2. Seek YouTube video / stream engine
    setSeekTarget({ time: clampedTime, timestamp: Date.now() });
  }, [currentTrack.audioUrl, currentTrack.duration, duration, isPlaying]);

  // Next / Prev track handlers
  const handleNextTrack = useCallback(() => {
    if (repeatMode === 'one') {
      handleSeek(0);
      setIsPlaying(true);
      return;
    }

    if (playlist.length === 0 || skipCooldownRef.current) return;
    skipCooldownRef.current = true;
    setTimeout(() => {
      skipCooldownRef.current = false;
    }, 450);

    if (isShuffle) {
      const remaining = playlist.filter((t) => t.id !== currentTrack.id);
      const randomTrack = remaining.length > 0 ? remaining[Math.floor(Math.random() * remaining.length)] : playlist[0];
      handleSelectTrack(randomTrack);
      return;
    }

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    if (currentIndex === -1) {
      if (playlist.length > 0) handleSelectTrack(playlist[0]);
      return;
    }

    if (repeatMode === 'off' && currentIndex === playlist.length - 1) {
      setIsPlaying(false);
      return;
    }

    const nextIndex = (currentIndex + 1) % playlist.length;
    handleSelectTrack(playlist[nextIndex]);
  }, [playlist, currentTrack.id, isShuffle, repeatMode, handleSelectTrack, handleSeek]);

  const handlePrevTrack = useCallback(() => {
    if (currentTime > 3) {
      handleSeek(0);
      return;
    }
    if (playlist.length === 0 || skipCooldownRef.current) return;
    skipCooldownRef.current = true;
    setTimeout(() => {
      skipCooldownRef.current = false;
    }, 450);

    const currentIndex = playlist.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + playlist.length) % playlist.length;
    handleSelectTrack(playlist[prevIndex]);
  }, [playlist, currentTrack.id, currentTime, handleSelectTrack, handleSeek]);

  // Toggle Favorite / Liked song
  const toggleFavorite = (track: SongTrack) => {
    const isFav = favorites.includes(track.id);
    if (isFav) {
      setFavorites((prev) => prev.filter((id) => id !== track.id));
      setLikedTracks((prev) => prev.filter((t) => t.id !== track.id));
      showToast(`Removed from Liked Songs`);
    } else {
      setFavorites((prev) => [track.id, ...prev]);
      setLikedTracks((prev) => [track, ...prev.filter((t) => t.id !== track.id)]);
      showToast(`Added to Liked Songs ❤️`);
    }
  };

  // Play All Liked Songs
  const handlePlayLiked = () => {
    if (likedTracks.length === 0) {
      showToast('No liked songs yet! Click the star icon to like songs.');
      return;
    }
    setPlaylist(likedTracks);
    handleSelectTrack(likedTracks[0]);
  };

  const handleShuffleLiked = () => {
    if (likedTracks.length === 0) {
      showToast('No liked songs yet! Click the star icon to like songs.');
      return;
    }
    const shuffled = [...likedTracks].sort(() => 0.5 - Math.random());
    setPlaylist(shuffled);
    setIsShuffle(true);
    handleSelectTrack(shuffled[0]);
    showToast('Shuffling Liked Songs');
  };

  // Clear listening history
  const handleClearHistory = () => {
    setRecentlyPlayed([]);
    try {
      localStorage.removeItem('apple_music_history');
    } catch {}
    showToast('Listening history cleared');
  };

  // Synchronize Native HTML5 Audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (currentTrack.audioUrl) {
      const targetSrc = currentTrack.audioUrl;
      if (!audio.src.endsWith(encodeURI(targetSrc)) && audio.src !== targetSrc) {
        audio.src = targetSrc;
        audio.load();
      }
      if (isPlaying) {
        audio.play().catch(() => {});
      } else {
        audio.pause();
      }
    } else {
      audio.pause();
    }
  }, [currentTrack, isPlaying]);

  // Volume synchronization for HTML5 Audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
  }, [volume, isMuted]);

  // Ultra-smooth 60fps tracking for native HTML5 audio
  useEffect(() => {
    if (!isPlaying || !currentTrack.audioUrl) return;

    let animId: number;
    const smoothAudioTick = () => {
      if (Date.now() - lastSeekTimeRef.current >= 400 && audioRef.current) {
        if (!audioRef.current.paused && !isNaN(audioRef.current.currentTime)) {
          setCurrentTime(audioRef.current.currentTime);
        }
      }
      animId = requestAnimationFrame(smoothAudioTick);
    };

    animId = requestAnimationFrame(smoothAudioTick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTrack.audioUrl]);

  // Ultra-smooth continuous time interpolation for pure YouTube streams (no jitter/glitch)
  useEffect(() => {
    if (!isPlaying || currentTrack.audioUrl) return;

    let animId: number;
    const smoothYtTick = () => {
      if (Date.now() - lastSeekTimeRef.current >= 500 && lastYtUpdateRef.current > 0) {
        const elapsed = (performance.now() - lastYtUpdateRef.current) / 1000;
        const projected = lastYtTimeRef.current + elapsed;
        const safeDuration = duration > 0 ? duration : (currentTrack.duration || 240);
        if (projected >= safeDuration) {
          handleNextTrack();
        } else {
          setCurrentTime(projected);
        }
      }
      animId = requestAnimationFrame(smoothYtTick);
    };

    animId = requestAnimationFrame(smoothYtTick);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, currentTrack.audioUrl, duration, handleNextTrack]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSeek(Math.min(duration, currentTime + 5));
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(Math.max(0, currentTime - 5));
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        setVolume((v) => Math.min(100, v + 5));
        setIsMuted(false);
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        setVolume((v) => Math.max(0, v - 5));
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        setIsMuted((m) => !m);
      } else if (e.key === 'Escape') {
        if (isSettingsOpen) setIsSettingsOpen(false);
        else if (isSheetExpanded) setIsSheetExpanded(false);
        else if (isVideoMode) setIsVideoMode(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, duration, isSettingsOpen, isSheetExpanded, isVideoMode, handleSeek]);

  // Autocomplete suggestions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/youtube/suggestions?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.suggestions)) {
            setSuggestions(data.suggestions);
          }
        }
      } catch {
        setSuggestions([]);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Execute Search: NEVER auto-plays! Keeps currently playing track uninterrupted.
  const executeSearch = async (queryText: string) => {
    const q = queryText.trim();
    if (!q) return;

    setIsSearching(true);
    setShowSuggestions(false);

    // Instant local library matching
    const localMatches = BILLBOARD_TOP_TRACKS.filter(
      (t) =>
        t.title.toLowerCase().includes(q.toLowerCase()) ||
        t.artist.toLowerCase().includes(q.toLowerCase()) ||
        (t.album && t.album.toLowerCase().includes(q.toLowerCase()))
    );

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(q)}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.videos) && data.videos.length > 0) {
          const ytMapped: SongTrack[] = data.videos.map((v: any, idx: number) => ({
            id: `yt-${v.id}-${idx}`,
            youtubeId: v.id,
            title: v.title,
            artist: v.channel,
            album: 'YouTube Music Search',
            duration: 240,
            durationFormatted: v.duration || '3:45',
            artwork: v.thumbnail || `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
            artworkBgColor: '#25163a',
            genre: 'YouTube Music',
          }));
          const combined = [...localMatches, ...ytMapped];
          setSearchResults(combined);
          showToast(`Found ${combined.length} tracks for "${q}"`);
          return;
        }
      }
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
        showToast(`Showing ${localMatches.length} library matches`);
      } else {
        setSearchResults([]);
        showToast('No tracks found. Try another search query.');
      }
    } catch {
      if (localMatches.length > 0) {
        setSearchResults(localMatches);
      }
      showToast('Search completed');
    } finally {
      setIsSearching(false);
    }
  };

  // Play track chosen explicitly by user from Search Results & Automate upcoming Queue
  const handlePlayFromSearch = (track: SongTrack, index: number) => {
    // 1. Play the selected track immediately
    handleSelectTrack(track);

    // 2. Automate playback: set playlist to continue with subsequent search results
    const remaining = searchResults.slice(index);
    const preceding = searchResults.slice(0, index);
    setPlaylist([...remaining, ...preceding]);
    showToast(`Playing "${track.title}" • Queue automated`);
  };

  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  // Library sub-filter state
  const [libraryFilter, setLibraryFilter] = useState<'liked' | 'history' | 'downloaded' | 'all'>('liked');

  const filteredLibraryTracks = useMemo(() => {
    if (libraryFilter === 'liked') {
      return likedTracks;
    }
    if (libraryFilter === 'history') {
      return recentlyPlayed;
    }
    if (libraryFilter === 'downloaded') {
      return BILLBOARD_TOP_TRACKS.filter((t) => t.isDownloaded || t.audioUrl);
    }
    return [...likedTracks, ...BILLBOARD_TOP_TRACKS.filter((t) => !favorites.includes(t.id))];
  }, [libraryFilter, likedTracks, recentlyPlayed, favorites]);

  return (
    <div className="relative w-full h-screen h-[100dvh] bg-black text-slate-100 flex flex-col overflow-hidden font-sans select-none">
      {/* Invisible HTML5 Audio Tag for crystal clear native local playback */}
      <audio
        ref={audioRef}
        preload="auto"
        onTimeUpdate={() => {
          if (audioRef.current && currentTrack.audioUrl) {
            if (Date.now() - lastSeekTimeRef.current >= 400 && !isNaN(audioRef.current.currentTime)) {
              setCurrentTime(audioRef.current.currentTime);
            }
          }
        }}
        onLoadedMetadata={() => {
          if (audioRef.current && currentTrack.audioUrl && audioRef.current.duration) {
            setDuration(audioRef.current.duration);
          }
        }}
        onEnded={() => {
          if (repeatMode === 'one' && audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play().catch(() => {});
          } else {
            handleNextTrack();
          }
        }}
      />

      {/* Full-Screen Ambient Blurred Live Video & YouTube Engine */}
      <BackgroundYouTubePlayer
        track={currentTrack}
        isPlaying={isPlaying}
        volume={volume}
        isMuted={isMuted}
        seekTarget={seekTarget}
        onEnded={handleNextTrack}
        onTimeUpdate={(c, d) => {
          if (!currentTrack.audioUrl) {
            if (Date.now() - lastSeekTimeRef.current >= 500 && typeof c === 'number' && !isNaN(c)) {
              lastYtTimeRef.current = c;
              lastYtUpdateRef.current = performance.now();
              setCurrentTime(c);
              if (d && d > 0 && Math.abs(duration - d) > 2) {
                setDuration(d);
              }
            }
          }
        }}
        onStateChange={(playing) => setIsPlaying(playing)}
        ambientEnabled={ambientSettings.enabled}
        blurLevel={ambientSettings.blurLevel}
        saturation={ambientSettings.saturation}
        brightness={ambientSettings.brightness}
        liveVideoBg={ambientSettings.liveVideoBg}
        hasNativeAudio={Boolean(currentTrack.audioUrl)}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-neutral-900/90 border border-white/20 text-xs font-semibold text-white shadow-2xl backdrop-blur-2xl flex items-center gap-2 animate-bounce-subtle">
          <Sparkles className="w-3.5 h-3.5 text-[#FA2D48]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Floating Picture-in-Picture Live Video Mode when collapsed */}
      {isVideoMode && !isSheetExpanded && (
        <div className="fixed bottom-24 right-4 z-40 w-64 aspect-video rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-black animate-scale-up">
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
            <button
              onClick={() => setIsSheetExpanded(true)}
              className="p-1 rounded-full bg-black/60 text-white/80 hover:text-white"
              title="Expand to Sheet"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsVideoMode(false)}
              className="p-1 rounded-full bg-black/60 text-white/80 hover:text-white"
              title="Close Video"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${currentTrack.youtubeId}?enablejsapi=1&autoplay=1&mute=1&controls=0&playsinline=1`}
            title={currentTrack.title}
            className="w-full h-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
          />
        </div>
      )}

      {/* ROOT SCALING CONTAINER */}
      <div
        className={`w-full h-full flex flex-col overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isSheetExpanded 
            ? 'scale-[0.94] translate-y-3 rounded-t-[32px] brightness-75 pointer-events-none' 
            : 'scale-100 translate-y-0 rounded-none brightness-100'
        }`}
      >
        {/* DESKTOP PC LAYOUT vs MOBILE/TABLET LAYOUT */}
        {isDesktop ? (
          /* DESKTOP APPLE MUSIC FOR MAC FULL-SCREEN LAYOUT */
          <div className="flex-1 flex overflow-hidden">
            {/* Left Desktop Sidebar */}
            <aside className="w-64 border-r border-white/10 bg-[#121214]/90 backdrop-blur-2xl flex flex-col p-4 shrink-0 justify-between select-none">
              <div className="space-y-6">
                {/* Apple Music Wordmark */}
                <div 
                  onClick={() => setActiveTab('listen-now')}
                  className="flex items-center gap-2.5 px-2 cursor-pointer group"
                >
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FA2D48] to-rose-600 flex items-center justify-center shadow-lg shadow-red-600/30">
                    <Music className="w-4.5 h-4.5 text-white" />
                  </div>
                  <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
                    Apple Music <span className="text-[10px] text-[#FA2D48] font-mono px-1.5 py-0.5 rounded bg-red-950/80 border border-red-800/40">Glass</span>
                  </span>
                </div>

                {/* Navigation Links */}
                <nav className="space-y-1">
                  <button
                    onClick={() => setActiveTab('listen-now')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'listen-now'
                        ? 'bg-[#FA2D48] text-white shadow-md'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>Listen Now</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('browse')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'browse'
                        ? 'bg-[#FA2D48] text-white shadow-md'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Compass className="w-4 h-4" />
                    <span>Browse</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('radio')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'radio'
                        ? 'bg-[#FA2D48] text-white shadow-md'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <RadioIcon className="w-4 h-4" />
                    <span>Radio</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('library')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'library'
                        ? 'bg-[#FA2D48] text-white shadow-md'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <LibraryIcon className="w-4 h-4" />
                    <span>Library</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('search')}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === 'search'
                        ? 'bg-[#FA2D48] text-white shadow-md'
                        : 'text-neutral-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </nav>

                {/* Liked Songs Quick Filter in Sidebar */}
                <div className="pt-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 px-3 pb-2 flex items-center justify-between">
                    <span>My Music</span>
                    <span className="text-[#FA2D48] font-mono text-[10px]">{likedTracks.length}</span>
                  </div>
                  <div className="space-y-0.5">
                    <button
                      onClick={() => {
                        setActiveTab('library');
                        setLibraryFilter('liked');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-3.5 h-3.5 text-[#FA2D48] fill-[#FA2D48]" />
                        <span>Liked Songs</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">{likedTracks.length}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('library');
                        setLibraryFilter('history');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs text-neutral-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <History className="w-3.5 h-3.5 text-neutral-400" />
                        <span>Recently Played</span>
                      </div>
                      <span className="text-[10px] text-neutral-500 font-mono">{recentlyPlayed.length}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar Bottom User Profile & Mini Status */}
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FA2D48] to-purple-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                  AM
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white truncate">My Collection</div>
                  <div className="text-[10px] text-neutral-400 truncate">
                    {likedTracks.length} Liked Tracks
                  </div>
                </div>
              </div>
            </aside>

            {/* Main Desktop View Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden bg-[#0a0a0c]">
              {/* Desktop Top Header Bar with Non-intrusive Search Input */}
              <header className="h-14 px-8 border-b border-white/10 flex items-center justify-between gap-6 shrink-0 bg-[#0a0a0c]/80 backdrop-blur-xl">
                <div className="relative flex-1 max-w-md">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      setActiveTab('search');
                      executeSearch(searchQuery);
                    }}
                    className="relative flex items-center"
                  >
                    <Search className="w-4 h-4 absolute left-3.5 text-neutral-400" />
                    <input
                      type="text"
                      placeholder="Search songs, artists, albums (press enter)..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowSuggestions(true);
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      className="w-full h-9 pl-10 pr-20 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FA2D48] transition-colors"
                    />
                    {isSearching && (
                      <Loader2 className="w-3.5 h-3.5 text-[#FA2D48] animate-spin absolute right-16" />
                    )}
                    <button
                      type="submit"
                      className="absolute right-1.5 px-2.5 py-1 rounded-lg bg-[#FA2D48] text-[11px] font-bold text-white hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      Search
                    </button>
                  </form>

                  {/* Autocomplete Dropdown */}
                  {showSuggestions && suggestions.length > 0 && (
                    <div className="absolute top-11 left-0 right-0 p-2 rounded-xl bg-neutral-900 border border-white/15 shadow-2xl z-50 space-y-1">
                      {suggestions.map((s, idx) => (
                        <div
                          key={idx}
                          onClick={() => {
                            setSearchQuery(s);
                            setActiveTab('search');
                            executeSearch(s);
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs hover:bg-white/10 cursor-pointer flex items-center justify-between text-white"
                        >
                          <span>{s}</span>
                          <Search className="w-3 h-3 text-neutral-500" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Top Right Header Controls */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setIsVideoMode(!isVideoMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isVideoMode
                        ? 'bg-[#FA2D48] text-white shadow-md'
                        : 'bg-white/10 text-neutral-300 hover:text-white hover:bg-white/15'
                    }`}
                    title={isVideoMode ? 'Video Mode: Active' : 'Switch to Live YouTube Video'}
                  >
                    <Tv className="w-3.5 h-3.5" />
                    <span>{isVideoMode ? 'Video Active' : 'Live Video'}</span>
                  </button>

                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/15 text-neutral-300 hover:text-white transition-all cursor-pointer"
                    title="Ambient Lighting Settings"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setIsSheetExpanded(true)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-[#FA2D48]" />
                    <span>Now Playing Sheet</span>
                  </button>
                </div>
              </header>

              {/* Desktop Tab Body with Responsive Multi-Column Layout */}
              <div className="flex-1 overflow-y-auto p-8">
                {renderTabContent(true)}
              </div>
            </div>
          </div>
        ) : (
          /* MOBILE & TABLET LAYOUT */
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Scrollable Tab Content Area */}
            <div className="flex-1 overflow-y-auto pb-32">
              <div className="p-4 sm:p-6 space-y-6 pt-6 md:pt-8 max-w-4xl mx-auto">
                {renderTabContent(false)}
              </div>
            </div>

            {/* Mobile / Tablet Floating MiniPlayer with Interactive Timeline */}
            <MiniPlayer
              track={currentTrack}
              isPlaying={isPlaying}
              currentTime={currentTime}
              duration={duration}
              onSeek={handleSeek}
              onPlayPause={(e) => {
                e.stopPropagation();
                setIsPlaying(!isPlaying);
              }}
              onNext={(e) => {
                e.stopPropagation();
                handleNextTrack();
              }}
              onExpand={() => setIsSheetExpanded(true)}
              bottomOffset={isPhone ? 72 : 68}
            />

            {/* Bottom Apple Music 5-Tab Bar */}
            <nav className="h-16 px-6 border-t border-white/10 apple-glass-material flex items-center justify-around z-30 shrink-0">
              <button
                onClick={() => setActiveTab('listen-now')}
                className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'listen-now' ? 'text-[#FA2D48]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Listen Now</span>
              </button>

              <button
                onClick={() => setActiveTab('browse')}
                className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'browse' ? 'text-[#FA2D48]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Compass className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Browse</span>
              </button>

              <button
                onClick={() => setActiveTab('radio')}
                className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'radio' ? 'text-[#FA2D48]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <RadioIcon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Radio</span>
              </button>

              <button
                onClick={() => setActiveTab('library')}
                className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'library' ? 'text-[#FA2D48]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <LibraryIcon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Library</span>
              </button>

              <button
                onClick={() => setActiveTab('search')}
                className={`flex flex-col items-center gap-1 transition-colors cursor-pointer ${
                  activeTab === 'search' ? 'text-[#FA2D48]' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Search className="w-5 h-5" />
                <span className="text-[10px] font-semibold">Search</span>
              </button>
            </nav>
          </div>
        )}

        {/* Persistent Desktop Bottom Playback Bar (Full Width on PC) */}
        {isDesktop && (
          <MiniPlayer
            track={currentTrack}
            isPlaying={isPlaying}
            onPlayPause={(e) => {
              e.stopPropagation();
              setIsPlaying(!isPlaying);
            }}
            onNext={(e) => {
              e.stopPropagation();
              handleNextTrack();
            }}
            onPrev={(e) => {
              e.stopPropagation();
              handlePrevTrack();
            }}
            onExpand={() => setIsSheetExpanded(true)}
            isDesktop={true}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            isMuted={isMuted}
            onSeek={handleSeek}
            onVolumeChange={(v) => {
              setVolume(v);
              if (isMuted) setIsMuted(false);
            }}
            onToggleMute={() => setIsMuted(!isMuted)}
            isVideoMode={isVideoMode}
            onToggleVideoMode={() => setIsVideoMode(!isVideoMode)}
          />
        )}
      </div>

      {/* EXPANDED BOTTOM SHEET PLAYER */}
      {isSheetExpanded && (
        <ExpandedPlayer
          track={currentTrack}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          isFavorite={favorites.includes(currentTrack.id)}
          isShuffle={isShuffle}
          repeatMode={repeatMode}
          isVideoMode={isVideoMode}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onPrev={handlePrevTrack}
          onNext={handleNextTrack}
          onSeek={handleSeek}
          onVolumeChange={(v) => {
            setVolume(v);
            if (isMuted) setIsMuted(false);
          }}
          onToggleMute={() => setIsMuted(!isMuted)}
          onToggleFavorite={() => toggleFavorite(currentTrack)}
          onToggleShuffle={() => setIsShuffle(!isShuffle)}
          onToggleRepeat={() => {
            const modes: ('off' | 'all' | 'one')[] = ['off', 'all', 'one'];
            const nextMode = modes[(modes.indexOf(repeatMode) + 1) % modes.length];
            setRepeatMode(nextMode);
            showToast(`Repeat: ${nextMode.toUpperCase()}`);
          }}
          onToggleVideoMode={() => setIsVideoMode(!isVideoMode)}
          onDismiss={() => setIsSheetExpanded(false)}
          playlist={playlist}
          onSelectTrack={handleSelectTrack}
          showToast={showToast}
        />
      )}

      {/* Ambient Lighting Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        ambientSettings={ambientSettings}
        onUpdateAmbientSettings={setAmbientSettings}
        showToast={showToast}
      />
    </div>
  );

  // Helper renderer for tab content (reused between desktop and mobile)
  function renderTabContent(forDesktop: boolean) {
    // 1. LISTEN NOW (PERSONALIZED HOME: USER'S LIKES & DISCOVERY, NO HARDCODED SAMPLE SONGS)
    if (activeTab === 'listen-now') {
      const hasLiked = likedTracks.length > 0;
      const hasHistory = recentlyPlayed.length > 0;

      return (
        <div className="space-y-7">
          {!forDesktop && (
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                  {todayDateString}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Listen Now
                </h1>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2 rounded-xl bg-white/10 text-neutral-300 hover:text-white"
                  title="Settings"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FA2D48] to-purple-600 flex items-center justify-center font-bold text-xs text-white shadow-md">
                  AM
                </div>
              </div>
            </div>
          )}

          {/* Quick Search on Home */}
          <div className="relative rounded-2xl bg-white/5 border border-white/10 p-3 sm:p-4 backdrop-blur-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setActiveTab('search');
                executeSearch(searchQuery);
              }}
              className="flex items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Find your favorite songs, artists, or genres..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FA2D48] transition-colors"
                />
              </div>
              <button
                type="submit"
                className="px-4 h-10 rounded-xl bg-[#FA2D48] hover:bg-rose-600 text-xs sm:text-sm font-bold text-white transition-all active:scale-95 cursor-pointer shrink-0"
              >
                Search
              </button>
            </form>

            {/* Quick Explore Genre Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 text-[11px] font-semibold text-white/80">
              <span className="text-neutral-500 text-[10px] uppercase font-bold shrink-0 mr-1">Vibes:</span>
              {['Pop', 'Hip-Hop', 'Lo-Fi Chill', 'R&B', 'Rock', 'Bollywood', 'Electronic', 'Acoustic'].map((genre) => (
                <button
                  key={genre}
                  onClick={() => {
                    setSearchQuery(genre);
                    setActiveTab('search');
                    executeSearch(genre);
                  }}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 hover:text-white transition-all shrink-0 cursor-pointer active:scale-95"
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* 1. USER'S LIKED SONGS & FAVORITES (CENTER STAGE) */}
          {hasLiked ? (
            <div className="space-y-4">
              <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FA2D48]/85 via-purple-900 to-black p-6 sm:p-8 shadow-2xl border border-white/15">
                <div className="max-w-xl space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-black/50 text-white backdrop-blur-md">
                    <Heart className="w-3.5 h-3.5 fill-[#FA2D48] text-[#FA2D48]" />
                    <span>Your Favorites &amp; Liked Tracks</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                    Songs You Love ({likedTracks.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-white/80">
                    Your personal soundtrack. Stored securely and always ready to play with liquid ambient lighting.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handlePlayLiked}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm shadow-lg hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-black" />
                    <span>Play All</span>
                  </button>

                  <button
                    onClick={handleShuffleLiked}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-sm backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                  >
                    <Shuffle className="w-4 h-4 text-white" />
                    <span>Shuffle</span>
                  </button>
                </div>
              </div>

              {/* Liked Songs List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Heart className="w-4 h-4 fill-[#FA2D48] text-[#FA2D48]" />
                    <span>Liked Songs</span>
                  </h3>
                  <span className="text-xs text-neutral-400 font-mono">
                    {likedTracks.length} tracks
                  </span>
                </div>

                <div className={`grid gap-2 ${forDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  {likedTracks.map((track, idx) => {
                    const isItemActive = currentTrack.id === track.id;
                    return (
                      <div
                        key={track.id}
                        onClick={() => handleSelectTrack(track)}
                        className={`group flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer transition-all border ${
                          isItemActive
                            ? 'bg-white/10 border-white/20 shadow-md'
                            : 'hover:bg-white/5 border-transparent'
                        }`}
                      >
                        <span className="w-5 text-center text-xs font-mono font-semibold text-neutral-400">
                          {idx + 1}
                        </span>

                        <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/10">
                          <TrackArtwork
                            src={track.artwork}
                            alt={track.title}
                            fallbackColor={track.artworkBgColor}
                            title={track.title}
                            className="w-full h-full object-cover"
                          />
                          {isItemActive && (
                            <MusicVisualizer isPlaying={isPlaying} barColor="#FA2D48" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0 pr-2">
                          <div className={`text-sm font-semibold truncate ${
                            isItemActive ? 'text-[#FA2D48]' : 'text-white'
                          }`}>
                            {track.title}
                          </div>
                          <div className="text-xs text-neutral-400 truncate mt-0.5">
                            {track.artist}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(track);
                            }}
                            className="p-2 rounded-full hover:bg-white/10 text-[#FA2D48] transition-colors"
                            title="Unlike"
                          >
                            <Star className="w-4 h-4 fill-[#FA2D48]" />
                          </button>
                          <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
                            {track.durationFormatted}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Welcome Onboarding Card when user hasn't liked any songs yet */
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#FA2D48]/70 via-neutral-900 to-black p-6 sm:p-8 border border-white/10 space-y-4">
              <div className="max-w-xl space-y-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/40 text-white backdrop-blur-md">
                  Welcome to Your Music Space
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Discover &amp; Like What You Love
                </h2>
                <p className="text-xs sm:text-sm text-white/80">
                  Search any song, artist, or album above. Tap the star icon on any track to build your personalized Home!
                </p>
              </div>

              <div className="pt-2">
                <button
                  onClick={() => setActiveTab('search')}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm shadow-lg hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>Start Searching Songs</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. RECENTLY PLAYED / JUMP BACK IN */}
          {hasHistory && (
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-neutral-400" />
                  <span>Recently Played</span>
                </h3>
                <button
                  onClick={handleClearHistory}
                  className="text-xs text-neutral-400 hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear History</span>
                </button>
              </div>

              <div className={`grid gap-2 ${forDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {recentlyPlayed.slice(0, 8).map((track) => {
                  const isItemActive = currentTrack.id === track.id;
                  const isFav = favorites.includes(track.id);

                  return (
                    <div
                      key={`recent-${track.id}`}
                      onClick={() => handleSelectTrack(track)}
                      className={`group flex items-center gap-3.5 p-2 rounded-2xl cursor-pointer transition-all border ${
                        isItemActive
                          ? 'bg-white/10 border-white/20 shadow-md'
                          : 'hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <div className="relative w-11 h-11 rounded-xl overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/10">
                        <TrackArtwork
                          src={track.artwork}
                          alt={track.title}
                          fallbackColor={track.artworkBgColor}
                          title={track.title}
                          className="w-full h-full object-cover"
                        />
                        {isItemActive && (
                          <MusicVisualizer isPlaying={isPlaying} barColor="#FA2D48" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <div className={`text-sm font-semibold truncate ${
                          isItemActive ? 'text-[#FA2D48]' : 'text-white'
                        }`}>
                          {track.title}
                        </div>
                        <div className="text-xs text-neutral-400 truncate mt-0.5">
                          {track.artist}
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(track);
                        }}
                        className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-[#FA2D48] transition-colors"
                        title={isFav ? 'Liked' : 'Like'}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-[#FA2D48] text-[#FA2D48]' : ''}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      );
    }

    // 2. BROWSE TAB
    if (activeTab === 'browse') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Browse Categories
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Explore genres, moods, and curated global sounds.
            </p>
          </div>

          <div className={`grid gap-4 ${forDesktop ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {CATEGORY_CARDS.map((cat) => (
              <div
                key={cat.id}
                onClick={() => {
                  setSearchQuery(cat.title);
                  setActiveTab('search');
                  executeSearch(cat.query);
                }}
                className="aspect-[1.4] rounded-2xl p-4 flex flex-col justify-end font-bold text-white shadow-xl cursor-pointer hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden group"
                style={{ backgroundColor: cat.bg }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                <span className="text-lg relative z-10">{cat.title}</span>
                <span className="text-xs text-white/70 relative z-10 flex items-center gap-1 mt-0.5">
                  Explore <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 3. RADIO TAB
    if (activeTab === 'radio') {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Live Radio Stations
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 mt-1">
              Non-stop global broadcasts, artist interviews, and chart-topping streams.
            </p>
          </div>

          <div className={`grid gap-4 ${forDesktop ? 'grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {RADIO_STATIONS.map((station) => (
              <div
                key={station.id}
                onClick={() => {
                  const stationTrack: SongTrack = {
                    id: `radio-${station.id}`,
                    youtubeId: station.youtubeId,
                    audioUrl: station.audioUrl,
                    title: station.title,
                    artist: 'Apple Music Radio',
                    album: station.subtitle,
                    duration: 3600,
                    durationFormatted: 'LIVE',
                    artwork: station.artwork,
                    artworkBgColor: station.color,
                    genre: 'Radio Live Stream',
                  };
                  handleSelectTrack(stationTrack);
                }}
                className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-4 cursor-pointer transition-all hover:scale-[1.01] active:scale-98"
              >
                <div className="relative w-16 h-16 rounded-xl overflow-hidden shadow-lg shrink-0 bg-neutral-900 border border-white/10">
                  <TrackArtwork
                    src={station.artwork}
                    alt={station.title}
                    fallbackColor={station.color}
                    title={station.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-red-600 text-[9px] font-black uppercase text-white shadow">
                    Live
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase text-[#FA2D48] tracking-wider">
                    Apple Music Radio
                  </span>
                  <div className="text-sm font-bold text-white truncate mt-0.5">
                    {station.title}
                  </div>
                  <div className="text-xs text-neutral-400 truncate mt-0.5">
                    {station.subtitle}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    }

    // 4. LIBRARY TAB
    if (activeTab === 'library') {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Your Library
              </h1>
              <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                Your personalized collection of liked songs and listening history.
              </p>
            </div>

            {libraryFilter === 'liked' && likedTracks.length > 0 && (
              <button
                onClick={handlePlayLiked}
                className="px-4 py-2 rounded-xl bg-[#FA2D48] hover:bg-rose-600 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play All</span>
              </button>
            )}
          </div>

          {/* Sub-tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-white/10">
            <button
              onClick={() => setLibraryFilter('liked')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                libraryFilter === 'liked'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
              <span>Liked Songs ({likedTracks.length})</span>
            </button>

            <button
              onClick={() => setLibraryFilter('history')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                libraryFilter === 'history'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History ({recentlyPlayed.length})</span>
            </button>

            <button
              onClick={() => setLibraryFilter('downloaded')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                libraryFilter === 'downloaded'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>High-Def Audio</span>
            </button>

            <button
              onClick={() => setLibraryFilter('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                libraryFilter === 'all'
                  ? 'bg-white text-black shadow'
                  : 'text-neutral-400 hover:text-white hover:bg-white/10'
              }`}
            >
              <ListMusic className="w-3.5 h-3.5" />
              <span>All Tracks</span>
            </button>
          </div>

          {/* Library Songs List */}
          {filteredLibraryTracks.length > 0 ? (
            <div className={`grid gap-2 ${forDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
              {filteredLibraryTracks.map((track, idx) => {
                const isItemActive = currentTrack.id === track.id;
                const isFav = favorites.includes(track.id);

                return (
                  <div
                    key={`${libraryFilter}-${track.id}-${idx}`}
                    onClick={() => handleSelectTrack(track)}
                    className={`group flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer transition-all border ${
                      isItemActive
                        ? 'bg-white/10 border-white/20 shadow-md'
                        : 'hover:bg-white/5 border-transparent'
                    }`}
                  >
                    <span className="w-5 text-center text-xs font-mono font-semibold text-neutral-400">
                      {idx + 1}
                    </span>

                    <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/10">
                      <TrackArtwork
                        src={track.artwork}
                        alt={track.title}
                        fallbackColor={track.artworkBgColor}
                        title={track.title}
                        className="w-full h-full object-cover"
                      />
                      {isItemActive && (
                        <MusicVisualizer isPlaying={isPlaying} barColor="#FA2D48" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 pr-2">
                      <div className={`text-sm font-semibold truncate ${
                        isItemActive ? 'text-[#FA2D48]' : 'text-white'
                      }`}>
                        {track.title}
                      </div>
                      <div className="text-xs text-neutral-400 truncate mt-0.5">
                        {track.artist}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(track);
                        }}
                        className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-[#FA2D48] transition-colors"
                        title="Toggle Favorite"
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'fill-[#FA2D48] text-[#FA2D48]' : ''}`} />
                      </button>
                      <span className="text-xs text-neutral-500 font-mono hidden sm:inline">
                        {track.durationFormatted}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <p className="text-sm text-neutral-400">
                {libraryFilter === 'liked'
                  ? 'No liked songs yet! Click the star icon on any song you love.'
                  : libraryFilter === 'history'
                  ? 'Your recently played history will appear here.'
                  : 'No songs found in this section.'}
              </p>
            </div>
          )}
        </div>
      );
    }

    // 5. SEARCH TAB (NO AUTO-PLAY! USER MUST CLICK TO PLAY & AUTOMATE)
    if (activeTab === 'search') {
      return (
        <div className="space-y-6">
          {!forDesktop && (
            <div className="relative">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  executeSearch(searchQuery);
                }}
                className="relative flex items-center"
              >
                <Search className="w-4 h-4 absolute left-3.5 text-neutral-400" />
                <input
                  type="text"
                  placeholder="Artists, songs, lyrics, or YouTube music..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  className="w-full h-11 pl-10 pr-24 rounded-2xl bg-neutral-900 border border-white/10 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-[#FA2D48] transition-colors"
                />
                {isSearching && (
                  <Loader2 className="w-4 h-4 text-[#FA2D48] animate-spin absolute right-20" />
                )}
                {searchQuery && !isSearching && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSuggestions([]);
                    }}
                    className="p-1 rounded-full text-neutral-400 hover:text-white absolute right-18"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!searchQuery.trim() || isSearching}
                  className="absolute right-2 px-3 py-1.5 rounded-xl bg-[#FA2D48] hover:bg-rose-600 disabled:opacity-40 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer"
                >
                  Search
                </button>
              </form>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-13 left-0 right-0 p-2 rounded-2xl bg-neutral-900 border border-white/15 shadow-2xl z-50 space-y-1">
                  {suggestions.map((s, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        setSearchQuery(s);
                        executeSearch(s);
                      }}
                      className="px-3 py-2 rounded-xl text-xs hover:bg-white/10 cursor-pointer flex items-center justify-between text-white"
                    >
                      <span>{s}</span>
                      <Search className="w-3.5 h-3.5 text-neutral-500" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Currently Playing Status Bar while browsing search */}
          {isPlaying && (
            <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <MusicVisualizer isPlaying={isPlaying} barColor="#FA2D48" />
                <span className="text-neutral-400">Currently playing:</span>
                <span className="font-semibold text-white truncate">{currentTrack.title} - {currentTrack.artist}</span>
              </div>
              <span className="text-[11px] text-[#FA2D48] font-bold shrink-0">Click any song below to switch</span>
            </div>
          )}

          {searchResults.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                  Search Results ({searchResults.length})
                </h3>
                <span className="text-xs text-neutral-500">
                  Tap song to play &amp; queue
                </span>
              </div>

              <div className={`grid gap-2 ${forDesktop ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {searchResults.map((track, idx) => {
                  const isItemActive = currentTrack.id === track.id;
                  const isFav = favorites.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handlePlayFromSearch(track, idx)}
                      className={`flex items-center gap-3.5 p-2.5 rounded-2xl cursor-pointer transition-all border ${
                        isItemActive
                          ? 'bg-white/10 border-white/20 shadow-md'
                          : 'hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <div className="relative w-12 h-12 rounded-xl overflow-hidden shadow-md shrink-0 bg-neutral-900 border border-white/10">
                        <TrackArtwork
                          src={track.artwork}
                          alt={track.title}
                          fallbackColor={track.artworkBgColor}
                          title={track.title}
                          className="w-full h-full object-cover shadow-md shrink-0"
                        />
                        {isItemActive && (
                          <MusicVisualizer isPlaying={isPlaying} barColor="#FA2D48" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 pr-2">
                        <div className={`text-sm font-semibold truncate ${
                          isItemActive ? 'text-[#FA2D48]' : 'text-white'
                        }`}>
                          {track.title}
                        </div>
                        <div className="text-xs text-neutral-400 truncate mt-0.5">
                          {track.artist}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track);
                          }}
                          className="p-2 rounded-full hover:bg-white/10 text-neutral-400 hover:text-[#FA2D48] transition-colors"
                          title="Like Song"
                        >
                          <Star className={`w-4 h-4 ${isFav ? 'fill-[#FA2D48] text-[#FA2D48]' : ''}`} />
                        </button>
                        <span className="text-xs text-neutral-500 font-mono">
                          {track.durationFormatted}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">
                Explore Genres &amp; Moods
              </h3>
              <div className={`grid gap-3 ${forDesktop ? 'grid-cols-4' : 'grid-cols-2 sm:grid-cols-3'}`}>
                {CATEGORY_CARDS.map((cat) => (
                  <div
                    key={cat.id}
                    onClick={() => {
                      setSearchQuery(cat.title);
                      executeSearch(cat.query);
                    }}
                    className="aspect-[1.5] rounded-2xl p-4 flex flex-col justify-end font-bold text-white shadow-lg cursor-pointer hover:scale-[1.02] active:scale-95 transition-transform"
                    style={{ backgroundColor: cat.bg }}
                  >
                    <span className="text-base">{cat.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return null;
  }
}
