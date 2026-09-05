/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { DocumentoLayoutConfig, Idioma } from "./types";
import { CHROME_PAGE_STYLE, PdfHeader, PdfFooter } from "./pdf-chrome";

const TOKENS = {
  fontBody: "Helvetica",
  fontBold: "Helvetica-Bold",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  zebra: "#F9FAFB",
};

const styles = (accent: string) =>
  StyleSheet.create({
    page: { ...CHROME_PAGE_STYLE },
    coverWrap: { marginTop: 8, marginBottom: 12 },
    coverTitle: { fontSize: 22, fontFamily: TOKENS.fontBold, color: TOKENS.text },
    coverAccentBar: {
      width: 56,
      height: 3,
      backgroundColor: accent,
      marginTop: 12,
      marginBottom: 14,
    },
    coverSubtitle: { fontSize: 11, color: TOKENS.muted },
    keyGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 8, marginBottom: 6 },
    keyCell: { width: "50%", marginBottom: 5, paddingRight: 8 },
    keyLabel: {
      fontSize: 7.5,
      color: TOKENS.muted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    keyValue: { fontSize: 9.5, color: TOKENS.text },
    sectionTitle: {
      fontSize: 12,
      fontFamily: TOKENS.fontBold,
      color: TOKENS.text,
      marginTop: 16,
      marginBottom: 8,
      paddingBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      borderBottomStyle: "solid",
    },
    qBlock: {
      marginBottom: 10,
      padding: 8,
      borderWidth: 0.5,
      borderColor: TOKENS.border,
      borderStyle: "solid",
      borderRadius: 3,
      backgroundColor: TOKENS.zebra,
    },
    qNum: {
      fontSize: 7.5,
      color: TOKENS.muted,
      marginBottom: 2,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    qText: { fontSize: 10, fontFamily: TOKENS.fontBold, color: TOKENS.text, marginBottom: 6 },
    aText: { fontSize: 9.5, color: TOKENS.text, marginBottom: 2 },
    aBullet: { fontSize: 9.5, color: TOKENS.text, marginLeft: 10 },
    extra: {
      marginTop: 4,
      paddingLeft: 8,
      fontSize: 8.5,
      color: TOKENS.muted,
      borderLeftWidth: 2,
      borderLeftColor: accent,
      borderLeftStyle: "solid",
    },
    empty: { fontSize: 9.5, color: TOKENS.muted, fontStyle: "italic" },
  });

const L: Record<
  Idioma,
  {
    title: string;
    subtitle: string;
    ident: string;
    codigo: string;
    segmento: string;
    idioma: string;
    lead: string;
    empresa: string;
    email: string;
    pilar: string;
    criada: string;
    respondida: string;
    respostas: string;
    semRespostas: string;
    pergunta: string;
    semResposta: string;
    observacao: string;
  }
> = {
  pt: {
    title: "Entrevista Técnica",
    subtitle: "Respostas do lead",
    ident: "Identificação",
    codigo: "Código",
    segmento: "Segmento",
    idioma: "Idioma",
    lead: "Lead",
    empresa: "Empresa",
    email: "E-mail",
    pilar: "Pilar (criador)",
    criada: "Criada em",
    respondida: "Respondida em",
    respostas: "Respostas",
    semRespostas: "Sem respostas registradas.",
    pergunta: "Pergunta",
    semResposta: "— não respondida —",
    observacao: "Observação",
  },
  es: {
    title: "Entrevista Técnica",
    subtitle: "Respuestas del lead",
    ident: "Identificación",
    codigo: "Código",
    segmento: "Segmento",
    idioma: "Idioma",
    lead: "Lead",
    empresa: "Empresa",
    email: "E-mail",
    pilar: "Pilar (creador)",
    criada: "Creada el",
    respondida: "Respondida el",
    respostas: "Respuestas",
    semRespostas: "Sin respuestas registradas.",
    pergunta: "Pregunta",
    semResposta: "— sin respuesta —",
    observacao: "Observación",
  },
  en: {
    title: "Technical Interview",
    subtitle: "Lead answers",
    ident: "Identification",
    codigo: "Code",
    segmento: "Segment",
    idioma: "Language",
    lead: "Lead",
    empresa: "Company",
    email: "E-mail",
    pilar: "Pillar (owner)",
    criada: "Created at",
    respondida: "Answered at",
    respostas: "Answers",
    semRespostas: "No answers recorded.",
    pergunta: "Question",
    semResposta: "— not answered —",
    observacao: "Note",
  },
};

export type EntrevistaPdfInput = {
  idioma: Idioma;
  layout: DocumentoLayoutConfig;
  codigo: string;
  segmento_nome: string;
  lead_nome: string | null;
  lead_empresa: string | null;
  lead_email: string | null;
  criador_nome: string | null;
  criada_em: string;
  respondida_em: string | null;
  responsavel: string;
  respostas: Array<{
    numero: number;
    enunciado: string;
    valor_text: string | null;
    valor_options: any;
    descricao_extra: string | null;
  }>;
};

function fmtDate(iso: string | null, idioma: Idioma): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const loc = idioma === "pt" ? "pt-BR" : idioma === "es" ? "es-ES" : "en-US";
  return d.toLocaleString(loc);
}

