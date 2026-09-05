import { createServerFn } from "@tanstack/react-start";
import { assertCanAccessModule } from "@/lib/admin-guard";
import { friendlyDbError } from "@/lib/db-errors";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const LOGISTICA_STATUS = [
  "rascunho",
  "programado",
  "embarcado",
  "entregue",
  "cancelado",
] as const;
export type LogisticaStatus = (typeof LOGISTICA_STATUS)[number];

export const LOGISTICA_ANEXOS_BUCKET = "logistica-embarques";

export type Embarque = {
  id: string;
  numero: string;
  projeto_id: string;
  transportadora_id: string | null;
  status: LogisticaStatus;
  previsao_saida: string | null;
  data_saida: string | null;
  data_entrega: string | null;
  nf_saida: string | null;
  destino: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

export type EmbarqueItem = {
  id: string;
  embarque_id: string;
  descricao: string;
  quantidade: number;
  unidade: string | null;
  peso_kg: number | null;
  volume_m3: number | null;
  serial: string | null;
  observacoes: string | null;
  ordem: number;
};

export type EmbarqueAnexo = {
  id: string;
  embarque_id: string;
  categoria: string;
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number | null;
  mime_type: string | null;
  created_at: string;
};

// ---------- Listar embarques ----------
const listInput = z
  .object({
    status: z.enum(LOGISTICA_STATUS).optional(),
    projetoId: z.string().uuid().optional(),
    clienteId: z.string().uuid().optional(),
    transportadoraId: z.string().uuid().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    q: z.string().trim().optional(),
  })
  .optional();

export const listEmbarques = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => (input ? listInput.parse(input) : undefined))
  .handler(async ({ data, context }) => {
    let query = (context.supabase as any)
      .from("logistica_embarques")
      .select(
        `id, numero, projeto_id, transportadora_id, status, previsao_saida, data_saida, data_entrega, nf_saida, destino, observacoes, created_at, updated_at,
         projeto:equipamento_projetos!inner(id, revisao, cliente_id, cliente:clientes(id, nome_fantasia, razao_social), equipamento:cliente_equipamentos(id, apelido, modelo)),
         transportadora:compras_transportadoras(id, nome)`
      )
      .order("created_at", { ascending: false })
      .limit(300);

    if (data?.status) query = query.eq("status", data.status);
    if (data?.projetoId) query = query.eq("projeto_id", data.projetoId);
    if (data?.transportadoraId) query = query.eq("transportadora_id", data.transportadoraId);
    if (data?.clienteId) query = query.eq("projeto.cliente_id", data.clienteId);
    if (data?.dateFrom) query = query.gte("previsao_saida", data.dateFrom);
    if (data?.dateTo) query = query.lte("previsao_saida", data.dateTo);
    if (data?.q && data.q.length >= 2) {
      const like = `%${data.q}%`;
      query = query.or(`numero.ilike.${like},nf_saida.ilike.${like},destino.ilike.${like}`);
    }

    const { data: rows, error } = await query;
    if (error) throw friendlyDbError(error);
    return rows ?? [];
  });

// ---------- Clientes com embarques (para filtro) ----------
export const listClientesComEmbarques = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("logistica_embarques")
      .select("projeto:equipamento_projetos!inner(cliente:clientes!inner(id, nome_fantasia, razao_social))")
      .limit(1000);
    if (error) throw friendlyDbError(error);
    const seen = new Map<string, { id: string; nome: string }>();
    for (const row of (data ?? []) as any[]) {
      const c = row?.projeto?.cliente;
      if (c?.id && !seen.has(c.id)) {
        seen.set(c.id, { id: c.id, nome: c.nome_fantasia || c.razao_social || "—" });
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  });

