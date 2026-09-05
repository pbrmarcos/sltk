import { reportClientError } from "./error-report.functions";

let installed = false;
let cachedSessionId: string | undefined;

/**
 * ID estável por aba (sessionStorage). Usado para correlacionar erros do
 * mesmo usuário/sessão na tela de monitoramento.
 */
export function getSessionId(): string {
  if (cachedSessionId) return cachedSessionId;
  if (typeof window === "undefined") {
    cachedSessionId = `srv-${Math.random().toString(36).slice(2, 10)}`;
    return cachedSessionId;
  }
  try {
    const key = "sltk:sid";
    let sid = window.sessionStorage.getItem(key);
    if (!sid) {
      sid = `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      window.sessionStorage.setItem(key, sid);
    }
    cachedSessionId = sid;
    return sid;
  } catch {
    cachedSessionId = `eph-${Math.random().toString(36).slice(2, 10)}`;
    return cachedSessionId;
  }
}

function generateIncidentId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INC-${ts}-${rand}`;
}

/**
 * Forwards a client-side error to the backend report channel and the console.
 * Includes the affected route so a blank page / stuck build can be traced
 * back to the page the user was on.
 */
export async function trackClientError(input: {
  source: "window" | "unhandledrejection" | "boundary" | "module-load";
  error: unknown;
  route?: string;
  extras?: Record<string, unknown>;
}): Promise<string> {
  const incidentId = generateIncidentId();
  const err =
    input.error instanceof Error
      ? input.error
      : new Error(typeof input.error === "string" ? input.error : JSON.stringify(input.error));
  const route =
    input.route ??
    (typeof window !== "undefined" ? window.location.pathname + window.location.search : undefined);

  // Always log locally with the incident ID so the user can quote it.
  console.error(
    `[telemetry:${input.source}] incident=${incidentId} route=${route ?? "?"}`,
    err,
    input.extras,
  );

  // Best-effort backend report. Never let logging crash the UI.
  try {
    await reportClientError({
      data: {
        incidentId,
        message: `[${input.source}] ${err.message}`,
        stack: err.stack,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        route,
      },
    });
  } catch (reportErr) {
    console.warn("[telemetry] backend report failed", reportErr);
  }
  return incidentId;
}

/**
 * Installs global listeners that catch otherwise-silent failures:
 * - window 'error' (sync throws, script load failures)
 * - 'unhandledrejection' (broken dynamic imports, stuck builds, fetch errors)
 * Safe to call multiple times — only installs once per session.
 */
export function installClientTelemetry(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (event) => {
    // Filter out noisy ResizeObserver loop notifications.
    if (event.message?.includes("ResizeObserver loop")) return;
    void trackClientError({
      source: "window",
      error: event.error ?? event.message ?? "Unknown window error",
      extras: { filename: event.filename, lineno: event.lineno, colno: event.colno },
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason ?? "");
    // Failed dynamic imports = stuck build or stale chunk. Tag explicitly.
    const source = /Failed to fetch dynamically imported module|Loading chunk \d+ failed/i.test(
      message,
    )
      ? "module-load"
      : "unhandledrejection";
    void trackClientError({ source, error: reason });
  });
}
