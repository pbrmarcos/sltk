/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { listEtpAnexos } from "@/lib/equipamento-etp-anexos.functions";
import { ETP_STATUS_LABEL, type EtpStatus } from "@/lib/engenharia.shared";

type EtpData = {
  id: string;
  versao: number;
  status: EtpStatus | string;
  escopo?: string | null;
  premissas?: string | null;
  requisitos_funcionais?: string | null;
  requisitos_tecnicos?: string | null;
  criterios_aceite?: string | null;
  riscos?: string | null;
  observacoes?: string | null;
  aprovado_em?: string | null;
  aprovado_por_nome?: string | null;
  updated_at?: string | null;
  cliente_equipamentos?: { codigo?: string | null; modelo?: string | null } | null;
  clientes?: { codigo?: string | null; razao_social?: string | null } | null;
};

type Anexo = {
  nome_final: string;
  descricao?: string | null;
  user_nome?: string | null;
  created_at: string;
};

function fmt(d?: string | null) {
  return d ? new Date(d).toLocaleString("pt-BR") : "—";
}

async function buildAndDownload(etp: EtpData, anexos: Anexo[]) {
  const { pdf, Document, Page, Text, View, StyleSheet } = await import("@react-pdf/renderer");

  const NAVY = "#0B2545";
  const s = StyleSheet.create({
    page: {
      paddingTop: 44,
      paddingBottom: 52,
      paddingHorizontal: 44,
      fontFamily: "Helvetica",
      fontSize: 9.5,
      color: "#111827",
      lineHeight: 1.45,
    },
    brand: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
    title: { fontSize: 18, fontFamily: "Helvetica-Bold", marginTop: 10 },
    sub: { fontSize: 10, color: "#6B7280", marginTop: 2 },
    bar: { height: 3, width: 60, backgroundColor: NAVY, marginTop: 10, marginBottom: 14 },
    stamp: {
      borderWidth: 1,
      borderColor: NAVY,
      borderStyle: "solid",
      borderRadius: 4,
      padding: 8,
      marginBottom: 16,
      flexDirection: "row",
      flexWrap: "wrap",
    },
    stampCell: { width: "50%", marginBottom: 3, paddingRight: 6 },
    stampLabel: { fontSize: 7, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.4 },
    stampValue: { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#111827" },
    secTitle: {
      fontSize: 11,
      fontFamily: "Helvetica-Bold",
      marginTop: 14,
      marginBottom: 5,
      paddingBottom: 3,
      borderBottomWidth: 0.8,
      borderBottomColor: NAVY,
      borderBottomStyle: "solid",
    },
    body: { fontSize: 9.5, color: "#111827" },
    empty: { fontSize: 9.5, color: "#9CA3AF", fontStyle: "italic" },
    row: {
      flexDirection: "row",
      borderBottomWidth: 0.5,
      borderBottomColor: "#E5E7EB",
      paddingVertical: 3,
    },
    c1: { width: "50%" },
    c2: { width: "28%", color: "#374151" },
    c3: { width: "22%", color: "#6B7280" },
    footer: {
      position: "absolute",
      bottom: 24,
      left: 44,
      right: 44,
      fontSize: 7.5,
      color: "#6B7280",
      borderTopWidth: 0.5,
      borderTopColor: "#E5E7EB",
      borderTopStyle: "solid",
      paddingTop: 5,
      flexDirection: "row",
      justifyContent: "space-between",
    },
  });

  const eqp = etp.cliente_equipamentos;
  const cli = etp.clientes;
  const secoes: Array<[string, string | null | undefined]> = [
    ["Escopo", etp.escopo],
    ["Premissas", etp.premissas],
    ["Requisitos funcionais", etp.requisitos_funcionais],
    ["Requisitos técnicos", etp.requisitos_tecnicos],
    ["Critérios de aceite", etp.criterios_aceite],
    ["Riscos", etp.riscos],
    ["Observações", etp.observacoes],
  ];

  const doc = (
    <Document title={`ETP v${etp.versao} — ${eqp?.codigo ?? "Equipamento"}`} author="SLTK Americas">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>SLTK AMERICAS</Text>
        <Text style={s.title}>Especificação Técnica do Produto (ETP)</Text>
        <Text style={s.sub}>
          {`${eqp?.codigo ?? ""} · ${eqp?.modelo ?? ""}`.trim()}
          {cli?.razao_social ? ` — ${cli.razao_social}` : ""}
        </Text>
        <View style={s.bar} />

        {/* Carimbo de versão */}
        <View style={s.stamp}>
          <View style={s.stampCell}>
            <Text style={s.stampLabel}>Versão</Text>
            <Text style={s.stampValue}>v{etp.versao}</Text>
          </View>
          <View style={s.stampCell}>
            <Text style={s.stampLabel}>Status</Text>
            <Text style={s.stampValue}>
              {ETP_STATUS_LABEL[(etp.status as EtpStatus) ?? "rascunho"] ?? String(etp.status)}
            </Text>
          </View>
          <View style={s.stampCell}>
            <Text style={s.stampLabel}>Aprovado em</Text>
            <Text style={s.stampValue}>{fmt(etp.aprovado_em)}</Text>
          </View>
          <View style={s.stampCell}>
            <Text style={s.stampLabel}>Aprovado por</Text>
            <Text style={s.stampValue}>{etp.aprovado_por_nome ?? "—"}</Text>
          </View>
          <View style={s.stampCell}>
            <Text style={s.stampLabel}>Cliente</Text>
            <Text style={s.stampValue}>{cli?.razao_social ?? "—"}</Text>
          </View>
          <View style={s.stampCell}>
            <Text style={s.stampLabel}>Última atualização</Text>
            <Text style={s.stampValue}>{fmt(etp.updated_at)}</Text>
          </View>
        </View>

        {secoes.map(([titulo, texto]) => (
          <View key={titulo} wrap={false}>
            <Text style={s.secTitle}>{titulo}</Text>
            {texto && texto.trim() ? (
              <Text style={s.body}>{texto}</Text>
            ) : (
              <Text style={s.empty}>Não informado.</Text>
            )}
          </View>
        ))}

        <Text style={s.secTitle}>Anexos vinculados ({anexos.length})</Text>
        {anexos.length === 0 ? (
          <Text style={s.empty}>Nenhum anexo vinculado a esta versão.</Text>
        ) : (
          anexos.map((a, i) => (
            <View key={i} style={s.row} wrap={false}>
              <Text style={s.c1}>{a.nome_final}</Text>
              <Text style={s.c2}>{a.descricao || "—"}</Text>
              <Text style={s.c3}>
                {new Date(a.created_at).toLocaleDateString("pt-BR")}
                {a.user_nome ? ` · ${a.user_nome}` : ""}
              </Text>
            </View>
          ))
        )}

        <View style={s.footer} fixed>
          <Text>
            ETP v{etp.versao} · {eqp?.codigo ?? ""} · Documento gerado em{" "}
            {new Date().toLocaleString("pt-BR")}
          </Text>
          <Text
            render={({ pageNumber, totalPages }: any) => `Página ${pageNumber} de ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );

  const blob = await pdf(doc as any).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ETP_${(eqp?.codigo ?? "equipamento").replace(/[^a-zA-Z0-9-_]/g, "_")}_v${etp.versao}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function EtpPdfButton({ etp }: { etp: EtpData }) {
  const [busy, setBusy] = useState(false);
  const { data: anexos } = useQuery({
    queryKey: ["engenharia", "etp", etp.id, "anexos"],
    queryFn: () => listEtpAnexos({ data: { etp_id: etp.id } }),
  });

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await buildAndDownload(etp, (anexos ?? []) as Anexo[]);
          toast.success("PDF do ETP gerado.");
        } catch (e) {
          toast.error((e as Error)?.message ?? "Falha ao gerar o PDF.");
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <FileDown className="mr-1.5 h-4 w-4" />
      )}
      Exportar PDF
    </Button>
  );
}
