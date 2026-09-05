import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { applyBrand } from "@/lib/brand-apply";
import { useAuth } from "@/hooks/use-auth";

export type BrandSettings = {
  id: string;
  logo_url: string | null;
  logo_url_dark: string | null;
  logo_url_collapsed: string | null;
  logo_url_collapsed_dark: string | null;
  favicon_url: string | null;
  system_name: string;
  primary_color: string;
  default_theme: "light" | "dark" | "system";
  support_email: string | null;
  footer_text: string | null;
  meta_title: string | null;
  meta_description: string | null;
  allow_indexing: boolean;
  canonical_base_url: string | null;
  contact_address: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  contact_hours: string | null;
  social_instagram: string | null;
  social_linkedin: string | null;
  social_youtube: string | null;
  updated_at: string;
  updated_by: string | null;
};

const DEFAULTS: Omit<BrandSettings, "id" | "updated_at" | "updated_by"> = {
  logo_url: null,
  logo_url_dark: null,
  logo_url_collapsed: null,
  logo_url_collapsed_dark: null,
  favicon_url: null,
  system_name: "Operations Suite",
  primary_color: "#3B82F6",
  default_theme: "system",
  support_email: null,
  footer_text: null,
  meta_title: null,
  meta_description: null,
  allow_indexing: true,
  canonical_base_url: null,
  contact_address: null,
  contact_phone: null,
  contact_whatsapp: null,
  contact_email: null,
  contact_hours: null,
  social_instagram: null,
  social_linkedin: null,
  social_youtube: null,
};

type Ctx = {
  settings: BrandSettings | null;
  defaults: typeof DEFAULTS;
  isLoading: boolean;
};

const BrandContext = createContext<Ctx | undefined>(undefined);

export const BRAND_QUERY_KEY = ["brand-settings"] as const;

const PUBLIC_BRAND_COLUMNS = [
  "id",
  "logo_url",
  "logo_url_dark",
  "logo_url_collapsed",
  "logo_url_collapsed_dark",
  "favicon_url",
  "system_name",
  "primary_color",
  "default_theme",
  "footer_text",
  "meta_title",
  "meta_description",
  "allow_indexing",
  "canonical_base_url",
  "contact_address",
  "contact_phone",
  "contact_whatsapp",
  "contact_email",
  "contact_hours",
  "social_instagram",
  "social_linkedin",
  "social_youtube",
  "updated_at",
].join(", ");

function normalizeSettings(data: Partial<BrandSettings> | null): BrandSettings | null {
  if (!data?.id) return null;
  const supportEmail =
    data.support_email === "suporte@solutekgroup.com"
      ? "suporte@sltkamericas.com"
      : data.support_email;
  const footerText =
    data.footer_text === "© 2026 Solutek Group · Todos os direitos reservados"
      ? "© 2026 SLTK Americas · Todos os direitos reservados"
      : data.footer_text;

  return {
    ...DEFAULTS,
    ...data,
    support_email: supportEmail ?? null,
    footer_text: footerText ?? null,
    id: data.id,
    updated_at: data.updated_at ?? "",
    updated_by: data.updated_by ?? null,
  };
}

export function BrandSettingsProvider({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const authenticated = !!session?.access_token;
  // Defer the query until after hydration so SSR never touches Supabase
  // and the server/client trees match.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: [...BRAND_QUERY_KEY, authenticated ? "authenticated" : "public"],
    staleTime: Infinity,
    enabled: hydrated && !authLoading,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_settings")
        .select(authenticated ? "*" : PUBLIC_BRAND_COLUMNS)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return normalizeSettings((data as Partial<BrandSettings> | null) ?? null);
    },
  });

  useEffect(() => {
    if (!data) return;
    applyBrand(data);
  }, [data]);

  return (
    <BrandContext.Provider
      value={{ settings: data ?? null, defaults: DEFAULTS, isLoading: authLoading || isLoading }}
    >
      {children}
    </BrandContext.Provider>
  );
}

export function useBrandSettings() {
  const ctx = useContext(BrandContext);
  if (!ctx) throw new Error("useBrandSettings must be used inside <BrandSettingsProvider>");
  return ctx;
}

/** Versão tolerante a uso fora do provider — usada em rotas públicas como /login. */
export function useBrandSettingsOptional(): Ctx {
  const ctx = useContext(BrandContext);
  return ctx ?? { settings: null, defaults: DEFAULTS, isLoading: false };
}
