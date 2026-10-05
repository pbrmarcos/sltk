// "Minerar dados" da ficha do cliente: pesquisa a empresa em várias fontes e
// completa o cadastro. Fontes (as que já existem no sistema):
//   1. Busca no Google via Gemini — site, telefone, e-mail, redes, endereço.
//   2. Motor de qualificação (`qualificarLead`) — lê o site, descobre o CNPJ e
//      SEMPRE confere na Receita, aplica as regras e dá a nota A/B/C.
// Regra de ouro: só preenche campos VAZIOS e só adiciona sócios novos — nunca
// sobrescreve o que o vendedor digitou. Novas fontes (ex.: Apollo) entram como
// mais um passo antes do merge, alimentando o mesmo objeto `achados`.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { friendlyDbError } from "@/lib/db-errors";
import { logAuditServer } from "@/lib/audit.server";

type BuscaGoogle = {
  site?: string | null;
  telefone?: string | null;
  email?: string | null;
  linkedin?: string | null;
  instagram?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  estado?: string | null;
  documento?: string | null;
  resumo?: string | null;
};

export type MineracaoIA = {
  grade: "A" | "B" | "C" | null;
  motivo: string | null;
  abordagem_sugerida: string | null;
  produtos_sltk: string[];
  resumo: string | null;
  ja_cliente: { id: string; nome: string } | null;
  etapas: string[];
  campos_preenchidos: string[];
};

function limpo(v: unknown): string | null {
  if (v == null) return null;
  const t = String(v).trim();
  if (!t || /^(null|undefined|n\/a|na|-|nao_encontrado|não encontrado)$/i.test(t)) return null;
  return t;
}

const CAMPO_LABEL: Record<string, string> = {
  site: "site",
  email_corporativo: "e-mail",
  telefone_corporativo_numero: "telefone",
  social_linkedin: "LinkedIn",
  social_instagram: "Instagram",
  endereco_logradouro: "endereço",
  endereco_numero: "número",
  endereco_bairro: "bairro",
  endereco_cidade: "cidade",
  endereco_estado: "estado",
  endereco_codigo_postal: "CEP",
  documento_fiscal_numero: "CNPJ",
  nome_fantasia: "nome fantasia",
  cnae_principal: "CNAE",
  cnaes_secundarios: "CNAEs secundários",
  porte: "porte",
  situacao_cadastral: "situação cadastral",
  data_abertura: "data de abertura",
  capital_social: "capital social",
  natureza_juridica_descricao: "natureza jurídica",
};

