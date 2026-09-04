/* eslint-disable @typescript-eslint/no-explicit-any */
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import type { DocumentoLayoutConfig } from "./types";
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
    title: { fontSize: 20, fontFamily: TOKENS.fontBold, color: TOKENS.text, marginTop: 6 },
    accentBar: { width: 48, height: 3, backgroundColor: accent, marginTop: 10, marginBottom: 14 },
    subtitle: { fontSize: 10, color: TOKENS.muted },
    section: {
      fontSize: 11, fontFamily: TOKENS.fontBold, color: TOKENS.text,
      marginTop: 14, marginBottom: 6, paddingBottom: 3,
      borderBottomWidth: 0.6, borderBottomColor: accent, borderBottomStyle: "solid",
    },
    keyGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
    keyCell: { width: "50%", marginBottom: 4, paddingRight: 8 },
    keyLabel: { fontSize: 7.5, color: TOKENS.muted, textTransform: "uppercase", letterSpacing: 0.4 },
    keyValue: { fontSize: 9.5, color: TOKENS.text },
    table: { borderWidth: 0.5, borderColor: TOKENS.borderStrong, borderStyle: "solid", marginBottom: 6 },
    tHeader: { flexDirection: "row", backgroundColor: accent, color: "#FFFFFF", fontSize: 8.5, fontFamily: TOKENS.fontBold },
    tRow: { flexDirection: "row", borderTopWidth: 0.5, borderTopColor: TOKENS.border, borderTopStyle: "solid" },
    tRowZebra: { backgroundColor: TOKENS.zebra },
    tCell: { padding: 4 },
    tRight: { textAlign: "right" },
    signatureRow: { flexDirection: "row", gap: 16, marginTop: 40 },
    sigBox: { flex: 1, borderTopWidth: 0.6, borderTopColor: TOKENS.borderStrong, borderTopStyle: "solid", paddingTop: 4 },
    sigLabel: { fontSize: 8, color: TOKENS.muted, textTransform: "uppercase", letterSpacing: 0.4 },
    smallMuted: { fontSize: 8.5, color: TOKENS.muted },
    logRow: { flexDirection: "row", borderTopWidth: 0.4, borderTopColor: TOKENS.border, borderTopStyle: "solid", paddingVertical: 3 },
    logCellDate: { width: "24%", fontSize: 8.5 },
    logCellFrom: { width: "18%", fontSize: 8.5 },
    logCellTo: { width: "18%", fontSize: 8.5, fontFamily: TOKENS.fontBold },
    logCellUser: { width: "40%", fontSize: 8.5, color: TOKENS.muted },
    anexoTitle: { fontSize: 9.5, fontFamily: TOKENS.fontBold, marginBottom: 4 },
    anexoImage: { width: "100%", maxHeight: 620, objectFit: "contain", marginBottom: 12 },
  });

export type RomaneioAnexo = {
  categoria: string;
  nome_arquivo: string;
  mime_type: string | null;
  dataUrl: string | null; // preenchido só para imagens
};

export type RomaneioStatusLog = {
  from_status: string | null;
  to_status: string;
  changed_at: string;
  actor_nome: string | null;
};

export type RomaneioPayload = {
  numero: string;
  status: string;
  cliente: { nome: string; documento?: string | null } | null;
  equipamento: { titulo: string } | null;
  projeto: { revisao: string | null } | null;
  transportadora: { nome: string; cnpj?: string | null; contato?: string | null; telefone?: string | null } | null;
  previsao_saida: string | null;
  data_saida: string | null;
  data_entrega: string | null;
  nf_saida: string | null;
  destino: string | null;
  observacoes: string | null;
  itens: Array<{
    ordem: number; descricao: string; quantidade: number; unidade: string | null;
    serial: string | null; peso_kg: number | null; volume_m3: number | null;
  }>;
  statusLog: RomaneioStatusLog[];
  anexos: RomaneioAnexo[];
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}
function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR");
}