// ---------- Detalhe ----------
export const getEmbarque = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: emb, error } = await (context.supabase as any)
      .from("logistica_embarques")
      .select(
        `*,
         projeto:equipamento_projetos(id, revisao, cliente:clientes(id, nome_fantasia, razao_social), equipamento:cliente_equipamentos(id, apelido, modelo)),
         transportadora:compras_transportadoras(id, nome, cnpj, contato, telefone)`
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw friendlyDbError(error);
    if (!emb) throw new Error("Embarque não encontrado.");

    const [{ data: itens }, { data: anexos }] = await Promise.all([
      (context.supabase as any)
        .from("logistica_embarque_itens")
        .select("*")
        .eq("embarque_id", data.id)
        .order("ordem", { ascending: true }),
      (context.supabase as any)
        .from("logistica_embarque_anexos")
        .select("*")
        .eq("embarque_id", data.id)
        .order("created_at", { ascending: false }),
    ]);

    return {
      embarque: emb,
      itens: (itens ?? []) as EmbarqueItem[],
      anexos: (anexos ?? []) as EmbarqueAnexo[],
    };
  });

// ---------- Projetos disponíveis (candidatos a embarque) ----------
export const listProjetosDisponiveis = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("equipamento_projetos")
      .select(
        "id, revisao, fase, status, cliente:clientes(id, nome_fantasia, razao_social), equipamento:cliente_equipamentos(id, apelido, modelo)"
      )
      .is("deleted_at", null)
      .order("updated_at", { ascending: false })
      .limit(200);
    if (error) throw friendlyDbError(error);
    return data ?? [];
  });

// ---------- Transportadoras ativas ----------
export const listTransportadoras = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any)
      .from("compras_transportadoras")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true });
    if (error) throw friendlyDbError(error);
    return data ?? [];
  });

// ---------- Criar embarque ----------
const createInput = z.object({
  projeto_id: z.string().uuid(),
  transportadora_id: z.string().uuid().optional().nullable(),
  previsao_saida: z.string().optional().nullable(),
  destino: z.string().trim().max(500).optional().nullable(),
  observacoes: z.string().trim().max(2000).optional().nullable(),
});

export const createEmbarque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "logistica");
    const { data: row, error } = await (context.supabase as any)
      .from("logistica_embarques")
      .insert({
        projeto_id: data.projeto_id,
        transportadora_id: data.transportadora_id ?? null,
        previsao_saida: data.previsao_saida || null,
        destino: data.destino ?? null,
        observacoes: data.observacoes ?? null,
        status: "rascunho",
        created_by: context.userId,
        updated_by: context.userId,
      })
      .select("id, numero")
      .single();
    if (error) throw friendlyDbError(error);
    return row as { id: string; numero: string };
  });

// ---------- Atualizar cabeçalho ----------
const updateInput = z.object({
  id: z.string().uuid(),
  transportadora_id: z.string().uuid().nullable().optional(),
  previsao_saida: z.string().nullable().optional(),
  nf_saida: z.string().trim().max(60).nullable().optional(),
  destino: z.string().trim().max(500).nullable().optional(),
  observacoes: z.string().trim().max(2000).nullable().optional(),
});

export const updateEmbarque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "logistica");
    const patch: Record<string, unknown> = { updated_by: context.userId };
    for (const k of ["transportadora_id", "previsao_saida", "nf_saida", "destino", "observacoes"] as const) {
      if (data[k] !== undefined) patch[k] = data[k];
    }
    const { error } = await (context.supabase as any)
      .from("logistica_embarques")
      .update(patch)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// ---------- Mudar status ----------
// Transições que exigem motivo obrigatório (mínimo 5 caracteres).
const CRITICAL_STATUS: LogisticaStatus[] = ["embarcado", "entregue", "cancelado"];

