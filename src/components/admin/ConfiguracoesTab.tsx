import { useEffect, useRef, useState } from "react";
import { focusFirstError } from "@/lib/form-errors";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { BRAND_QUERY_KEY, useBrandSettings, type BrandSettings } from "@/hooks/use-brand-settings";
import { applyBrand } from "@/lib/brand-apply";
import { logAudit, diffEntries } from "@/lib/audit";
import { SeoFieldsCard } from "@/components/admin/SeoFieldsCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const LOGO_MAX = 2 * 1024 * 1024;
const FAV_MAX = 512 * 1024;
const LOGO_TYPES = ["image/png", "image/svg+xml"];
const FAV_TYPES = ["image/x-icon", "image/vnd.microsoft.icon", "image/png"];

const schema = z.object({
  system_name: z.string().trim().min(1, "Obrigatório").max(60),
  primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use formato #RRGGBB"),
  default_theme: z.enum(["light", "dark", "system"]),
  support_email: z.string().trim().email("Email inválido").max(255).optional().or(z.literal("")),
  footer_text: z.string().trim().max(200).optional().or(z.literal("")),
  meta_title: z.string().trim().max(60).optional().or(z.literal("")),
  meta_description: z.string().trim().max(160).optional().or(z.literal("")),
  allow_indexing: z.boolean(),
  canonical_base_url: z.string().trim().url("URL inválida").max(255).optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

function fromSettings(
  s: BrandSettings | null,
  defaults: {
    system_name: string;
    primary_color: string;
    default_theme: "light" | "dark" | "system";
    allow_indexing: boolean;
  },
): FormValues {
  return {
    system_name: s?.system_name ?? defaults.system_name,
    primary_color: s?.primary_color ?? defaults.primary_color,
    default_theme: (s?.default_theme ?? defaults.default_theme) as FormValues["default_theme"],
    support_email: s?.support_email ?? "suporte@sltkamericas.com",
    footer_text: s?.footer_text ?? "© 2026 SLTK Americas · Todos os direitos reservados",
    meta_title: s?.meta_title ?? "Solutek · Operations Dashboard",
    meta_description:
      s?.meta_description ??
      "Painel de gestão integrada Solutek — CRM, engenharia, FAT e pós-vendas.",
    allow_indexing: s?.allow_indexing ?? defaults.allow_indexing,
    canonical_base_url: s?.canonical_base_url ?? "https://app.solutekgroup.com",
  };
}

async function uploadToBrand(file: File, prefix: "logo" | "favicon"): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase();
  const path = `${prefix}-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("brand")
    .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
  if (upErr) throw upErr;
  // Bucket privado → URL assinada com expiração longa (10 anos)
  const { data, error } = await supabase.storage
    .from("brand")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
  if (error || !data) throw error ?? new Error("Falha ao gerar URL assinada");
  return data.signedUrl;
}

function FileField({
  label,
  hint,
  accept,
  maxBytes,
  acceptedTypes,
  currentUrl,
  previewUrl,
  onPick,
  onClear,
  size = 64,
}: {
  label: string;
  hint: string;
  accept: string;
  maxBytes: number;
  acceptedTypes: string[];
  currentUrl: string | null;
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  size?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const display = previewUrl ?? currentUrl;
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
        {label}
      </Label>
      <div className="flex items-center gap-4">
        <div
          className="flex items-center justify-center rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] overflow-hidden"
          style={{ width: size, height: size }}
        >
          {display ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={display} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[10px] text-[var(--text-muted)]">sem imagem</span>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (!acceptedTypes.includes(file.type)) {
                toast.error(`Formato não suportado: ${file.type || "desconhecido"}`);
                e.target.value = "";
                return;
              }
              if (file.size > maxBytes) {
                toast.error(`Arquivo excede ${Math.round(maxBytes / 1024)} KB`);
                e.target.value = "";
                return;
              }
              onPick(file);
              e.target.value = "";
            }}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="mr-1.5 h-3.5 w-3.5" />
              Escolher arquivo
            </Button>
            {previewUrl && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                <X className="mr-1 h-3.5 w-3.5" />
                Descartar
              </Button>
            )}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        {description && <p className="mt-1 text-xs text-[var(--text-muted)]">{description}</p>}
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export function ConfiguracoesTab({ onClose }: { onClose?: () => void }) {
  const { user } = useAuth();
  const { settings, defaults } = useBrandSettings();
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onBlur",
    reValidateMode: "onChange",
    defaultValues: fromSettings(settings, defaults),
  });

  // Reset quando settings carrega/atualiza — nunca sobre alterações não salvas:
  // se o usuário já digitou algo, um refetch em background não pode limpar o form.
  useEffect(() => {
    if (form.formState.isDirty) return;
    form.reset(fromSettings(settings, defaults));
  }, [settings, defaults, form]);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoDarkFile, setLogoDarkFile] = useState<File | null>(null);
  const [logoCollapsedFile, setLogoCollapsedFile] = useState<File | null>(null);
  const [logoCollapsedDarkFile, setLogoCollapsedDarkFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDarkPreview, setLogoDarkPreview] = useState<string | null>(null);
  const [logoCollapsedPreview, setLogoCollapsedPreview] = useState<string | null>(null);
  const [logoCollapsedDarkPreview, setLogoCollapsedDarkPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (logoDarkPreview) URL.revokeObjectURL(logoDarkPreview);
      if (logoCollapsedPreview) URL.revokeObjectURL(logoCollapsedPreview);
      if (logoCollapsedDarkPreview) URL.revokeObjectURL(logoCollapsedDarkPreview);
      if (faviconPreview) URL.revokeObjectURL(faviconPreview);
    },
    [logoPreview, logoDarkPreview, logoCollapsedPreview, logoCollapsedDarkPreview, faviconPreview],
  );

  const primaryColor = form.watch("primary_color");
  const systemName = form.watch("system_name");
  const metaTitle = form.watch("meta_title") ?? "";
  const metaDescription = form.watch("meta_description") ?? "";

  const [saving, setSaving] = useState(false);

  const onSubmit = async (values: FormValues, closeAfter: boolean) => {
    setSaving(true);
    try {
      const { data: currentSettings, error: currentError } = await supabase
        .from("brand_settings")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (currentError) throw currentError;
      const persistedSettings = (currentSettings as BrandSettings | null) ?? settings;

      let logo_url = persistedSettings?.logo_url ?? null;
      let logo_url_dark = persistedSettings?.logo_url_dark ?? null;
      let logo_url_collapsed = persistedSettings?.logo_url_collapsed ?? null;
      let logo_url_collapsed_dark = persistedSettings?.logo_url_collapsed_dark ?? null;
      let favicon_url = persistedSettings?.favicon_url ?? null;

      if (logoFile) logo_url = await uploadToBrand(logoFile, "logo");
      if (logoDarkFile) logo_url_dark = await uploadToBrand(logoDarkFile, "logo");
      if (logoCollapsedFile) logo_url_collapsed = await uploadToBrand(logoCollapsedFile, "logo");
      if (logoCollapsedDarkFile)
        logo_url_collapsed_dark = await uploadToBrand(logoCollapsedDarkFile, "logo");
      if (faviconFile) favicon_url = await uploadToBrand(faviconFile, "favicon");

      // Validação: garante que as logos do modo expandido sempre tenham um valor,
      // caindo automaticamente na versão colapsada quando estiverem vazias.
      if (!logo_url)
        logo_url = logo_url_collapsed ?? logo_url_dark ?? logo_url_collapsed_dark ?? null;
      if (!logo_url_dark)
        logo_url_dark = logo_url_collapsed_dark ?? logo_url ?? logo_url_collapsed ?? null;

      const payload = {
        system_name: values.system_name,
        primary_color: values.primary_color,
        default_theme: values.default_theme,
        support_email: values.support_email || null,
        footer_text: values.footer_text || null,
        meta_title: values.meta_title || null,
        meta_description: values.meta_description || null,
        allow_indexing: values.allow_indexing,
        canonical_base_url: values.canonical_base_url || null,
        logo_url,
        logo_url_dark,
        logo_url_collapsed,
        logo_url_collapsed_dark,
        favicon_url,
        updated_by: user?.id ?? null,
      };

      let resultId: string | null = persistedSettings?.id ?? null;
      let before: Record<string, unknown> = {};
      if (persistedSettings) {
        before = { ...persistedSettings } as Record<string, unknown>;
        const { error } = await supabase
          .from("brand_settings")
          .update(payload)
          .eq("id", persistedSettings.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("brand_settings")
          .insert({ ...payload, singleton: true })
          .select("id")
          .single();
        if (error) throw error;
        resultId = (data as { id: string }).id;
      }

      // Audit log (best-effort)
      if (resultId) {
        const diffs = persistedSettings
          ? diffEntries("brand_settings", resultId, before, payload as Record<string, unknown>)
          : [
              {
                table_name: "brand_settings",
                record_id: resultId,
                action: "INSERT" as const,
                new_value: payload,
              },
            ];
        if (diffs.length) void logAudit(diffs);
      }

      // Aplica imediatamente
      applyBrand({ ...payload });
      await queryClient.invalidateQueries({ queryKey: BRAND_QUERY_KEY });

      // Limpa previews
      setLogoFile(null);
      setLogoDarkFile(null);
      setLogoCollapsedFile(null);
      setLogoCollapsedDarkFile(null);
      setFaviconFile(null);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      if (logoDarkPreview) URL.revokeObjectURL(logoDarkPreview);
      if (logoCollapsedPreview) URL.revokeObjectURL(logoCollapsedPreview);
      if (logoCollapsedDarkPreview) URL.revokeObjectURL(logoCollapsedDarkPreview);
      if (faviconPreview) URL.revokeObjectURL(faviconPreview);
      setLogoPreview(null);
      setLogoDarkPreview(null);
      setLogoCollapsedPreview(null);
      setLogoCollapsedDarkPreview(null);
      setFaviconPreview(null);

      toast.success("Configurações salvas");
      if (closeAfter) onClose?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao salvar";
      toast.error(msg);
      console.error("[ConfiguracoesTab] save failed", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(
        (v) => onSubmit(v, false),
        (errs) => focusFirstError(errs as Record<string, unknown>),
      )}
      className="space-y-4"
    >
      <Section
        title="Identidade"
        description="Logo, favicon e nome exibidos na sidebar e abas do navegador."
      >
        <FileField
          label="Logomarca (fundo claro)"
          hint="Versão escura da logo, exibida sobre fundos claros. PNG ou SVG, até 2 MB."
          accept="image/png,image/svg+xml"
          maxBytes={LOGO_MAX}
          acceptedTypes={LOGO_TYPES}
          currentUrl={settings?.logo_url ?? null}
          previewUrl={logoPreview}
          onPick={(f) => {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            setLogoFile(f);
            setLogoPreview(URL.createObjectURL(f));
          }}
          onClear={() => {
            if (logoPreview) URL.revokeObjectURL(logoPreview);
            setLogoFile(null);
            setLogoPreview(null);
          }}
          size={80}
        />
        <FileField
          label="Logomarca (fundo escuro)"
          hint="Versão clara da logo, exibida na sidebar e fundos escuros. PNG ou SVG, até 2 MB."
          accept="image/png,image/svg+xml"
          maxBytes={LOGO_MAX}
          acceptedTypes={LOGO_TYPES}
          currentUrl={(settings as { logo_url_dark?: string | null } | null)?.logo_url_dark ?? null}
          previewUrl={logoDarkPreview}
          onPick={(f) => {
            if (logoDarkPreview) URL.revokeObjectURL(logoDarkPreview);
            setLogoDarkFile(f);
            setLogoDarkPreview(URL.createObjectURL(f));
          }}
          onClear={() => {
            if (logoDarkPreview) URL.revokeObjectURL(logoDarkPreview);
            setLogoDarkFile(null);
            setLogoDarkPreview(null);
          }}
          size={80}
        />
        <FileField
          label="Logo recolhida (fundo claro)"
          hint="Versão compacta / ícone, exibida quando o menu está recolhido sobre fundo claro. PNG ou SVG, até 2 MB."
          accept="image/png,image/svg+xml"
          maxBytes={LOGO_MAX}
          acceptedTypes={LOGO_TYPES}
          currentUrl={
            (settings as { logo_url_collapsed?: string | null } | null)?.logo_url_collapsed ?? null
          }
          previewUrl={logoCollapsedPreview}
          onPick={(f) => {
            if (logoCollapsedPreview) URL.revokeObjectURL(logoCollapsedPreview);
            setLogoCollapsedFile(f);
            setLogoCollapsedPreview(URL.createObjectURL(f));
          }}
          onClear={() => {
            if (logoCollapsedPreview) URL.revokeObjectURL(logoCollapsedPreview);
            setLogoCollapsedFile(null);
            setLogoCollapsedPreview(null);
          }}
          size={64}
        />
        <FileField
          label="Logo recolhida (fundo escuro)"
          hint="Versão compacta / ícone, exibida quando o menu está recolhido na sidebar escura. PNG ou SVG, até 2 MB."
          accept="image/png,image/svg+xml"
          maxBytes={LOGO_MAX}
          acceptedTypes={LOGO_TYPES}
          currentUrl={
            (settings as { logo_url_collapsed_dark?: string | null } | null)
              ?.logo_url_collapsed_dark ?? null
          }
          previewUrl={logoCollapsedDarkPreview}
          onPick={(f) => {
            if (logoCollapsedDarkPreview) URL.revokeObjectURL(logoCollapsedDarkPreview);
            setLogoCollapsedDarkFile(f);
            setLogoCollapsedDarkPreview(URL.createObjectURL(f));
          }}
          onClear={() => {
            if (logoCollapsedDarkPreview) URL.revokeObjectURL(logoCollapsedDarkPreview);
            setLogoCollapsedDarkFile(null);
            setLogoCollapsedDarkPreview(null);
          }}
          size={64}
        />
        <FileField
          label="Favicon"
          hint="ICO ou PNG 32×32 / 64×64, até 512 KB."
          accept="image/x-icon,image/png"
          maxBytes={FAV_MAX}
          acceptedTypes={FAV_TYPES}
          currentUrl={settings?.favicon_url ?? null}
          previewUrl={faviconPreview}
          onPick={(f) => {
            if (faviconPreview) URL.revokeObjectURL(faviconPreview);
            setFaviconFile(f);
            setFaviconPreview(URL.createObjectURL(f));
          }}
          onClear={() => {
            if (faviconPreview) URL.revokeObjectURL(faviconPreview);
            setFaviconFile(null);
            setFaviconPreview(null);
          }}
          size={48}
        />
        <div className="space-y-2 max-w-md">
          <Label
            htmlFor="system_name"
            className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
          >
            Nome do sistema
          </Label>
          <Input id="system_name" {...form.register("system_name")} />
          {form.formState.errors.system_name && (
            <p className="text-xs text-destructive">{form.formState.errors.system_name.message}</p>
          )}
        </div>
      </Section>

      <Section title="Aparência" description="Cor de destaque e tema padrão para novos usuários.">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label
              htmlFor="primary_color"
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Cor de destaque
            </Label>
            <div className="flex items-center gap-2">
              <input
                id="primary_color"
                type="color"
                {...form.register("primary_color")}
                className="h-10 w-14 cursor-pointer rounded border border-[var(--bg-border)] bg-transparent p-0"
              />
              <Input {...form.register("primary_color")} className="w-32 font-mono uppercase" />
            </div>
            {form.formState.errors.primary_color && (
              <p className="text-xs text-destructive">
                {form.formState.errors.primary_color.message}
              </p>
            )}
          </div>
          {/* Live preview */}
          <div className="flex items-center gap-3 rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-4 py-3">
            <button
              type="button"
              className="rounded-md px-3 py-1.5 text-xs font-semibold text-white"
              style={{ backgroundColor: primaryColor }}
            >
              Botão exemplo
            </button>
            <div
              className="flex items-center gap-2 rounded px-2 py-1 text-xs font-medium"
              style={{
                color: primaryColor,
                backgroundColor: `${primaryColor}1A`,
              }}
            >
              Item ativo
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
            Tema padrão
          </Label>
          <RadioGroup
            value={form.watch("default_theme")}
            onValueChange={(v) =>
              form.setValue("default_theme", v as FormValues["default_theme"], {
                shouldDirty: true,
              })
            }
            className="flex flex-wrap gap-4"
          >
            {[
              { v: "light", l: "Light" },
              { v: "dark", l: "Dark" },
              { v: "system", l: "Seguir sistema" },
            ].map((o) => (
              <label
                key={o.v}
                className="flex items-center gap-2 text-sm text-[var(--text-primary)]"
              >
                <RadioGroupItem value={o.v} />
                {o.l}
              </label>
            ))}
          </RadioGroup>
        </div>
      </Section>

      <Section
        title="Comunicação"
        description="Informações exibidas na tela de login e no rodapé do app."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="support_email"
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
            >
              E-mail de suporte
            </Label>
            <Input
              id="support_email"
              type="email"
              placeholder="suporte@empresa.com"
              {...form.register("support_email")}
            />
            {form.formState.errors.support_email && (
              <p className="text-xs text-destructive">
                {form.formState.errors.support_email.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label
              htmlFor="footer_text"
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
            >
              Texto do rodapé
            </Label>
            <Input
              id="footer_text"
              placeholder="© 2026 SLTK Americas"
              maxLength={200}
              {...form.register("footer_text")}
            />
          </div>
        </div>
      </Section>

      <Section
        title="SEO & Indexação"
        description="Metadados padrão e controle de indexação por buscadores."
      >
        <SeoFieldsCard
          titleId="meta_title"
          title={metaTitle}
          onTitleChange={(v) => form.setValue("meta_title", v, { shouldDirty: true })}
          descriptionId="meta_description"
          description={metaDescription}
          onDescriptionChange={(v) => form.setValue("meta_description", v, { shouldDirty: true })}
        />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label
              htmlFor="canonical_base_url"
              className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]"
            >
              URL canônica base
            </Label>
            <Input
              id="canonical_base_url"
              placeholder="https://app.empresa.com"
              {...form.register("canonical_base_url")}
            />
            {form.formState.errors.canonical_base_url && (
              <p className="text-xs text-destructive">
                {form.formState.errors.canonical_base_url.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wider text-[var(--text-secondary)]">
              Permitir indexação pelo Google
            </Label>
            <div className="flex items-center gap-3 rounded-md border border-[var(--bg-border)] bg-[var(--bg-elevated)] px-3 py-2">
              <Switch
                checked={form.watch("allow_indexing")}
                onCheckedChange={(v) => form.setValue("allow_indexing", v, { shouldDirty: true })}
              />
              <span className="text-xs text-[var(--text-secondary)]">
                {form.watch("allow_indexing")
                  ? "Indexação permitida"
                  : "noindex,nofollow injetado em todas as páginas"}
              </span>
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-[var(--text-muted)]">
          Preview do título:{" "}
          <code className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5">
            {metaTitle || systemName}
          </code>
        </p>
      </Section>
      <BottomActions
        form={form}
        saving={saving}
        hasDirtyFiles={
          !!(logoFile || logoDarkFile || logoCollapsedFile || logoCollapsedDarkFile || faviconFile)
        }
        onSaveAndClose={form.handleSubmit(
          (v) => onSubmit(v, true),
          (errs) => focusFirstError(errs as Record<string, unknown>),
        )}
        onCancel={() => {
          form.reset(fromSettings(settings, defaults));
          setLogoFile(null);
          setLogoDarkFile(null);
          setLogoCollapsedFile(null);
          setLogoCollapsedDarkFile(null);
          setFaviconFile(null);
          if (logoPreview) URL.revokeObjectURL(logoPreview);
          if (logoDarkPreview) URL.revokeObjectURL(logoDarkPreview);
          if (logoCollapsedPreview) URL.revokeObjectURL(logoCollapsedPreview);
          if (logoCollapsedDarkPreview) URL.revokeObjectURL(logoCollapsedDarkPreview);
          if (faviconPreview) URL.revokeObjectURL(faviconPreview);
          setLogoPreview(null);
          setLogoDarkPreview(null);
          setLogoCollapsedPreview(null);
          setLogoCollapsedDarkPreview(null);
          setFaviconPreview(null);
        }}
      />
    </form>
  );
}

function BottomActions({
  form,
  saving,
  hasDirtyFiles,
  onSaveAndClose,
  onCancel,
}: {
  form: ReturnType<typeof useForm<FormValues>>;
  saving: boolean;
  hasDirtyFiles: boolean;
  onSaveAndClose: () => void;
  onCancel: () => void;
}) {
  const isDirty = form.formState.isDirty || hasDirtyFiles;
  if (!isDirty) return null;
  return (
    <div className="sticky bottom-0 z-10 -mx-1 mt-2 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] px-4 py-3 shadow-[var(--shadow-sm)]">
      <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="button" variant="secondary" disabled={saving} onClick={onSaveAndClose}>
        Salvar e fechar
      </Button>
      <Button type="submit" disabled={saving}>
        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Salvar
      </Button>
    </div>
  );
}
