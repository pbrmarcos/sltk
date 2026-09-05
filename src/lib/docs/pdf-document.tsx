/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { Bloco, DocumentoLayoutConfig, Idioma, OrcamentoPayload } from "./types";
import { formatDate, formatMoney, formatNumber } from "./formatters";
import { moedaLabel } from "@/lib/moedas";
import { t } from "./i18n";
import { CHROME_PAGE_STYLE, PdfHeader, PdfFooter } from "./pdf-chrome";
import {
  itensPrincipais,
  itensOpcionais,
  calcularSubtotal,
  calcularTotalOpcionais,
  calcularValorItem,
} from "./orcamento-calc";

// ============================================================
// Design tokens
// ============================================================
const TOKENS = {
  fontBody: "Helvetica",
  fontBold: "Helvetica-Bold",
  fontOblique: "Helvetica-Oblique",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  zebra: "#F9FAFB",
};

const styles = (accent: string) =>
  StyleSheet.create({
    page: { ...CHROME_PAGE_STYLE },
    coverWrap: { marginTop: 8, marginBottom: 16 },
    coverTitle: { fontSize: 24, fontFamily: TOKENS.fontBold, color: TOKENS.text },
    coverAccentBar: {
      width: 56,
      height: 3,
      backgroundColor: accent,
      marginTop: 14,
      marginBottom: 18,
    },
    coverSubtitle: { fontSize: 11, color: TOKENS.muted },
    sectionTitle: {
      fontSize: 12,
      fontFamily: TOKENS.fontBold,
      color: TOKENS.text,
      marginTop: 18,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      borderBottomStyle: "solid",
    },
    para: { marginBottom: 6 },
    keyGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    keyCell: { width: "50%", marginBottom: 4, paddingRight: 8 },
    keyLabel: {
      fontSize: 7.5,
      color: TOKENS.muted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    keyValue: { fontSize: 9.5, color: TOKENS.text },
    // Tabela
    table: {
      borderWidth: 0.5,
      borderColor: TOKENS.borderStrong,
      borderStyle: "solid",
      marginBottom: 8,
    },
    tHeader: {
      flexDirection: "row",
      backgroundColor: accent,
      color: "#FFFFFF",
      fontSize: 8.5,
      fontFamily: TOKENS.fontBold,
    },
    tRow: {
      flexDirection: "row",
      borderTopWidth: 0.5,
      borderTopColor: TOKENS.border,
      borderTopStyle: "solid",
    },
    tCell: { padding: 5 },
    tRight: { textAlign: "right" },
    totalsBox: {
      marginTop: 4,
      alignSelf: "flex-end",
      width: 240,
      borderWidth: 0.5,
      borderColor: TOKENS.borderStrong,
      borderStyle: "solid",
    },
    totalsRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderBottomWidth: 0.5,
      borderBottomColor: TOKENS.border,
      borderBottomStyle: "solid",
    },
    totalsTotal: { backgroundColor: accent, color: "#FFFFFF" },
    eqCard: {
      borderWidth: 0.5,
      borderColor: TOKENS.borderStrong,
      borderStyle: "solid",
      marginBottom: 10,
      padding: 8,
    },
    eqRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
    eqImgWrap: { width: 140, alignItems: "center" },
    eqImg: { width: 140, height: 100, objectFit: "contain" },
    eqImgCaption: {
      fontSize: 8,
      color: TOKENS.muted,
      marginTop: 3,
      textAlign: "center",
      lineHeight: 1.3,
    },
    eqMeta: { flex: 1 },
    eqTitle: { fontSize: 11, fontFamily: TOKENS.fontBold, marginBottom: 3 },
    eqDescr: { fontSize: 9, color: TOKENS.text, lineHeight: 1.4 },
    signBox: { marginTop: 28, width: 240 },
    signLine: {
      borderTopWidth: 0.5,
      borderTopColor: TOKENS.text,
      borderTopStyle: "solid",
      marginTop: 28,
    },
    signName: { fontSize: 9.5, fontFamily: TOKENS.fontBold, marginTop: 3 },
    signMeta: { fontSize: 8, color: TOKENS.muted },
    badge: {
      alignSelf: "flex-start",
      backgroundColor: accent,
      color: "#FFFFFF",
      fontSize: 7.5,
      paddingHorizontal: 6,
      paddingVertical: 2,
      marginBottom: 6,
    },
    continuationNote: { fontSize: 7.5, color: TOKENS.muted, fontStyle: "italic", marginTop: 4 },
  });

