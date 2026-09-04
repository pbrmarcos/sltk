import { Link, useRouterState } from "@tanstack/react-router";
import {
  Boxes,
  LayoutDashboard,
  Users,
  FileText,
  Cog,
  GitBranch,
  Pickaxe,
  ClipboardCheck,
  ShieldCheck,
  Headphones,
  Plus,
  LogOut,
  ChevronDown,
  Shield,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  Building2,
  BookOpen,
  ClipboardList,
  FileSpreadsheet,
  CalendarRange,
  Wrench,
  MessageSquare,
  MessageSquareText,
  Truck,
  Mail,
  Inbox,
  Receipt,
  KeyRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, useAuth, type AppRole } from "@/hooks/use-auth";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";
import { useMyModules } from "@/hooks/use-my-modules";
import type { AppModule } from "@/lib/permissoes.functions";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SidebarSearch } from "@/components/layout/SidebarSearch";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { usePendenciasSidebar } from "@/hooks/use-pendencias";

const SIDEBAR_COLLAPSED_KEY = "sltk:sidebar-collapsed";
const SIDEBAR_OPEN_MAP_KEY = "sltk:sidebar-open-map";

type Child = { label: string; badge?: string; to?: string };
type Item = {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  badge?: string;
  children?: Child[];
  roles?: AppRole[]; // additional roles (admin + manager always allowed unless section adminOnly)
  module?: AppModule;
};
type Section = { title: string; items: Item[]; adminOnly?: boolean; module?: AppModule };