export const setStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(LOGISTICA_STATUS),
        notas: z.string().trim().max(2000).optional().nullable(),
        anexo_ids: z.array(z.string().uuid()).optional().default([]),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "logistica");
    // Motivo obrigatório para transições críticas
    if (CRITICAL_STATUS.includes(data.status)) {
      const trimmed = (data.notas ?? "").trim();
      if (trimmed.length < 5) {
        throw new Error(
          `Motivo obrigatório para marcar como "${data.status}" (mínimo 5 caracteres).`
        );
      }
    }

    // Ler status atual para registrar a transição
    const { data: prev } = await (context.supabase as any)
      .from("logistica_embarques")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    const fromStatus = (prev as { status?: string } | null)?.status ?? null;

    const patch: Record<string, unknown> = { status: data.status, updated_by: context.userId };
    const now = new Date().toISOString();
    if (data.status === "embarcado") patch.data_saida = now;
    if (data.status === "entregue") patch.data_entrega = now;
    const { error } = await (context.supabase as any)
      .from("logistica_embarques")
      .update(patch)
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);

    // Registrar na trilha (idempotente: só se realmente mudou)
    if (fromStatus !== data.status) {
      const { error: logErr } = await (context.supabase as any)
        .from("logistica_embarque_status_log")
        .insert({
          embarque_id: data.id,
          from_status: fromStatus,
          to_status: data.status,
          notas: data.notas?.trim() || null,
          changed_by: context.userId,
          anexo_ids: data.anexo_ids ?? [],
        });
      if (logErr) throw friendlyDbError(logErr);
    }
    return { ok: true };
  });

// ---------- Trilha de auditoria (status) ----------
export type StatusLogAnexo = {
  id: string;
  nome_arquivo: string;
  storage_path: string;
  mime_type: string | null;
};

export type StatusLogEntry = {
  id: string;
  embarque_id: string;
  from_status: LogisticaStatus | null;
  to_status: LogisticaStatus;
  notas: string | null;
  changed_by: string | null;
  changed_at: string;
  actor_nome: string | null;
  actor_email: string | null;
  anexos: StatusLogAnexo[];
};

export const listStatusLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ embarque_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await (context.supabase as any)
      .from("logistica_embarque_status_log")
      .select("id, embarque_id, from_status, to_status, notas, changed_by, changed_at, anexo_ids")
      .eq("embarque_id", data.embarque_id)
      .order("changed_at", { ascending: false });
    if (error) throw friendlyDbError(error);

    const rowsArr = (rows ?? []) as any[];
    const ids = Array.from(new Set(rowsArr.map((r) => r.changed_by).filter(Boolean)));
    const profiles: Record<string, { full_name: string | null; email: string | null }> = {};
    if (ids.length > 0) {
      const { data: profs } = await (context.supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      for (const p of (profs ?? []) as any[]) profiles[p.id] = { full_name: p.full_name, email: p.email };
    }

    const allAnexoIds = Array.from(
      new Set(rowsArr.flatMap((r) => (Array.isArray(r.anexo_ids) ? r.anexo_ids : [])))
    );
    const anexosMap: Record<string, StatusLogAnexo> = {};
    if (allAnexoIds.length > 0) {
      const { data: axs } = await (context.supabase as any)
        .from("logistica_embarque_anexos")
        .select("id, nome_arquivo, storage_path, mime_type")
        .in("id", allAnexoIds);
      for (const a of (axs ?? []) as any[]) {
        anexosMap[a.id] = {
          id: a.id,
          nome_arquivo: a.nome_arquivo,
          storage_path: a.storage_path,
          mime_type: a.mime_type,
        };
      }
    }

    return rowsArr.map((r) => ({
      id: r.id,
      embarque_id: r.embarque_id,
      from_status: r.from_status,
      to_status: r.to_status,
      notas: r.notas,
      changed_by: r.changed_by,
      changed_at: r.changed_at,
      actor_nome: r.changed_by ? profiles[r.changed_by]?.full_name ?? null : null,
      actor_email: r.changed_by ? profiles[r.changed_by]?.email ?? null : null,
      anexos: ((r.anexo_ids ?? []) as string[])
        .map((id) => anexosMap[id])
        .filter(Boolean) as StatusLogAnexo[],
    })) as StatusLogEntry[];
  });

