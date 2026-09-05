/**
 * Header e rodapé compartilhados pelos PDFs gerados (Orçamento, FAT, SAT).
 * Mantém o layout enxuto: 64pt no topo / 48pt na base.
 */
import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { DocumentoLayoutConfig, Idioma } from "./types";
import { SYSTEM_LOGO_DATA_URL } from "./system-logo";
import { parseLogoUrl } from "./logo-opts";

const TOKENS = {
  fontBody: "Helvetica",
  fontBold: "Helvetica-Bold",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
};

const PAGINA_LABEL: Record<Idioma, { pagina: string; de: string; resp: string }> = {
  pt: { pagina: "Página", de: "de", resp: "Resp." },
  es: { pagina: "Página", de: "de", resp: "Resp." },
  en: { pagina: "Page", de: "of", resp: "Owner" },
};

export const CHROME_PAGE_STYLE = {
  paddingTop: 64,
  paddingBottom: 48,
  paddingHorizontal: 48,
  fontFamily: TOKENS.fontBody,
  fontSize: 9.5,
  color: TOKENS.text,
  lineHeight: 1.45,
} as const;

const chromeStyles = (accent: string, logoHeight: number, logoGap: number) =>
  StyleSheet.create({
    header: {
      position: "absolute",
      top: 22,
      left: 48,
      right: 48,
      paddingBottom: 6,
      borderBottomWidth: 0.6,
      borderBottomColor: accent,
      borderBottomStyle: "solid",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: logoGap, maxWidth: "55%" },
    logoBox: {
      backgroundColor: "#FFFFFF",
    },

    headerLogo: {
      height: logoHeight,
      width: "auto",
      maxWidth: logoHeight * 3.5,
      objectFit: "contain",
    },
    headerEmpresaCol: { flexDirection: "column" },
    headerEmpresa: { fontSize: 10, fontFamily: TOKENS.fontBold, color: accent },
    headerSub: { fontSize: 7, color: TOKENS.muted, marginTop: 1 },
    headerRight: { alignItems: "flex-end", maxWidth: "45%" },
    headerTitulo: { fontSize: 10, fontFamily: TOKENS.fontBold, color: TOKENS.text },
    headerMeta: { fontSize: 7.5, color: TOKENS.muted, marginTop: 1 },

    footer: {
      position: "absolute",
      bottom: 18,
      left: 48,
      right: 48,
      paddingTop: 4,
      borderTopWidth: 0.4,
      borderTopColor: TOKENS.border,
      borderTopStyle: "solid",
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      fontSize: 7,
      color: TOKENS.muted,
    },
    footerLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      flexShrink: 1,
      maxWidth: "32%",
    },
    footerCenter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      flexShrink: 1,
      maxWidth: "44%",
      justifyContent: "center",
    },
    footerRight: { flexShrink: 0, maxWidth: "24%", textAlign: "right" },
    footerStrong: { fontFamily: TOKENS.fontBold, color: TOKENS.text },
  });

function truncate(s: string | null | undefined, max: number): string {
  if (!s) return "";
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

export function PdfHeader({
  layout,
  titulo,
  codigo,
  versao,
  idioma,
  dataFmt,
}: {
  layout: DocumentoLayoutConfig;
  titulo: string;
  codigo: string;
  versao: string;
  idioma: Idioma;
  dataFmt: string;
}) {
  const accent = layout.accent_color || "#0B3D91";
  const { url, opts } = parseLogoUrl(layout.logo_url);
  const s = chromeStyles(accent, opts.altura, opts.gap);
  const src = url || SYSTEM_LOGO_DATA_URL;
  return (
    <View style={s.header} fixed>
      <View style={s.headerLeft}>
        <View style={s.logoBox}>
          <Image src={src} style={s.headerLogo} />
        </View>
        <View style={s.headerEmpresaCol}>
          <Text style={s.headerEmpresa}>{layout.empresa_nome || "—"}</Text>
          {layout.empresa_contato ? (
            <Text style={s.headerSub}>{truncate(layout.empresa_contato, 60)}</Text>
          ) : layout.empresa_endereco ? (
            <Text style={s.headerSub}>{truncate(layout.empresa_endereco, 60)}</Text>
          ) : null}
        </View>
      </View>
      <View style={s.headerRight}>
        <Text style={s.headerTitulo}>{titulo}</Text>
        <Text style={s.headerMeta}>
          {codigo} · v{versao} · {idioma.toUpperCase()} · {dataFmt}
        </Text>
      </View>
    </View>
  );
}

export function PdfFooter({
  layout,
  titulo,
  versao,
  responsavel,
  idioma,
  tag,
}: {
  layout: DocumentoLayoutConfig;
  titulo: string;
  versao: string;
  responsavel: string;
  idioma: Idioma;
  tag?: string;
}) {
  const accent = layout.accent_color || "#0B3D91";
  const s = chromeStyles(accent, 24, 8);
  const L = PAGINA_LABEL[idioma];
  const extra = truncate(layout.rodape_extra, 80);
  const empresa = truncate(layout.empresa_nome, 40);
  const endereco = truncate(layout.empresa_endereco, 70);
  return (
    <View style={s.footer} fixed>
      <View style={s.footerLeft}>
        {empresa ? (
          <Text style={s.footerStrong}>{empresa}</Text>
        ) : (
          <Text style={s.footerStrong}>{truncate(titulo, 40)}</Text>
        )}
        {endereco ? <Text>· {endereco}</Text> : <Text>· v{versao}</Text>}
      </View>
      <View style={s.footerCenter}>
        {tag ? <Text style={s.footerStrong}>{tag}</Text> : null}
        {tag ? <Text>·</Text> : null}
        <Text>
          {L.resp}: {truncate(responsavel, 28) || "—"}
        </Text>
        {extra ? <Text>· {extra}</Text> : null}
      </View>
      <Text
        style={s.footerRight}
        render={({ pageNumber, totalPages }) => `${L.pagina} ${pageNumber} ${L.de} ${totalPages}`}
      />
    </View>
  );
}
