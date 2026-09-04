import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NavItem = { label: string; to: string };
type NavGroup = { title: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  { title: "Visão geral", items: [{ label: "Painel", to: "/admin/configuracoes" }] },
  {
    title: "Sistema",
    items: [
      { label: "Chaves & Diagnóstico", to: "/admin/diagnostico" },
      { label: "Banco de Dados", to: "/admin/banco" },
      { label: "Mineração", to: "/admin/mineracao" },
      { label: "Migrations", to: "/admin/migrations" },
    ],
  },
  {
    title: "Marca & Site",
    items: [
      { label: "Geral", to: "/admin/geral" },
      { label: "Contato", to: "/admin/contato" },
      { label: "SEO", to: "/admin/seo" },
      { label: "Páginas dos Equipamentos", to: "/admin/paginas-equipamentos" },
    ],
  },
  {
    title: "Usuários & Segurança",
    items: [
      { label: "Usuários & Permissões", to: "/admin/usuarios" },
      { label: "Auditoria", to: "/admin/auditoria" },
    ],
  },
  {
    title: "Atendimento & Conteúdo",
    items: [
      { label: "E-mails automáticos", to: "/admin/emails" },
      { label: "Formulários recebidos", to: "/admin/formularios-recebidos" },
      { label: "Modelos de Formulário", to: "/admin/modelos-formulario" },
      { label: "SLA de Chamados", to: "/admin/sla-chamados" },
    ],
  },
  { title: "Comercial", items: [{ label: "Origens de Lead", to: "/admin/origens-lead" }] },
  { title: "Equipamentos", items: [{ label: "Etapas dos Equipamentos", to: "/admin/etapas-equipamentos" }] },
];

function isActive(pathname: string, to: string): boolean {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function SettingsNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const current = GROUPS.flatMap((g) => g.items).find((i) => isActive(pathname, i.to));

  return (
    <>
      {/* Mobile/tablet: um Select cobrindo todas as seções */}
      <div className="mb-4 lg:hidden">
        <Select
          value={current?.to ?? "/admin/configuracoes"}
          onValueChange={(to) => {
            void navigate({ to });
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Seção" />
          </SelectTrigger>
          <SelectContent>
            {GROUPS.map((g) => (
              <SelectGroup key={g.title}>
                <SelectLabel>{g.title}</SelectLabel>
                {g.items.map((item) => (
                  <SelectItem key={item.to} value={item.to}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop: menu de categorias fixo */}
      <nav className="hidden w-60 shrink-0 space-y-5 overflow-y-auto rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-3 lg:block">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
              {g.title}
            </div>
            <div className="space-y-0.5">
              {g.items.map((item) => {
                const active = isActive(pathname, item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "block rounded-md px-2 py-1.5 text-[13px] transition-colors",
                      active
                        ? "bg-[var(--primary)]/10 font-medium text-[var(--primary)]"
                        : "text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)]",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </>
  );
}