export function EntrevistaPdf(props: EntrevistaPdfInput) {
  const t = L[props.idioma];
  const s = styles(props.layout.accent_color || "#0B3D91");
  const codigoDoc = `ENT-${props.codigo}`;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader
          layout={props.layout}
          titulo={t.title}
          codigo={codigoDoc}
          versao="1"
          idioma={props.idioma}
          dataFmt={fmtDate(props.respondida_em || props.criada_em, props.idioma)}
        />

        <View style={s.coverWrap}>
          <Text style={s.coverTitle}>{t.title}</Text>
          <View style={s.coverAccentBar} />
          <Text style={s.coverSubtitle}>
            {t.subtitle} · {props.segmento_nome}
          </Text>
        </View>

        <Text style={s.sectionTitle}>{t.ident}</Text>
        <View style={s.keyGrid}>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.codigo}</Text>
            <Text style={s.keyValue}>#{props.codigo}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.segmento}</Text>
            <Text style={s.keyValue}>{props.segmento_nome}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.lead}</Text>
            <Text style={s.keyValue}>{props.lead_nome || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.empresa}</Text>
            <Text style={s.keyValue}>{props.lead_empresa || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.email}</Text>
            <Text style={s.keyValue}>{props.lead_email || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.pilar}</Text>
            <Text style={s.keyValue}>{props.criador_nome || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.criada}</Text>
            <Text style={s.keyValue}>{fmtDate(props.criada_em, props.idioma)}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>{t.respondida}</Text>
            <Text style={s.keyValue}>{fmtDate(props.respondida_em, props.idioma)}</Text>
          </View>
        </View>

        <Text style={s.sectionTitle}>{t.respostas}</Text>
        {props.respostas.length === 0 ? (
          <Text style={s.empty}>{t.semRespostas}</Text>
        ) : (
          props.respostas.map((r) => {
            const opts: string[] = Array.isArray(r.valor_options) ? r.valor_options : [];
            const hasText = !!(r.valor_text && r.valor_text.trim().length);
            const hasAny = opts.length > 0 || hasText;
            return (
              <View key={`${r.numero}-${r.enunciado}`} style={s.qBlock} wrap={false}>
                <Text style={s.qNum}>
                  {t.pergunta} {r.numero}
                </Text>
                <Text style={s.qText}>{r.enunciado}</Text>
                {opts.map((o, i) => (
                  <Text key={i} style={s.aBullet}>
                    • {o}
                  </Text>
                ))}
                {hasText && <Text style={s.aText}>{r.valor_text}</Text>}
                {!hasAny && <Text style={s.empty}>{t.semResposta}</Text>}
                {r.descricao_extra ? (
                  <Text style={s.extra}>
                    {t.observacao}: {r.descricao_extra}
                  </Text>
                ) : null}
              </View>
            );
          })
        )}

        <PdfFooter
          layout={props.layout}
          titulo={t.title}
          versao="1"
          responsavel={props.responsavel}
          idioma={props.idioma}
          tag={codigoDoc}
        />
      </Page>
    </Document>
  );
}