const SECTIONS: Section[] = [
  {
    title: "Visão geral",
    items: [{ label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, exact: true, module: "dashboard" }],
  },
  {
    title: "Comercial",
    items: [
      {
        label: "Mineração",
        to: "/comercial/mineracao",
        icon: Pickaxe,
        roles: ["sales"],

        module: "comercial",
      },
      {
        label: "Pipeline",
        to: "/comercial/pipeline",
        icon: GitBranch,
        roles: ["sales"],
        module: "comercial",
      },
      {
        label: "Checklists",
        to: "/comercial/checklists",
        icon: ClipboardList,
        roles: ["sales"],
        module: "comercial",
      },
      {
        label: "Entrevistas",
        to: "/comercial/entrevistas",
        icon: MessageSquare,
        roles: ["sales"],
        module: "comercial",
      },
      {
        label: "Orçamentos",
        to: "/comercial/orcamento",
        icon: FileText,
        roles: ["sales"],
        module: "comercial",
      },
    ],
  },
  {
    title: "Operações",
    items: [
      {
        label: "Clientes",
        to: "/clientes",
        icon: Building2,
        roles: ["sales", "field"],
        module: "clientes",
      },
      {
        label: "ETPs",
        to: "/engenharia/etp",
        icon: FileSpreadsheet,
        roles: ["engineer"],
        module: "engenharia",
      },
      {
        label: "Projetos",
        to: "/engenharia/projetos",
        icon: Wrench,
        roles: ["engineer"],
        module: "engenharia",
      },
      {
        label: "Planejamento",
        to: "/engenharia/etapas",
        icon: CalendarRange,
        roles: ["engineer", "production"],
        module: "engenharia",
      },
    ],
  },
  {
    title: "Compras",
    module: "compras",
    items: [
      {
        label: "Solicitações de Compra",
        to: "/compras/solicitacao",
        icon: FileSpreadsheet,
        roles: ["purchasing", "manager"],
        module: "compras",
      },
      {
        label: "Cotações",
        to: "/compras/cotacoes",
        icon: Receipt,
        roles: ["purchasing", "manager"],
        module: "compras",
      },
      {
        label: "Ordens de Compra",
        to: "/compras/ordens",
        icon: ClipboardList,
        roles: ["purchasing", "manager"],
        module: "compras",
      },
      {
        label: "Almoxarifado",
        to: "/compras/almoxarifado",
        icon: Boxes,
        roles: ["purchasing", "manager", "engineer"],
        module: "compras",
      },
      {
        label: "Fornecedores",
        to: "/fornecedores",
        icon: Building2,
        roles: ["purchasing", "manager"],
        module: "fornecedores",
      },
    ],
  },

  {
    title: "Produção",
    module: "producao",
    items: [
      {
        label: "Montagem",
        to: "/producao/montagem",
        icon: Wrench,
        roles: ["production", "assembly"],
        module: "producao",
      },
    ],
  },
  {

    title: "Qualidade",
    items: [
      {
        label: "Revisão Mecânica",
        to: "/qualidade/revisao-mecanica",
        icon: ClipboardCheck,
        roles: ["assembly", "production"],
        module: "qualidade",
      },
      {
        label: "Revisão Elétrica",
        to: "/qualidade/revisao-eletrica",
        icon: ClipboardList,
        roles: ["assembly", "production"],
        module: "qualidade",
      },
      {
        label: "Relatório FAT",
        to: "/qualidade/fat",
        icon: ShieldCheck,
        roles: ["production"],
        module: "qualidade",
      },
    ],
  },
  {
    title: "Pós-venda",
    items: [
      {
        label: "Chamados",
        to: "/pos-vendas/chamados",
        icon: Headphones,
        roles: ["field"],
        module: "pos_vendas",
      },
      {
        label: "Relatórios SAT",
        to: "/pos-vendas/sat",
        icon: ClipboardList,
        roles: ["field", "engineer", "assembly", "sales"],
        module: "pos_vendas",
      },
    ],
  },
  {
    title: "Logística",
    module: "logistica",
    items: [
      {
        label: "Embarques",
        to: "/logistica/embarques",
        icon: Truck,
        roles: ["field", "production", "assembly"],
        module: "logistica",
      },
    ],
  },
  {
    title: "Documentos",
    items: [
      {
        label: "Emitidos",
        to: "/documentos",
        icon: FileText,
        exact: true,
      },
      {
        label: "Editor de blocos",
        to: "/central-documentos",
        icon: FileSpreadsheet,
        module: "admin",
      },
      {
        label: "Templates",
        to: "/template-documentos",
        icon: ClipboardList,
        module: "admin",
      },
    ],
  },
  {
    title: "Administração — Sistema",
    adminOnly: true,
    module: "admin",
    items: [
      {
        label: "Configurações",
        to: "/admin/configuracoes",
        icon: Cog,
        module: "admin",
      },
      {
        label: "Usuários & Permissões",
        to: "/admin/usuarios",
        icon: Shield,
        module: "admin",
      },
      {
        label: "Auditoria",
        to: "/admin/auditoria",
        icon: FileSpreadsheet,
        module: "admin",
      },
      {
        label: "Balcão de Suporte",
        to: "/admin/suporte",
        icon: KeyRound,
        module: "admin",
      },
    ],
  },
  {
    title: "Administração — Atendimento & Conteúdo",
    adminOnly: true,
    module: "admin",
    items: [
      {
        label: "E-mails automáticos",
        to: "/admin/emails",
        icon: Mail,
        module: "admin",
      },
      {
        label: "Formulários recebidos",
        to: "/admin/formularios-recebidos",
        icon: Inbox,
        module: "admin",
      },
      {
        label: "Tipos de Checklist",
        to: "/admin/checklist-tipos",
        icon: ClipboardList,
        module: "admin",
      },
      {
        label: "Formulários de Entrevista",
        to: "/admin/entrevistas",
        icon: MessageSquareText,
        module: "admin",
      },
      {
        label: "SLA de Chamados",
        to: "/admin/sla-chamados",
        icon: Cog,
        module: "admin",
      },
    ],
  },
  {
    title: "Administração — Equipamentos",
    adminOnly: true,
    module: "admin",
    items: [
      {
        label: "Páginas dos Equipamentos",
        to: "/admin/paginas-equipamentos",
        icon: ClipboardList,
        module: "admin",
      },
      {
        label: "Etapas dos Equipamentos",
        to: "/admin/etapas-equipamentos",
        icon: ClipboardList,
        module: "admin",
      },
      {
        label: "Design System",
        to: "/design-system",
        icon: BookOpen,
        module: "admin",
      },
    ],
  },
  {
    title: "Know-how",
    module: "know_how",
    items: [
      {
        label: "Biblioteca",
        to: "/know-how",
        icon: BookOpen,
        exact: true,
        roles: ["engineer", "production", "purchasing", "assembly", "field", "sales"],
        module: "know_how",
      },
    ],
  },
  {
    title: "Ajuda",
    items: [
      {
        label: "Central de ajuda",
        to: "/ajuda",
        icon: HelpCircle,
        roles: ["engineer", "production", "purchasing", "assembly", "field", "sales"],
      },
      {
        label: "Documentação",
        to: "/ajuda/documentacao",
        icon: BookOpen,
        roles: ["engineer", "production", "purchasing", "assembly", "field", "sales"],
      },
      {
        label: "FAQ",
        to: "/ajuda/faq",
        icon: HelpCircle,
        roles: ["engineer", "production", "purchasing", "assembly", "field", "sales"],
      },
      {
        label: "Changelog",
        to: "/changelog",
        icon: FileText,
        roles: ["engineer", "production", "purchasing", "assembly", "field", "sales"],
      },
    ],
  },

];