// ---------- Itens ----------
const itemInput = z.object({
  embarque_id: z.string().uuid(),
  descricao: z.string().trim().min(1).max(300),
  quantidade: z.number().positive().default(1),
  unidade: z.string().trim().max(10).optional().nullable(),
  peso_kg: z.number().nonnegative().optional().nullable(),
  volume_m3: z.number().nonnegative().optional().nullable(),
  serial: z.string().trim().max(120).optional().nullable(),
  observacoes: z.string().trim().max(500).optional().nullable(),
});

export const addItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => itemInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "logistica");
    const { data: max } = await (context.supabase as any)
      .from("logistica_embarque_itens")
      .select("ordem")
      .eq("embarque_id", data.embarque_id)
      .order("ordem", { ascending: false })
      .limit(1)
      .maybeSingle();
    const ordem = ((max as { ordem?: number } | null)?.ordem ?? 0) + 1;

    const { data: row, error } = await (context.supabase as any)
      .from("logistica_embarque_itens")
      .insert({
        embarque_id: data.embarque_id,
        descricao: data.descricao,
        quantidade: data.quantidade,
        unidade: data.unidade ?? "un",
        peso_kg: data.peso_kg ?? null,
        volume_m3: data.volume_m3 ?? null,
        serial: data.serial ?? null,
        observacoes: data.observacoes ?? null,
        ordem,
      })
      .select("*")
      .single();
    if (error) throw friendlyDbError(error);
    return row as EmbarqueItem;
  });

export const removeItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "logistica");
    const { error } = await (context.supabase as any)
      .from("logistica_embarque_itens")
      .delete()
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

// ---------- Anexos: registrar após upload no bucket ----------
const anexoInput = z.object({
  embarque_id: z.string().uuid(),
  categoria: z.enum(["foto", "nf", "comprovante", "outro", "status"]).default("foto"),
  nome_arquivo: z.string().trim().min(1).max(300),
  storage_path: z.string().trim().min(1).max(600),
  tamanho_bytes: z.number().int().nonnegative().optional().nullable(),
  mime_type: z.string().trim().max(120).optional().nullable(),
});

export const registrarAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => anexoInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "logistica");
    const { data: row, error } = await (context.supabase as any)
      .from("logistica_embarque_anexos")
      .insert({
        embarque_id: data.embarque_id,
        categoria: data.categoria,
        nome_arquivo: data.nome_arquivo,
        storage_path: data.storage_path,
        tamanho_bytes: data.tamanho_bytes ?? null,
        mime_type: data.mime_type ?? null,
        created_by: context.userId,
      })
      .select("*")
      .single();
    if (error) throw friendlyDbError(error);
    return row as EmbarqueAnexo;
  });

export const removerAnexo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid(), storage_path: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertCanAccessModule(context.supabase, context.userId, "logistica");
    await (context.supabase as any).storage.from(LOGISTICA_ANEXOS_BUCKET).remove([data.storage_path]);
    const { error } = await (context.supabase as any)
      .from("logistica_embarque_anexos")
      .delete()
      .eq("id", data.id);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

export const getAnexoSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ path: z.string().min(1), expiresIn: z.number().int().positive().max(60 * 60 * 24).optional() }).parse(input)
  )
  .handler(async ({ data, context }) => {
    const { data: res, error } = await (context.supabase as any).storage
      .from(LOGISTICA_ANEXOS_BUCKET)
      .createSignedUrl(data.path, data.expiresIn ?? 60 * 60);
    if (error) throw friendlyDbError(error);
    return { url: (res as { signedUrl: string }).signedUrl };
  });

