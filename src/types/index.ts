export interface SongTrack {
  id: string;
  youtubeId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  durationFormatted: string;
  artwork: string;
  artworkBgColor: string;
  genre: string;
  lyrics?: string[];
  isExplicit?: boolean;
  audioUrl?: string;
  isDownloaded?: boolean;
}

export type AppleMusicTab = 'listen-now' | 'browse' | 'radio' | 'library' | 'search' | 'settings';

export interface AmbientSettings {
  enabled: boolean;
  blurLevel: number; // in px: 25, 45, 65, 85
  saturation: number; // in %: 120, 180, 240
  brightness: number; // in %: 40, 60, 80
  liveVideoBg: boolean;
}

export type DeviceMode = 'phone' | 'tablet' | 'desktop';

export interface CommentItem {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
}
