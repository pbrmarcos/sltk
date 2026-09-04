/**
 * SLA por estágio (em dias). Cobre os estágios dos três tipos de processo
 * (Projeto, Atendimento, Instalação). Futuramente virá da tabela `sla_configs`.
 */
export const STAGE_SLA_DAYS: Record<string, number> = {
  Lead: 3,
  ETP: 7,
  "Orçamento": 7,
  OC: 5,
  "Eng. Mecânica": 30,
  "Eng. Elétrica": 30,
  Montagem: 45,
  FAT: 10,
  Embarque: 7,
  "Pós-venda": 30,
  "Solicitação": 1,
  "Análise": 1,
  "Registro": 1,
  "Resolução": 5,
  "Encerrado": 1,
  "Preparação": 3,
  "Agendamento": 5,
  "Arranque": 3,
  "Treinamento": 2,
  "Entrega Técnica": 2,
};

export type SlaStatus = "ok" | "risco" | "atrasado";

export type SlaInfo = {
  status: SlaStatus;
  diasNoEstagio: number;
  limite: number;
  diasRestantes: number; // negativo quando atrasado
  percent: number; // 0..1+
};

const MS_DAY = 24 * 60 * 60 * 1000;

export function slaStatus(processo: { stage: string; stageEnteredAt: string }): SlaInfo {
  const limite = STAGE_SLA_DAYS[processo.stage] ?? 14;
  const entered = new Date(processo.stageEnteredAt).getTime();
  const diasNoEstagio = Math.max(0, Math.floor((Date.now() - entered) / MS_DAY));
  const diasRestantes = limite - diasNoEstagio;
  const percent = limite > 0 ? diasNoEstagio / limite : 0;
  const status: SlaStatus =
    percent >= 1 ? "atrasado" : percent >= 0.8 ? "risco" : "ok";
  return { status, diasNoEstagio, limite, diasRestantes, percent };
}

export function slaToneClass(status: SlaStatus): string {
  switch (status) {
    case "atrasado":
      return "border-red-300 bg-red-50 text-red-700";
    case "risco":
      return "border-amber-300 bg-amber-50 text-amber-700";
    default:
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

export function slaLabel(info: SlaInfo): string {
  if (info.status === "atrasado") return `Atrasado ${Math.abs(info.diasRestantes)}d`;
  if (info.status === "risco") return `${info.diasRestantes}d restantes`;
  return `${info.diasRestantes}d / ${info.limite}d`;
}