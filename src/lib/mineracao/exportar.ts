/**
 * Exportação da mineração para Excel (.xlsx).
 * Roda no navegador — o exceljs é carregado sob demanda para não pesar o bundle.
 */

export type LinhaExport = Record<string, any>;

export type MetaExport = {
  nome?: string;
  base?: string;
  modo?: string;
  pais_destino?: string | null;
  pais_origem?: string | null;
  rubros?: string[];
  periodo?: string;
  responsavel?: string;
  data_busca?: string;
};

const usd = (n: number) => Number(n || 0);

export async function exportarResultadosXlsx(
  linhas: LinhaExport[],
  meta: MetaExport,
  nomeArquivo = "mineracao",
) {
  const ExcelJS = (await import("exceljs")).default;
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();

  const info = wb.addWorksheet("Busca");
  info.columns = [
    { header: "Campo", key: "campo", width: 28 },
    { header: "Valor", key: "valor", width: 70 },
  ];
  info.getRow(1).font = { bold: true };
  const linhasMeta: Array<[string, string]> = [
    ["Busca", meta.nome ?? "—"],
    ["Base de dados", meta.base ?? "—"],
    ["Tipo de consulta", meta.modo ?? "—"],
    ["País de destino", meta.pais_destino ?? "—"],
    ["País de origem", meta.pais_origem ?? "—"],
    ["NCMs", (meta.rubros ?? []).join(", ") || "—"],
    ["Período", meta.periodo ?? "—"],
    ["Responsável pela busca", meta.responsavel ?? "—"],
    ["Data da busca", meta.data_busca ?? "—"],
    ["Exportado em", new Date().toLocaleString("pt-BR")],
    ["Total de linhas", String(linhas.length)],
  ];
  for (const [campo, valor] of linhasMeta) info.addRow({ campo, valor });

  const ws = wb.addWorksheet("Resultados");
  ws.columns = [
    { header: "Empresa", key: "empresa", width: 42 },
    { header: "Contraparte", key: "contraparte", width: 42 },
    { header: "NCMs", key: "rubros", width: 20 },
    { header: "Operações", key: "operacoes", width: 12 },
    { header: "Valor (USD)", key: "valor", width: 18 },
    { header: "Ticket médio (USD)", key: "ticket", width: 18 },
    { header: "Última operação", key: "ultima", width: 16 },
    { header: "Anotação", key: "anotacao", width: 40 },
    { header: "Pipeline", key: "pipeline", width: 14 },
  ];
  ws.getRow(1).font = { bold: true };

  for (const r of linhas) {
    const ops = Number(r["operacoes"] ?? 0);
    const valor = Number(r["valor_total"] ?? 0);
    const parceiros = (r["parceiros"] ?? []) as Array<{ nome: string }>;
    ws.addRow({
      empresa: r["empresa"] ?? "",
      contraparte:
        r["contraparte"] ||
        parceiros
          .map((p) => p.nome)
          .slice(0, 5)
          .join(" · ") ||
        "",
      rubros: (r["rubros"] ?? []).join(", "),
      operacoes: ops,
      valor: usd(valor),
      ticket: usd(ops > 0 ? valor / ops : 0),
      ultima: r["ultima_operacao"] ?? "",
      anotacao: r["anotacao"] ?? "",
      pipeline: r["convertido_oportunidade_id"] ? "Convertido" : "",
    });
  }
  ws.getColumn("valor").numFmt = "#,##0.00";
  ws.getColumn("ticket").numFmt = "#,##0.00";

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nomeArquivo.replace(/[^\w.-]+/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