// ---------- Gerar PDF do romaneio ----------
export const generateRomaneioPdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        embarque_id: z.string().uuid(),
        anexo_ids: z.array(z.string().uuid()).optional().default([]),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const supa = context.supabase as any;

    const { data: emb, error: eErr } = await supa
      .from("logistica_embarques")
      .select(
        `id, numero, status, previsao_saida, data_saida, data_entrega, nf_saida, destino, observacoes,
         projeto:equipamento_projetos(id, revisao,
           cliente:clientes(id, nome_fantasia, razao_social, cnpj),
           equipamento:cliente_equipamentos(id, apelido, modelo)),
         transportadora:compras_transportadoras(id, nome, cnpj, contato, telefone)`
      )
      .eq("id", data.embarque_id)
      .maybeSingle();
    if (eErr) throw friendlyDbError(eErr);
    if (!emb) throw new Error("Embarque não encontrado.");

    const [{ data: itens }, { data: logs }] = await Promise.all([
      supa
        .from("logistica_embarque_itens")
        .select("*")
        .eq("embarque_id", data.embarque_id)
        .order("ordem", { ascending: true }),
      supa
        .from("logistica_embarque_status_log")
        .select("from_status, to_status, changed_at, changed_by")
        .eq("embarque_id", data.embarque_id)
        .order("changed_at", { ascending: true }),
    ]);

    const actorIds = Array.from(new Set(((logs ?? []) as any[]).map((l) => l.changed_by).filter(Boolean)));
    let actorMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profs } = await supa.from("profiles").select("id, full_name, email").in("id", actorIds);
      actorMap = Object.fromEntries(
        ((profs ?? []) as any[]).map((p) => [p.id, p.full_name || p.email || "—"])
      );
    }

    // Carregar layout do documento (fallback simples)
    const { data: layoutRow } = await supa
      .from("documento_layout_config")
      .select("*")
      .eq("tipo_codigo", "romaneio")
      .maybeSingle();
    const layout = (layoutRow ?? {
      tipo_codigo: "romaneio",
      empresa_nome: "Solutek",
      empresa_endereco: null,
      empresa_contato: null,
      rodape_extra: null,
      accent_color: "#0B3D91",
      logo_url: null,
    }) as any;

    // Anexos selecionados: baixar imagens como data URL
    let selectedAnexos: any[] = [];
    if (data.anexo_ids && data.anexo_ids.length > 0) {
      const { data: rows } = await supa
        .from("logistica_embarque_anexos")
        .select("id, categoria, nome_arquivo, storage_path, mime_type")
        .in("id", data.anexo_ids)
        .eq("embarque_id", data.embarque_id);
      selectedAnexos = (rows ?? []) as any[];
    }

    const anexosResolved: Array<{ categoria: string; nome_arquivo: string; mime_type: string | null; dataUrl: string | null }> = [];
    for (const a of selectedAnexos) {
      const isImage = (a.mime_type || "").startsWith("image/");
      if (!isImage) {
        anexosResolved.push({
          categoria: a.categoria,
          nome_arquivo: a.nome_arquivo,
          mime_type: a.mime_type,
          dataUrl: null,
        });
        continue;
      }
      try {
        const { data: blob, error: dlErr } = await supa.storage
          .from(LOGISTICA_ANEXOS_BUCKET)
          .download(a.storage_path);
        if (dlErr || !blob) throw new Error(dlErr?.message ?? "download falhou");
        const buf = Buffer.from(await (blob as Blob).arrayBuffer());
        const b64 = buf.toString("base64");
        anexosResolved.push({
          categoria: a.categoria,
          nome_arquivo: a.nome_arquivo,
          mime_type: a.mime_type,
          dataUrl: `data:${a.mime_type};base64,${b64}`,
        });
      } catch {
        anexosResolved.push({
          categoria: a.categoria,
          nome_arquivo: a.nome_arquivo,
          mime_type: a.mime_type,
          dataUrl: null,
        });
      }
    }

    const cli = (emb as any).projeto?.cliente;
    const eq = (emb as any).projeto?.equipamento;

    const payload = {
      numero: (emb as any).numero,
      status: (emb as any).status,
      cliente: cli
        ? { nome: cli.nome_fantasia || cli.razao_social || "—", documento: cli.cnpj ?? null }
        : null,
      equipamento: eq ? { titulo: eq.apelido || eq.modelo || "—" } : null,
      projeto: (emb as any).projeto ? { revisao: (emb as any).projeto.revisao ?? null } : null,
      transportadora: (emb as any).transportadora
        ? {
            nome: (emb as any).transportadora.nome,
            cnpj: (emb as any).transportadora.cnpj ?? null,
            contato: (emb as any).transportadora.contato ?? null,
            telefone: (emb as any).transportadora.telefone ?? null,
          }
        : null,
      previsao_saida: (emb as any).previsao_saida,
      data_saida: (emb as any).data_saida,
      data_entrega: (emb as any).data_entrega,
      nf_saida: (emb as any).nf_saida,
      destino: (emb as any).destino,
      observacoes: (emb as any).observacoes,
      itens: ((itens ?? []) as any[]).map((it) => ({
        ordem: it.ordem,
        descricao: it.descricao,
        quantidade: Number(it.quantidade),
        unidade: it.unidade,
        serial: it.serial,
        peso_kg: it.peso_kg,
        volume_m3: it.volume_m3,
      })),
      statusLog: ((logs ?? []) as any[]).map((l) => ({
        from_status: l.from_status,
        to_status: l.to_status,
        changed_at: l.changed_at,
        actor_nome: l.changed_by ? actorMap[l.changed_by] ?? null : null,
      })),
      anexos: anexosResolved,
    };

    const { data: me } = await supa.from("profiles").select("full_name, email").eq("id", context.userId).maybeSingle();
    const responsavel = (me as any)?.full_name || (me as any)?.email || "—";

    const { renderToBuffer } = await import("@react-pdf/renderer");
    const { RomaneioPdf } = await import("./docs/romaneio-pdf");
    const React = (await import("react")).default;
    const buffer = await renderToBuffer(
      React.createElement(RomaneioPdf, { layout, payload, responsavel }) as any
    );
    return {
      filename: `romaneio-${payload.numero}.pdf`,
      base64: Buffer.from(buffer).toString("base64"),
    };
  });

