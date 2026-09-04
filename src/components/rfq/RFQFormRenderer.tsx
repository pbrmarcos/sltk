import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RotateCw,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import type { FormularioSchema, Idioma } from "@/lib/rfq.shared";
import { pickLabel } from "@/lib/rfq.shared";
import { cn } from "@/lib/utils";

type AnexoRow = {
  id: string;
  nome: string;
  nome_original: string | null;
  mime: string;
  tamanho_bytes: number;
  drive_view_url: string | null;
  campo_id: string | null;
};

type PendingFile = {
  key: string;
  nome: string;
  tamanho_bytes: number;
  mime: string;
  status: "enviando" | "concluido" | "erro";
  progress: number;
  erro?: string;
  file?: File;
};

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPTED_MIMES = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
function validarArquivo(f: File, idioma: Idioma): string | null {
  if (f.size > MAX_BYTES) {
    const mb = (f.size / (1024 * 1024)).toFixed(1);
    if (idioma === "es") return `Excede 50 MB (${mb} MB). Envía una versión más ligera.`;
    if (idioma === "en") return `Exceeds 50 MB (${mb} MB). Please send a lighter version.`;
    return `Ultrapassa 50 MB (${mb} MB). Envie uma versão mais leve.`;
  }
  if (!ACCEPTED_MIMES.includes(f.type)) {
    if (idioma === "es") return "Tipo no permitido. Sólo PDF, JPG o PNG.";
    if (idioma === "en") return "File type not allowed. Only PDF, JPG or PNG.";
    return "Tipo não permitido. Apenas PDF, JPG ou PNG.";
  }
  return null;
}

type Props = {
  schema: FormularioSchema;
  idioma: Idioma;
  slug?: string;
  submissaoId?: string | null;
  onEnsureSubmissao?: () => Promise<string | null>;

  onSubmit?: (values: {
    respostas: Record<string, unknown>;
    preenchido_por_nome: string;
    preenchido_por_email: string;
    preenchido_por_telefone: string;
  }) => Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  preview?: boolean;
};

const T: Record<
  Idioma,
  {
    contatoTitulo: string;
    contatoAjuda: string;
    nome: string;
    email: string;
    tel: string;
    obrigatorio: string;
    faltando: (n: number) => string;
    completos: string;
    envie: string;
    enviarOutroLabel: string;
    upload: string;
    uploadHint: string;
    uploadFormats: string;
    remover: string;
    abrir: string;
    sim: string;
    nao: string;
    caracteres: (n: number) => string;
    corrija: string;
    protocolo: string;
    pt: string;
    es: string;
    en: string;
  }
