/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PDF de Solicitação de Cotação — A4 retrato, 1 página.
 * Layout enxuto: descrição do produto → condições → fecho → assinatura.
 * Cabeçalho e rodapé vêm do chrome da Central de Documentos (logo,
 * empresa, endereço, TAG do item, responsável).
 */
import type { ReactNode } from "react";
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Bloco, DocumentoLayoutConfig, Idioma } from "./types";
import { formatDate } from "./formatters";
import { CHROME_PAGE_STYLE, PdfHeader, PdfFooter } from "./pdf-chrome";

const TOKENS = {
  fontBody: "Helvetica",
  fontBold: "Helvetica-Bold",
  text: "#111827",
  muted: "#6B7280",
  borderStrong: "#D1D5DB",
  soft: "#F9FAFB",
};

const DOC_TITLE: Record<Idioma, string> = {
  pt: "Solicitação de Cotação",
  es: "Solicitud de Cotización",
  en: "Request for Quotation",
};

const LABELS: Record<Idioma, { tag: string; descricao: string }> = {
  pt: { tag: "TAG", descricao: "Descrição do produto" },
  es: { tag: "TAG", descricao: "Descripción del producto" },
  en: { tag: "TAG", descricao: "Product description" },
};

const styles = (accent: string) =>
  StyleSheet.create({
    page: { ...CHROME_PAGE_STYLE, fontSize: 9.5, lineHeight: 1.35 },

    title: { fontSize: 15, fontFamily: TOKENS.fontBold, color: TOKENS.text, marginTop: 2 },
    accentBar: { width: 36, height: 2, backgroundColor: accent, marginTop: 5, marginBottom: 4 },
    subline: { fontSize: 8.5, color: TOKENS.muted, marginBottom: 10 },

    sectionTitle: {
      fontSize: 10,
      fontFamily: TOKENS.fontBold,
      color: TOKENS.text,
      marginTop: 8,
      marginBottom: 5,
      paddingBottom: 2.5,
      borderBottomWidth: 0.6,
      borderBottomColor: accent,
      borderBottomStyle: "solid",
    },

    descBox: {
      padding: 8,
      borderWidth: 0.5,
      borderColor: TOKENS.borderStrong,
      borderStyle: "solid",
      backgroundColor: TOKENS.soft,
    },
    descLabel: {
      fontSize: 6.5,
      color: TOKENS.muted,
      textTransform: "uppercase",
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    descText: { fontSize: 10, color: TOKENS.text, lineHeight: 1.4 },

    bulletsGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 2 },
    bulletCell: { width: "50%", flexDirection: "row", marginBottom: 2, paddingRight: 6 },
    bulletDot: { width: 8, fontSize: 9, color: TOKENS.text },
    bulletText: { flex: 1, fontSize: 9, color: TOKENS.text },

    closing: { marginTop: 12, fontSize: 9.5, color: TOKENS.text },
    att: { marginTop: 8, fontSize: 9.5, color: TOKENS.text },
    signature: { marginTop: 2, fontSize: 10.5, fontFamily: TOKENS.fontBold, color: TOKENS.text },

    debugBox: {
      marginTop: 14,
      padding: 6,
      borderWidth: 0.5,
      borderColor: "#F59E0B",
      borderStyle: "dashed",
      backgroundColor: "#FFFBEB",
    },
    debugTitle: { fontSize: 8, fontFamily: TOKENS.fontBold, color: "#92400E", marginBottom: 3 },
    debugRow: { fontSize: 7.5, color: "#92400E", marginBottom: 1 },
  });

function pickConteudo(b: Bloco, idioma: Idioma): { titulo: string; texto: string } {
  const raw = (
    idioma === "pt" ? b.conteudo_pt : idioma === "es" ? b.conteudo_es : b.conteudo_en
  ) as any;
  const fb = (b.conteudo_pt as any) ?? {};
  return {
    titulo: String(raw?.titulo ?? fb?.titulo ?? ""),
    texto: String(raw?.texto ?? fb?.texto ?? ""),
  };
}

function interp(text: string, placeholders: Record<string, string>): string {
  return (text || "").replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, k) => placeholders[k] ?? "");
}

/** Parseia `**texto**` em segmentos de texto normal/negrito. */
function parseInlineBold(text: string): Array<{ text: string; bold: boolean }> {
  const segments: Array<{ text: string; bold: boolean }> = [];
  let remaining = text;
  let bold = false;
  while (remaining.length) {
    const idx = remaining.indexOf("**");
    if (idx === -1) {
      segments.push({ text: remaining, bold });
      break;
    }
    if (idx > 0) segments.push({ text: remaining.slice(0, idx), bold });
    bold = !bold;
    remaining = remaining.slice(idx + 2);
  }
  return segments;
}

function RichText({ style, text }: { style: any; text: string }) {
  const segments = parseInlineBold(text);
  return (
    <Text style={style}>
      {segments.map((seg, i) => (
        <Text key={i} style={seg.bold ? { fontFamily: TOKENS.fontBold } : undefined}>
          {seg.text}
        </Text>
      ))}
    </Text>
  );
}

