import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getOrdemCompra } from "@/lib/ordens-compra.functions";

export const Route = createFileRoute("/_authenticated/compras/ordens/$id/imprimir")({
  component: ImprimirOcPage,
});

function fmtBRL(v: number, moeda = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda }).format(v || 0);
  } catch {
    return `${moeda} ${v?.toFixed(2)}`;
  }
}
function fmtNum(v: number, d = 2) {
  return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d }).format(v || 0);
}
function fmtDate(s?: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("pt-BR");
}

function ImprimirOcPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getOrdemCompra);
  const q = useQuery({ queryKey: ["ordens", "imprimir", id], queryFn: () => getFn({ data: { id } }) });

  useEffect(() => {
    if (q.data) {
      const t = setTimeout(() => window.print(), 500);
      return () => clearTimeout(t);
    }
  }, [q.data]);

  if (q.isLoading || !q.data) return <div className="p-8">Carregando...</div>;
  const { oc, itens } = q.data;

  return (
    <div className="print-doc bg-white text-black min-h-screen p-6 font-sans text-[11px]">
      <style>{`
        @page { size: A4; margin: 12mm; }
        @media print {
          body { background: white !important; }
          .print-doc { padding: 0 !important; }
        }
        .print-doc h1, .print-doc h2, .print-doc h3 { font-family: Arial, sans-serif; }
        .print-doc .bar { background: #d9d9d9; padding: 4px 8px; font-weight: bold; text-align: center; }
        .print-doc .bar-sub { background: #e8e8e8; padding: 3px 8px; text-align: center; font-weight: 600; }
        .print-doc table.items { width: 100%; border-collapse: collapse; }
        .print-doc table.items th { border-bottom: 1px solid #333; text-align: left; padding: 4px 2px; font-size: 10px; }
        .print-doc table.items td { border-bottom: 1px dashed #ccc; padding: 4px 2px; vertical-align: top; }
      `}</style>

      {/* ============ HEADER ============ */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-start gap-3 flex-1">
          {oc.comprador_logo_url && (
            <img src={oc.comprador_logo_url} alt="Logo" className="h-14 w-auto object-contain" />
          )}
          <div>
            <h1 className="text-[22px] font-bold leading-tight">Relatório de Pedido de Compra</h1>
            <div className="text-[11px] leading-tight mt-1">
              <div className="font-bold">{oc.comprador_razao_social ?? "—"}</div>
              <div>
                CNPJ: {oc.comprador_cnpj ?? "—"} &nbsp; Insc. Estadual: {oc.comprador_ie ?? "—"}
              </div>
              <div>
                Endereço: {oc.comprador_endereco ?? "—"} &nbsp; Cidade: {oc.comprador_cidade ?? "—"} &nbsp; UF: {oc.comprador_uf ?? "—"}
              </div>
              <div>
                CEP: {oc.comprador_cep ?? "—"} &nbsp; Telefone: {oc.comprador_telefone ?? "—"}
              </div>
            </div>
          </div>
        </div>
        <div className="text-right text-[11px] leading-tight">
          <div className="font-bold text-[13px]">{oc.comprador_razao_social ?? "—"}</div>
          <div>
            Emissão: {fmtDate(oc.emissao_em)} &nbsp; Hora: {new Date(oc.created_at).toLocaleTimeString("pt-BR")}
          </div>
          <div>Usuário: {oc.criado_por ? "SISTEMA" : "—"}</div>
        </div>
      </div>

      {/* ============ NUMERO ============ */}
      <div className="bar text-[13px] mb-2">Pedido de Compra nº {oc.numero.replace(/^OC0*/, "") || oc.numero}</div>

      {/* ============ FORNECEDOR ============ */}
      <div className="bar-sub mb-1">Dados do Fornecedor</div>
      <div className="grid grid-cols-[1fr_auto] gap-x-4 mb-3 text-[11px] leading-relaxed">
        <div>
          <div>
            <b>Fornecedor:</b> {oc.fornecedor_codigo ?? ""} - {oc.fornecedor_razao_social ?? "—"}
          </div>
          <div>
            <b>Endereço:</b> {oc.fornecedor_endereco ?? "—"}
          </div>
          <div>
            <b>Fone:</b> {oc.fornecedor_telefone ?? "—"} &nbsp;&nbsp; <b>Insc. Estadual:</b> {oc.fornecedor_ie ?? "—"} &nbsp;&nbsp; <b>Contato:</b> {oc.fornecedor_contato ?? ""}
          </div>
          <div>
            <b>E-mail:</b> {oc.fornecedor_email ?? "—"}
          </div>
        </div>
        <div className="text-right whitespace-nowrap">
          <div>
            <b>CNPJ:</b> {oc.fornecedor_cnpj ?? "—"}
          </div>
          <div>
            <b>Cidade:</b> {oc.fornecedor_cidade ?? "—"} &nbsp; <b>UF:</b> {oc.fornecedor_uf ?? "—"}
          </div>
          <div>
            <b>CEP:</b> {oc.fornecedor_cep ?? "—"}
          </div>
          <div>
            <b>Cond. Pagamento:</b> {oc.condicao_pagamento ?? "—"}
          </div>
        </div>
      </div>

      {/* ============ ITENS ============ */}
      <div className="bar-sub mb-1">Dados do Pedido</div>
      <div className="mb-1">
        <b>Transportadora:</b> {oc.transportadora ?? ""}
      </div>
      <table className="items mb-4">
        <thead>
          <tr>
            <th>Nº</th>
            <th>Cód. do Produto</th>
            <th>Descrição</th>
            <th>Data Entrega</th>
            <th>Un.</th>
            <th className="text-right">Qtde</th>
            <th className="text-right">Saldo</th>
            <th className="text-right">Valor Unit.</th>
            <th className="text-right">Vlr Desc.</th>
            <th className="text-right">IPI (R$)</th>
            <th className="text-right">ICMS-ST (R$)</th>
            <th className="text-right">Valor Total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it: any, idx: number) => (
            <tr key={it.id}>
              <td>{idx + 1}</td>
              <td className="font-mono">{it.codigo_produto ?? ""}</td>
              <td className="max-w-[260px]">{it.descricao}</td>
              <td>{fmtDate(it.data_entrega ?? oc.entrega_prevista)}</td>
              <td>{it.unidade}</td>
              <td className="text-right">{fmtNum(Number(it.quantidade))}</td>
              <td className="text-right">{fmtNum(Number(it.saldo ?? it.quantidade))}</td>
              <td className="text-right">{fmtNum(Number(it.valor_unitario), 6)}</td>
              <td className="text-right">{fmtNum(Number(it.valor_desconto), 6)}</td>
              <td className="text-right">{fmtNum(Number(it.valor_ipi))}</td>
              <td className="text-right">{fmtNum(Number(it.valor_icms_st))}</td>
              <td className="text-right">{fmtNum(Number(it.valor_total ?? 0))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ============ OBS + TOTAIS ============ */}
      <div className="grid grid-cols-[1fr_260px] gap-4">
        <div className="border border-black p-2">
          <div className="font-bold underline mb-2">Observações:</div>
          <div className="whitespace-pre-wrap font-bold">** INFORMAR NUMERO DO PEDIDO NA NOTA FISCAL **</div>
          <div className="whitespace-pre-wrap mt-2">{oc.observacoes ?? ""}</div>
        </div>
        <div className="space-y-1">
          <TotalRow label="Valor Total (R$)" value={fmtNum(Number(oc.valor_subtotal))} />
          <TotalRow label="Valor do Desconto (R$)" value={fmtNum(Number(oc.valor_desconto))} />
          <TotalRow label="Valor do IPI (R$)" value={fmtNum(Number(oc.valor_ipi))} />
          <TotalRow label="Valor do ICMS-ST (R$)" value={fmtNum(Number(oc.valor_icms_st))} />
          <TotalRow label="Valor do Frete (R$)" value={fmtNum(Number(oc.valor_frete))} />
          <div className="border-t border-black mt-1 pt-1 flex justify-between font-bold">
            <span>Valor Total do Pedido (R$):</span>
            <span>{fmtNum(Number(oc.valor_total))}</span>
          </div>
          <div className="mt-8 border-t border-black pt-1 text-center">
            {oc.comprador_email ?? ""}
          </div>
        </div>
      </div>

      <div className="text-center text-[10px] mt-8">Página 1 de 1</div>
    </div>
  );
}

function TotalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="font-bold">{label}:</span>
      <span>{value}</span>
    </div>
  );
}