const linkRowClasses =
  "group relative flex items-center gap-2.5 border-l-[3px] border-transparent px-3 py-1.5 text-[12px] font-medium text-[var(--sidebar-foreground)] transition-colors hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)] data-[status=active]:border-[var(--sidebar-primary)] data-[status=active]:bg-[var(--sidebar-accent)] data-[status=active]:text-[var(--sidebar-accent-foreground)]";

function Badge({ value, tone = "default" }: { value: string; tone?: "default" | "danger" }) {
  if (tone === "danger") {
    return (
      <span
        title="Informações pendentes"
        className="grid shrink-0 min-w-[18px] h-[18px] px-1 place-items-center rounded-full bg-red-500 text-[10px] font-bold tabular-nums text-white shadow ring-1 ring-red-400/60"
      >
        {value}
      </span>
    );
  }
  return (
    <span className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold tabular-nums text-[var(--sidebar-foreground)]">
      {value}
    </span>
  );
}

function PendenciasTooltipContent({ details }: { details?: { label: string; count: number }[] }) {
  if (!details || details.length === 0) {
    return <p className="text-xs">Informações pendentes</p>;
  }
  return (
    <div className="space-y-0.5">
      <p className="mb-1 text-xs font-semibold">Pendências</p>
      {details.map((d) => (
        <div key={d.label} className="flex items-center justify-between gap-4 text-xs">
          <span className="opacity-80">{d.label}</span>
          <span className="font-semibold tabular-nums">{d.count}</span>
        </div>
      ))}
    </div>
  );
}

function ParentRow({
  item,
  open,
  onToggle,
  collapsed,
  active,
  pendCount,
  pendDetails,
}: {
  item: Item;
  open: boolean;
  onToggle: () => void;
  collapsed?: boolean;
  active?: boolean;
  pendCount?: number;
  pendDetails?: { label: string; count: number }[];
}) {
  const Icon = item.icon;
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onToggle}
            data-status={active ? "active" : undefined}
            className={cn(linkRowClasses, "w-full justify-center px-0 relative")}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            {pendCount && pendCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 grid shrink-0 min-w-[14px] h-[14px] px-0.5 place-items-center rounded-full bg-red-500 text-[9px] font-bold tabular-nums text-white ring-1 ring-red-400/60">
                {pendCount > 99 ? "99+" : pendCount}
              </span>
            ) : null}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="space-y-1">
            <p className="font-medium">{item.label}</p>
            <PendenciasTooltipContent details={pendDetails} />
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      data-status={active ? "active" : undefined}
      aria-expanded={open}
      className={cn(linkRowClasses, "w-full justify-between text-left")}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        <span className="min-w-0 truncate text-left">{item.label}</span>
        {pendCount && pendCount > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Badge value={String(pendCount)} tone="danger" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              <PendenciasTooltipContent details={pendDetails} />
            </TooltipContent>
          </Tooltip>
        ) : (
          item.badge && <Badge value={item.badge} />
        )}
      </span>
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded text-white/50">
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
      </span>
    </button>
  );
}