export function RomaneioPdf({
  layout,
  payload,
  responsavel,
}: {
  layout: DocumentoLayoutConfig;
  payload: RomaneioPayload;
  responsavel: string;
}) {
  const accent = layout.accent_color || "#0B3D91";
  const s = styles(accent);
  const dataFmt = new Date().toLocaleDateString("pt-BR");

  const totalPeso = payload.itens.reduce((sum, it) => sum + (Number(it.peso_kg) || 0), 0);
  const totalVol = payload.itens.reduce((sum, it) => sum + (Number(it.volume_m3) || 0), 0);
  const totalQtd = payload.itens.reduce((sum, it) => sum + (Number(it.quantidade) || 0), 0);

  const imgAnexos = payload.anexos.filter((a) => a.dataUrl);
  const listOnlyAnexos = payload.anexos.filter((a) => !a.dataUrl);

  return (
    <Document>
      <Page size="A4" style={s.page}>
        <PdfHeader
          layout={layout}
          titulo="Romaneio de Embarque"
          codigo={payload.numero}
          versao="1"
          idioma="pt"
          dataFmt={dataFmt}
        />
        <PdfFooter
          layout={layout}
          titulo={`Romaneio ${payload.numero}`}
          versao="1"
          responsavel={responsavel}
          idioma="pt"
          tag={payload.numero}
        />

        <Text style={s.title}>Romaneio de Embarque</Text>
        <View style={s.accentBar} />
        <Text style={s.subtitle}>
          {payload.numero} · Status: {payload.status.toUpperCase()}
        </Text>

        {/* Cliente / Projeto */}
        <Text style={s.section}>Cliente e Equipamento</Text>
        <View style={s.keyGrid}>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Cliente</Text>
            <Text style={s.keyValue}>{payload.cliente?.nome || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Equipamento</Text>
            <Text style={s.keyValue}>{payload.equipamento?.titulo || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Projeto / Revisão</Text>
            <Text style={s.keyValue}>{payload.projeto?.revisao ? `Rev. ${payload.projeto.revisao}` : "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Destino</Text>
            <Text style={s.keyValue}>{payload.destino || "—"}</Text>
          </View>
        </View>

        {/* Transporte */}
        <Text style={s.section}>Transporte</Text>
        <View style={s.keyGrid}>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Transportadora</Text>
            <Text style={s.keyValue}>{payload.transportadora?.nome || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>CNPJ / Contato</Text>
            <Text style={s.keyValue}>
              {[payload.transportadora?.cnpj, payload.transportadora?.contato, payload.transportadora?.telefone]
                .filter(Boolean)
                .join(" · ") || "—"}
            </Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Previsão de saída</Text>
            <Text style={s.keyValue}>{fmtDate(payload.previsao_saida)}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>NF de saída</Text>
            <Text style={s.keyValue}>{payload.nf_saida || "—"}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Data embarcado</Text>
            <Text style={s.keyValue}>{fmtDateTime(payload.data_saida)}</Text>
          </View>
          <View style={s.keyCell}>
            <Text style={s.keyLabel}>Data entregue</Text>
            <Text style={s.keyValue}>{fmtDateTime(payload.data_entrega)}</Text>
          </View>
        </View>

        {/* Itens */}
        <Text style={s.section}>Itens do romaneio ({payload.itens.length})</Text>
        {payload.itens.length === 0 ? (
          <Text style={s.smallMuted}>Nenhum item registrado.</Text>
        ) : (
          <View style={s.table}>
            <View style={s.tHeader}>
              <Text style={[s.tCell, { width: "6%" }]}>#</Text>
              <Text style={[s.tCell, { width: "44%" }]}>Descrição</Text>
              <Text style={[s.tCell, { width: "14%" }]}>Serial</Text>
              <Text style={[s.tCell, { width: "10%" }, s.tRight]}>Qtd</Text>
              <Text style={[s.tCell, { width: "13%" }, s.tRight]}>Peso (kg)</Text>
              <Text style={[s.tCell, { width: "13%" }, s.tRight]}>Vol (m³)</Text>
            </View>
            {payload.itens.map((it, idx) => (
              <View key={idx} style={[s.tRow, idx % 2 === 1 ? s.tRowZebra : {}]} wrap={false}>
                <Text style={[s.tCell, { width: "6%" }]}>{it.ordem}</Text>
                <Text style={[s.tCell, { width: "44%" }]}>{it.descricao}</Text>
                <Text style={[s.tCell, { width: "14%" }]}>{it.serial || "—"}</Text>
                <Text style={[s.tCell, { width: "10%" }, s.tRight]}>
                  {Number(it.quantidade)} {it.unidade || ""}
                </Text>
                <Text style={[s.tCell, { width: "13%" }, s.tRight]}>{it.peso_kg ?? "—"}</Text>
                <Text style={[s.tCell, { width: "13%" }, s.tRight]}>{it.volume_m3 ?? "—"}</Text>
              </View>
            ))}
            <View style={[s.tRow, { backgroundColor: TOKENS.zebra }]} wrap={false}>
              <Text style={[s.tCell, { width: "6%" }]}> </Text>
              <Text style={[s.tCell, { width: "44%", fontFamily: TOKENS.fontBold }]}>Totais</Text>
              <Text style={[s.tCell, { width: "14%" }]}> </Text>
              <Text style={[s.tCell, { width: "10%", fontFamily: TOKENS.fontBold }, s.tRight]}>{totalQtd}</Text>
              <Text style={[s.tCell, { width: "13%", fontFamily: TOKENS.fontBold }, s.tRight]}>{totalPeso.toFixed(2)}</Text>
              <Text style={[s.tCell, { width: "13%", fontFamily: TOKENS.fontBold }, s.tRight]}>{totalVol.toFixed(3)}</Text>
            </View>
          </View>
        )}

        {payload.observacoes ? (
          <>
            <Text style={s.section}>Observações</Text>
            <Text style={{ fontSize: 9.5 }}>{payload.observacoes}</Text>
          </>
        ) : null}

        {/* Trilha de status */}
        {payload.statusLog.length > 0 && (
          <>
            <Text style={s.section}>Trilha de auditoria — mudanças de status</Text>
            <View style={s.logRow}>
              <Text style={[s.logCellDate, { fontFamily: TOKENS.fontBold }]}>Data / hora</Text>
              <Text style={[s.logCellFrom, { fontFamily: TOKENS.fontBold }]}>De</Text>
              <Text style={[s.logCellTo, { fontFamily: TOKENS.fontBold }]}>Para</Text>
              <Text style={[s.logCellUser, { fontFamily: TOKENS.fontBold, color: TOKENS.text }]}>Responsável</Text>
            </View>
            {payload.statusLog.map((l, i) => (
              <View key={i} style={s.logRow} wrap={false}>
                <Text style={s.logCellDate}>{fmtDateTime(l.changed_at)}</Text>
                <Text style={s.logCellFrom}>{l.from_status || "—"}</Text>
                <Text style={s.logCellTo}>{l.to_status}</Text>
                <Text style={s.logCellUser}>{l.actor_nome || "—"}</Text>
              </View>
            ))}
          </>
        )}

        {/* Assinaturas */}
        <View style={s.signatureRow} wrap={false}>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Expedidor</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Motorista / Transportadora</Text>
          </View>
          <View style={s.sigBox}>
            <Text style={s.sigLabel}>Recebedor</Text>
          </View>
        </View>

        {listOnlyAnexos.length > 0 && (
          <>
            <Text style={s.section}>Anexos referenciados</Text>
            {listOnlyAnexos.map((a, i) => (
              <Text key={i} style={{ fontSize: 9, marginBottom: 2 }}>
                • [{a.categoria}] {a.nome_arquivo}
              </Text>
            ))}
          </>
        )}
      </Page>

      {imgAnexos.map((a, i) => (
        <Page key={`anexo-${i}`} size="A4" style={s.page}>
          <PdfHeader layout={layout} titulo="Romaneio — Anexo" codigo={payload.numero} versao="1" idioma="pt" dataFmt={dataFmt} />
          <PdfFooter layout={layout} titulo={`Romaneio ${payload.numero}`} versao="1" responsavel={responsavel} idioma="pt" tag={payload.numero} />
          <Text style={s.anexoTitle}>
            [{a.categoria}] {a.nome_arquivo}
          </Text>
          {a.dataUrl ? <Image src={a.dataUrl} style={s.anexoImage} /> : null}
        </Page>
      ))}
    </Document>
  );
}
