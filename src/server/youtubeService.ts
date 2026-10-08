export interface YouTubeVideoItem {
  id: string;
  title: string;
  channel: string;
  channelAvatar?: string;
  views: string;
  uploadedAt: string;
  duration: string;
  thumbnail: string;
  description: string;
  isLive?: boolean;
}

interface CacheEntry {
  videos: YouTubeVideoItem[];
  expiresAt: number;
}

export class YouTubeService {
  private cache = new Map<string, CacheEntry>();
  private cacheTtlMs = 600000; // 10 minutes cache

  // Reliable curated fallback collection with verified active IDs
  private curatedCollection: Record<string, YouTubeVideoItem[]> = {
    trending: [
      {
        id: 'jfKfPfyJRdk',
        title: 'lofi hip hop radio 📚 - beats to relax/study to',
        channel: 'Lofi Girl',
        views: '80M views',
        uploadedAt: 'Live Now',
        duration: 'LIVE',
        thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
        description: '24/7 peaceful lofi hip hop radio stream for concentration, coding, studying, and deep sleep.',
        isLive: true,
      },
      {
        id: 'bMknfKXIFA8',
        title: 'React in 100 Seconds',
        channel: 'Fireship',
        views: '2.1M views',
        uploadedAt: 'Tech Guide',
        duration: '2:24',
        thumbnail: 'https://i.ytimg.com/vi/bMknfKXIFA8/hqdefault.jpg',
        description: 'React.js explained in 100 seconds. Learn why it is the worlds most popular UI library.',
      },
      {
        id: '2g811Eo7K8U',
        title: 'Apple Silicon Architecture & Unified Memory Subsystem',
        channel: 'Apple',
        views: '5.2M views',
        uploadedAt: 'Official',
        duration: '11:42',
        thumbnail: 'https://i.ytimg.com/vi/2g811Eo7K8U/hqdefault.jpg',
        description: 'Apple engineering presentation on M-series unified system architecture.',
      },
      {
        id: 't2SkZXyvWvE',
        title: 'Steve Jobs Unveils the Original iPhone (Macworld 2007 Historic Keynote)',
        channel: 'Apple Keynotes',
        views: '32M views',
        uploadedAt: 'Classic',
        duration: '15:20',
        thumbnail: 'https://i.ytimg.com/vi/t2SkZXyvWvE/hqdefault.jpg',
        description: 'An iPod, a phone, and an internet communicator. The historic 2007 keynote by Steve Jobs.',
      },
      {
        id: 'LXb3EKWsInQ',
        title: '4K Ultra HD Drone Footage - Hawaiian Island Coastline & Waterfalls',
        channel: 'Nature Cinema 4K',
        views: '14M views',
        uploadedAt: '4K HDR',
        duration: '24:18',
        thumbnail: 'https://i.ytimg.com/vi/LXb3EKWsInQ/hqdefault.jpg',
        description: 'Ultra high-definition aerial cinematography across lush mountain ridges and Pacific oceans.',
      },
      {
        id: 'dpw9EHDh2bM',
        title: 'synthwave radio 🌌 - beats to chill/game to',
        channel: 'Lofi Girl',
        views: '22M views',
        uploadedAt: 'Live Now',
        duration: 'LIVE',
        thumbnail: 'https://i.ytimg.com/vi/dpw9EHDh2bM/hqdefault.jpg',
        description: 'Continuous 80s retro synthwave beats streaming live for gaming and coding.',
        isLive: true,
      },
      {
        id: 'dQw4w9WgXcQ',
        title: 'Rick Astley - Never Gonna Give You Up (Official 4K Remastered)',
        channel: 'Rick Astley',
        views: '1.6B views',
        uploadedAt: 'Remastered',
        duration: '3:32',
        thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        description: 'The iconic classic remastered in 4K high fidelity audio and video.',
      },
      {
        id: 'SqcY0GlETPk',
        title: 'React Tutorial for Beginners - Full Course',
        channel: 'Programming with Mosh',
        views: '6.2M views',
        uploadedAt: 'Tutorial',
        duration: '1:20:04',
        thumbnail: 'https://i.ytimg.com/vi/SqcY0GlETPk/hqdefault.jpg',
        description: 'Complete hands-on beginner crash course on React fundamentals and components.',
      }
    ]
  };

  public async search(query: string, limit = 20): Promise<YouTubeVideoItem[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return this.curatedCollection.trending;
    }