function LeafRow({
  item,
  onNavigate,
  collapsed,
  pendCount,
  pendDetails,
}: {
  item: Item;
  onNavigate?: () => void;
  collapsed?: boolean;
  pendCount?: number;
  pendDetails?: { label: string; count: number }[];
}) {
  const Icon = item.icon;
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            to={item.to}
            activeOptions={{ exact: item.exact ?? false }}
            onClick={onNavigate}
            className={cn(linkRowClasses, "justify-center px-0 relative")}
          >
            <Icon className="h-4 w-4 shrink-0 opacity-80" />
            {pendCount && pendCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 grid shrink-0 min-w-[14px] h-[14px] px-0.5 place-items-center rounded-full bg-red-500 text-[9px] font-bold tabular-nums text-white ring-1 ring-red-400/60">
                {pendCount > 99 ? "99+" : pendCount}
              </span>
            ) : null}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="space-y-1">
            <p className="font-medium">{item.label}</p>
            <PendenciasTooltipContent details={pendDetails} />
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Link
      to={item.to}
      activeOptions={{ exact: item.exact ?? false }}
      onClick={onNavigate}
      className={cn(linkRowClasses, "justify-between")}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <Icon className="h-4 w-4 shrink-0 opacity-80" />
        <span className="min-w-0 truncate text-left">{item.label}</span>
        {pendCount && pendCount > 0 ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span>
                <Badge value={pendCount > 99 ? "99+" : String(pendCount)} tone="danger" />
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" align="start">
              <PendenciasTooltipContent details={pendDetails} />
            </TooltipContent>
          </Tooltip>
        ) : (
          item.badge && <Badge value={item.badge} />
        )}
      </span>
    </Link>
  );
}

function ChildList({
  children,
  onNavigate,
  pendMap = {},
  pendDetailsMap = {},
}: {
  children: Child[];
  onNavigate?: () => void;
  pendMap?: Record<string, number>;
  pendDetailsMap?: Record<string, { label: string; count: number }[]>;
}) {
  return (
    <div className="ml-7 mt-0.5 flex flex-col gap-0.5 border-l border-[var(--sidebar-border)] pl-2 py-1">
      {children.map((c) =>
        c.to ? (
          <Link
            key={c.label}
            to={c.to}
            onClick={onNavigate}
            className="flex items-center gap-2 rounded px-2 py-1 text-[11.5px] text-[var(--sidebar-foreground)]/75 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
          >
            <span className="min-w-0 truncate">{c.label}</span>
            {(() => {
              const p = c.to ? pendMap[c.to] ?? 0 : 0;
              const details = c.to ? pendDetailsMap[c.to] : undefined;
              return p > 0 ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Badge value={p > 99 ? "99+" : String(p)} tone="danger" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    <PendenciasTooltipContent details={details} />
                  </TooltipContent>
                </Tooltip>
              ) : (
                c.badge && <Badge value={c.badge} />
              );
            })()}
          </Link>
        ) : (
          <button
            key={c.label}
            type="button"
            className="flex items-center gap-2 rounded px-2 py-1 text-left text-[11.5px] text-[var(--sidebar-foreground)]/75 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
          >
            <span className="min-w-0 truncate">{c.label}</span>
            {c.badge && <Badge value={c.badge} />}
          </button>
        ),
      )}
    </div>
  );
}

