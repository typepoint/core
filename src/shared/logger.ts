export interface Logger {
  log(...args: any[]): void;
  debug(...args: any[]): void;
  info(...args: any[]): void;
  warn(...args: any[]): void;
  error(...args: any[]): void;
}

// tslint:disable-next-line:no-empty
const noop = () => { };

export class NoopLogger {
  log = noop;
  debug = noop;
  info = noop;
  warn = noop;
  error = noop;
}
