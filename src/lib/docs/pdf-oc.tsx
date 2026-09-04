/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * PDF trilíngue (PT/ES/EN) de Ordem de Compra baseada em insumo.
 * Layout minimalista A4 retrato, reaproveita PdfHeader/PdfFooter para
 * consistência visual com Orçamento / RFQ / FAT / SAT.
 */
import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { CHROME_PAGE_STYLE, PdfFooter, PdfHeader } from "./pdf-chrome";
import type { DocumentoLayoutConfig, Idioma } from "./types";

const TOKENS = { fontBody: "Helvetica", fontBold: "Helvetica-Bold", text: "#111827", muted: "#6B7280", border: "#E5E7EB" };

const DOC_TITLE: Record<Idioma, string> = {
  pt: "Ordem de Compra",
  es: "Orden de Compra",
  en: "Purchase Order",
};

const L: Record<Idioma, Record<string, string>> = {
  pt: {
    fornecedor: "Fornecedor",
    contato: "Contato",
    condicoes: "Condições Comerciais",
    moeda: "Moeda",
    incoterm: "Incoterm",
    pagamento: "Pagamento",
    entrega: "Entrega prevista",
    itens: "Itens",
    codigo: "Código",
    descricao: "Descrição",
    qtd: "Qtd.",
    un: "UN",
    unitario: "Valor Unit.",
    total: "Total",
    subtotal: "Subtotal",
    frete: "Frete",
    valorTotal: "Valor total",
    observacoes: "Observações",
    responsavel: "Responsável",
    autorizacao: "Emitida após aprovação técnica/gerencial.",
    assinaturas: "Assinaturas",
    comprador: "Comprador",
    aprovador: "Aprovador",
  },
  es: {
    fornecedor: "Proveedor",
    contato: "Contacto",
    condicoes: "Condiciones Comerciales",
    moeda: "Moneda",
    incoterm: "Incoterm",
    pagamento: "Pago",
    entrega: "Entrega prevista",
    itens: "Ítems",
    codigo: "Código",
    descricao: "Descripción",
    qtd: "Cant.",
    un: "UN",
    unitario: "Valor Unit.",
    total: "Total",
    subtotal: "Subtotal",
    frete: "Flete",
    valorTotal: "Valor total",
    observacoes: "Observaciones",
    responsavel: "Responsable",
    autorizacao: "Emitida tras aprobación técnica/gerencial.",
    assinaturas: "Firmas",
    comprador: "Comprador",
    aprovador: "Aprobador",
  },
  en: {
    fornecedor: "Supplier",
    contato: "Contact",
    condicoes: "Commercial Terms",
    moeda: "Currency",
    incoterm: "Incoterm",
    pagamento: "Payment",
    entrega: "Expected delivery",
    itens: "Items",
    codigo: "Code",
    descricao: "Description",
    qtd: "Qty",
    un: "UOM",
    unitario: "Unit price",
    total: "Total",
    subtotal: "Subtotal",
    frete: "Freight",
    valorTotal: "Grand total",
    observacoes: "Notes",
    responsavel: "Responsible",
    autorizacao: "Issued after technical/managerial approval.",
    assinaturas: "Signatures",
    comprador: "Buyer",
    aprovador: "Approver",
  },
};

function fmtMoney(v: number, moeda: string, idioma: Idioma) {
  const loc = idioma === "pt" ? "pt-BR" : idioma === "es" ? "es-ES" : "en-US";
  try {
    return new Intl.NumberFormat(loc, { style: "currency", currency: moeda }).format(v);
  } catch {
    return `${moeda} ${v.toFixed(2)}`;
  }
}

function formatDate(d: Date, idioma: Idioma) {
  const loc = idioma === "pt" ? "pt-BR" : idioma === "es" ? "es-ES" : "en-US";
  return d.toLocaleDateString(loc);
}