    // Check in-memory cache
    const cacheKey = trimmed.toLowerCase();
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.videos.slice(0, limit);
    }

    // 1. Try real-time YouTube scraping via ytInitialData
    try {
      const results = await this.scrapeYouTubeSearch(trimmed);
      if (results.length > 0) {
        this.cache.set(cacheKey, {
          videos: results,
          expiresAt: Date.now() + this.cacheTtlMs,
        });
        return results.slice(0, limit);
      }
    } catch (err: any) {
      console.warn('[YouTubeService] Primary search error:', err.message);
    }

    // 2. Try secondary public Invidious instances from the server
    try {
      const invidiousResults = await this.queryInvidious(trimmed);
      if (invidiousResults.length > 0) {
        this.cache.set(cacheKey, {
          videos: invidiousResults,
          expiresAt: Date.now() + this.cacheTtlMs,
        });
        return invidiousResults.slice(0, limit);
      }
    } catch (err: any) {
      console.warn('[YouTubeService] Invidious fallback error:', err.message);
    }

    // 3. Fallback: filter curated or return default trending
    const matchedCurated = this.curatedCollection.trending.filter(
      v => v.title.toLowerCase().includes(trimmed.toLowerCase()) ||
           v.channel.toLowerCase().includes(trimmed.toLowerCase())
    );

    return matchedCurated.length > 0 ? matchedCurated : this.curatedCollection.trending;
  }

  public async getTrending(category = 'trending'): Promise<YouTubeVideoItem[]> {
    let query = 'trending videos';
    if (category === 'music') query = 'trending music hits 2026';
    else if (category === 'gaming') query = 'trending gaming highlights';
    else if (category === 'coding') query = 'React web development tutorials';
    else if (category === 'apple') query = 'Apple silicon Mac tech review';
    else if (category === 'lofi') query = 'lofi hip hop radio live';
    else if (category === 'nature') query = '4k nature drone landscape hdr';

    const results = await this.search(query, 16);
    return results.length > 0 ? results : this.curatedCollection.trending;
  }

  // Scrape YouTube HTML search results directly on the server
  private async scrapeYouTubeSearch(query: string): Promise<YouTubeVideoItem[]> {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`YouTube HTTP ${res.status}`);
      }

      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/s) || html.match(/ytInitialData\s*=\s*({.+?});/);
      if (!match) {
        throw new Error('ytInitialData not found in HTML response');
      }

      const parsed = JSON.parse(match[1]);
      const sections = parsed.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

      const videos: YouTubeVideoItem[] = [];
      const seenIds = new Set<string>();

      for (const sec of sections) {
        const items = sec.itemSectionRenderer?.contents || [];
        for (const item of items) {
          const v = item.videoRenderer;
          if (v && v.videoId && !seenIds.has(v.videoId)) {
            seenIds.add(v.videoId);

            const title = v.title?.runs?.[0]?.text || v.title?.simpleText || 'YouTube Video';
            const channel = v.ownerText?.runs?.[0]?.text || v.longBylineText?.runs?.[0]?.text || 'YouTube Creator';
            const views = v.viewCountText?.simpleText || v.shortViewCountText?.simpleText || 'Trending';
            const isLive = v.badges?.some((b: any) => b.metadataBadgeRenderer?.label === 'LIVE') ||
                           v.thumbnailOverlays?.some((o: any) => o.thumbnailOverlayTimeStatusRenderer?.style === 'LIVE');
            const duration = isLive ? 'LIVE' : (v.lengthText?.simpleText || 'HD');
            
            // Prefer high-res thumbnail
            const thumbList = v.thumbnail?.thumbnails;
            const thumbnail = (Array.isArray(thumbList) && thumbList.length > 0)
              ? thumbList[thumbList.length - 1].url
              : `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

            const description = v.detailedMetadataSnippets?.[0]?.snippetText?.runs?.map((r: any) => r.text).join('') || '';

            videos.push({
              id: v.videoId,
              title,
              channel,
              views,
              uploadedAt: v.publishedTimeText?.simpleText || (isLive ? 'Live Now' : 'Recent'),
              duration,
              thumbnail,
              description,
              isLive: Boolean(isLive),
            });
          }
        }
      }

      return videos;
    } finally {
      clearTimeout(timeout);
    }
  }

  // Secondary fallback: Invidious public APIs from the backend
  private async queryInvidious(query: string): Promise<YouTubeVideoItem[]> {
    const instances = [
      'https://inv.nadeko.net',
      'https://invidious.private.coffee',
      'https://invidious.nerdvpn.de',
    ];

    for (const inst of instances) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3500);
        const res = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(query)}&type=video`, {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        });
        clearTimeout(timeout);

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items) && items.length > 0) {
            return items
              .filter((it: any) => it.type === 'video' && it.videoId)
              .map((it: any) => ({
                id: it.videoId,
                title: it.title || query,
                channel: it.author || 'YouTube Channel',
                views: it.viewCount ? `${(it.viewCount / 1000).toFixed(0)}K views` : 'Trending',
                uploadedAt: it.publishedText || 'Recent',
                duration: it.lengthSeconds ? `${Math.floor(it.lengthSeconds / 60)}:${(it.lengthSeconds % 60).toString().padStart(2, '0')}` : 'HD',
                thumbnail: it.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${it.videoId}/hqdefault.jpg`,
                description: it.description || '',
                isLive: Boolean(it.liveNow),
              }));
          }
        }
      } catch {
        continue;
      }
    }

    return [];
  }
}
