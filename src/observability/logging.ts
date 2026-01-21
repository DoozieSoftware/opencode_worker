export interface LogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  event: string;
  session_id?: string;
  job_id?: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, unknown>;
}

type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let current_log_level: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  current_log_level = level;
}

function formatTimestamp(): string {
  return new Date().toISOString();
}

function formatLogEntry(entry: LogEntry): string {
  const parts = [
    entry.timestamp,
    entry.level.toUpperCase(),
    entry.event,
  ];

  if (entry.session_id) {
    parts.push(`session_id=${entry.session_id}`);
  }
  if (entry.job_id) {
    parts.push(`job_id=${entry.job_id}`);
  }
  if (entry.duration_ms !== undefined) {
    parts.push(`duration_ms=${entry.duration_ms}`);
  }
  if (entry.error) {
    parts.push(`error=${entry.error}`);
  }
  if (entry.metadata) {
    parts.push(JSON.stringify(entry.metadata));
  }

  return parts.join(" ");
}

function writeLog(level: LogLevel, entry: Omit<LogEntry, "timestamp" | "level">): void {
  if (LOG_LEVELS[level] < LOG_LEVELS[current_log_level]) {
    return;
  }

  const full_entry: LogEntry = {
    ...entry,
    timestamp: formatTimestamp(),
    level,
  };

  const formatted = formatLogEntry(full_entry);

  if (level === "error") {
    console.error(formatted);
  } else if (level === "warn") {
    console.warn(formatted);
  } else {
    console.log(formatted);
  }
}

export const logger = {
  debug: (
    event: string,
    metadata?: Record<string, unknown> & { session_id?: string; job_id?: string }
  ): void => {
    writeLog("debug", { event, ...metadata });
  },

  info: (
    event: string,
    metadata?: Record<string, unknown> & { session_id?: string; job_id?: string; duration_ms?: number }
  ): void => {
    writeLog("info", { event, ...metadata });
  },

  warn: (
    event: string,
    metadata?: Record<string, unknown> & { session_id?: string; job_id?: string }
  ): void => {
    writeLog("warn", { event, ...metadata });
  },

  error: (
    event: string,
    metadata?: Record<string, unknown> & { session_id?: string; job_id?: string; error?: string }
  ): void => {
    writeLog("error", { event, ...metadata });
  },
};

export function createSessionLogger(session_id: string, job_id?: string) {
  return {
    debug: (event: string, metadata?: Record<string, unknown>) =>
      logger.debug(event, { ...metadata, session_id, job_id }),
    info: (event: string, metadata?: Record<string, unknown>) =>
      logger.info(event, { ...metadata, session_id, job_id }),
    warn: (event: string, metadata?: Record<string, unknown>) =>
      logger.warn(event, { ...metadata, session_id, job_id }),
    error: (event: string, metadata?: Record<string, unknown> & { error?: string }) =>
      logger.error(event, { ...metadata, session_id, job_id }),
  };
}
