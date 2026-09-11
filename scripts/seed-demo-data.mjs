#!/usr/bin/env bun
// ============================================================================
// Seed de dados de demonstração: 8 jornadas completas de cliente.
// Roda uma vez, direto contra o banco (service-role, sem passar pelas
// createServerFn — elas exigem uma sessão JWT real de usuário autenticado,
// inviável num script). Cada linha inserida é espelhada em
// demo_seed_registry, pra o botão "Excluir conteúdo DEMO" poder reverter.
//
// Uso: bun scripts/seed-demo-data.mjs
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const path = join(__dirname, "..", ".env");
  const txt = readFileSync(path, "utf-8");
  for (const line of txt.split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) {
      const key = m[1];
      let val = m[2].trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não encontrados em .env");
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 1x1 PNG transparente — evidência real de verdade, não só metadado no banco.
const TINY_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
const TINY_PNG_BYTES = Buffer.from(TINY_PNG_BASE64, "base64");

const registry = [];
function track(table, id) {
  if (id) registry.push({ table_name: table, record_id: id });
}

async function insertOne(table, row) {
  const { data, error } = await sb.from(table).insert(row).select().single();
  if (error) throw new Error(`[insert ${table}] ${error.message}`);
  track(table, data.id);
  return data;
}

async function updateOne(table, id, patch) {
  const { error } = await sb.from(table).update(patch).eq("id", id);
  if (error) throw new Error(`[update ${table}] ${error.message}`);
}

function log(msg) {
  console.log(msg);
}

async function findAdminId() {
  const { data, error } = await sb
    .from("user_roles")
    .select("user_id, role")
    .in("role", ["admin", "manager"])
    .limit(1);
  if (error) throw new Error(`[user_roles] ${error.message}`);
  return data?.[0]?.user_id ?? null;
}

async function findChecklistTipo() {
  const { data, error } = await sb
    .from("checklist_formulario_tipo")
    .select("id, campos_schema")
    .eq("ativo", true)
    .limit(1);
  if (error) throw new Error(`[checklist_formulario_tipo] ${error.message}`);
  return data?.[0] ?? null;
}

async function ensureSatTemplate(adminId) {
  const { data: existing, error: e1 } = await sb
    .from("sat_template")
    .select("id, versao")
    .eq("ativo", true)
    .limit(1);
  if (e1) throw new Error(`[sat_template] ${e1.message}`);
  if (existing?.[0]) return existing[0];

  log("  (nenhum sat_template ativo — criando um mínimo, infraestrutura permanente, não-demo)");
  const tpl = await sb
    .from("sat_template")
    .insert({ nome: "Relatório SAT padrão", versao: 1, ativo: true, created_by: adminId })
    .select()
    .single();
  if (tpl.error) throw new Error(`[sat_template insert] ${tpl.error.message}`);
  const secao = await sb
    .from("sat_template_secao")
    .insert({ template_id: tpl.data.id, ordem: 1, titulo: "Comissionamento" })
    .select()
    .single();
  if (secao.error) throw new Error(`[sat_template_secao insert] ${secao.error.message}`);
  const item = await sb.from("sat_template_item").insert({
    secao_id: secao.data.id,
    ordem: 1,
    label: "Equipamento em operação conforme especificado?",
    tipo: "sim_nao_comentario",
    obrigatorio: true,
    permite_anexo: true,
    opcoes: [],
  });
  if (item.error) throw new Error(`[sat_template_item insert] ${item.error.message}`);
  return { id: tpl.data.id, versao: tpl.data.versao };
}

function buildRespostas(camposSchema) {
  const respostas = {};
  const secoes = camposSchema?.secoes ?? [];
  for (const sec of secoes) {
    for (const campo of sec.campos ?? []) {
      if (!campo?.id) continue;
      switch (campo.tipo) {
        case "checkbox":
        case "boolean":
          respostas[campo.id] = true;
          break;
        case "numero":
        case "number":
          respostas[campo.id] = 10;
          break;
        case "data":
        case "date":
          respostas[campo.id] = new Date().toISOString().slice(0, 10);
          break;
        case "select":
        case "radio":
          respostas[campo.id] =
            Array.isArray(campo.opcoes) && campo.opcoes.length ? campo.opcoes[0] : "Sim";
          break;
        default:
          respostas[campo.id] = "Resposta de demonstração.";
      }
    }
  }
  return respostas;
}

const MONTAGEM_ETAPA_TIPOS = [
  { tipo: "pre_montagem", ordem: 1 },
  { tipo: "mecanica", ordem: 2 },
  { tipo: "eletrica", ordem: 3 },
  { tipo: "testes", ordem: 4 },
  { tipo: "embalagem", ordem: 5 },
];

// 8 perfis com valores variados de status pra cobrir os enums na íntegra.
const PROFILES = [
  {
    nome: "Demo Indústria 01",
    pais: "BR",
    doc_tipo: "CNPJ",
    doc: "00000000000101",
    moeda: "BRL",
    status: "ativo",
    pipeline_stage: "ganho",
    etp_status: "aprovado",
    projeto_status: "liberado_producao",
    montagem_rica: true,
    revisao_status: "aprovada",
    fat_status: "homologado",
    sat_status: "assinado",
    chamado_status: "resolvido",
    embarque_status: "entregue",
  },
  {
    nome: "Demo Indústria 02",
    pais: "BR",
    doc_tipo: "CNPJ",
    doc: "00000000000102",
    moeda: "BRL",
    status: "ativo",
    pipeline_stage: "negociacao",
    etp_status: "em_revisao",
    projeto_status: "em_aprovacao",
    montagem_rica: true,
    revisao_status: "aprovada_com_ressalvas",
    fat_status: "em_execucao",
    sat_status: "preenchendo",
    chamado_status: "em_analise",
    embarque_status: "embarcado",
  },
  {
    nome: "Demo Indústria 03",
    pais: "AR",
    doc_tipo: "CUIT",
    doc: "20000000001",
    moeda: "USD",
    status: "prospect",
    pipeline_stage: "proposta",
    etp_status: "em_revisao",
    projeto_status: "em_elaboracao",
    montagem_rica: false,
    revisao_status: "em_andamento",
    fat_status: "rascunho",
    sat_status: "rascunho",
    chamado_status: "aberto",
    embarque_status: "programado",
  },
  {
    nome: "Demo Indústria 04",
    pais: "CL",
    doc_tipo: "RUT",
    doc: "123456785",
    moeda: "USD",
    status: "prospect",
    pipeline_stage: "qualificado",
    etp_status: "rascunho",
    projeto_status: "em_elaboracao",
    montagem_rica: false,
    revisao_status: "pendente",
    fat_status: "rascunho",
    sat_status: "rascunho",
    chamado_status: "aberto",
    embarque_status: "rascunho",
  },
  {
    nome: "Demo Indústria 05",
    pais: "BR",
    doc_tipo: "CNPJ",
    doc: "00000000000105",
    moeda: "BRL",
    status: "suspect",
    pipeline_stage: "novo",
    etp_status: "rascunho",
    projeto_status: "em_elaboracao",
    montagem_rica: false,
    revisao_status: "pendente",
    fat_status: "rascunho",
    sat_status: "rascunho",
    chamado_status: "aguardando_cliente",
    embarque_status: "rascunho",
  },
  {
    nome: "Demo Indústria 06",
    pais: "MX",
    doc_tipo: "RFC",
    doc: "DEM010101AB1",
    moeda: "USD",
    status: "ativo",
    pipeline_stage: "perdido",
    lost_reason: "Cliente optou por concorrente com prazo de entrega menor.",
    etp_status: "rejeitado",
    projeto_status: "obsoleto",
    montagem_rica: true,
    revisao_status: "reprovada",
    fat_status: "reprovado",
    sat_status: "arquivado",
    chamado_status: "reaberto",
    embarque_status: "cancelado",
  },
  {
    nome: "Demo Indústria 07",
    pais: "BR",
    doc_tipo: "CNPJ",
    doc: "00000000000107",
    moeda: "BRL",
    status: "ativo",
    pipeline_stage: "proposta",
    etp_status: "aprovado",
    projeto_status: "liberado_producao",
    montagem_rica: true,
    revisao_status: "aprovada",
    fat_status: "em_execucao",
    sat_status: "preenchendo",
    chamado_status: "em_analise",
    embarque_status: "programado",
  },
  {
    nome: "Demo Indústria 08",
    pais: "PE",
    doc_tipo: "RUC",
    doc: "20123456789",
    moeda: "USD",
    status: "prospect",
    pipeline_stage: "qualificado",
    etp_status: "em_revisao",
    projeto_status: "em_aprovacao",
    montagem_rica: false,
    revisao_status: "em_andamento",
    fat_status: "rascunho",
    sat_status: "rascunho",
    chamado_status: "arquivado",
    embarque_status: "rascunho",
  },
];

async function seedCliente(profile, adminId) {
  const cliente = await insertOne("clientes", {
    codigo: "",
    razao_social: `${profile.nome} Ltda.`,
    nome_fantasia: profile.nome,
    pais: profile.pais,
    documento_fiscal_tipo: profile.doc_tipo,
    documento_fiscal_numero: profile.doc,
    moeda: profile.moeda,
    idioma: profile.pais === "BR" ? "pt" : "es",
    status: profile.status,
    observacoes: "Cliente de demonstração — criado pelo script de seed.",
    created_by: adminId,
  });

  await insertOne("cliente_contatos", {
    cliente_id: cliente.id,
    nome: `Contato ${profile.nome}`,
    cargo: "Gerente de Manutenção",
    email: `contato@${profile.nome.toLowerCase().replace(/\s+/g, "")}.demo`,
    principal: true,
  });

  return cliente;
}

async function seedOportunidade(profile, cliente, adminId) {
  const patch = {
    titulo: `Projeto envase — ${profile.nome}`,
    cliente_id: cliente.id,
    responsavel_id: adminId,
    valor_estimado: 250000 + Math.random() * 150000,
    probabilidade:
      profile.pipeline_stage === "ganho" ? 100 : profile.pipeline_stage === "perdido" ? 0 : 50,
    pipeline_stage: profile.pipeline_stage,
    lifecycle_stage:
      profile.status === "ativo"
        ? "cliente"
        : profile.status === "prospect"
          ? "prospect"
          : "suspect",
    observacoes: "Oportunidade de demonstração.",
    created_by: adminId,
  };
  if (profile.pipeline_stage === "perdido") {
    patch.lost_reason = profile.lost_reason;
    patch.lost_at = new Date().toISOString();
  }
  return insertOne("oportunidades", patch);
}

async function seedProcesso(profile, cliente, adminId) {
  return insertOne("processos", {
    codigo: "",
    titulo: `Processo — ${profile.nome}`,
    cliente_id: cliente.id,
    pilar_id: adminId,
    created_by: adminId,
  });
}

async function seedEquipamento(profile, cliente, adminId) {
  const statusMap = {
    ganho: "operacional",
    negociacao: "em_fabricacao",
    proposta: "planejamento",
    qualificado: "planejamento",
    novo: "planejamento",
    perdido: "parado",
  };
  return insertOne("cliente_equipamentos", {
    cliente_id: cliente.id,
    modelo: `Envasadora Linear — ${profile.nome}`,
    numero_serie: `DEMO-${randomUUID().slice(0, 8).toUpperCase()}`,
    categoria: "envase",
    status: statusMap[profile.pipeline_stage] ?? "planejamento",
    localizacao: "Planta principal",
    created_by: adminId,
  });
}

async function seedEtp(profile, equipamento, cliente, adminId) {
  const patch = {
    equipamento_id: equipamento.id,
    cliente_id: cliente.id,
    versao: 1,
    status: profile.etp_status,
    escopo: "Escopo de demonstração: envase automatizado de líquidos.",
    created_by: adminId,
  };
  if (profile.etp_status === "aprovado") {
    patch.aprovado_por = adminId;
    patch.aprovado_em = new Date().toISOString();
  }
  return insertOne("equipamento_etps", patch);
}

async function seedProjetos(profile, equipamento, cliente, oportunidade, adminId) {
  const projetos = [];
  for (const disciplina of ["mecanico", "eletrico"]) {
    const p = await insertOne("equipamento_projetos", {
      equipamento_id: equipamento.id,
      cliente_id: cliente.id,
      disciplina,
      revisao: "R00",
      status: profile.projeto_status,
      oportunidade_id: oportunidade.id,
      responsavel_id: adminId,
      created_by: adminId,
    });
    projetos.push(p);
  }
  return projetos;
}

async function seedMontagem(profile, equipamento, cliente, adminId) {
  const montStatusMap = {
    ganho: "concluida",
    negociacao: "em_andamento",
    perdido: "bloqueada",
  };
  const montagem = await insertOne("equipamento_montagens", {
    equipamento_id: equipamento.id,
    cliente_id: cliente.id,
    status: montStatusMap[profile.pipeline_stage] ?? "nao_iniciada",
    responsavel_id: adminId,
    created_by: adminId,
  });

  const etapas = [];
  for (const t of MONTAGEM_ETAPA_TIPOS) {
    const etapa = await insertOne("equipamento_montagem_etapas", {
      montagem_id: montagem.id,
      equipamento_id: equipamento.id,
      cliente_id: cliente.id,
      tipo: t.tipo,
      ordem: t.ordem,
    });
    etapas.push(etapa);
  }

  if (profile.montagem_rica) {
    const primeira = etapas[0];
    const { data: templates, error: tErr } = await sb
      .from("montagem_etapa_checklist_template")
      .select("id")
      .eq("tipo", primeira.tipo)
      .eq("ativo", true);
    if (tErr) throw new Error(`[montagem_etapa_checklist_template] ${tErr.message}`);

    for (const tpl of templates ?? []) {
      await insertOne("montagem_etapa_checklist_resposta", {
        etapa_id: primeira.id,
        template_id: tpl.id,
        ok: true,
        updated_by: adminId,
      });
    }

    const path = `${equipamento.id}/${primeira.id}/${Date.now()}_evidencia-demo.png`;
    const { error: upErr } = await sb.storage
      .from("montagem-evidencias")
      .upload(path, TINY_PNG_BYTES, { contentType: "image/png", upsert: true });
    if (upErr) throw new Error(`[storage montagem-evidencias] ${upErr.message}`);
    await insertOne("montagem_etapa_evidencias", {
      etapa_id: primeira.id,
      equipamento_id: equipamento.id,
      cliente_id: cliente.id,
      nome_arquivo: "evidencia-demo.png",
      mime: "image/png",
      tamanho_bytes: TINY_PNG_BYTES.byteLength,
      storage_path: path,
      created_by: adminId,
    });

    await updateOne("equipamento_montagem_etapas", primeira.id, {
      status: "concluida",
      concluida_em: new Date().toISOString(),
      concluida_por: adminId,
    });
  }

  return montagem;
}

async function seedRevisoes(profile, equipamento, cliente, adminId) {
  for (const disciplina of ["mecanica", "eletrica"]) {
    await insertOne("equipamento_revisoes", {
      equipamento_id: equipamento.id,
      cliente_id: cliente.id,
      disciplina,
      numero: 1,
      status: profile.revisao_status,
      inspetor_id: adminId,
      created_by: adminId,
    });
  }
}

async function seedFat(profile, processo, cliente, adminId) {
  const patch = {
    processo_id: processo.id,
    cliente_id: cliente.id,
    tag_equipamento: `TAG-${profile.nome}`,
    os_codigo: `OS-${profile.nome}`,
    status: profile.fat_status,
    motivos_viagem: [],
    inspetor_id: adminId,
    created_by: adminId,
  };
  if (profile.fat_status === "homologado") {
    patch.homologado_em = new Date().toISOString();
    patch.progresso = 100;
  }
  if (profile.fat_status === "reprovado") {
    patch.reprovado_em = new Date().toISOString();
    patch.reprovado_por = adminId;
    patch.motivo_reprovacao = "Não conformidade em teste de estanqueidade — demonstração.";
  }
  return insertOne("fat_relatorios", patch);
}

async function seedSat(profile, processo, cliente, equipamento, satTemplate, adminId) {
  return insertOne("sat_relatorio", {
    cliente_id: cliente.id,
    processo_id: processo.id,
    equipamento_ids: [equipamento.id],
    template_id: satTemplate.id,
    template_versao: satTemplate.versao,
    status: profile.sat_status,
    dados: {},
    tecnicos: [],
    tecnico_ids: [],
    motivos_viagem: [],
    local_endereco: "Planta do cliente — demonstração.",
    created_by: adminId,
  });
}

function novoCodigoChamado() {
  const pick = () =>
    Array.from(
      { length: 4 },
      () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)],
    ).join("");
  return `TCK-${pick()}-${pick()}`;
}

