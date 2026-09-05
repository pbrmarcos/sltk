/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { DocumentoLayoutConfig, Idioma } from "./types";
import { formatDate, formatNumber } from "./formatters";
import { CHROME_PAGE_STYLE, PdfHeader, PdfFooter } from "./pdf-chrome";

const TOKENS = {
  fontBody: "Helvetica",
  fontBold: "Helvetica-Bold",
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
    secaoTitle: {
      fontSize: 10.5,
      fontFamily: TOKENS.fontBold,
      color: accent,
      marginTop: 14,
      marginBottom: 6,
    },
    secaoDesc: { fontSize: 8, color: TOKENS.muted, marginBottom: 6 },
    keyGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    keyCell: { width: "50%", marginBottom: 4, paddingRight: 8 },
    keyLabel: {
      fontSize: 7.5,
      color: TOKENS.muted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    keyValue: { fontSize: 9.5, color: TOKENS.text },
    itemRow: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: TOKENS.border,
      borderBottomStyle: "solid",
      paddingVertical: 5,
    },
    itemRowZebra: { backgroundColor: TOKENS.zebra },
    itemLabel: { width: "55%", paddingRight: 8, fontSize: 9 },
    itemValue: { width: "45%", fontSize: 9 },
    itemComment: { fontSize: 8, color: TOKENS.muted, marginTop: 2 },
    chipOk: { color: "#065F46", fontFamily: TOKENS.fontBold },
    chipNok: { color: "#991B1B", fontFamily: TOKENS.fontBold },
    chipNa: { color: TOKENS.muted, fontFamily: TOKENS.fontBold },
    para: { marginBottom: 6 },
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
    tRowZebra: { backgroundColor: TOKENS.zebra },
    tCell: { padding: 5, fontSize: 9 },
    signGrid: { flexDirection: "row", marginTop: 24, gap: 16 },
    signBox: {
      flex: 1,
      borderTopWidth: 0.5,
      borderTopColor: TOKENS.text,
      borderTopStyle: "solid",
      paddingTop: 4,
    },
    signLabel: { fontSize: 8, color: TOKENS.muted, textTransform: "uppercase", letterSpacing: 0.4 },
    signValue: { fontSize: 9.5, fontFamily: TOKENS.fontBold },
    signImg: { height: 48, objectFit: "contain", marginBottom: 4 },
    auditFoot: { marginTop: 16, fontSize: 7, color: TOKENS.muted },
  });

