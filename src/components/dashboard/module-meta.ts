import {
  Building2,
  FileSpreadsheet,
  GitBranch,
  Headphones,
  ShieldCheck,
  ShoppingCart,
  Settings,
  Truck,
  Wrench,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import type { AppModule } from "@/lib/permissoes.functions";

/**
 * Ícone, rota e cor de destaque por módulo — usado tanto pela grade
 * "Módulos ativos" quanto por qualquer outro card que precise linkar/rotular
 * um módulo de forma consistente com os ícones já usados no AppSidebar.
 */
export const MODULE_DASHBOARD_META: Partial<
  Record<AppModule, { label: string; icon: LucideIcon; to: string; color: string }>
> = {
  clientes: { label: "Clientes", icon: Building2, to: "/clientes", color: "#3b82f6" },
  comercial: { label: "Comercial", icon: GitBranch, to: "/comercial/pipeline", color: "#22c55e" },
  engenharia: {
    label: "Engenharia",
    icon: FileSpreadsheet,
    to: "/engenharia/etp",
    color: "#6366f1",
  },
  producao: { label: "Produção", icon: Wrench, to: "/producao/montagem", color: "#f59e0b" },
  qualidade: { label: "Qualidade", icon: ShieldCheck, to: "/qualidade/fat", color: "#f43f5e" },
  logistica: { label: "Logística", icon: Truck, to: "/logistica/embarques", color: "#14b8a6" },
  pos_vendas: { label: "Pós-vendas", icon: Headphones, to: "/pos-vendas", color: "#ef4444" },
  know_how: { label: "Know-how", icon: BookOpen, to: "/know-how", color: "#a855f7" },
  fornecedores: {
    label: "Fornecedores",
    icon: Building2,
    to: "/fornecedores",
    color: "#d97706",
  },
  compras: { label: "Compras", icon: ShoppingCart, to: "/compras/ordens", color: "#0ea5e9" },
  admin: { label: "Administração", icon: Settings, to: "/admin/usuarios", color: "#64748b" },
};