async function seedChamado(profile, equipamento, cliente) {
  const tokenHash = createHash("sha256").update(randomUUID()).digest("hex");
  return insertOne("chamados", {
    codigo: novoCodigoChamado(),
    token_hash: tokenHash,
    status: profile.chamado_status,
    origem: "interno",
    visitante_nome: `Contato ${profile.nome}`,
    visitante_email: `contato@${profile.nome.toLowerCase().replace(/\s+/g, "")}.demo`,
    numero_serie: equipamento.numero_serie,
    equipamento_id: equipamento.id,
    cliente_id: cliente.id,
    descricao_inicial: "Chamado de demonstração — equipamento apresentando alarme intermitente.",
    assunto: "Alarme intermitente na linha de envase",
    prioridade: "media",
  });
}

async function seedEmbarque(profile, projetoMecanico) {
  return insertOne("logistica_embarques", {
    projeto_id: projetoMecanico.id,
    status: profile.embarque_status,
    destino: "Planta do cliente — demonstração.",
  });
}

async function seedChecklist(profile, cliente, tipo, adminId) {
  const link = await insertOne("checklist_formulario_link", {
    tipo_id: tipo.id,
    cliente_id: cliente.id,
    sales_id: adminId,
    idioma: cliente.idioma ?? "pt",
    slug: `demo-${randomUUID().slice(0, 12)}`,
    status: "preenchido",
    titulo: `Checklist técnico — ${profile.nome}`,
  });

  const respostas = buildRespostas(tipo.campos_schema);
  const submissao = await insertOne("checklist_submissao", {
    link_id: link.id,
    cliente_id: cliente.id,
    tipo_id: tipo.id,
    idioma: link.idioma,
    respostas,
    preenchido_por_nome: `Contato ${profile.nome}`,
    preenchido_por_email: `contato@${profile.nome.toLowerCase().replace(/\s+/g, "")}.demo`,
  });

  await updateOne("checklist_formulario_link", link.id, { submissao_id: submissao.id });
  return submissao;
}