export type CotacaoPdfProps = {
  codigo: string;
  versao: string;
  idioma: Idioma;
  data: Date;
  layout: DocumentoLayoutConfig;
  blocos: Bloco[];
  item: {
    descricao: string;
    especificacao: string;
    fabricante: string;
    part_number: string;
    codigo_interno: string;
    quantidade: string;
    unidade: string;
    lead_time: string;
    necessidade_em: string;
    criticidade: string;
    observacoes: string;
    tag: string;
  };
  responsavel: string;
  nota_compras?: string | null;
};

export function CotacaoPdf(props: CotacaoPdfProps) {
  const { codigo, versao, idioma, data, layout, blocos, item, responsavel, nota_compras } = props;
  const accent = layout.accent_color || "#0B3D91";
  const s = styles(accent);
  const dataFmt = formatDate(data, idioma);
  const L = LABELS[idioma];
  const titulo = DOC_TITLE[idioma];

  // Descrição consolidada: descrição + (observações) + (especificação), sem
  // rótulos técnicos que possam expor referências internas.
  const partes = [item.descricao, item.observacoes, item.especificacao]
    .map((x) => (x || "").trim())
    .filter((x) => x && x !== "—");
  const descricaoConsolidada = partes.length ? partes.join(" · ") : "—";

  const dash = (v: string | undefined | null) => {
    const s = (v ?? "").toString().trim();
    return s && s !== "—" ? s : "—";
  };
  const qtd = (item.quantidade || "").toString().trim();
  const un = (item.unidade || "").toString().trim();
  const qtdUn = qtd ? (un ? `${qtd} ${un}` : qtd) : "—";
  const leadTxt = (item.lead_time || "").toString().trim();
  const placeholders: Record<string, string> = {
    "item.tag": dash(item.tag),
    "item.descricao": descricaoConsolidada,
    "item.especificacao": dash(item.especificacao),
    "item.fabricante": dash(item.fabricante),
    "item.part_number": dash(item.part_number),
    "item.codigo_interno": dash(item.codigo_interno),
    "item.quantidade": qtd || "—",
    "item.quantidade_unidade": qtdUn,
    "item.unidade": dash(item.unidade),
    "item.lead_time": leadTxt
      ? `${leadTxt} ${idioma === "en" ? "day(s)" : idioma === "es" ? "día(s)" : "dia(s)"}`
      : "—",
    "item.necessidade_em": dash(item.necessidade_em),
    "item.criticidade": dash(item.criticidade),
    "item.observacoes": dash(item.observacoes),
    "compras.responsavel": dash(responsavel),
    "compras.nota": nota_compras || "",
  };

  // "Dados do Item" fica desativado por padrão (ativo=false no template).
  // Para reativar, alterne o bloco em Central de Documentos → Solicitação de
  // Cotação → Blocos → Dados do Item.
  const orderedBlocos = [...blocos]
    .filter((b) => b.ativo !== false)
    .sort((a, b) => a.ordem_padrao - b.ordem_padrao);

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
          titulo={titulo}
          codigo={codigo}
          versao={versao}
          idioma={idioma}
          dataFmt={dataFmt}
        />
        <PdfFooter
          layout={layout}
          titulo={titulo}
          versao={versao}
          responsavel={responsavel}
          idioma={idioma}
          tag={item.tag}
        />

        <Text style={s.title}>{titulo}</Text>
        <View style={s.accentBar} />
        <Text style={s.subline}>
          {L.tag}: {item.tag} · {dataFmt}
        </Text>

        {/* Descrição do produto — cabeçalho fixo do item */}
        <View style={s.descBox}>
          <Text style={s.descLabel}>{L.descricao}</Text>
          <Text style={s.descText}>{descricaoConsolidada}</Text>
        </View>

        {/* Blocos extras (Central de Documentos) — agrupa 50%+50% lado a lado. */}
        {(() => {
          const renderBloco = (b: Bloco) => {
            const c = pickConteudo(b, idioma);
            const tituloBloco = interp(c.titulo, placeholders).trim();
            const texto = interp(c.texto, placeholders).trim();
            if (!tituloBloco && !texto) return null;
            return (
              <>
                {tituloBloco ? <RichText style={s.sectionTitle} text={tituloBloco} /> : null}
                {texto ? (
                  <RichText style={{ fontSize: 9.5, lineHeight: 1.45 }} text={texto} />
                ) : null}
              </>
            );
          };
          const rows: ReactNode[] = [];
          for (let i = 0; i < orderedBlocos.length; i++) {
            const b = orderedBlocos[i];
            const largura = (b as any).largura === 50 ? 50 : 100;
            const next = orderedBlocos[i + 1];
            const nextLargura = next ? ((next as any).largura === 50 ? 50 : 100) : 100;
            if (largura === 50 && next && nextLargura === 50) {
              rows.push(
                <View
                  key={`${b.id}-row`}
                  wrap={false}
                  style={{ flexDirection: "row", gap: 10, marginTop: 10 }}
                >
                  <View style={{ flex: 1 }}>{renderBloco(b)}</View>
                  <View style={{ flex: 1 }}>{renderBloco(next)}</View>
                </View>,
              );
              i++;
            } else {
              rows.push(
                <View
                  key={b.id}
                  wrap={false}
                  style={{ marginTop: 10, width: largura === 50 ? "50%" : "100%" }}
                >
                  {renderBloco(b)}
                </View>,
              );
            }
          }
          return rows;
        })()}
      </Page>
    </Document>
  );
}