export function AppSidebarContent({
  onNavigate,
  collapsed = false,
  onToggleCollapsed,
  showToggle = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
  showToggle?: boolean;
}) {
  const { profile, role, roleLoading, user, signOut } = useAuth();
  const { settings } = useBrandSettingsOptional();
  const { modules: myModules, loading: modulesLoading } = useMyModules();
  const brandName = settings?.system_name || "Solutek";
  const expandedLogo =
    settings?.logo_url_dark ||
    settings?.logo_url ||
    settings?.logo_url_collapsed_dark ||
    settings?.logo_url_collapsed ||
    null;
  const collapsedLogo =
    settings?.logo_url_collapsed_dark ||
    settings?.logo_url_collapsed ||
    settings?.logo_url_dark ||
    settings?.logo_url ||
    null;
  const brandLogo = collapsed ? collapsedLogo : expandedLogo;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: pendData } = usePendenciasSidebar();
  const pendMap = pendData?.map ?? {};
  const pendDetailsMap = pendData?.details ?? {};

  const itemDetails = (it: Item): { label: string; count: number }[] => {
    const details: { label: string; count: number }[] = [];
    if (pendDetailsMap[it.to]) details.push(...pendDetailsMap[it.to]);
    if (it.children) {
      for (const c of it.children) {
        if (c.to && pendDetailsMap[c.to]) details.push(...pendDetailsMap[c.to]);
      }
    }
    return details;
  };

  const visibleSections = useMemo(() => {
    // While role is loading after sign-in, show everything to avoid an empty sidebar flash.
    if (roleLoading || modulesLoading) return SECTIONS;
    const isAdmin = role === "admin";
    const moduleVisible = (mod?: AppModule) => {
      if (!mod) return true;
      if (isAdmin) return true;
      return myModules.has(mod);
    };
    const itemVisible = (it: Item) => {
      // Visibility is driven exclusively by role_module_permissions.
      // The per-item `roles` whitelist is intentionally ignored to keep the
      // sidebar in sync with the admin Permissões matrix.
      return moduleVisible(it.module);
    };
    return SECTIONS.filter((s) => {
      // Seções administrativas: role admin OU papel com o módulo 'admin' liberado
      // na matriz (ex.: manager delegado).
      if (s.adminOnly) return role === "admin" || myModules.has("admin");
      if (s.module && !moduleVisible(s.module)) return false;
      if (role === "admin") return true;
      return s.items.some(itemVisible);
    }).map((s) => ({
      ...s,
      items: role === "admin" ? s.items : s.items.filter(itemVisible),
    }));

  }, [role, roleLoading, myModules, modulesLoading]);

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});

  // Load persisted open map
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_OPEN_MAP_KEY);
      if (raw) setOpenMap(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  // Persist
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_OPEN_MAP_KEY, JSON.stringify(openMap));
    } catch {
      /* ignore */
    }
  }, [openMap]);

  // Auto-expand the parent that matches the current route
  useEffect(() => {
    setOpenMap((prev) => {
      let next = prev;
      for (const s of visibleSections) {
        for (const it of s.items) {
          if (!it.children?.length) continue;
          if (pathname === it.to || pathname.startsWith(it.to + "/")) {
            if (!prev[it.to]) {
              if (next === prev) next = { ...prev };
              next[it.to] = true;
            }
          }
        }
      }
      return next;
    });
  }, [pathname, visibleSections]);

  const displayName = profile?.full_name ?? user?.email ?? "Usuário";
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";
  const roleLabel = role ? ROLE_LABEL[role] : "Sem perfil";

  return (
   <TooltipProvider delayDuration={150}>
    <div className="flex h-full w-full flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      <div className={cn(
        "flex items-center border-b border-[var(--sidebar-border)] h-16",
        collapsed ? "flex-col justify-center gap-1 px-1" : "gap-2.5 px-3",
      )}>
        <div
          className={cn(
            "flex items-center justify-center rounded-md overflow-hidden",
            collapsed ? "h-7 w-7 justify-start" : "h-12 px-1 flex-1",
          )}
        >
          {brandLogo ? (
            <img
              src={brandLogo}
              alt={brandName}
              className={cn(
                "object-contain",
                collapsed ? "h-7 w-7" : "h-10 w-auto",
              )}
            />
          ) : (
            <span
              className={cn(
                "font-mono uppercase tracking-[0.2em] text-white/85",
                collapsed ? "text-[10px]" : "text-xs",
              )}
            >
              {collapsed ? "S" : brandName}
            </span>
          )}
        </div>
        {showToggle && (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            title={collapsed ? "Expandir menu" : "Recolher menu"}
            className={cn(
              "grid place-items-center rounded text-[var(--sidebar-foreground)]/70 hover:bg-white/10 hover:text-white",
              collapsed ? "h-6 w-6" : "h-7 w-7",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className={cn("border-b border-[var(--sidebar-border)] py-3", collapsed ? "px-2" : "px-3")}>
        {(() => {
          const podeCliente = role === "admin" || myModules.has("clientes");
          const base =
            "flex w-full items-center justify-center rounded-md bg-[var(--sidebar-primary)] text-[var(--sidebar-primary-foreground)] transition-opacity";
          const enabled = "hover:opacity-90";
          const disabled = "opacity-45 cursor-not-allowed pointer-events-none";
          const tip = podeCliente
            ? "Novo cliente"
            : "Você não tem permissão para o módulo Clientes. Solicite acesso ao administrador.";
          const inner = collapsed ? (
            <Plus className="h-4 w-4" />
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              Novo cliente
            </>
          );
          const cls = cn(
            base,
            collapsed ? "p-2" : "gap-1.5 px-2.5 py-2 text-[11.5px] font-semibold",
            podeCliente ? enabled : disabled,
          );
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="block w-full">
                  {podeCliente ? (
                    <Link to="/clientes/novo" onClick={onNavigate} className={cls}>
                      {inner}
                    </Link>
                  ) : (
                    <span aria-disabled className={cls}>
                      {inner}
                    </span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="right">{tip}</TooltipContent>
            </Tooltip>
          );
        })()}
        <div className="mt-2">
          <SidebarSearch
            collapsed={collapsed}
            navItems={visibleSections.flatMap((s) =>
              s.items.map((it) => ({ label: it.label, to: it.to, section: s.title })),
            )}
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {!role && !roleLoading && !collapsed && (
          <div className="mx-3 mb-3 rounded-md border border-[var(--sidebar-border)] bg-white/5 p-2.5 text-[10px] leading-snug text-[var(--sidebar-foreground)]/70">
            Seu usuário ainda não tem perfil atribuído. Solicite a um administrador o acesso aos módulos.
          </div>
        )}
        {visibleSections.map((s) => (
          <div key={s.title} className="mb-2">
            {!collapsed && (
              <div className="px-4 pb-1 pt-1.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--sidebar-foreground)]/50">
                {s.title}
              </div>
            )}
            <div className="flex flex-col">
              {s.items.map((it) => {
                const hasChildren = !!it.children?.length;
                const open = !!openMap[it.to];
                const isActive = pathname === it.to || pathname.startsWith(it.to + "/");
                const directPend = pendMap[it.to] ?? 0;
                const childPend = hasChildren
                  ? it.children!.reduce((acc, c) => acc + (c.to ? pendMap[c.to] ?? 0 : 0), 0)
                  : 0;
                const pendCount = directPend + childPend;
                return (
                  <div key={it.to}>
                    {hasChildren ? (
                      <ParentRow
                        item={it}
                        open={open}
                        onToggle={() => setOpenMap((p) => ({ ...p, [it.to]: !p[it.to] }))}
                        collapsed={collapsed}
                        active={isActive}
                        pendCount={pendCount}
                        pendDetails={itemDetails(it)}
                      />
                    ) : (
                      <LeafRow
                        item={it}
                        onNavigate={onNavigate}
                        collapsed={collapsed}
                        pendCount={pendCount}
                        pendDetails={itemDetails(it)}
                      />
                    )}
                    {hasChildren && open && !collapsed && (
                      <ChildList
                        children={it.children!}
                        onNavigate={onNavigate}
                        pendMap={pendMap}
                        pendDetailsMap={pendDetailsMap}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={cn(
        "flex items-center border-t border-[var(--sidebar-border)] p-3",
        collapsed ? "flex-col gap-2" : "gap-2",
      )}>
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/conta"
                onClick={onNavigate}
                className="grid h-8 w-8 place-items-center overflow-hidden rounded-full bg-[var(--sidebar-primary)] text-[10px] font-bold text-[var(--sidebar-primary-foreground)] hover:opacity-90"
                aria-label="Minha conta"
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="h-8 w-8 object-cover" />
                ) : (
                  initials
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {displayName} · {roleLabel}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Link
            to="/conta"
            onClick={onNavigate}
            className="flex min-w-0 flex-1 items-center gap-2 rounded hover:bg-white/5 p-1 -m-1"
            title="Minha conta"
          >
            <div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--sidebar-primary)] text-[10px] font-bold text-[var(--sidebar-primary-foreground)]">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={displayName} className="h-8 w-8 object-cover" />
              ) : (
                initials
              )}
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="truncate text-[11.5px] font-medium text-[var(--sidebar-foreground)]">{displayName}</div>
              <div className="truncate text-[10px] text-[var(--sidebar-foreground)]/60">{roleLabel}</div>
            </div>
          </Link>
        )}
        <NotificationsBell collapsed={collapsed} />
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                aria-label="Sair"
                onClick={() => void signOut()}
                className="grid h-8 w-8 place-items-center rounded text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Sair</TooltipContent>
          </Tooltip>
        ) : (
          <button
            title="Sair"
            onClick={() => void signOut()}
            className="grid h-8 w-8 place-items-center rounded text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
   </TooltipProvider>
  );
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  return (
    <aside
      className={cn(
        "hidden md:flex shrink-0 flex-col border-r border-[var(--sidebar-border)] transition-[width] duration-200 ease-linear",
        collapsed ? "w-[64px]" : "w-[240px]",
      )}
    >
      <AppSidebarContent collapsed={collapsed} onToggleCollapsed={toggle} showToggle />
    </aside>
  );
}

export function useCloseOnNavigate(close: () => void) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);
}