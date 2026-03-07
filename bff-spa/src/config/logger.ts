type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  requestId?: string;
  message: string;
  [key: string]: unknown;
}

function write(level: LogLevel, message: string, meta: Record<string, unknown>): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'bff-spa',
    message,
    ...meta,
  };

  const line = JSON.stringify(entry);

  // Errores y warnings a stderr; el resto a stdout (Cloud Logging los distingue)
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

/**
 * Logger JSON estructurado compatible con Cloud Logging.
 * API: logger.info({ requestId, ...meta }, 'mensaje')
 */
export const logger = {
  debug: (meta: Record<string, unknown>, message: string) => write('debug', message, meta),
  info:  (meta: Record<string, unknown>, message: string) => write('info',  message, meta),
  warn:  (meta: Record<string, unknown>, message: string) => write('warn',  message, meta),
  error: (meta: Record<string, unknown>, message: string) => write('error', message, meta),
};