async function seedOneClient(profile, adminId, checklistTipo, satTemplate) {
  log(`\n=== ${profile.nome} ===`);
  const cliente = await seedCliente(profile, adminId);
  log(`  cliente ${cliente.id}`);
  const oportunidade = await seedOportunidade(profile, cliente, adminId);
  log(`  oportunidade ${oportunidade.id} (${profile.pipeline_stage})`);
  const processo = await seedProcesso(profile, cliente, adminId);
  log(`  processo ${processo.id}`);
  const equipamento = await seedEquipamento(profile, cliente, adminId);
  log(`  equipamento ${equipamento.id}`);
  await seedEtp(profile, equipamento, cliente, adminId);
  const projetos = await seedProjetos(profile, equipamento, cliente, oportunidade, adminId);
  log(`  ETP + ${projetos.length} projetos`);
  const montagem = await seedMontagem(profile, equipamento, cliente, adminId);
  log(`  montagem ${montagem.id} (rica=${profile.montagem_rica})`);
  await seedRevisoes(profile, equipamento, cliente, adminId);
  await seedFat(profile, processo, cliente, adminId);
  await seedSat(profile, processo, cliente, equipamento, satTemplate, adminId);
  await seedChamado(profile, equipamento, cliente);
  await seedEmbarque(profile, projetos[0]);
  await seedChecklist(profile, cliente, checklistTipo, adminId);
  log(`  jornada completa.`);
}

