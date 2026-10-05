import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const truncate = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.slice(0, max) : v), z.string().max(max));

const schema = z.object({
  incidentId: z.string().trim().min(1).max(64),
  message: z.preprocess(
    (v) => (typeof v === "string" ? v.slice(0, 500) : v),
    z.string().trim().min(1).max(500),
  ),
  stack: truncate(2000).optional(),
  url: truncate(500).optional(),
  userAgent: truncate(300).optional(),
  route: truncate(200).optional(),
});

const stripNewlines = (s: string | undefined) => (s ?? "").replace(/[\r\n]+/g, " ");

export const reportClientError = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data }) => {
    // Endpoint público: sem limite, qualquer um inunda o log do servidor.
    // Excedente é descartado em silêncio (o cliente não precisa saber).
    const { clientIp } = await import("@/lib/request-meta.server");
    const { rateLimitPorIp } = await import("@/lib/rate-limit.server");
    try {
      rateLimitPorIp("client-error", clientIp(), 20, 60_000);
    } catch {
      return { ok: true, incidentId: data.incidentId };
    }
    // Surfaces in server/edge logs. Keep concise to avoid log truncation.
    // Newlines are stripped from all client-supplied fields to prevent log injection.
    console.error(
      `[client-error] id=${stripNewlines(data.incidentId)} ` +
        `route=${stripNewlines(data.route) || "?"} url=${stripNewlines(data.url) || "?"} ` +
        `ua="${stripNewlines(data.userAgent).slice(0, 120)}" ` +
        `msg="${stripNewlines(data.message)}"` +
        (data.stack ? ` stack="${stripNewlines(data.stack)}"` : ""),
    );
    return { ok: true, incidentId: data.incidentId };
  });
