/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";
import type { DocumentoLayoutConfig, Idioma } from "./types";
import { formatDate, formatNumber } from "./formatters";
import { CHROME_PAGE_STYLE, PdfHeader, PdfFooter } from "./pdf-chrome";

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
    coverAccentBar: { width: 56, height: 3, backgroundColor: accent, marginTop: 14, marginBottom: 18 },
    coverSubtitle: { fontSize: 11, color: TOKENS.muted },
    sectionTitle: {
      fontSize: 12, fontFamily: TOKENS.fontBold, color: TOKENS.text,
      marginTop: 18, marginBottom: 8, paddingBottom: 4,
      borderBottomWidth: 1, borderBottomColor: accent, borderBottomStyle: "solid",
    },
    keyGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 8 },
    keyCell: { width: "50%", marginBottom: 4, paddingRight: 8 },
    keyLabel: { fontSize: 7.5, color: TOKENS.muted, textTransform: "uppercase", letterSpacing: 0.4 },
    keyValue: { fontSize: 9.5, color: TOKENS.text },
    table: { borderWidth: 0.5, borderColor: TOKENS.borderStrong, borderStyle: "solid", marginBottom: 8 },
    tHeader: { flexDirection: "row", backgroundColor: accent, color: "#FFFFFF", fontSize: 8.5, fontFamily: TOKENS.fontBold },
    tRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: TOKENS.border, borderTopStyle: "solid" },
    tRowZebra: { backgroundColor: TOKENS.zebra },
    tCell: { padding: 5, fontSize: 9 },
    tRight: { textAlign: "right" },
    chipOk: { color: "#065F46" },
    chipNok: { color: "#991B1B" },
    para: { marginBottom: 6 },
    rncBox: {
      borderLeftWidth: 3, borderLeftColor: "#F59E0B", borderLeftStyle: "solid",
      paddingLeft: 8, marginBottom: 8,
    },
    rncTitle: { fontSize: 10, fontFamily: TOKENS.fontBold },
    rncMeta: { fontSize: 8, color: TOKENS.muted, marginBottom: 2 },
    signGrid: { flexDirection: "row", marginTop: 24, gap: 16 },
    signBox: { flex: 1, borderTopWidth: 0.5, borderTopColor: TOKENS.text, borderTopStyle: "solid", paddingTop: 4 },
    signLabel: { fontSize: 8, color: TOKENS.muted, textTransform: "uppercase", letterSpacing: 0.4 },
    signValue: { fontSize: 9.5, fontFamily: TOKENS.fontBold },
    auditFoot: { marginTop: 16, fontSize: 7, color: TOKENS.muted },
  });

const L: Record<Idioma, Record<string, string>> = {
  pt: {
    title: "Relatório FAT",
    subtitle: "Factory Acceptance Test",
    identificacao: "Identificação", os: "OS", tag: "TAG", data: "Data do ensaio",
    inspetor: "Inspetor", testemunha: "Testemunha", local: "Local",
    cond: "Condições", temp: "Temperatura", umid: "Umidade", tensao: "Tensão",
    motivos: "Motivos da viagem", periodo: "Período",
    medicoes: "Medições", parametro: "Parâmetro", unidade: "Unidade",
    nominal: "Nominal", tol: "Tolerância", medido: "Medido", status: "Status",
    rncs: "Não conformidades (RNC)", prazo: "Prazo", plano: "Plano de ação",
    obs: "Observações gerais", semObs: "Sem observações.",
    homolog: "Homologação", homologadoEm: "Homologado em", homologadoPor: "Homologado por",
    assInspetor: "Inspetor", assTestemunha: "Testemunha",
    pagina: "Página", de: "de",
    audit: "Documento assinado digitalmente — verificação HMAC-SHA256 disponível no portal.",
    semRnc: "Sem RNCs registradas.", semMed: "Sem medições registradas.",
    ok: "OK", nok: "NOK", na: "N/A",
  },
  es: {
    title: "Informe FAT", subtitle: "Factory Acceptance Test",
    identificacao: "Identificación", os: "OS", tag: "TAG", data: "Fecha del ensayo",
    inspetor: "Inspector", testemunha: "Testigo", local: "Lugar",
    cond: "Condiciones", temp: "Temperatura", umid: "Humedad", tensao: "Tensión",
    motivos: "Motivos del viaje", periodo: "Período",
    medicoes: "Mediciones", parametro: "Parámetro", unidade: "Unidad",
    nominal: "Nominal", tol: "Tolerancia", medido: "Medido", status: "Estado",
    rncs: "No conformidades (RNC)", prazo: "Plazo", plano: "Plan de acción",
    obs: "Observaciones generales", semObs: "Sin observaciones.",
    homolog: "Homologación", homologadoEm: "Homologado el", homologadoPor: "Homologado por",
    assInspetor: "Inspector", assTestemunha: "Testigo",
    pagina: "Página", de: "de",
    audit: "Documento firmado digitalmente — verificación HMAC-SHA256 disponible en el portal.",
    semRnc: "Sin RNCs registradas.", semMed: "Sin mediciones registradas.",
    ok: "OK", nok: "NOK", na: "N/A",
  },
  en: {
    title: "FAT Report", subtitle: "Factory Acceptance Test",
    identificacao: "Identification", os: "WO", tag: "TAG", data: "Test date",
    inspetor: "Inspector", testemunha: "Witness", local: "Location",
    cond: "Conditions", temp: "Temperature", umid: "Humidity", tensao: "Voltage",
    motivos: "Trip motives", periodo: "Period",
    medicoes: "Measurements", parametro: "Parameter", unidade: "Unit",
    nominal: "Nominal", tol: "Tolerance", medido: "Measured", status: "Status",
    rncs: "Non-conformities (NCR)", prazo: "Due", plano: "Action plan",
    obs: "General notes", semObs: "No notes.",
    homolog: "Approval", homologadoEm: "Approved on", homologadoPor: "Approved by",
    assInspetor: "Inspector", assTestemunha: "Witness",
    pagina: "Page", de: "of",
    audit: "Digitally signed document — HMAC-SHA256 verification available on the portal.",
    semRnc: "No NCRs recorded.", semMed: "No measurements recorded.",
    ok: "OK", nok: "NOK", na: "N/A",
  },
};