async function flushRegistry() {
  if (registry.length === 0) return;
  const chunkSize = 500;
  for (let i = 0; i < registry.length; i += chunkSize) {
    const chunk = registry.slice(i, i + chunkSize);
    const { error } = await sb.from("demo_seed_registry").insert(chunk);
    if (error) throw new Error(`[demo_seed_registry] ${error.message}`);
  }
  log(`\nRegistradas ${registry.length} linhas em demo_seed_registry.`);
}

async function main() {
  log("Buscando usuário admin/manager existente...");
  const adminId = await findAdminId();
  if (!adminId) log("  nenhum admin/manager encontrado — campos de responsável ficarão null.");
  else log(`  usando ${adminId}`);

  log("Verificando checklist_formulario_tipo ativo...");
  const checklistTipo = await findChecklistTipo();
  if (!checklistTipo)
    throw new Error("Nenhum checklist_formulario_tipo ativo encontrado — aborta.");
  log(`  reaproveitando tipo ${checklistTipo.id}`);

  log("Verificando sat_template ativo...");
  const satTemplate = await ensureSatTemplate(adminId);
  log(`  usando template ${satTemplate.id} v${satTemplate.versao}`);

  for (const profile of PROFILES) {
    await seedOneClient(profile, adminId, checklistTipo, satTemplate);
  }

  await flushRegistry();
  log("\nSeed de demonstração concluído.");
}

main().catch((err) => {
  console.error("\nFALHA:", err.message);
  flushRegistry()
    .catch(() => {})
    .finally(() => process.exit(1));
});