const L: Record<Idioma, Record<string, string>> = {
  pt: {
    title: "Relatório SAT",
    subtitle: "Service Acceptance Test",
    identificacao: "Identificação",
    codigo: "Código",
    local: "Local",
    periodo: "Período",
    motivos: "Motivos da viagem",
    tecnicos: "Técnicos",
    equipamentos: "Equipamentos",
    obs: "Observações",
    semObs: "Sem observações.",
    semItens: "Sem itens registrados.",
    semSecoes: "Sem seções configuradas.",
    anexos: "Anexos",
    nomeAnexo: "Arquivo",
    tipoAnexo: "Tipo",
    linkAnexo: "Link Drive",
    semAnexos: "Sem anexos.",
    assinaturas: "Assinaturas",
    assTecnico: "Técnico",
    assCliente: "Cliente",
    naoAssinado: "Não assinado",
    sim: "Sim",
    nao: "Não",
    na: "N/A",
    pagina: "Página",
    de: "de",
    audit: "Documento assinado digitalmente — verificação HMAC-SHA256 disponível no portal.",
  },
  es: {
    title: "Informe SAT",
    subtitle: "Service Acceptance Test",
    identificacao: "Identificación",
    codigo: "Código",
    local: "Lugar",
    periodo: "Período",
    motivos: "Motivos del viaje",
    tecnicos: "Técnicos",
    equipamentos: "Equipos",
    obs: "Observaciones",
    semObs: "Sin observaciones.",
    semItens: "Sin ítems registrados.",
    semSecoes: "Sin secciones configuradas.",
    anexos: "Adjuntos",
    nomeAnexo: "Archivo",
    tipoAnexo: "Tipo",
    linkAnexo: "Enlace Drive",
    semAnexos: "Sin adjuntos.",
    assinaturas: "Firmas",
    assTecnico: "Técnico",
    assCliente: "Cliente",
    naoAssinado: "No firmado",
    sim: "Sí",
    nao: "No",
    na: "N/A",
    pagina: "Página",
    de: "de",
    audit: "Documento firmado digitalmente — verificación HMAC-SHA256 disponible en el portal.",
  },
  en: {
    title: "SAT Report",
    subtitle: "Service Acceptance Test",
    identificacao: "Identification",
    codigo: "Code",
    local: "Location",
    periodo: "Period",
    motivos: "Trip motives",
    tecnicos: "Technicians",
    equipamentos: "Equipment",
    obs: "Notes",
    semObs: "No notes.",
    semItens: "No items recorded.",
    semSecoes: "No sections configured.",
    anexos: "Attachments",
    nomeAnexo: "File",
    tipoAnexo: "Type",
    linkAnexo: "Drive link",
    semAnexos: "No attachments.",
    assinaturas: "Signatures",
    assTecnico: "Technician",
    assCliente: "Customer",
    naoAssinado: "Unsigned",
    sim: "Yes",
    nao: "No",
    na: "N/A",
    pagina: "Page",
    de: "of",
    audit: "Digitally signed document — HMAC-SHA256 verification available on the portal.",
  },
};

export type SatItemTipo =
  | "sim_nao_comentario"
  | "texto"
  | "numero"
  | "data"
  | "checkbox_multi"
  | "parametro_operacional"
  | "cabecalho";

export type SatPdfPayload = {
  cliente: { codigo: string; razao_social: string };
  processo?: { codigo: string; titulo: string } | null;
  sat: {
    codigo: string;
    local_endereco: string | null;
    periodo_de: string | null;
    periodo_ate: string | null;
    motivos_viagem: string[];
    observacoes: string | null;
    status: string;
    assinatura_tecnico_url: string | null;
    assinatura_cliente_url: string | null;
    assinatura_tecnico_nome: string | null;
    assinatura_cliente_nome: string | null;
  };
  tecnicos: Array<{ nome: string; email?: string | null; cargo?: string | null }>;
  equipamentos: Array<{ tag: string | null; descricao: string | null }>;
  secoes: Array<{
    id: string;
    titulo: string;
    descricao: string | null;
    itens: Array<{
      id: string;
      label: string;
      tipo: SatItemTipo;
      valor: any;
      comentario: string | null;
    }>;
  }>;
  anexos: Array<{
    nome: string;
    tipo: string;
    url: string;
  }>;
};

function renderValor(
  tipo: SatItemTipo,
  valor: any,
  idioma: Idioma,
  t: Record<string, string>,
): { texto: string; chip?: "ok" | "nok" | "na" } {
  if (valor == null || valor === "") return { texto: "—" };
  switch (tipo) {
    case "sim_nao_comentario": {
      const v = (typeof valor === "object" ? valor.resposta : valor) as string;
      if (v === "sim") return { texto: t.sim, chip: "ok" };
      if (v === "nao") return { texto: t.nao, chip: "nok" };
      if (v === "na") return { texto: t.na, chip: "na" };
      return { texto: String(v ?? "—") };
    }
    case "numero":
      return { texto: typeof valor === "number" ? formatNumber(valor, idioma) : String(valor) };
    case "data":
      return { texto: typeof valor === "string" ? formatDate(valor, idioma) : String(valor) };
    case "checkbox_multi":
      return { texto: Array.isArray(valor) ? valor.join(", ") : String(valor) };
    case "parametro_operacional": {
      if (typeof valor === "object" && valor) {
        const { medido, unidade, nominal } = valor as any;
        const m = medido != null ? formatNumber(Number(medido), idioma) : "—";
        const n = nominal != null ? ` / ${formatNumber(Number(nominal), idioma)}` : "";
        return { texto: `${m}${unidade ? ` ${unidade}` : ""}${n}` };
      }
      return { texto: String(valor) };
    }
    case "cabecalho":
      return { texto: "" };
    default:
      return { texto: typeof valor === "object" ? JSON.stringify(valor) : String(valor) };
  }
}