// Header / Footer agora vêm de ./pdf-chrome

// ============================================================
// Helpers
// ============================================================
function bloco<T = any>(blocos: Bloco[], codigo: string, idioma: Idioma): T | null {
  const b = blocos.find((x) => x.codigo === codigo);
  if (!b) return null;
  if (idioma === "pt") return (b.conteudo_pt as T) ?? null;
  if (idioma === "es") return (b.conteudo_es as T) ?? null;
  return (b.conteudo_en as T) ?? null;
}

function override(payload: OrcamentoPayload, codigo: string, idioma: Idioma): string | null {
  return payload.blocos_overrides[codigo]?.[idioma] ?? null;
}

function pickName(eq: OrcamentoPayload["equipamentos"][number], idioma: Idioma) {
  if (idioma === "pt") return eq.nome_pt || eq.nome_en || eq.nome_es;
  if (idioma === "es") return eq.nome_es || eq.nome_pt || eq.nome_en;
  return eq.nome_en || eq.nome_pt || eq.nome_es;
}
function pickDescr(eq: OrcamentoPayload["equipamentos"][number], idioma: Idioma) {
  if (idioma === "pt") return eq.descricao_pt || eq.descricao_en || eq.descricao_es;
  if (idioma === "es") return eq.descricao_es || eq.descricao_pt || eq.descricao_en;
  return eq.descricao_en || eq.descricao_pt || eq.descricao_es;
}

// ============================================================
// Bloco renderers
// ============================================================
function renderQualificacao(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ intro?: string }>(blocos, "qualificacao", idioma);
  const c = payload.cliente;
  const intro = override(payload, "qualificacao", idioma) || conf?.intro || "";
  return (
    <View>
      <Text style={s.sectionTitle}>{t(idioma, "qualificacao")}</Text>
      <View style={s.keyGrid}>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>{t(idioma, "para")}</Text>
          <Text style={s.keyValue}>{c.razao_social}</Text>
        </View>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>{t(idioma, "cnpj")}</Text>
          <Text style={s.keyValue}>{c.documento_fiscal_numero || "—"}</Text>
        </View>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>{t(idioma, "endereco")}</Text>
          <Text style={s.keyValue}>
            {[c.endereco_logradouro, c.endereco_numero, c.endereco_bairro]
              .filter(Boolean)
              .join(", ") || "—"}
          </Text>
        </View>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>
            {t(idioma, "cidade")} / {t(idioma, "pais")}
          </Text>
          <Text style={s.keyValue}>
            {[c.endereco_cidade, c.endereco_estado].filter(Boolean).join(" / ")}
            {c.pais ? ` — ${c.pais}` : ""}
          </Text>
        </View>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>{t(idioma, "email")}</Text>
          <Text style={s.keyValue}>{c.email_corporativo || "—"}</Text>
        </View>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>{t(idioma, "telefone")}</Text>
          <Text style={s.keyValue}>
            {[c.telefone_corporativo_ddi, c.telefone_corporativo_numero]
              .filter(Boolean)
              .join(" ") || "—"}
          </Text>
        </View>
      </View>
      {intro ? <Text style={s.para}>{intro}</Text> : null}
    </View>
  );
}

