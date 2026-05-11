/**
 * OSDAI — Centralized Logger
 * Logs to console and (optionally) to rotating log files.
 * Zero external dependencies for core functionality.
 */

import fs from 'fs';
import path from 'path';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[90m',   // gray
  info:  '\x1b[36m',   // cyan
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
};
const RESET = '\x1b[0m';

function getConfiguredLevel(): LogLevel {
  const raw = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
  return LEVELS[raw] !== undefined ? raw : 'info';
}

function ensureLogDir(logDir: string): void {
  try {
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
  } catch {
    // Can't create log dir — silently continue with console only
  }
}

function formatMessage(level: LogLevel, category: string, message: string): string {
  const ts = new Date().toISOString();
  return `[${ts}] [${level.toUpperCase()}] [${category}] ${message}`;
}

class Logger {
  private minLevel: number;
  private logDir: string;
  private fileHandles: Record<string, fs.WriteStream> = {};

  constructor() {
    this.minLevel = LEVELS[getConfiguredLevel()];
    this.logDir = process.env.LOG_DIR || 'logs';
    ensureLogDir(this.logDir);
  }

  private write(level: LogLevel, category: string, message: string, data?: unknown): void {
    if (LEVELS[level] < this.minLevel) return;

    const line = formatMessage(level, category, message);
    const dataStr = data ? `\n  ${JSON.stringify(data, null, 2)}` : '';
    const color = COLORS[level];

    // Console
    console.log(`${color}${line}${RESET}${dataStr}`);

    // File (only warn/error to keep disk usage low)
    if (LEVELS[level] >= LEVELS.warn) {
      this.writeToFile(level, line + dataStr);
    }
  }

  private writeToFile(level: LogLevel, line: string): void {
    const date = new Date().toISOString().split('T')[0];
    const filename = path.join(this.logDir, `${level}-${date}.log`);
    try {
      fs.appendFileSync(filename, line + '\n');
    } catch {
      // Ignore file write errors
    }
  }

  debug(category: string, message: string, data?: unknown) {
    this.write('debug', category, message, data);
  }
  info(category: string, message: string, data?: unknown) {
    this.write('info', category, message, data);
  }
  warn(category: string, message: string, data?: unknown) {
    this.write('warn', category, message, data);
  }
  error(category: string, message: string, data?: unknown) {
    this.write('error', category, message, data);
  }
}

export const logger = new Logger();
