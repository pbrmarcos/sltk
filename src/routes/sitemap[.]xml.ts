import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "@/integrations/supabase/config";

const SITE_ORIGIN = "https://sltkamericas.com";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority?: string;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/equipamentos", changefreq: "weekly", priority: "0.9" },
  { path: "/solucoes/projetos-industriais-automacao", changefreq: "monthly", priority: "0.8" },
  { path: "/solucoes/tecnologia-de-processos", changefreq: "monthly", priority: "0.8" },
  { path: "/solucoes/consultoria-implementacao", changefreq: "monthly", priority: "0.8" },
  { path: "/contato", changefreq: "monthly", priority: "0.7" },
];

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [...STATIC_ENTRIES];

        try {
          const cfg = getSupabasePublicConfig();
          const sb = createClient(cfg.url, cfg.publishableKey, {
            auth: {
              storage: undefined as never,
              persistSession: false,
              autoRefreshToken: false,
            },
          });
          const { data } = await sb
            .from("equipamento_pagina")
            .select("slug, atualizado_em, publicado")
            .eq("publicado", true)
            .order("slug", { ascending: true });
          for (const row of (data ?? []) as Array<{
            slug: string;
            atualizado_em: string | null;
          }>) {
            entries.push({
              path: `/equipamentos/${row.slug}`,
              lastmod: row.atualizado_em
                ? new Date(row.atualizado_em).toISOString().slice(0, 10)
                : undefined,
              changefreq: "monthly",
              priority: "0.7",
            });
          }
        } catch (error) {
          console.error("[sitemap] falha ao listar equipamentos publicados:", error);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${SITE_ORIGIN}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