> = {
  pt: {
    contatoTitulo: "Seus dados de contato",
    contatoAjuda: "Precisamos disso para responder sua solicitação.",
    nome: "Nome completo",
    email: "E-mail",
    tel: "Telefone (opcional)",
    obrigatorio: "obrigatório",
    faltando: (n) => `${n} campo(s) obrigatório(s) pendente(s)`,
    completos: "Tudo preenchido — pronto para enviar",
    envie: "Preencha para dimensionarmos sua solução. Leva cerca de 5 minutos.",
    enviarOutroLabel: "Voltar ao topo",
    upload: "Arraste arquivos aqui ou clique para selecionar",
    uploadHint: "Você pode anexar quantos arquivos precisar.",
    uploadFormats: "PDF, JPG ou PNG · até 50 MB por arquivo",
    remover: "Remover",
    abrir: "Abrir",
    sim: "Sim",
    nao: "Não",
    caracteres: (n) => `${n} caracteres`,
    corrija: "Verifique os campos obrigatórios em destaque.",
    protocolo: "Protocolo",
    pt: "Português",
    es: "Espanhol",
    en: "Inglês",
  },
  es: {
    contatoTitulo: "Tus datos de contacto",
    contatoAjuda: "Los necesitamos para responder tu solicitud.",
    nome: "Nombre completo",
    email: "Correo",
    tel: "Teléfono (opcional)",
    obrigatorio: "obligatorio",
    faltando: (n) => `${n} campo(s) obligatorio(s) pendiente(s)`,
    completos: "Todo listo — puedes enviar",
    envie: "Completa para dimensionar tu solución. Toma unos 5 minutos.",
    enviarOutroLabel: "Volver al inicio",
    upload: "Arrastra archivos aquí o haz clic para elegir",
    uploadHint: "Puedes adjuntar los archivos que necesites.",
    uploadFormats: "PDF, JPG o PNG · hasta 50 MB por archivo",
    remover: "Quitar",
    abrir: "Abrir",
    sim: "Sí",
    nao: "No",
    caracteres: (n) => `${n} caracteres`,
    corrija: "Revisa los campos obligatorios resaltados.",
    protocolo: "Protocolo",
    pt: "Portugués",
    es: "Español",
    en: "Inglés",
  },
  en: {
    contatoTitulo: "Your contact details",
    contatoAjuda: "We use this to reply to your request.",
    nome: "Full name",
    email: "Email",
    tel: "Phone (optional)",
    obrigatorio: "required",
    faltando: (n) => `${n} required field(s) pending`,
    completos: "All set — ready to submit",
    envie: "Fill it out so we can size the right solution. Takes about 5 minutes.",
    enviarOutroLabel: "Back to top",
    upload: "Drop files here or click to browse",
    uploadHint: "Attach as many files as you need.",
    uploadFormats: "PDF, JPG or PNG · up to 50 MB per file",
    remover: "Remove",
    abrir: "Open",
    sim: "Yes",
    nao: "No",
    caracteres: (n) => `${n} characters`,
    corrija: "Please review the required fields highlighted below.",
    protocolo: "Reference",
    pt: "Portuguese",
    es: "Spanish",
    en: "English",
  },
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function mimeIcon(mime: string) {
  if (mime.startsWith("image/")) return <ImageIcon className="h-4 w-4 text-emerald-600" />;
  return <FileText className="h-4 w-4 text-red-600" />;
}

const SECTION_ICONS = [ClipboardList, Paperclip, UserRound];

export function RFQFormRenderer({
  schema,
  idioma,
  slug,
  submissaoId,
  onEnsureSubmissao,
  onSubmit,
  submitting,
  submitLabel,
  preview,
}: Props) {
  const t = T[idioma];
  const [respostas, setRespostas] = useState<Record<string, unknown>>({});
  const [anexos, setAnexos] = useState<Record<string, AnexoRow[]>>({});
  const [pendentesArquivo, setPendentesArquivo] = useState<Record<string, PendingFile[]>>({});
  const [uploadingCampo, setUploadingCampo] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [errors, setErrors] = useState<Set<string>>(new Set());
  const [showErrorBanner, setShowErrorBanner] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  function set(id: string, v: unknown) {
    setRespostas((prev) => ({ ...prev, [id]: v }));
    setErrors((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }

  // Campos obrigatórios e progresso
  const { obrigatorios, pendentes } = useMemo(() => {
    const obs: string[] = [];
    for (const sec of schema.secoes) {
      for (const c of sec.campos) {
        if (c.obrigatorio) obs.push(c.id);
      }
    }
    const pend = obs.filter((id) => {
      const v = respostas[id];
      if (Array.isArray(v)) return v.length === 0;
      if (typeof v === "boolean") return false;
      return v === undefined || v === null || String(v).trim() === "";
    });
    return { obrigatorios: obs, pendentes: pend };
  }, [schema, respostas]);

  const total = Math.max(obrigatorios.length + 3, 1); // +3 = nome, email
  const preenchidos =
    obrigatorios.length -
    pendentes.length +
    (nome.trim() ? 1 : 0) +
    (email.trim() ? 1 : 0) +
    1; // conta o "leia atento" como já feito
  const progresso = Math.min(100, Math.round((preenchidos / total) * 100));

  function addPending(campoId: string, p: PendingFile) {
    setPendentesArquivo((prev) => ({ ...prev, [campoId]: [...(prev[campoId] ?? []), p] }));
  }
  function updatePending(campoId: string, key: string, patch: Partial<PendingFile>) {
    setPendentesArquivo((prev) => ({
      ...prev,
      [campoId]: (prev[campoId] ?? []).map((p) => (p.key === key ? { ...p, ...patch } : p)),
    }));
  }
  function removePending(campoId: string, key: string) {
    setPendentesArquivo((prev) => ({
      ...prev,
      [campoId]: (prev[campoId] ?? []).filter((p) => p.key !== key),
    }));
  }

  function uploadOne(campoId: string, key: string, file: File, subId: string, slugStr: string) {
    updatePending(campoId, key, { status: "enviando", progress: 0, erro: undefined });
    return new Promise<void>((resolve) => {
      try {
        const fd = new FormData();
        fd.set("slug", slugStr);
        fd.set("submissao_id", subId);
        fd.set("campo_id", campoId);
        fd.set("file", file);
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "/api/public/rfq/upload");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
            updatePending(campoId, key, { progress: pct });
          }
        };
        xhr.onerror = () => {
          updatePending(campoId, key, {
            status: "erro",
            erro:
              idioma === "es" ? "Error de red." : idioma === "en" ? "Network error." : "Erro de rede.",
          });
          resolve();
        };
        xhr.onload = () => {
          let json: { ok?: boolean; anexo?: AnexoRow; error?: string } = {};
          try {
            json = JSON.parse(xhr.responseText || "{}");
          } catch {
            /* noop */
          }
          if (xhr.status < 200 || xhr.status >= 300 || !json.ok || !json.anexo) {
            updatePending(campoId, key, {
              status: "erro",
              erro:
                json.error ||
                (idioma === "es"
                  ? "Fallo al enviar. Intenta de nuevo."
                  : idioma === "en"
                    ? "Upload failed. Try again."
                    : "Falha no envio. Tente novamente."),
            });
            resolve();
            return;
          }
          updatePending(campoId, key, { status: "concluido", progress: 100 });
          setAnexos((prev) => ({ ...prev, [campoId]: [...(prev[campoId] ?? []), json.anexo!] }));
          // Remove a linha de progresso após um curto highlight de sucesso.
          window.setTimeout(() => removePending(campoId, key), 1200);
          resolve();
        };
        xhr.send(fd);
      } catch {
        updatePending(campoId, key, {
          status: "erro",
          erro:
            idioma === "es" ? "Error de red." : idioma === "en" ? "Network error." : "Erro de rede.",
        });
        resolve();
      }
    });
  }

  async function retryPending(campoId: string, key: string) {
    const p = (pendentesArquivo[campoId] ?? []).find((x) => x.key === key);
    if (!p || !p.file) return;
    let subId = submissaoId;
    if (!subId && onEnsureSubmissao) subId = await onEnsureSubmissao();
    if (!subId || !slug) return;
    setUploadingCampo(campoId);
    try {
      await uploadOne(campoId, key, p.file, subId, slug);
    } finally {
      setUploadingCampo(null);
    }
  }

  async function handleFiles(campoId: string, files: FileList | File[]) {
    if (preview) return;
    const list = Array.from(files);
    if (list.length === 0) return;

    // Pré-valida cada arquivo antes de qualquer chamada de rede.
    const validos: { f: File; key: string }[] = [];
    for (const f of list) {
      const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const err = validarArquivo(f, idioma);
      if (err) {
        addPending(campoId, {
          key,
          nome: f.name,
          tamanho_bytes: f.size,
          mime: f.type || "application/octet-stream",
          status: "erro",
          progress: 0,
          erro: err,
          file: f,
        });
      } else {
        addPending(campoId, {
          key,
          nome: f.name,
          tamanho_bytes: f.size,
          mime: f.type,
          status: "enviando",
          progress: 0,
          file: f,
        });
        validos.push({ f, key });
      }
    }

    if (validos.length === 0) return;

    let subId = submissaoId;
    if (!subId && onEnsureSubmissao) {
      subId = await onEnsureSubmissao();
    }
    if (!subId || !slug) {
      const msg =
        idioma === "es"
          ? "No se pudo iniciar el envío. Intenta de nuevo."
          : idioma === "en"
            ? "Could not start upload. Please try again."
            : "Não foi possível iniciar o envio. Tente novamente.";
      for (const v of validos) updatePending(campoId, v.key, { status: "erro", erro: msg });
      return;
    }

    setUploadingCampo(campoId);
    try {
      for (const { f, key } of validos) {
        await uploadOne(campoId, key, f, subId, slug);
      }
    } finally {
      setUploadingCampo(null);
    }
  }

  function removerAnexo(campoId: string, anexoId: string) {
    setAnexos((prev) => ({
      ...prev,
      [campoId]: (prev[campoId] ?? []).filter((a) => a.id !== anexoId),
    }));
  }

  function scrollToFirstError(ids: string[]) {
    for (const sec of schema.secoes) {
      if (sec.campos.some((c) => ids.includes(c.id))) {
        sectionRefs.current[sec.id]?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }
  }


  return (
    <form
      className="space-y-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (preview || !onSubmit) return;

        if (pendentes.length > 0) {
          setErrors(new Set(pendentes));
          setShowErrorBanner(true);
          scrollToFirstError(pendentes);
          return;
        }
        setShowErrorBanner(false);

        // Injeta descrição dos anexos como marcador nas respostas.
        const respostasFinal = { ...respostas };
        for (const [campoId, arr] of Object.entries(anexos)) {
          if (arr.length > 0) {
            respostasFinal[`${campoId}__anexos`] = arr.map((a) => ({
              nome: a.nome_original ?? a.nome,
              url: a.drive_view_url,
              mime: a.mime,
              tamanho: a.tamanho_bytes,
            }));
          }
        }

        await onSubmit({
          respostas: respostasFinal,
          preenchido_por_nome: nome,
          preenchido_por_email: email,
          preenchido_por_telefone: tel,
        });
      }}
    >
      {/* Barra de progresso */}
      <div className="sticky top-0 z-10 -mx-4 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-foreground">
            {pendentes.length === 0 ? t.completos : t.faltando(pendentes.length)}
          </span>
          <span className="text-muted-foreground">{progresso}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              pendentes.length === 0 ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {showErrorBanner && pendentes.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
          {t.corrija}
        </div>
      )}

      {/* Contato */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <UserRound className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold">{t.contatoTitulo}</h3>
            <p className="text-xs text-muted-foreground">{t.contatoAjuda}</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <Label className="text-[13px]">
              {t.nome} <span className="text-red-500">*</span>
            </Label>
            <Input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t.nome} />
          </div>
          <div>
            <Label className="text-[13px]">
              {t.email} <span className="text-red-500">*</span>
            </Label>
            <Input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" />
          </div>
          <div>
            <Label className="text-[13px]">{t.tel}</Label>
            <Input value={tel} onChange={(e) => setTel(e.target.value)} placeholder="+55 11 …" />
          </div>
        </div>
      </section>

      {/* Seções */}
      {schema.secoes.map((sec, idx) => {
        const Icon = SECTION_ICONS[idx % SECTION_ICONS.length];
        return (
          <section
            key={sec.id}
            ref={(el) => {
              sectionRefs.current[sec.id] = el;
            }}

            className="rounded-xl border border-border bg-card p-5 shadow-sm"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {idx + 1} / {schema.secoes.length}
                </div>
                <h3 className="text-base font-semibold">{pickLabel(sec.titulo, idioma)}</h3>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {sec.campos.map((campo) => {
                const label = pickLabel(campo.label, idioma);
                const ajuda = pickLabel(campo.ajuda, idioma);
                const value = respostas[campo.id];
                const idKey = `${sec.id}_${campo.id}`;
                const isFullWidth =
                  campo.tipo === "long_text" ||
                  campo.tipo === "multi_select" ||
                  campo.tipo === "anexo_multiplo";
                const hasError = errors.has(campo.id);

                const LabelBlock = (
                  <div>
                    <Label className="text-[13px] font-medium">
                      {label} {campo.obrigatorio && <span className="text-red-500">*</span>}
                    </Label>
                    {ajuda && <p className="mt-0.5 text-xs text-muted-foreground">{ajuda}</p>}
                  </div>
                );

                const errClass = hasError ? "border-red-400 focus-visible:ring-red-300" : "";

                let control: React.ReactNode = null;
                switch (campo.tipo) {
                  case "text":
                  case "numero":
                    control = (
                      <Input
                        type={campo.tipo === "numero" ? "number" : "text"}
                        className={cn("mt-1", errClass)}
                        value={(value as string) ?? ""}
                        onChange={(e) => set(campo.id, e.target.value)}
                      />
                    );
                    break;
                  case "long_text":
                    control = (
                      <>
                        <Textarea
                          rows={3}
                          className={cn("mt-1", errClass)}
                          value={(value as string) ?? ""}
                          onChange={(e) => set(campo.id, e.target.value)}
                        />
                        <div className="mt-1 text-right text-[11px] text-muted-foreground">
                          {t.caracteres(((value as string) ?? "").length)}
                        </div>
                      </>
                    );
                    break;
                  case "boolean":
                    control = (
                      <div
                        className={cn(
                          "mt-1 flex items-center justify-between rounded-md border bg-background px-3 py-2",
                          hasError ? "border-red-400" : "border-border",
                        )}
                      >
                        <span className="text-xs text-muted-foreground">
                          {value ? t.sim : t.nao}
                        </span>
                        <Switch checked={Boolean(value)} onCheckedChange={(v) => set(campo.id, v)} />
                      </div>
                    );
                    break;
                  case "select":
                    control = (
                      <Select
                        value={(value as string) ?? ""}
                        onValueChange={(v) => set(campo.id, v)}
                      >
                        <SelectTrigger className={cn("mt-1", errClass)}>
                          <SelectValue placeholder="—" />
                        </SelectTrigger>
                        <SelectContent>
                          {(campo.opcoes ?? []).map((o) => (
                            <SelectItem key={o} value={o}>
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    );
                    break;
                  case "multi_select": {
                    const arr = (value as string[]) ?? [];
                    control = (
                      <div className={cn("mt-2 flex flex-wrap gap-2", hasError && "outline outline-1 outline-red-300 rounded-md p-1")}>
                        {(campo.opcoes ?? []).map((o) => {
                          const active = arr.includes(o);
                          return (
                            <button
                              key={o}
                              type="button"
                              onClick={() => {
                                const next = active ? arr.filter((x) => x !== o) : [...arr, o];
                                set(campo.id, next);
                              }}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground",
                              )}
                            >
                              {o}
                            </button>
                          );
                        })}
                        {arr.length > 0 && (
                          <span className="ml-1 self-center text-[11px] text-muted-foreground">
                            {arr.length}
                          </span>
                        )}
                      </div>
                    );
                    break;
                  }
                  case "anexo_multiplo": {
                    const rows = anexos[campo.id] ?? [];
                    const uploading = uploadingCampo === campo.id;
                    control = (
                      <div className="mt-2 space-y-3">
                        <label
                          className={cn(
                            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30 px-4 py-6 text-center transition-colors hover:bg-muted/50",
                            hasError ? "border-red-400" : "border-border",
                          )}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (e.dataTransfer?.files) handleFiles(campo.id, e.dataTransfer.files);
                          }}
                        >
                          {uploading ? (
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          ) : (
                            <UploadCloud className="h-6 w-6 text-primary" />
                          )}
                          <div className="text-sm font-medium">{t.upload}</div>
                          <div className="text-xs text-muted-foreground">{t.uploadFormats}</div>
                          <input
                            type="file"
                            multiple
                            accept="application/pdf,image/png,image/jpeg"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files) handleFiles(campo.id, e.target.files);
                              e.target.value = "";
                            }}
                          />
                        </label>
                        {(pendentesArquivo[campo.id] ?? []).length > 0 && (
                          <ul className="space-y-2">
                            {(pendentesArquivo[campo.id] ?? []).map((p) => {
                              const statusLabel =
                                p.status === "concluido"
                                  ? idioma === "es"
                                    ? "Enviado"
                                    : idioma === "en"
                                      ? "Uploaded"
                                      : "Concluído"
                                  : p.status === "erro"
                                    ? idioma === "es"
                                      ? "Error"
                                      : idioma === "en"
                                        ? "Failed"
                                        : "Erro"
                                    : idioma === "es"
                                      ? "Enviando…"
                                      : idioma === "en"
                                        ? "Uploading…"
                                        : "Enviando…";
                              const retryLabel =
                                idioma === "es" ? "Reintentar" : idioma === "en" ? "Retry" : "Tentar novamente";
                              return (
                                <li
                                  key={p.key}
                                  className={cn(
                                    "rounded-lg border px-3 py-2 text-sm transition-colors",
                                    p.status === "erro"
                                      ? "border-red-300 bg-red-50 dark:border-red-900/60 dark:bg-red-950/40"
                                      : p.status === "concluido"
                                        ? "border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40"
                                        : "border-border bg-background",
                                  )}
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="flex min-w-0 items-center gap-2">
                                      {p.status === "enviando" ? (
                                        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
                                      ) : p.status === "concluido" ? (
                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                                      ) : (
                                        <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                      )}
                                      <div className="min-w-0">
                                        <div className="truncate font-medium">{p.nome}</div>
                                        <div className="text-[11px] text-muted-foreground">
                                          <span>{formatBytes(p.tamanho_bytes)}</span>
                                          <span className="mx-1">·</span>
                                          <span
                                            className={cn(
                                              p.status === "erro" && "text-red-600",
                                              p.status === "concluido" && "text-emerald-700 dark:text-emerald-400",
                                            )}
                                          >
                                            {statusLabel}
                                            {p.status === "enviando" ? ` ${p.progress}%` : null}
                                          </span>
                                          {p.status === "erro" && p.erro ? (
                                            <span className="ml-1 text-red-600">· {p.erro}</span>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                      {p.status === "erro" && p.file && (
                                        <button
                                          type="button"
                                          onClick={() => retryPending(campo.id, p.key)}
                                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                                        >
                                          <RotateCw className="h-3.5 w-3.5" />
                                          {retryLabel}
                                        </button>
                                      )}
                                      {p.status !== "concluido" && (
                                        <button
                                          type="button"
                                          onClick={() => removePending(campo.id, p.key)}
                                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                                          aria-label={t.remover}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  {(p.status === "enviando" || p.status === "concluido") && (
                                    <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
                                      <div
                                        className={cn(
                                          "h-full rounded-full transition-all duration-200",
                                          p.status === "concluido" ? "bg-emerald-500" : "bg-primary",
                                        )}
                                        style={{ width: `${p.status === "concluido" ? 100 : p.progress}%` }}
                                      />
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        )}
                        {rows.length > 0 && (
                          <ul className="space-y-2">
                            {rows.map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                              >
                                <div className="flex min-w-0 items-center gap-2">
                                  {mimeIcon(a.mime)}
                                  <div className="min-w-0">
                                    <div className="truncate font-medium">{a.nome_original || a.nome}</div>
                                    <div className="text-[11px] text-muted-foreground">
                                      {formatBytes(a.tamanho_bytes)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  {a.drive_view_url && (
                                    <a
                                      href={a.drive_view_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                                    >
                                      {t.abrir}
                                    </a>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removerAnexo(campo.id, a.id)}
                                    className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-red-600"
                                    aria-label={t.remover}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-[11px] text-muted-foreground">{t.uploadHint}</p>
                      </div>
                    );
                    break;
                  }
                }

                return (
                  <div key={idKey} className={isFullWidth ? "md:col-span-2" : ""}>
                    {LabelBlock}
                    {control}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {!preview && (
        <div className="sticky bottom-0 -mx-4 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-muted-foreground">
              {pendentes.length === 0 ? t.completos : t.faltando(pendentes.length)}
            </p>
            <Button type="submit" size="lg" disabled={submitting} className="min-w-[140px]">
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {submitLabel ?? "Enviar"}
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