function renderDescricaoTecnica(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ titulo?: string }>(blocos, "descricao_tecnica", idioma);
  const equipamentos = itensPrincipais(payload.equipamentos);
  return (
    <View>
      <Text style={s.sectionTitle}>{conf?.titulo || t(idioma, "descricao_tecnica")}</Text>
      {equipamentos.map((eq, idx) => (
        <View key={idx} style={s.eqCard} wrap={false}>
          <View style={s.eqRow}>
            {eq.imagem_url ? (
              <View style={s.eqImgWrap}>
                <Image src={eq.imagem_url} style={s.eqImg} />
                {eq.imagem_legenda ? <Text style={s.eqImgCaption}>{eq.imagem_legenda}</Text> : null}
              </View>
            ) : null}
            <View style={s.eqMeta}>
              <Text style={s.eqTitle}>{pickName(eq, idioma)}</Text>
              <Text style={s.eqDescr}>{pickDescr(eq, idioma)}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

function renderValores(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ titulo?: string }>(blocos, "valores", idioma);
  const m = payload.moeda;
  const principais = itensPrincipais(payload.equipamentos);
  const opcionais = itensOpcionais(payload.equipamentos);
  const subtotal = calcularSubtotal(payload.equipamentos);
  const totalOpc = calcularTotalOpcionais(payload.equipamentos);

  const TableHeader = () => (
    <View style={s.tHeader} fixed>
      <View style={[s.tCell, { width: "55%" }]}>
        <Text>{t(idioma, "item")}</Text>
      </View>
      <View style={[s.tCell, { width: "10%" }]}>
        <Text style={s.tRight}>{t(idioma, "quantidade")}</Text>
      </View>
      <View style={[s.tCell, { width: "17%" }]}>
        <Text style={s.tRight}>{t(idioma, "valor_unitario")}</Text>
      </View>
      <View style={[s.tCell, { width: "18%" }]}>
        <Text style={s.tRight}>{t(idioma, "valor_total")}</Text>
      </View>
    </View>
  );

  const renderRows = (items: typeof principais) => (
    <View style={s.table}>
      <TableHeader />
      {items.map((eq, idx) => {
        const total = calcularValorItem(eq);
        return (
          <View
            key={idx}
            style={[s.tRow, idx % 2 ? { backgroundColor: TOKENS.zebra } : {}]}
            wrap={false}
          >
            <View style={[s.tCell, { width: "55%" }]}>
              <Text>{pickName(eq, idioma)}</Text>
            </View>
            <View style={[s.tCell, { width: "10%" }]}>
              <Text style={s.tRight}>{formatNumber(eq.quantidade, idioma)}</Text>
            </View>
            <View style={[s.tCell, { width: "17%" }]}>
              <Text style={s.tRight}>{formatMoney(eq.valor_unitario, m, idioma)}</Text>
            </View>
            <View style={[s.tCell, { width: "18%" }]}>
              <Text style={s.tRight}>{formatMoney(total, m, idioma)}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  return (
    <View>
      <Text style={s.sectionTitle}>{conf?.titulo || t(idioma, "valores_projeto")}</Text>
      {renderRows(principais)}
      <View style={s.totalsBox}>
        <View style={s.totalsRow}>
          <Text>{t(idioma, "sub_total")}</Text>
          <Text>{formatMoney(subtotal, m, idioma)}</Text>
        </View>
        <View style={[s.totalsRow, s.totalsTotal]}>
          <Text>{t(idioma, "total")}</Text>
          <Text>{formatMoney(subtotal, m, idioma)}</Text>
        </View>
      </View>
      {opcionais.length > 0 ? (
        <View style={{ marginTop: 14 }}>
          <Text style={s.sectionTitle}>{t(idioma, "opcionais")}</Text>
          {renderRows(opcionais)}
          <View style={s.totalsBox}>
            <View style={s.totalsRow}>
              <Text>{t(idioma, "total")}</Text>
              <Text>{formatMoney(totalOpc, m, idioma)}</Text>
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function renderCondicoesPagamento(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ titulo?: string; texto?: string }>(blocos, "condicoes_pagamento", idioma);
  const overrideTxt = override(payload, "condicoes_pagamento", idioma);
  const total = calcularSubtotal(payload.equipamentos);
  return (
    <View>
      <Text style={s.sectionTitle}>{conf?.titulo || "Condições de Pagamento"}</Text>
      <View style={s.keyGrid}>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>Forma</Text>
          <Text style={s.keyValue}>{payload.pagamento.forma}</Text>
        </View>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>{t(idioma, "moeda")}</Text>
          <Text style={s.keyValue}>{moedaLabel(payload.moeda)}</Text>
        </View>
      </View>
      <Text style={s.para}>
        {idioma === "pt"
          ? `Todos os valores deste documento estão expressos em ${moedaLabel(payload.moeda)}.`
          : idioma === "es"
            ? `Todos los valores de este documento están expresados en ${moedaLabel(payload.moeda)}.`
            : `All amounts in this document are expressed in ${moedaLabel(payload.moeda)}.`}
      </Text>
      {overrideTxt || conf?.texto ? <Text style={s.para}>{overrideTxt || conf?.texto}</Text> : null}
      {payload.pagamento.parcelas.length > 0 ? (
        <View style={s.table}>
          <View style={s.tHeader}>
            <View style={[s.tCell, { width: "10%" }]}>
              <Text>{t(idioma, "parcela")}</Text>
            </View>
            <View style={[s.tCell, { width: "20%" }]}>
              <Text style={s.tRight}>{t(idioma, "percentual")}</Text>
            </View>
            <View style={[s.tCell, { width: "25%" }]}>
              <Text style={s.tRight}>{t(idioma, "valor_parcela")}</Text>
            </View>
            <View style={[s.tCell, { width: "45%" }]}>
              <Text>{t(idioma, "descricao")}</Text>
            </View>
          </View>
          {payload.pagamento.parcelas.map((p, idx) => {
            const v = (total * p.percentual) / 100;
            const desc =
              idioma === "pt" ? p.descricao_pt : idioma === "es" ? p.descricao_es : p.descricao_en;
            return (
              <View key={idx} style={s.tRow} wrap={false}>
                <View style={[s.tCell, { width: "10%" }]}>
                  <Text>{p.numero}</Text>
                </View>
                <View style={[s.tCell, { width: "20%" }]}>
                  <Text style={s.tRight}>{formatNumber(p.percentual, idioma, 2)}%</Text>
                </View>
                <View style={[s.tCell, { width: "25%" }]}>
                  <Text style={s.tRight}>{formatMoney(v, payload.moeda, idioma)}</Text>
                </View>
                <View style={[s.tCell, { width: "45%" }]}>
                  <Text>{desc || "—"}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function renderTextBlock(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
  codigo: string,
) {
  const conf = bloco<{ titulo?: string; texto?: string }>(blocos, codigo, idioma);
  if (!conf) return null;
  const texto = override(payload, codigo, idioma) || conf?.texto || "";
  return (
    <View wrap={false}>
      <Text style={s.sectionTitle}>{conf?.titulo || codigo}</Text>
      {texto ? <Text style={s.para}>{texto}</Text> : null}
    </View>
  );
}

function renderPrazo(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ titulo?: string; texto?: string }>(blocos, "prazo_entrega", idioma);
  const overrideTxt = override(payload, "prazo_entrega", idioma);
  return (
    <View wrap={false}>
      <Text style={s.sectionTitle}>{conf?.titulo || "Prazo"}</Text>
      <Text style={s.para}>
        <Text style={{ fontFamily: TOKENS.fontBold }}>{payload.prazo.dias}</Text>{" "}
        {t(idioma, "dias")} — {overrideTxt || conf?.texto || ""}
      </Text>
      {payload.prazo.texto_extra ? <Text style={s.para}>{payload.prazo.texto_extra}</Text> : null}
    </View>
  );
}

function renderFrete(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ titulo?: string; texto?: string }>(blocos, "frete_embarque", idioma);
  return (
    <View wrap={false}>
      <Text style={s.sectionTitle}>{conf?.titulo || "Frete"}</Text>
      <View style={s.keyGrid}>
        <View style={s.keyCell}>
          <Text style={s.keyLabel}>{t(idioma, "incoterm")}</Text>
          <Text style={s.keyValue}>{payload.frete.incoterm}</Text>
        </View>
        {payload.frete.descricao ? (
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t(idioma, "descricao")}</Text>
            <Text style={s.keyValue}>{payload.frete.descricao}</Text>
          </View>
        ) : null}
      </View>
      {conf?.texto ? <Text style={s.para}>{conf.texto}</Text> : null}
    </View>
  );
}

function renderValidade(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ titulo?: string; texto?: string }>(blocos, "validade", idioma);
  return (
    <View wrap={false}>
      <Text style={s.sectionTitle}>{conf?.titulo || "Validade"}</Text>
      <Text style={s.para}>
        {t(idioma, "validade_em")}{" "}
        <Text style={{ fontFamily: TOKENS.fontBold }}>
          {payload.validade.dias} {t(idioma, "dias")}
        </Text>
        .
      </Text>
      {conf?.texto ? <Text style={s.para}>{conf.texto}</Text> : null}
    </View>
  );
}

function renderAssinatura(
  s: ReturnType<typeof styles>,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  const conf = bloco<{ titulo?: string; texto?: string }>(blocos, "assinatura", idioma);
  const r = payload.responsavel;
  return (
    <View wrap={false}>
      <Text style={s.sectionTitle}>{conf?.titulo || t(idioma, "cordialmente")}</Text>
      {conf?.texto ? <Text style={s.para}>{conf.texto}</Text> : null}
      <View style={s.signBox}>
        <View style={s.signLine} />
        <Text style={s.signName}>{r.nome}</Text>
        {r.cargo ? <Text style={s.signMeta}>{r.cargo}</Text> : null}
        {r.email ? <Text style={s.signMeta}>{r.email}</Text> : null}
        {r.telefone ? <Text style={s.signMeta}>{r.telefone}</Text> : null}
      </View>
    </View>
  );
}

// ============================================================
// Bloco dispatcher
// ============================================================
function renderBloco(
  s: ReturnType<typeof styles>,
  codigo: string,
  payload: OrcamentoPayload,
  blocos: Bloco[],
  idioma: Idioma,
) {
  switch (codigo) {
    case "qualificacao":
      return renderQualificacao(s, payload, blocos, idioma);
    case "descricao_tecnica":
      return renderDescricaoTecnica(s, payload, blocos, idioma);
    case "valores":
      return renderValores(s, payload, blocos, idioma);
    case "condicoes_pagamento":
      return renderCondicoesPagamento(s, payload, blocos, idioma);
    case "prazo_entrega":
      return renderPrazo(s, payload, blocos, idioma);
    case "frete_embarque":
      return renderFrete(s, payload, blocos, idioma);
    case "validade":
      return renderValidade(s, payload, blocos, idioma);
    case "assinatura":
      return renderAssinatura(s, payload, blocos, idioma);
    case "garantia":
    case "montagem_manutencao":
    case "treinamento":
    case "embalagem":
    case "fat":
    case "sat":
    case "informacoes_gerais":
      return renderTextBlock(s, payload, blocos, idioma, codigo);
    default:
      return null;
  }
}

// ============================================================
// Documento (Orçamento)
// ============================================================
export type OrcamentoPdfProps = {
  codigo: string;
  versao: string;
  idioma: Idioma;
  data: Date;
  payload: OrcamentoPayload;
  blocos: Bloco[];
  layout: DocumentoLayoutConfig;
};

export function OrcamentoPdf({
  codigo,
  versao,
  idioma,
  data,
  payload,
  blocos,
  layout,
}: OrcamentoPdfProps) {
  const accent = layout.accent_color || "#0B3D91";
  const s = styles(accent);
  const dataFmt = formatDate(data, idioma);

  const ordered =
    payload.blocos_selecionados.length > 0
      ? payload.blocos_selecionados
      : [...blocos].sort((a, b) => a.ordem_padrao - b.ordem_padrao).map((b) => b.codigo);

  return (
    <Document
      title={`${codigo} ${idioma.toUpperCase()}`}
      author={layout.empresa_nome}
      creator={layout.empresa_nome}
      producer={layout.empresa_nome}
    >
      <Page size="A4" style={s.page}>
        <PdfHeader
          layout={layout}
          titulo={t(idioma, "documento_titulo_orcamento")}
          codigo={codigo}
          versao={versao}
          idioma={idioma}
          dataFmt={dataFmt}
        />
        <PdfFooter
          layout={layout}
          titulo={t(idioma, "documento_titulo_orcamento")}
          versao={versao}
          responsavel={payload.responsavel.nome}
          idioma={idioma}
        />

        {/* Capa simples */}
        <View style={s.coverWrap}>
          <Text style={s.badge}>
            {codigo} · v{versao} · {idioma.toUpperCase()}
          </Text>
          <Text style={s.coverTitle}>{t(idioma, "documento_titulo_orcamento")}</Text>
          <View style={s.coverAccentBar} />
          <Text style={s.coverSubtitle}>
            {payload.cliente.razao_social}
            {payload.cliente.endereco_cidade ? ` · ${payload.cliente.endereco_cidade}` : ""}
            {payload.cliente.pais ? ` · ${payload.cliente.pais}` : ""}
          </Text>
          <Text style={[s.coverSubtitle, { marginTop: 4 }]}>
            {t(idioma, "data_emissao")}: {dataFmt}
          </Text>
        </View>

        {ordered.map((c, i) => (
          <View key={`${c}-${i}`}>{renderBloco(s, c, payload, blocos, idioma)}</View>
        ))}
      </Page>
    </Document>
  );
}
