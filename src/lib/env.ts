/**
 * OSDAI — Environment Validation
 * Runs at startup. Fails fast with a clear message if config is missing.
 */

export interface AppEnv {
  APP_NAME: string;
  APP_ENV: 'development' | 'production' | 'test';
  APP_URL: string;
  APP_PORT: number;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  EMAIL_PROVIDER: 'smtp' | 'resend';
  SMTP_HOST?: string;
  SMTP_PORT: number;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  RESEND_API_KEY?: string;
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_IS_PRODUCTION: boolean;
  STORAGE_PROVIDER: 'local' | 'cloudinary';
  UPLOAD_DIR: string;
  QR_SECRET: string;
  LOG_LEVEL: string;
  LOG_DIR: string;
  CORS_ORIGINS: string[];
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
}

// Accepts JWT_REFRESH_SECRET or the legacy REFRESH_SECRET name
const REQUIRED_VARS = ['DATABASE_URL', 'JWT_SECRET'];
const REQUIRED_WITH_FALLBACKS: Array<{ keys: string[]; label: string }> = [
  { keys: ['JWT_REFRESH_SECRET', 'REFRESH_SECRET'], label: 'JWT_REFRESH_SECRET (or REFRESH_SECRET)' },
];

/**
 * Detect the base URL automatically from environment or Replit domain.
 */
export function detectAppUrl(): string {
  if (process.env.APP_URL) return process.env.APP_URL;

  // Replit environment
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  if (process.env.REPLIT_DOMAINS) {
    const first = process.env.REPLIT_DOMAINS.split(',')[0].trim();
    return `https://${first}`;
  }

  const port = process.env.APP_PORT || process.env.PORT || '5000';
  return `http://localhost:${port}`;
}

/**
 * Validate and parse environment variables.
 * Call once at server startup. Throws with a clear message on failure.
 */
export function validateEnv(): AppEnv {
  const missing: string[] = [];

  for (const key of REQUIRED_VARS) {
    if (!process.env[key]) missing.push(key);
  }

  for (const { keys, label } of REQUIRED_WITH_FALLBACKS) {
    if (!keys.some(k => process.env[k])) missing.push(label);
  }

  if (missing.length > 0) {
    const sep = '═'.repeat(60);
    console.error(`\n${sep}`);
    console.error('  OSDAI — STARTUP FAILED: Missing environment variables');
    console.error(sep);
    missing.forEach(k => console.error(`  ✗  ${k}`));
    console.error(`\n  Copy .env.example → .env and fill in the values.`);
    console.error(`${sep}\n`);
    process.exit(1);
  }

  const appEnv = (process.env.APP_ENV || 'development') as AppEnv['APP_ENV'];
  const corsRaw = process.env.CORS_ORIGINS || '';
  const corsOrigins = corsRaw
    ? corsRaw.split(',').map(s => s.trim()).filter(Boolean)
    : [];

  return {
    APP_NAME: process.env.APP_NAME || 'OSDAI',
    APP_ENV: appEnv,
    APP_URL: detectAppUrl(),
    APP_PORT: parseInt(process.env.APP_PORT || process.env.PORT || '5000'),
    DATABASE_URL: process.env.DATABASE_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || process.env.REFRESH_SECRET!,
    EMAIL_PROVIDER: (process.env.EMAIL_PROVIDER || 'smtp') as 'smtp' | 'resend',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MIDTRANS_SERVER_KEY: process.env.MIDTRANS_SERVER_KEY,
    MIDTRANS_CLIENT_KEY: process.env.MIDTRANS_CLIENT_KEY,
    MIDTRANS_IS_PRODUCTION: process.env.MIDTRANS_IS_PRODUCTION === 'true',
    STORAGE_PROVIDER: (process.env.STORAGE_PROVIDER || 'local') as 'local' | 'cloudinary',
    UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
    QR_SECRET: process.env.QR_SECRET || 'osdai-qr-default',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_DIR: process.env.LOG_DIR || 'logs',
    CORS_ORIGINS: corsOrigins,
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  };
}

export let env: AppEnv;

export function initEnv(): AppEnv {
  env = validateEnv();
  return env;
}
