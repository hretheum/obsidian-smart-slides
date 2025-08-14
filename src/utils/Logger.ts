export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  constructor(private readonly scope: string) {}

  private format(level: LogLevel, message: string) {
    return `[${new Date().toISOString()}] [${this.scope}] [${level.toUpperCase()}] ${message}`;
  }

  debug(message: string) {
    console.debug(this.format('debug', message));
  }
  info(message: string) {
    console.info(this.format('info', message));
  }
  warn(message: string) {
    console.warn(this.format('warn', message));
  }
  error(message: string) {
    console.error(this.format('error', message));
  }
}