export type FatPdfPayload = {
  cliente: { codigo: string; razao_social: string };
  processo?: { codigo: string; titulo: string } | null;
  fat: {
    codigo: string;
    os_codigo: string | null;
    tag_equipamento: string | null;
    data_ensaio: string | null;
    hora_inicio: string | null;
    local_ensaio: string | null;
    temperatura_c: number | null;
    umidade_rel: number | null;
    tensao_alimentacao: string | null;
    motivos_viagem: string[] | null;
    periodo_de: string | null;
    periodo_ate: string | null;
    tecnicos: string | null;
    testemunha_nome: string | null;
    observacoes_gerais: string | null;
    homologado_em: string | null;
    status: string;
  };
  inspetor: { nome: string; email: string | null };
  homologador: { nome: string | null };
  medicoes: Array<{
    ordem: number; parametro: string; unidade: string | null;
    nominal: number | null; tolerancia: string | null; medido: number | null; status_auto: string | null;
  }>;
  rncs: Array<{
    codigo: string; titulo: string; descricao: string | null;
    plano_acao: string | null; prazo: string | null; status: string;
  }>;
};

export function FatPdf({
  codigo, versao, idioma, data, payload, layout,
}: {
  codigo: string; versao: string; idioma: Idioma; data: Date;
  payload: FatPdfPayload; layout: DocumentoLayoutConfig;
}) {
  const s = styles(layout.accent_color || "#0F172A");
  const t = L[idioma];
  const fmtDate = (iso: string | null) => (iso ? formatDate(iso, idioma) : "—");
  const fmtNum = (n: number | null, suffix = "") =>
    n == null || isNaN(n) ? "—" : `${formatNumber(n, idioma)}${suffix}`;

  const statusLabel = (s: string | null) => {
    if (s === "ok") return t.ok;
    if (s === "nok") return t.nok;
    return t.na;
  };

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
          responsavel={payload.inspetor.nome}
          idioma={idioma}
        />

        {/* Cover */}
        <View style={s.coverWrap}>
          <Text style={s.coverTitle}>{t.title}</Text>
          <View style={s.coverAccentBar} />
          <Text style={s.coverSubtitle}>{t.subtitle}{payload.processo ? ` · ${payload.processo.codigo} — ${payload.processo.titulo}` : ""}</Text>
        </View>

        {/* Identificação */}
        <Text style={s.sectionTitle}>{t.identificacao}</Text>
        <View style={s.keyGrid}>
          <KV label={t.os} value={payload.fat.os_codigo || "—"} s={s} />
          <KV label={t.tag} value={payload.fat.tag_equipamento || "—"} s={s} />
          <KV label={t.data} value={fmtDate(payload.fat.data_ensaio)} s={s} />
          <KV label={t.local} value={payload.fat.local_ensaio || "—"} s={s} />
          <KV label={t.inspetor} value={payload.inspetor.nome} s={s} />
          <KV label={t.testemunha} value={payload.fat.testemunha_nome || "—"} s={s} />
          <KV label={t.periodo} value={`${fmtDate(payload.fat.periodo_de)} — ${fmtDate(payload.fat.periodo_ate)}`} s={s} />
          <KV label={t.motivos} value={(payload.fat.motivos_viagem || []).join(", ") || "—"} s={s} />
        </View>

        <Text style={s.sectionTitle}>{t.cond}</Text>
        <View style={s.keyGrid}>
          <KV label={t.temp} value={fmtNum(payload.fat.temperatura_c, " °C")} s={s} />
          <KV label={t.umid} value={fmtNum(payload.fat.umidade_rel, " %")} s={s} />
          <KV label={t.tensao} value={payload.fat.tensao_alimentacao || "—"} s={s} />
        </View>

        {/* Medições */}
        <Text style={s.sectionTitle}>{t.medicoes}</Text>
        {payload.medicoes.length === 0 ? (
          <Text style={s.para}>{t.semMed}</Text>
        ) : (
          <View style={s.table}>
            <View style={s.tHeader}>
              <Text style={[s.tCell, { width: "8%" }]}>#</Text>
              <Text style={[s.tCell, { width: "32%" }]}>{t.parametro}</Text>
              <Text style={[s.tCell, { width: "10%" }]}>{t.unidade}</Text>
              <Text style={[s.tCell, { width: "14%" }, s.tRight]}>{t.nominal}</Text>
              <Text style={[s.tCell, { width: "14%" }]}>{t.tol}</Text>
              <Text style={[s.tCell, { width: "14%" }, s.tRight]}>{t.medido}</Text>
              <Text style={[s.tCell, { width: "8%" }]}>{t.status}</Text>
            </View>
            {payload.medicoes.map((m, i) => (
              <View key={i} style={[s.tRow, i % 2 ? s.tRowZebra : {}]} wrap={false}>
                <Text style={[s.tCell, { width: "8%" }]}>{m.ordem}</Text>
                <Text style={[s.tCell, { width: "32%" }]}>{m.parametro}</Text>
                <Text style={[s.tCell, { width: "10%" }]}>{m.unidade || "—"}</Text>
                <Text style={[s.tCell, { width: "14%" }, s.tRight]}>{fmtNum(m.nominal)}</Text>
                <Text style={[s.tCell, { width: "14%" }]}>{m.tolerancia || "—"}</Text>
                <Text style={[s.tCell, { width: "14%" }, s.tRight]}>{fmtNum(m.medido)}</Text>
                <Text style={[s.tCell, { width: "8%" }, m.status_auto === "ok" ? s.chipOk : m.status_auto === "nok" ? s.chipNok : {}]}>
                  {statusLabel(m.status_auto)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* RNCs */}
        <Text style={s.sectionTitle}>{t.rncs}</Text>
        {payload.rncs.length === 0 ? (
          <Text style={s.para}>{t.semRnc}</Text>
        ) : (
          payload.rncs.map((r, i) => (
            <View key={i} style={s.rncBox} wrap={false}>
              <Text style={s.rncTitle}>{r.codigo} — {r.titulo}</Text>
              <Text style={s.rncMeta}>{t.prazo}: {fmtDate(r.prazo)} · {t.status}: {r.status}</Text>
              {r.descricao ? <Text>{r.descricao}</Text> : null}
              {r.plano_acao ? <Text>{t.plano}: {r.plano_acao}</Text> : null}
            </View>
          ))
        )}

        {/* Observações */}
        <Text style={s.sectionTitle}>{t.obs}</Text>
        <Text style={s.para}>{payload.fat.observacoes_gerais || t.semObs}</Text>

        {/* Homologação + assinaturas */}
        <Text style={s.sectionTitle}>{t.homolog}</Text>
        <View style={s.keyGrid}>
          <KV label={t.homologadoEm} value={fmtDate(payload.fat.homologado_em)} s={s} />
          <KV label={t.homologadoPor} value={payload.homologador.nome || "—"} s={s} />
        </View>
        <View style={s.signGrid}>
          <View style={s.signBox}>
            <Text style={s.signLabel}>{t.assInspetor}</Text>
            <Text style={s.signValue}>{payload.inspetor.nome}</Text>
          </View>
          <View style={s.signBox}>
            <Text style={s.signLabel}>{t.assTestemunha}</Text>
            <Text style={s.signValue}>{payload.fat.testemunha_nome || "—"}</Text>
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
