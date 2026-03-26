/**
 * Logger estructurado en JSON (12-Factor: Logs).
 *
 * Los logs son streams de eventos sin timestamp (el orquestador/agregador los añade).
 * En producción, stdout es un stream JSON parseable. En desarrollo, formato legible.
 *
 * Uso:
 *   import { log } from "@/lib/log";
 *   log.info("Mensaje procesado", { userId, messageId });
 *   log.error("Fallo la API", { error: err.message });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function getMinLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? process.env.NODE_ENV === "production" ? "info" : "debug") as LogLevel;
  return env in LEVEL_ORDER ? env : "info";
}

function write(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[getMinLevel()]) return;

  const entry = {
    level,
    message,
    ...context,
  };

  if (process.env.NODE_ENV === "production") {
    // Producción: JSON puro en stdout para que el orquestador lo agregue
    const line = JSON.stringify(entry);
    if (level === "error") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  } else {
    // Desarrollo: formato legible
    const prefix = {
      debug: "\x1b[36mDEBUG\x1b[0m",
      info: "\x1b[32mINFO\x1b[0m",
      warn: "\x1b[33mWARN\x1b[0m",
      error: "\x1b[31mERROR\x1b[0m",
    }[level];
    const ctx = context ? ` ${JSON.stringify(context)}` : "";
    const out = level === "error" ? console.error : console.log;
    out(`  ${prefix} ${message}${ctx}`);
  }
}

export const log = {
  debug: (message: string, ctx?: Record<string, unknown>) => write("debug", message, ctx),
  info: (message: string, ctx?: Record<string, unknown>) => write("info", message, ctx),
  warn: (message: string, ctx?: Record<string, unknown>) => write("warn", message, ctx),
  error: (message: string, ctx?: Record<string, unknown>) => write("error", message, ctx),
};
