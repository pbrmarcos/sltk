let didRun = false;

/**
 * Validates that critical route dependencies are present at runtime.
 * Logs a clear console message listing any missing modules so a blank
 * screen can be diagnosed quickly. Safe to call multiple times.
 */
export async function runStartupCheck(): Promise<void> {
  if (didRun || typeof window === "undefined") return;
  didRun = true;

  const required: Array<{ name: string; load: () => Promise<unknown> }> = [
    { name: "@tanstack/react-router", load: () => import("@tanstack/react-router") },
    { name: "@tanstack/react-query", load: () => import("@tanstack/react-query") },
    { name: "@tanstack/react-start", load: () => import("@tanstack/react-start") },
    { name: "zod", load: () => import("zod") },
    { name: "@tanstack/zod-adapter", load: () => import("@tanstack/zod-adapter") },
  ];

  const missing: string[] = [];
  await Promise.all(
    required.map(async ({ name, load }) => {
      try {
        await load();
      } catch (err) {
        missing.push(name);
        console.error(`[startup-check] Missing required module: ${name}`, err);
      }
    }),
  );

  if (missing.length > 0) {
    console.error(
      `[startup-check] ${missing.length} required dependency(ies) missing: ${missing.join(", ")}. ` +
        `Run \`bun add ${missing.join(" ")}\` to fix.`,
    );
  } else {
    console.info("[startup-check] All required route dependencies are available.");
  }
}