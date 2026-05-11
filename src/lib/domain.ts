/**
 * OSDAI — Auto Domain Detection
 *
 * Detects the current domain, protocol, and port at runtime.
 * Zero hardcoded URLs. Works on localhost, Replit, cPanel, VPS, and cloud.
 */

import { Request } from 'express';

/**
 * Get the base URL from an incoming request.
 * Respects X-Forwarded-Proto and X-Forwarded-Host for reverse proxies.
 */
export function getBaseUrlFromRequest(req: Request): string {
  const proto =
    req.headers['x-forwarded-proto']?.toString().split(',')[0] ||
    (req.secure ? 'https' : 'http');

  const host =
    req.headers['x-forwarded-host']?.toString().split(',')[0] ||
    req.headers.host ||
    'localhost';

  return `${proto}://${host}`;
}

/**
 * Get the WebSocket URL for a given request.
 * Automatically switches between ws:// and wss://.
 */
export function getWsUrlFromRequest(req: Request): string {
  const base = getBaseUrlFromRequest(req);
  return base.replace(/^http/, 'ws');
}

/**
 * Build a fully qualified URL using the server-side detected base URL.
 * Falls back to APP_URL env var, then Replit domain, then localhost.
 */
export function buildUrl(path: string = ''): string {
  let base = process.env.APP_URL || '';

  if (!base) {
    if (process.env.REPLIT_DEV_DOMAIN) {
      base = `https://${process.env.REPLIT_DEV_DOMAIN}`;
    } else if (process.env.REPLIT_DOMAINS) {
      const first = process.env.REPLIT_DOMAINS.split(',')[0].trim();
      base = `https://${first}`;
    } else {
      const port = process.env.APP_PORT || process.env.PORT || '5000';
      base = `http://localhost:${port}`;
    }
  }

  const normalizedBase = base.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}

/**
 * Build a dynamic QR verification URL.
 * Never hardcoded — always uses the current active domain.
 */
export function buildQrUrl(referenceNo: string): string {
  return buildUrl(`/verify/${referenceNo}`);
}

/**
 * Build a dynamic WebSocket URL from the server's APP_URL.
 */
export function buildWsUrl(): string {
  return buildUrl('').replace(/^http/, 'ws');
}

/**
 * Determine if the current environment is production.
 */
export function isProduction(): boolean {
  return (process.env.APP_ENV || process.env.NODE_ENV) === 'production';
}

/**
 * Build dynamic CORS origin list from env and Replit domains.
 * Never returns a hardcoded list — always reads from environment.
 */
export function buildCorsOrigins(): (string | RegExp)[] {
  const origins: (string | RegExp)[] = [];

  // From CORS_ORIGINS env var (comma-separated)
  const envOrigins = process.env.CORS_ORIGINS;
  if (envOrigins) {
    envOrigins.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.push(o));
  }

  // From APP_URL
  if (process.env.APP_URL) origins.push(process.env.APP_URL);

  // From Replit domains
  if (process.env.REPLIT_DEV_DOMAIN) {
    origins.push(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    origins.push(`http://${process.env.REPLIT_DEV_DOMAIN}`);
  }
  if (process.env.REPLIT_DOMAINS) {
    process.env.REPLIT_DOMAINS.split(',').forEach(d => {
      origins.push(`https://${d.trim()}`);
    });
  }

  // Always allow localhost in development
  if (!isProduction()) {
    origins.push('http://localhost:5000');
    origins.push('http://localhost:5173');
    origins.push('http://localhost:3000');
    origins.push(/^http:\/\/localhost:\d+$/);
  }

  return origins.length > 0 ? origins : ['*'];
}
