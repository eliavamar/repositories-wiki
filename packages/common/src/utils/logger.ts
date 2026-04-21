export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const COLORS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";

export class Logger {
  private level: LogLevel = "info";

  setLevel(level: LogLevel): void {
    this.level = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private format(level: LogLevel, message: string, ...args: unknown[]): string {
    const timestamp = new Date().toISOString();
    const color = COLORS[level];
    const prefix = `${color}${BOLD}[${level.toUpperCase()}]${RESET}`;
    const ts = `\x1b[90m${timestamp}${RESET}`;
    const extra = args.length > 0 ? " " + args.map((a) => JSON.stringify(a)).join(" ") : "";
    return `${ts} ${prefix} ${message}${extra}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (this.shouldLog("debug")) {
      process.stderr.write(this.format("debug", message, ...args) + "\n");
    }
  }

  info(message: string, ...args: unknown[]): void {
    if (this.shouldLog("info")) {
      process.stderr.write(this.format("info", message, ...args) + "\n");
    }
  }

  warn(message: string, ...args: unknown[]): void {
    if (this.shouldLog("warn")) {
      process.stderr.write(this.format("warn", message, ...args) + "\n");
    }
  }

  error(message: string, ...args: unknown[]): void {
    if (this.shouldLog("error")) {
      process.stderr.write(this.format("error", message, ...args) + "\n");
    }
  }
}

export const logger = new Logger();
