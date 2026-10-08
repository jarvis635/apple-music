import { Request, Response, NextFunction } from 'express';

// Check if a URL is safe to fetch or redirect to (SSRF protection)
export function isSafeUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;

  const trimmed = rawUrl.trim();
  // Reject protocol-relative or obvious dangerous schemes
  if (trimmed.startsWith('//') || trimmed.toLowerCase().startsWith('javascript:') || trimmed.toLowerCase().startsWith('data:')) {
    return false;
  }

  try {
    const parsed = new URL(trimmed);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase();

    // Check banned exact hosts
    const blockedHosts = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '[::1]',
      '169.254.169.254', // AWS/GCP/Azure instance metadata
      'metadata.google.internal',
      'metadata.internal',
      'instance-data',
    ];
    if (blockedHosts.includes(hostname)) {
      return false;
    }

    // Check banned suffixes
    if (hostname.endsWith('.localhost') || hostname.endsWith('.local') || hostname.endsWith('.internal')) {
      return false;
    }

    // Check IPv4 private and link-local ranges
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const octet1 = parseInt(ipMatch[1], 10);
      const octet2 = parseInt(ipMatch[2], 10);

      // 0.0.0.0/8
      if (octet1 === 0) return false;
      // 10.0.0.0/8 (Private network)
      if (octet1 === 10) return false;
      // 127.0.0.0/8 (Loopback)
      if (octet1 === 127) return false;
      // 169.254.0.0/16 (Link-local / Cloud metadata)
      if (octet1 === 169 && octet2 === 254) return false;
      // 172.16.0.0/12 (Private network 172.16 - 172.31)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      // 192.168.0.0/16 (Private network)
      if (octet1 === 192 && octet2 === 168) return false;
      // 100.64.0.0/10 (Carrier-grade NAT)
      if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return false;
      // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
      if (octet1 >= 224) return false;
    }

    // Check IPv6 private / link-local / loopback
    if (hostname.startsWith('[') && hostname.endsWith(']')) {
      const v6 = hostname.slice(1, -1).toLowerCase();
      if (v6 === '::1' || v6 === '::' || v6.startsWith('fe80:') || v6.startsWith('fc00:') || v6.startsWith('fd00:')) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Sanitize string to remove any HTML tags or script injection
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Sliding window in-memory rate limiter
interface RateLimitRecord {
  timestamps: number[];
}

export class RateLimiter {
  private records = new Map<string, RateLimitRecord>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs = 60000, maxRequests = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;

    // Periodic cleanup of stale records every 2 minutes
    setInterval(() => this.cleanup(), 120000).unref?.();
  }

  public isAllowed(key: string): { allowed: boolean; remaining: number; resetMs: number } {
    const now = Date.now();
    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [] };
      this.records.set(key, record);
    }

    // Filter out timestamps outside the current sliding window
    record.timestamps = record.timestamps.filter((ts) => now - ts < this.windowMs);

    if (record.timestamps.length >= this.maxRequests) {
      const oldest = record.timestamps[0];
      const resetMs = Math.max(0, this.windowMs - (now - oldest));
      return { allowed: false, remaining: 0, resetMs };
    }

    record.timestamps.push(now);
    const remaining = this.maxRequests - record.timestamps.length;
    return { allowed: true, remaining, resetMs: this.windowMs };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, record] of this.records.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < this.windowMs);
      if (record.timestamps.length === 0) {
        this.records.delete(key);
      }
    }
  }

  public middleware(maxReq?: number) {
    return (req: Request, res: Response, next: NextFunction) => {
      const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '127.0.0.1';
      const check = this.isAllowed(clientIp);

      res.setHeader('X-RateLimit-Limit', maxReq || this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', check.remaining);

      if (!check.allowed) {
        res.setHeader('Retry-After', Math.ceil(check.resetMs / 1000));
        res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded. Please wait before issuing another search query.',
          retryAfterSeconds: Math.ceil(check.resetMs / 1000),
        });
        return;
      }
      next();
    };
  }
}