export const minerarCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { cliente_id: string }) =>
    z.object({ cliente_id: z.string().uuid() }).parse(d),
  )
  .handler(
    async ({
      data,
      context,
    }): Promise<
      | { ok: true; preenchidos: string[]; socios_novos: number; mineracao: MineracaoIA }
      | { ok: false; error: string }
    > => {
      const { assertCanAccessModule } = await import("@/lib/admin-guard");
      await assertCanAccessModule(
        context.supabase,
        context.userId,
        "clientes",
        "Acesso restrito ao módulo de clientes.",
      );
      const { aiConfigured, aiChatComplete, extractJsonFromAi } =
        await import("@/lib/ai-gateway.server");
      if (!(await aiConfigured())) {
        return {
          ok: false,
          error: "Minerar dados precisa da chave do Gemini (Admin → Chaves & Diagnóstico).",
        };
      }

      // Leitura com o client do usuário: respeita RLS (só minera o que pode ver).
      const sb = context.supabase as unknown as {
        from: (t: string) => any;
      };
      const { data: cli, error: cliErr } = await sb
        .from("clientes")
        .select("*")
        .eq("id", data.cliente_id)
        .is("deleted_at", null)
        .maybeSingle();
      if (cliErr) throw friendlyDbError(cliErr);
      if (!cli) return { ok: false, error: "Cliente não encontrado." };
      const c = cli as Record<string, any>;

      const [{ data: contatos }, { data: seg }] = await Promise.all([
        sb
          .from("cliente_contatos")
          .select("email, telefone_numero")
          .eq("cliente_id", c.id)
          .is("deleted_at", null)
          .limit(3),
        c.segmento_id
          ? sb.from("segmentos").select("nome").eq("id", c.segmento_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      const segmentoNome: string | null = seg?.nome ?? c.segmento ?? null;
      const empresa: string = c.nome_fantasia || c.razao_social;
      const docAtual: string = String(c.documento_fiscal_numero ?? "");
      const docReal = docAtual.startsWith("SUSPECT-") ? "" : docAtual;
      const etapas: string[] = [];

      // ===== 1) Busca no Google via Gemini =====
      let google: BuscaGoogle = {};
      try {
        const raw = await aiChatComplete({
          userContent: `Pesquise na internet a empresa "${empresa}"${c.endereco_cidade ? `, de ${c.endereco_cidade}` : ""}, país ${c.pais}${segmentoNome ? `, ramo ${segmentoNome}` : ""}${c.site ? `, site ${c.site}` : ""}.
Responda APENAS com JSON (null no que não tiver certeza — NÃO invente):
{"site":"domínio oficial sem http","telefone":"com DDI","email":"comercial","linkedin":"url da página da empresa","instagram":"url","endereco":"logradouro e número da fábrica/sede","cidade":"...","estado":"UF/região","documento":"CNPJ/RUT/RUC","resumo":"1-2 frases: o que a empresa fabrica e porte aproximado"}`,
          webSearch: true,
          maxOutputTokens: 700,
        });
        google = extractJsonFromAi<BuscaGoogle>(raw) ?? {};
        etapas.push("busca google ok");
      } catch (err) {
        etapas.push(`busca google falhou: ${err instanceof Error ? err.message : "erro"}`);
      }

      // ===== 2) Site + Receita + nota (motor de qualificação) =====
      const contato0 = (contatos ?? [])[0] as
        | { email?: string | null; telefone_numero?: string | null }
        | undefined;
      let qualify: Awaited<
        ReturnType<typeof import("@/lib/lead-qualify.server").qualificarLead>
      > | null = null;
      try {
        const { qualificarLead } = await import("@/lib/lead-qualify.server");
        qualify = await qualificarLead({
          empresa,
          pais: c.pais,
          cidade: c.endereco_cidade || limpo(google.cidade),
          telefone:
            c.telefone_corporativo_numero || contato0?.telefone_numero || limpo(google.telefone),
          email: c.email_corporativo || contato0?.email || limpo(google.email),
          site: c.site || limpo(google.site),
          documento: docReal || limpo(google.documento),
          segmento: segmentoNome,
          origem: "ficha",
          extras: [limpo(google.resumo), c.observacoes].filter(Boolean).join(" · ") || null,
          userId: context.userId,
          excluirClienteId: c.id,
        });
        etapas.push(...qualify.etapas);
      } catch (err) {
        etapas.push(`qualificação falhou: ${err instanceof Error ? err.message : "erro"}`);
      }

      // ===== 3) Merge: só campos vazios =====
      const receita = qualify?.dados.receita ?? null;
      const site = qualify?.dados.site ?? null;
      const candidatos: Record<string, unknown> = {
        site: limpo(google.site),
        email_corporativo:
          limpo(receita?.email_corporativo) ?? limpo(site?.emails?.[0]) ?? limpo(google.email),
        telefone_corporativo_numero:
          limpo(receita?.telefone_corporativo_numero) ??
          limpo(site?.telefones?.[0]) ??
          limpo(google.telefone),
        social_linkedin: limpo(google.linkedin),
        social_instagram: limpo(google.instagram),
        endereco_logradouro: limpo(receita?.endereco_logradouro) ?? limpo(google.endereco),
        endereco_numero: limpo(receita?.endereco_numero),
        endereco_bairro: limpo(receita?.endereco_bairro),
        endereco_cidade: limpo(receita?.endereco_cidade) ?? limpo(google.cidade),
        endereco_estado: limpo(receita?.endereco_estado) ?? limpo(google.estado),
        endereco_codigo_postal: limpo(receita?.endereco_codigo_postal),
        nome_fantasia: limpo(receita?.nome_fantasia),
        cnae_principal: limpo(receita?.cnae_principal),
        cnaes_secundarios: receita?.cnaes_secundarios?.length ? receita.cnaes_secundarios : null,
        porte: limpo(receita?.porte),
        situacao_cadastral: limpo(receita?.situacao_cadastral),
        data_abertura: limpo(receita?.data_abertura),
        capital_social: receita?.capital_social ?? null,
        natureza_juridica_descricao: limpo(receita?.natureza_juridica_descricao),
      };
      if (
        receita?.telefone_corporativo_ddi &&
        !c.telefone_corporativo_ddi &&
        !c.telefone_corporativo_numero
      ) {
        candidatos.telefone_corporativo_ddi = limpo(receita.telefone_corporativo_ddi);
      }

      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(candidatos)) {
        if (v == null) continue;
        const atual = c[k];
        const vazio = atual == null || atual === "" || (Array.isArray(atual) && atual.length === 0);
        if (vazio) patch[k] = v;
      }
      // Documento verificado na Receita substitui o marcador SUSPECT-xxxx.
      if (qualify?.dados.documento_verificado && !docReal) {
        patch.documento_fiscal_numero = qualify.dados.documento_verificado;
      }

      const mineracao: MineracaoIA = {
        grade: qualify?.grade ?? null,
        motivo: qualify?.motivo ?? null,
        abordagem_sugerida: qualify?.abordagem_sugerida ?? null,
        produtos_sltk: qualify?.produtos_sltk ?? [],
        resumo: limpo(google.resumo) ?? limpo(site?.resumo),
        ja_cliente: qualify?.ja_cliente ?? null,
        etapas,
        campos_preenchidos: Object.keys(patch)
          .filter((k) => k !== "telefone_corporativo_ddi")
          .map((k) => CAMPO_LABEL[k] ?? k),
      };

      if (!qualify && !Object.keys(patch).length && !mineracao.resumo) {
        return {
          ok: false,
          error: "Não consegui pesquisar agora (IA indisponível). Tente de novo em instantes.",
        };
      }

      const { error: upErr } = await sb
        .from("clientes")
        .update({
          ...patch,
          mineracao_ia: mineracao,
          mineracao_grade: mineracao.grade,
          minerado_em: new Date().toISOString(),
          updated_by: context.userId,
        })
        .eq("id", c.id);
      if (upErr) throw friendlyDbError(upErr);

      // ===== 4) Sócios novos (Receita) =====
      let sociosNovos = 0;
      const socios = receita?.socios ?? [];
      if (socios.length) {
        const { data: existentes } = await sb
          .from("cliente_socios")
          .select("nome")
          .eq("cliente_id", c.id)
          .is("deleted_at", null);
        const ja = new Set(
          ((existentes ?? []) as Array<{ nome: string }>).map((s) => s.nome.trim().toLowerCase()),
        );
        const novos = socios
          .filter((s) => s.nome && !ja.has(s.nome.trim().toLowerCase()))
          .map((s) => ({
            cliente_id: c.id,
            nome: s.nome,
            qualificacao: s.qualificacao ?? null,
            desde: s.desde ?? null,
            created_by: context.userId,
          }));
        if (novos.length) {
          const { error: sErr } = await sb.from("cliente_socios").insert(novos);
          if (!sErr) sociosNovos = novos.length;
          else etapas.push("sócios não gravados");
        }
      }

      try {
        const { getCriticalClient } = await import("@/lib/supabase-client.server");
        await logAuditServer(await getCriticalClient(), context.userId, [
          {
            table_name: "clientes",
            record_id: c.id,
            action: "UPDATE",
            field_changed: "minerar_dados",
            new_value: {
              grade: mineracao.grade,
              campos: mineracao.campos_preenchidos,
              socios_novos: sociosNovos,
            },
          },
        ]);
      } catch {
        // auditoria é best-effort
      }

      return {
        ok: true,
        preenchidos: mineracao.campos_preenchidos,
        socios_novos: sociosNovos,
        mineracao,
      };
    },
  );
