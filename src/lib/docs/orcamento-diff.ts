import type { OrcamentoPayload, EquipamentoOrcamento, Parcela } from "./types";

export type BumpKind = "major" | "minor" | "patch";
export type DiffResult = {
  kind: BumpKind | "none";
  changes: string[];
};

function eqEq(a: EquipamentoOrcamento, b: EquipamentoOrcamento): boolean {
  return (
    a.nome_pt === b.nome_pt &&
    a.nome_es === b.nome_es &&
    a.nome_en === b.nome_en &&
    a.descricao_pt === b.descricao_pt &&
    a.descricao_es === b.descricao_es &&
    a.descricao_en === b.descricao_en &&
    a.quantidade === b.quantidade &&
    a.valor_unitario === b.valor_unitario &&
    (a.imagem_url ?? null) === (b.imagem_url ?? null) &&
    !!a.opcional === !!b.opcional
  );
}

function productishChanged(a: EquipamentoOrcamento, b: EquipamentoOrcamento): boolean {
  // Mudanças que classificam como MINOR (produto/valor/estrutura), e não só texto descritivo.
  return (
    a.quantidade !== b.quantidade ||
    a.valor_unitario !== b.valor_unitario ||
    !!a.opcional !== !!b.opcional ||
    a.nome_pt !== b.nome_pt ||
    a.nome_es !== b.nome_es ||
    a.nome_en !== b.nome_en ||
    (a.imagem_url ?? null) !== (b.imagem_url ?? null)
  );
}

function parcelasEqual(a: Parcela[], b: Parcela[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (
      x.numero !== y.numero ||
      x.percentual !== y.percentual ||
      x.descricao_pt !== y.descricao_pt ||
      x.descricao_es !== y.descricao_es ||
      x.descricao_en !== y.descricao_en
    ) return false;
  }
  return true;
}

function parcelasProductish(a: Parcela[], b: Parcela[]): boolean {
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i].numero !== b[i].numero || a[i].percentual !== b[i].percentual) return true;
  }
  return false;
}

function arrEqUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  return sa.every((v, i) => v === sb[i]);
}

export function diffOrcamentoPayload(
  prev: OrcamentoPayload,
  next: OrcamentoPayload,
): DiffResult {
  const changes: string[] = [];
  let major = false;
  let minor = false;
  let patch = false;

  // MAJOR — cliente trocado ou conjunto de blocos selecionados alterado
  if (prev.cliente?.id !== next.cliente?.id) {
    major = true;
    changes.push(`Cliente alterado (${prev.cliente?.razao_social ?? "—"} → ${next.cliente?.razao_social ?? "—"})`);
  }
  if (!arrEqUnordered(prev.blocos_selecionados ?? [], next.blocos_selecionados ?? [])) {
    major = true;
    changes.push("Conjunto de blocos do documento alterado");
  }

  // MINOR — equipamentos (estrutura/valor), moeda, incoterm, parcelas (números)
  if (prev.moeda !== next.moeda) {
    minor = true;
    changes.push(`Moeda alterada (${prev.moeda} → ${next.moeda})`);
  }
  if (prev.frete?.incoterm !== next.frete?.incoterm) {
    minor = true;
    changes.push(`Incoterm alterado (${prev.frete?.incoterm ?? "—"} → ${next.frete?.incoterm ?? "—"})`);
  }
  if (parcelasProductish(prev.pagamento?.parcelas ?? [], next.pagamento?.parcelas ?? [])) {
    minor = true;
    changes.push("Parcelas (número/percentual) alteradas");
  }

  const pe = prev.equipamentos ?? [];
  const ne = next.equipamentos ?? [];
  if (pe.length !== ne.length) {
    minor = true;
    changes.push(`Quantidade de equipamentos alterada (${pe.length} → ${ne.length})`);
  } else {
    for (let i = 0; i < pe.length; i++) {
      if (productishChanged(pe[i], ne[i])) {
        minor = true;
        changes.push(`Equipamento #${i + 1}: produto/valor alterado`);
      } else if (!eqEq(pe[i], ne[i])) {
        patch = true;
        changes.push(`Equipamento #${i + 1}: descrição alterada`);
      }
    }
  }

  // PATCH — textos e condições secundárias
  if (prev.prazo?.dias !== next.prazo?.dias) {
    patch = true;
    changes.push(`Prazo de entrega alterado (${prev.prazo?.dias ?? "—"} → ${next.prazo?.dias ?? "—"} dias)`);
  }
  if ((prev.prazo?.texto_extra ?? "") !== (next.prazo?.texto_extra ?? "")) {
    patch = true;
    changes.push("Texto adicional do prazo alterado");
  }
  if ((prev.frete?.descricao ?? "") !== (next.frete?.descricao ?? "")) {
    patch = true;
    changes.push("Descrição do frete alterada");
  }
  if (prev.validade?.dias !== next.validade?.dias) {
    patch = true;
    changes.push(`Validade da oferta alterada (${prev.validade?.dias ?? "—"} → ${next.validade?.dias ?? "—"} dias)`);
  }
  if ((prev.pagamento?.forma ?? "") !== (next.pagamento?.forma ?? "")) {
    patch = true;
    changes.push("Forma de pagamento alterada");
  }
  if (!parcelasEqual(prev.pagamento?.parcelas ?? [], next.pagamento?.parcelas ?? []) && !minor) {
    patch = true;
    changes.push("Descrição das parcelas alterada");
  }
  // overrides de blocos
  const pov = prev.blocos_overrides ?? {};
  const nov = next.blocos_overrides ?? {};
  const keys = new Set([...Object.keys(pov), ...Object.keys(nov)]);
  for (const k of keys) {
    const a = pov[k] ?? {};
    const b = nov[k] ?? {};
    if ((a.pt ?? "") !== (b.pt ?? "") || (a.es ?? "") !== (b.es ?? "") || (a.en ?? "") !== (b.en ?? "")) {
      patch = true;
      changes.push(`Texto do bloco "${k}" alterado`);
    }
  }

  const kind: BumpKind | "none" = major ? "major" : minor ? "minor" : patch ? "patch" : "none";
  return { kind, changes };
}

export const BUMP_LABEL: Record<BumpKind, string> = {
  major: "Maior (cliente ou estrutura)",
  minor: "Menor (produto/valor)",
  patch: "Patch (texto)",
};
