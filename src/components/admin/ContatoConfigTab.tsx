import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BRAND_QUERY_KEY, useBrandSettings } from "@/hooks/use-brand-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ContactFields = {
  contact_address: string;
  contact_phone: string;
  contact_whatsapp: string;
  contact_email: string;
  contact_hours: string;
  social_instagram: string;
  social_linkedin: string;
  social_youtube: string;
};

const EMPTY: ContactFields = {
  contact_address: "",
  contact_phone: "",
  contact_whatsapp: "",
  contact_email: "",
  contact_hours: "",
  social_instagram: "",
  social_linkedin: "",
  social_youtube: "",
};

function pick(s: unknown, key: keyof ContactFields): string {
  const rec = s as Record<string, unknown> | null;
  const v = rec?.[key];
  return typeof v === "string" ? v : "";
}

export function ContatoConfigTab() {
  const { user } = useAuth();
  const { settings } = useBrandSettings();
  const qc = useQueryClient();
  const [values, setValues] = useState<ContactFields>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setValues({
      contact_address: pick(settings, "contact_address"),
      contact_phone: pick(settings, "contact_phone"),
      contact_whatsapp: pick(settings, "contact_whatsapp"),
      contact_email: pick(settings, "contact_email"),
      contact_hours: pick(settings, "contact_hours"),
      social_instagram: pick(settings, "social_instagram"),
      social_linkedin: pick(settings, "social_linkedin"),
      social_youtube: pick(settings, "social_youtube"),
    });
  }, [settings]);

  function update<K extends keyof ContactFields>(k: K, v: string) {
    setValues((prev) => ({ ...prev, [k]: v }));
  }

  async function onSave() {
    if (!settings?.id) {
      toast.error("brand_settings ainda não inicializado.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | null> = {};
      (Object.keys(values) as (keyof ContactFields)[]).forEach((k) => {
        payload[k] = values[k].trim() ? values[k].trim() : null;
      });
      (payload as Record<string, unknown>).updated_by = user?.id ?? null;

      const { error } = await (supabase.from("brand_settings") as unknown as {
        update: (v: unknown) => { eq: (c: string, id: string) => Promise<{ error: { message: string } | null }> };
      })
        .update(payload)
        .eq("id", settings.id);
      if (error) throw error;

      await qc.invalidateQueries({ queryKey: BRAND_QUERY_KEY });
      toast.success("Contato atualizado.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar contato.");
    } finally {
      setSaving(false);
    }
  }

  const fields: { key: keyof ContactFields; label: string; placeholder?: string; type?: string }[] = [
    { key: "contact_address", label: "Endereço", placeholder: "Av. Santa Catarina, 1207 — Joinville/SC" },
    { key: "contact_phone", label: "Telefone", placeholder: "+55 (47) 9635-0101" },
    { key: "contact_whatsapp", label: "WhatsApp", placeholder: "+55 (47) 9635-0101" },
    { key: "contact_email", label: "E-mail de contato", type: "email", placeholder: "contato@solutekgroup.com" },
    { key: "contact_hours", label: "Horário de atendimento", placeholder: "Seg a Sex · 08h – 18h (BRT)" },
    { key: "social_instagram", label: "Instagram (URL)", placeholder: "https://instagram.com/solutek" },
    { key: "social_linkedin", label: "LinkedIn (URL)", placeholder: "https://linkedin.com/company/solutek" },
    { key: "social_youtube", label: "YouTube (URL)", placeholder: "https://youtube.com/@solutek" },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
        <header className="mb-4">
          <h3 className="text-sm font-semibold">Dados de contato do site</h3>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Usados no rodapé público, na página /contato e em cards de canais diretos. Deixe em branco para usar o padrão traduzido.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.key === "contact_address" ? "sm:col-span-2" : ""}>
              <Label htmlFor={`c-${f.key}`}>{f.label}</Label>
              <Input
                id={`c-${f.key}`}
                type={f.type ?? "text"}
                placeholder={f.placeholder}
                value={values[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                maxLength={300}
              />
            </div>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar contato
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
        <h3 className="text-sm font-semibold">Mensagens recebidas</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Mensagens do formulário público são registradas em <code>contato_mensagens</code>.
          A listagem detalhada fica disponível numa próxima entrega.
        </p>
      </div>
    </section>
  );
}
