export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogRecord {
  timestamp: string;
  scope: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  durationMs?: number;
}

export interface LoggerConfig {
  level: LogLevel;
  pretty?: boolean;
}

export interface ILogger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  time<T>(label: string, fn: () => Promise<T>): Promise<T>;
}

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export class Logger implements ILogger {
  private readonly minLevel: LogLevel;
  private readonly pretty: boolean;

  constructor(private readonly scope: string, config?: Partial<LoggerConfig>) {
    this.minLevel = config?.level ?? (process.env.NODE_ENV === 'production' ? 'info' : 'debug');
    this.pretty = config?.pretty ?? process.env.NODE_ENV !== 'production';
  }

  private shouldLog(level: LogLevel): boolean {
    return levelPriority[level] >= levelPriority[this.minLevel];
  }

  private formatRecord(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
    durationMs?: number,
  ): LogRecord {
    return {
      timestamp: new Date().toISOString(),
      scope: this.scope,
      level,
      message,
      context,
      durationMs,
    };
  }

  private emit(record: LogRecord): void {
    if (this.pretty) {
      const base = `[${record.timestamp}] [${record.scope}] [${record.level.toUpperCase()}] ${
        record.message
      }`;
      const suffix = record.durationMs !== undefined ? ` (${record.durationMs}ms)` : '';
      const ctx = record.context ? ` ${JSON.stringify(record.context)}` : '';
      switch (record.level) {
        case 'debug':
          // eslint-disable-next-line no-console
          console.debug(base + suffix + ctx);
          break;
        case 'info':
          // eslint-disable-next-line no-console
          console.info(base + suffix + ctx);
          break;
        case 'warn':
          // eslint-disable-next-line no-console
          console.warn(base + suffix + ctx);
          break;
        case 'error':
          // eslint-disable-next-line no-console
          console.error(base + suffix + ctx);
          break;
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(record));
    }
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('debug')) return;
    this.emit(this.formatRecord('debug', message, context));
  }
  info(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('info')) return;
    this.emit(this.formatRecord('info', message, context));
  }
  warn(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('warn')) return;
    this.emit(this.formatRecord('warn', message, context));
  }
  error(message: string, context?: Record<string, unknown>) {
    if (!this.shouldLog('error')) return;
    this.emit(this.formatRecord('error', message, context));
  }

  async time<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      this.info(`${label} completed`, { label, success: true, durationMs: duration });
      return result;
    } catch (error) {
      const duration = Math.round(performance.now() - start);
      this.error(`${label} failed`, {
        label,
        success: false,
        durationMs: duration,
        error: String(error),
      });
      throw error;
    }
  }
}