function extractComentario(tipo: SatItemTipo, valor: any): string | null {
  if (valor && typeof valor === "object") {
    if (tipo === "sim_nao_comentario") return (valor as any).comentario || null;
    if (tipo === "parametro_operacional") return (valor as any).observacao || null;
  }
  return null;
}

export function SatPdf({
  codigo,
  versao,
  idioma,
  data,
  payload,
  layout,
}: {
  codigo: string;
  versao: string;
  idioma: Idioma;
  data: Date;
  payload: SatPdfPayload;
  layout: DocumentoLayoutConfig;
}) {
  const s = styles(layout.accent_color || "#0F172A");
  const t = L[idioma];
  const fmtDate = (iso: string | null) => (iso ? formatDate(iso, idioma) : "—");

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader
          layout={layout}
          titulo={t.title}
          codigo={codigo}
          versao={versao}
          idioma={idioma}
          dataFmt={fmtDate(data.toISOString())}
        />
        <PdfFooter
          layout={layout}
          titulo={t.title}
          versao={versao}
          responsavel={payload.tecnicos[0]?.nome || payload.sat.assinatura_tecnico_nome || "—"}
          idioma={idioma}
        />

        <View style={s.coverWrap}>
          <Text style={s.coverTitle}>{t.title}</Text>
          <View style={s.coverAccentBar} />
          <Text style={s.coverSubtitle}>
            {t.subtitle}
            {payload.processo ? ` · ${payload.processo.codigo} — ${payload.processo.titulo}` : ""}
          </Text>
        </View>

        <Text style={s.sectionTitle}>{t.identificacao}</Text>
        <View style={s.keyGrid}>
          <KV label={t.codigo} value={payload.sat.codigo} s={s} />
          <KV label={t.local} value={payload.sat.local_endereco || "—"} s={s} />
          <KV
            label={t.periodo}
            value={`${fmtDate(payload.sat.periodo_de)} — ${fmtDate(payload.sat.periodo_ate)}`}
            s={s}
          />
          <KV
            label={t.motivos}
            value={(payload.sat.motivos_viagem || []).join(", ") || "—"}
            s={s}
          />
        </View>

        <Text style={s.sectionTitle}>{t.tecnicos}</Text>
        {payload.tecnicos.length === 0 ? (
          <Text style={s.para}>—</Text>
        ) : (
          <View style={s.keyGrid}>
            {payload.tecnicos.map((tc, i) => (
              <KV
                key={i}
                label={tc.cargo || t.assTecnico}
                value={`${tc.nome}${tc.email ? ` · ${tc.email}` : ""}`}
                s={s}
              />
            ))}
          </View>
        )}

        {payload.equipamentos.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t.equipamentos}</Text>
            <View style={s.table}>
              <View style={s.tHeader}>
                <Text style={[s.tCell, { width: "30%" }]}>TAG</Text>
                <Text style={[s.tCell, { width: "70%" }]}>—</Text>
              </View>
              {payload.equipamentos.map((eq, i) => (
                <View key={i} style={[s.tRow, i % 2 ? s.tRowZebra : {}]} wrap={false}>
                  <Text style={[s.tCell, { width: "30%" }]}>{eq.tag || "—"}</Text>
                  <Text style={[s.tCell, { width: "70%" }]}>{eq.descricao || "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={s.sectionTitle}>Checklist</Text>
        {payload.secoes.length === 0 ? (
          <Text style={s.para}>{t.semSecoes}</Text>
        ) : (
          payload.secoes.map((sec) => (
            <View key={sec.id} wrap={false}>
              <Text style={s.secaoTitle}>{sec.titulo}</Text>
              {sec.descricao ? <Text style={s.secaoDesc}>{sec.descricao}</Text> : null}
              {sec.itens.length === 0 ? (
                <Text style={s.para}>{t.semItens}</Text>
              ) : (
                sec.itens.map((it, i) => {
                  if (it.tipo === "cabecalho") {
                    return (
                      <Text key={it.id} style={s.secaoTitle}>
                        {it.label}
                      </Text>
                    );
                  }
                  const r = renderValor(it.tipo, it.valor, idioma, t);
                  const com = it.comentario ?? extractComentario(it.tipo, it.valor);
                  return (
                    <View key={it.id} style={[s.itemRow, i % 2 ? s.itemRowZebra : {}]}>
                      <Text style={s.itemLabel}>{it.label}</Text>
                      <View style={s.itemValue}>
                        <Text
                          style={
                            r.chip === "ok"
                              ? s.chipOk
                              : r.chip === "nok"
                                ? s.chipNok
                                : r.chip === "na"
                                  ? s.chipNa
                                  : {}
                          }
                        >
                          {r.texto || "—"}
                        </Text>
                        {com ? <Text style={s.itemComment}>{com}</Text> : null}
                      </View>
                    </View>
                  );
                })
              )}
            </View>
          ))
        )}

        <Text style={s.sectionTitle}>{t.obs}</Text>
        <Text style={s.para}>{payload.sat.observacoes || t.semObs}</Text>

        {payload.anexos.length > 0 && (
          <>
            <Text style={s.sectionTitle}>{t.anexos}</Text>
            <View style={s.table}>
              <View style={s.tHeader}>
                <Text style={[s.tCell, { width: "60%" }]}>{t.nomeAnexo}</Text>
                <Text style={[s.tCell, { width: "20%" }]}>{t.tipoAnexo}</Text>
                <Text style={[s.tCell, { width: "20%" }]}>{t.linkAnexo}</Text>
              </View>
              {payload.anexos.map((a, i) => (
                <View key={i} style={[s.tRow, i % 2 ? s.tRowZebra : {}]} wrap={false}>
                  <Text style={[s.tCell, { width: "60%" }]}>{a.nome}</Text>
                  <Text style={[s.tCell, { width: "20%" }]}>{a.tipo}</Text>
                  <Text style={[s.tCell, { width: "20%" }]}>{a.url ? "Drive" : "—"}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={s.sectionTitle}>{t.assinaturas}</Text>
        <View style={s.signGrid}>
          <View style={s.signBox}>
            {payload.sat.assinatura_tecnico_url ? (
              <Image src={payload.sat.assinatura_tecnico_url} style={s.signImg} />
            ) : null}
            <Text style={s.signLabel}>{t.assTecnico}</Text>
            <Text style={s.signValue}>{payload.sat.assinatura_tecnico_nome || t.naoAssinado}</Text>
          </View>
          <View style={s.signBox}>
            {payload.sat.assinatura_cliente_url ? (
              <Image src={payload.sat.assinatura_cliente_url} style={s.signImg} />
            ) : null}
            <Text style={s.signLabel}>{t.assCliente}</Text>
            <Text style={s.signValue}>{payload.sat.assinatura_cliente_nome || t.naoAssinado}</Text>
          </View>
        </View>
        <Text style={s.auditFoot}>{t.audit}</Text>
      </Page>
    </Document>
  );
}

function KV({ label, value, s }: { label: string; value: string; s: any }) {
  return (
    <View style={s.keyCell}>
      <Text style={s.keyLabel}>{label}</Text>
      <Text style={s.keyValue}>{value}</Text>
    </View>
  );
}