const styles = (accent: string) =>
  StyleSheet.create({
    page: { ...CHROME_PAGE_STYLE },
    title: { fontSize: 15, fontFamily: TOKENS.fontBold, color: accent, marginTop: 6 },
    accentBar: { height: 2, width: 42, backgroundColor: accent, marginTop: 3, marginBottom: 8 },
    subline: { fontSize: 8.5, color: TOKENS.muted, marginBottom: 10 },
    section: { marginTop: 10 },
    sectionTitle: { fontSize: 10, fontFamily: TOKENS.fontBold, color: accent, marginBottom: 4 },
    twoCols: { flexDirection: "row", gap: 12 },
    col: { flex: 1 },
    label: { fontSize: 7.5, color: TOKENS.muted, textTransform: "uppercase", letterSpacing: 0.4 },
    value: { fontSize: 9.5, color: TOKENS.text },
    strong: { fontFamily: TOKENS.fontBold },
    tableHead: {
      flexDirection: "row",
      backgroundColor: "#F3F4F6",
      paddingVertical: 4,
      paddingHorizontal: 6,
      fontSize: 8,
      fontFamily: TOKENS.fontBold,
      color: TOKENS.text,
      borderRadius: 2,
    },
    row: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 6,
      borderBottomWidth: 0.4,
      borderBottomColor: TOKENS.border,
      fontSize: 9,
    },
    cCod: { width: "14%" },
    cDesc: { width: "44%" },
    cQtd: { width: "10%", textAlign: "right" },
    cUn: { width: "8%", textAlign: "center" },
    cUnit: { width: "12%", textAlign: "right" },
    cTot: { width: "12%", textAlign: "right" },
    totalsBox: {
      alignSelf: "flex-end",
      width: "45%",
      marginTop: 8,
      fontSize: 9.5,
    },
    totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
    totalGrand: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: 4,
      borderTopWidth: 0.6,
      borderTopColor: accent,
      marginTop: 2,
      fontFamily: TOKENS.fontBold,
    },
    obsBox: { marginTop: 10, fontSize: 9, color: TOKENS.text },
    assinBox: {
      marginTop: 20,
      flexDirection: "row",
      gap: 20,
    },
    assinCol: {
      flex: 1,
      borderTopWidth: 0.6,
      borderTopColor: TOKENS.text,
      paddingTop: 3,
      fontSize: 8,
      color: TOKENS.muted,
      textAlign: "center",
    },
    autorizNote: {
      marginTop: 8,
      fontSize: 7.5,
      color: TOKENS.muted,
      fontStyle: "italic",
    },
  });

export type OcPdfProps = {
  idioma: Idioma;
  layout: DocumentoLayoutConfig;
  codigo: string; // ex: OC-000123
  versao: string;
  tag: string;
  emissao: Date;
  fornecedor: {
    razao_social: string;
    nome_fantasia?: string | null;
    tax_id?: string | null;
    endereco?: string | null;
    cidade?: string | null;
    uf?: string | null;
    pais?: string | null;
    telefone?: string | null;
    email?: string | null;
    contato?: string | null;
  };
  moeda: string;
  incoterm?: string | null;
  condicao_pagamento?: string | null;
  entrega_prevista?: string | null;
  observacoes?: string | null;
  responsavel: string;
  aprovador?: string | null;
  itens: Array<{
    codigo?: string | null;
    descricao: string;
    unidade: string;
    quantidade: number;
    valor_unitario: number;
  }>;
  valor_frete?: number | null;
};