// ---------- Exportar trilha de auditoria (CSV / PDF) ----------
export const exportStatusLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        embarque_id: z.string().uuid(),
        format: z.enum(["csv", "pdf"]),
      })
      .parse(input)
  )
  .handler(async ({ data, context }) => {
    const supa = context.supabase as any;

    const { data: emb } = await supa
      .from("logistica_embarques")
      .select("numero")
      .eq("id", data.embarque_id)
      .maybeSingle();
    const numero = (emb as { numero?: string } | null)?.numero ?? "embarque";

    const { data: rows, error } = await supa
      .from("logistica_embarque_status_log")
      .select("id, from_status, to_status, notas, changed_by, changed_at, anexo_ids")
      .eq("embarque_id", data.embarque_id)
      .order("changed_at", { ascending: true });
    if (error) throw friendlyDbError(error);
    const rowsArr = (rows ?? []) as any[];

    // Autores
    const actorIds = Array.from(new Set(rowsArr.map((r) => r.changed_by).filter(Boolean)));
    const actorMap: Record<string, string> = {};
    if (actorIds.length > 0) {
      const { data: profs } = await supa
        .from("profiles")
        .select("id, full_name, email")
        .in("id", actorIds);
      for (const p of (profs ?? []) as any[])
        actorMap[p.id] = p.full_name || p.email || "—";
    }

    // Anexos referenciados
    const anexoIds = Array.from(
      new Set(rowsArr.flatMap((r) => (Array.isArray(r.anexo_ids) ? r.anexo_ids : [])))
    );
    const anexoMap: Record<string, string> = {};
    if (anexoIds.length > 0) {
      const { data: axs } = await supa
        .from("logistica_embarque_anexos")
        .select("id, nome_arquivo")
        .in("id", anexoIds);
      for (const a of (axs ?? []) as any[]) anexoMap[a.id] = a.nome_arquivo;
    }

    const fmtDate = (iso: string) => {
      try {
        return new Date(iso).toLocaleString("pt-BR");
      } catch {
        return iso;
      }
    };

    if (data.format === "csv") {
      const escape = (v: unknown) => {
        const s = v == null ? "" : String(v);
        return `"${s.replace(/"/g, '""')}"`;
      };
      const header = [
        "data_hora",
        "de",
        "para",
        "autor",
        "motivo",
        "anexos",
      ].map(escape).join(";");
      const lines = rowsArr.map((r) => {
        const anexos = ((r.anexo_ids ?? []) as string[])
          .map((id) => anexoMap[id])
          .filter(Boolean)
          .join(" | ");
        return [
          fmtDate(r.changed_at),
          r.from_status ?? "",
          r.to_status,
          r.changed_by ? actorMap[r.changed_by] ?? "" : "",
          r.notas ?? "",
          anexos,
        ].map(escape).join(";");
      });
      const csv = "\uFEFF" + [header, ...lines].join("\n");
      const base64 = Buffer.from(csv, "utf8").toString("base64");
      return {
        filename: `trilha-${numero}.csv`,
        mime: "text/csv;charset=utf-8",
        base64,
      };
    }

    // PDF via react-pdf
    const { renderToBuffer, Document, Page, Text, View, StyleSheet } =
      await import("@react-pdf/renderer");
    const React = (await import("react")).default;

    const styles = StyleSheet.create({
      page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
      title: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
      subtitle: { fontSize: 10, color: "#555", marginBottom: 12 },
      row: {
        borderBottomWidth: 0.5,
        borderBottomColor: "#ccc",
        paddingVertical: 6,
      },
      head: { flexDirection: "row", fontWeight: 700, marginBottom: 4 },
      cellDate: { width: "22%" },
      cellFlow: { width: "28%" },
      cellActor: { width: "25%" },
      cellNotes: { width: "25%" },
      notes: { color: "#333", marginTop: 3, fontStyle: "italic" },
      anexos: { color: "#0B3D91", marginTop: 2, fontSize: 9 },
    });

    const el = React.createElement(
      Document as any,
      null,
      React.createElement(
        Page as any,
        { size: "A4", style: styles.page },
        React.createElement(Text as any, { style: styles.title }, `Trilha de auditoria — ${numero}`),
        React.createElement(
          Text as any,
          { style: styles.subtitle },
          `Gerado em ${new Date().toLocaleString("pt-BR")} · ${rowsArr.length} evento(s)`
        ),
        React.createElement(
          View as any,
          { style: styles.head },
          React.createElement(Text as any, { style: styles.cellDate }, "Data / hora"),
          React.createElement(Text as any, { style: styles.cellFlow }, "Transição"),
          React.createElement(Text as any, { style: styles.cellActor }, "Autor"),
          React.createElement(Text as any, { style: styles.cellNotes }, "Motivo")
        ),
        ...rowsArr.map((r, i) => {
          const anexos = ((r.anexo_ids ?? []) as string[])
            .map((id) => anexoMap[id])
            .filter(Boolean);
          return React.createElement(
            View as any,
            { key: i, style: styles.row, wrap: false },
            React.createElement(
              View as any,
              { style: { flexDirection: "row" } },
              React.createElement(Text as any, { style: styles.cellDate }, fmtDate(r.changed_at)),
              React.createElement(
                Text as any,
                { style: styles.cellFlow },
                `${r.from_status ?? "—"} → ${r.to_status}`
              ),
              React.createElement(
                Text as any,
                { style: styles.cellActor },
                r.changed_by ? actorMap[r.changed_by] ?? "—" : "—"
              ),
              React.createElement(Text as any, { style: styles.cellNotes }, r.notas ?? "—")
            ),
            anexos.length > 0
              ? React.createElement(
                  Text as any,
                  { style: styles.anexos },
                  `Anexos: ${anexos.join(", ")}`
                )
              : null
          );
        })
      )
    );

    const buffer = await renderToBuffer(el as any);
    return {
      filename: `trilha-${numero}.pdf`,
      mime: "application/pdf",
      base64: Buffer.from(buffer).toString("base64"),
    };
  });