export function OcPdf(props: OcPdfProps) {
  const {
    idioma, layout, codigo, versao, tag, emissao,
    fornecedor, moeda, incoterm, condicao_pagamento, entrega_prevista, observacoes,
    responsavel, aprovador, itens, valor_frete = 0,
  } = props;
  const accent = layout.accent_color || "#0B3D91";
  const s = styles(accent);
  const t = L[idioma];
  const titulo = DOC_TITLE[idioma];
  const dataFmt = formatDate(emissao, idioma);

  const subtotal = itens.reduce((acc, it) => acc + it.valor_unitario * it.quantidade, 0);
  const frete = Number(valor_frete ?? 0);
  const total = subtotal + frete;

  return (
    <Document title={`${codigo} ${idioma.toUpperCase()}`} author={layout.empresa_nome} creator={layout.empresa_nome}>
      <Page size="A4" style={s.page}>
        <PdfHeader layout={layout} titulo={titulo} codigo={codigo} versao={versao} idioma={idioma} dataFmt={dataFmt} />
        <PdfFooter layout={layout} titulo={titulo} versao={versao} responsavel={responsavel} idioma={idioma} tag={tag} />

        <Text style={s.title}>{titulo}</Text>
        <View style={s.accentBar} />
        <Text style={s.subline}>{codigo} · {tag} · {dataFmt}</Text>

        {/* Fornecedor + Condições */}
        <View style={[s.section, s.twoCols]}>
          <View style={s.col}>
            <Text style={s.sectionTitle}>{t.fornecedor}</Text>
            <Text style={[s.value, s.strong]}>{fornecedor.nome_fantasia || fornecedor.razao_social}</Text>
            {fornecedor.nome_fantasia && fornecedor.razao_social !== fornecedor.nome_fantasia ? (
              <Text style={s.value}>{fornecedor.razao_social}</Text>
            ) : null}
            {fornecedor.tax_id ? <Text style={s.value}>{fornecedor.tax_id}</Text> : null}
            {fornecedor.endereco ? <Text style={s.value}>{fornecedor.endereco}</Text> : null}
            <Text style={s.value}>
              {[fornecedor.cidade, fornecedor.uf, fornecedor.pais].filter(Boolean).join(" · ")}
            </Text>
            {fornecedor.contato ? <Text style={s.value}>{t.contato}: {fornecedor.contato}</Text> : null}
            {fornecedor.telefone ? <Text style={s.value}>{fornecedor.telefone}</Text> : null}
            {fornecedor.email ? <Text style={s.value}>{fornecedor.email}</Text> : null}
          </View>
          <View style={s.col}>
            <Text style={s.sectionTitle}>{t.condicoes}</Text>
            <KV label={t.moeda} value={moeda} s={s} />
            <KV label={t.incoterm} value={incoterm || "—"} s={s} />
            <KV label={t.pagamento} value={condicao_pagamento || "—"} s={s} />
            <KV label={t.entrega} value={entrega_prevista || "—"} s={s} />
          </View>
        </View>

        {/* Itens */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t.itens}</Text>
          <View style={s.tableHead}>
            <Text style={s.cCod}>{t.codigo}</Text>
            <Text style={s.cDesc}>{t.descricao}</Text>
            <Text style={s.cQtd}>{t.qtd}</Text>
            <Text style={s.cUn}>{t.un}</Text>
            <Text style={s.cUnit}>{t.unitario}</Text>
            <Text style={s.cTot}>{t.total}</Text>
          </View>
          {itens.map((it, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={s.cCod}>{it.codigo || "—"}</Text>
              <Text style={s.cDesc}>{it.descricao}</Text>
              <Text style={s.cQtd}>{it.quantidade}</Text>
              <Text style={s.cUn}>{it.unidade}</Text>
              <Text style={s.cUnit}>{fmtMoney(it.valor_unitario, moeda, idioma)}</Text>
              <Text style={s.cTot}>{fmtMoney(it.valor_unitario * it.quantidade, moeda, idioma)}</Text>
            </View>
          ))}
        </View>

        <View style={s.totalsBox}>
          <View style={s.totalRow}>
            <Text>{t.subtotal}</Text>
            <Text>{fmtMoney(subtotal, moeda, idioma)}</Text>
          </View>
          {frete > 0 && (
            <View style={s.totalRow}>
              <Text>{t.frete}</Text>
              <Text>{fmtMoney(frete, moeda, idioma)}</Text>
            </View>
          )}
          <View style={s.totalGrand}>
            <Text>{t.valorTotal}</Text>
            <Text>{fmtMoney(total, moeda, idioma)}</Text>
          </View>
        </View>

        {observacoes ? (
          <View style={s.obsBox}>
            <Text style={s.sectionTitle}>{t.observacoes}</Text>
            <Text>{observacoes}</Text>
          </View>
        ) : null}

        <Text style={s.autorizNote}>{t.autorizacao}</Text>

        <View style={s.assinBox}>
          <View style={s.assinCol}>
            <Text style={{ color: TOKENS.text, fontFamily: TOKENS.fontBold }}>{responsavel || "—"}</Text>
            <Text>{t.comprador}</Text>
          </View>
          <View style={s.assinCol}>
            <Text style={{ color: TOKENS.text, fontFamily: TOKENS.fontBold }}>{aprovador || "—"}</Text>
            <Text>{t.aprovador}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

function KV({ label, value, s }: { label: string; value: string; s: any }) {
  return (
    <View style={{ marginBottom: 3 }}>
      <Text style={s.label}>{label}</Text>
      <Text style={s.value}>{value}</Text>
    </View>
  );
}
