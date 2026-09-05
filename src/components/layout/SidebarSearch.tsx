import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";

type NavItem = { label: string; to: string; section: string };

export function SidebarSearch({
  collapsed,
  navItems,
}: {
  collapsed?: boolean;
  navItems: NavItem[];
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [results, setResults] = useState<{
    clientes: any[];
    equipamentos: any[];
    processos: any[];
    projetos: any[];
  }>({ clientes: [], equipamentos: [], processos: [], projetos: [] });
  const navigate = useNavigate();

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Dynamic search
  useEffect(() => {
    if (!open || debouncedQ.length < 2) {
      setResults({ clientes: [], equipamentos: [], processos: [], projetos: [] });
      return;
    }
    let cancelled = false;
    const term = `%${debouncedQ}%`;
    (async () => {
      const [cli, eqp, pro, prj] = await Promise.all([
        supabase
          .from("clientes")
          .select("id, codigo, razao_social")
          .is("deleted_at", null)
          .or(`codigo.ilike.${term},razao_social.ilike.${term}`)
          .limit(5),
        supabase
          .from("cliente_equipamentos")
          .select("id, codigo, modelo, clientes!inner(codigo, razao_social)")
          .is("deleted_at", null)
          .or(`codigo.ilike.${term},modelo.ilike.${term}`)
          .limit(5),
        Promise.resolve({ data: [] as { id: string; codigo: string; titulo: string }[] }),
        supabase
          .from("equipamento_projetos")
          .select(
            "id, revisao, disciplina, equipamento_id, cliente_equipamentos!inner(codigo,modelo)",
          )
          .is("deleted_at", null)
          .or(`revisao.ilike.${term}`)
          .limit(5),
      ]);
      if (cancelled) return;
      setResults({
        clientes: cli.data ?? [],
        equipamentos: eqp.data ?? [],
        processos: pro.data ?? [],
        projetos: prj.data ?? [],
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, debouncedQ]);

  const filteredNav =
    q.trim().length === 0
      ? navItems.slice(0, 8)
      : navItems
          .filter((n) => (n.label + " " + n.section).toLowerCase().includes(q.toLowerCase()))
          .slice(0, 12);

  function go(to: string) {
    setOpen(false);
    setQ("");
    navigate({ to });
  }

  return (
    <>
      {collapsed ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buscar (Ctrl+K)"
          title="Buscar (Ctrl+K)"
          className="flex w-full items-center justify-center rounded-md border border-[var(--sidebar-border)] bg-white/5 p-2 text-[var(--sidebar-foreground)]/80 hover:bg-white/10"
        >
          <Search className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center gap-2 rounded-md border border-[var(--sidebar-border)] bg-white/5 px-2.5 py-1.5 text-left text-[11.5px] text-[var(--sidebar-foreground)]/70 hover:bg-white/10"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 truncate">Buscar…</span>
          <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-mono text-[var(--sidebar-foreground)]/80">
            Ctrl+K
          </kbd>
        </button>
      )}

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar páginas, clientes, equipamentos, processos…"
          value={q}
          onValueChange={setQ}
        />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>

          {filteredNav.length > 0 && (
            <CommandGroup heading="Navegação">
              {filteredNav.map((n) => (
                <CommandItem
                  key={n.to}
                  value={`nav ${n.label} ${n.section}`}
                  onSelect={() => go(n.to)}
                >
                  <span className="flex-1">{n.label}</span>
                  <span className="text-[10px] text-muted-foreground">{n.section}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.clientes.length > 0 && (
            <CommandGroup heading="Clientes">
              {results.clientes.map((c: any) => (
                <CommandItem
                  key={c.id}
                  value={`cli ${c.codigo} ${c.razao_social}`}
                  onSelect={() => go(`/clientes/${c.codigo}`)}
                >
                  <span className="font-mono text-xs mr-2">{c.codigo}</span>
                  <span className="flex-1 truncate">{c.razao_social}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.equipamentos.length > 0 && (
            <CommandGroup heading="Equipamentos">
              {results.equipamentos.map((e: any) => (
                <CommandItem
                  key={e.id}
                  value={`eqp ${e.codigo} ${e.modelo}`}
                  onSelect={() => go(`/clientes/${e.clientes?.codigo}`)}
                >
                  <span className="font-mono text-xs mr-2">{e.codigo}</span>
                  <span className="flex-1 truncate">{e.modelo}</span>
                  <span className="text-[10px] text-muted-foreground truncate ml-2">
                    {e.clientes?.razao_social}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {results.projetos.length > 0 && (
            <CommandGroup heading="Revisões de projeto">
              {results.projetos.map((p: any) => (
                <CommandItem
                  key={p.id}
                  value={`prj ${p.revisao} ${p.cliente_equipamentos?.codigo}`}
                  onSelect={() => {
                    setOpen(false);
                    setQ("");
                    navigate({
                      to: "/engenharia/projetos",
                      search: { d: p.disciplina === "mecanico" ? "mecanico" : "eletrico" },
                    });
                  }}
                >
                  <span className="font-mono text-xs mr-2">{p.revisao}</span>
                  <span className="flex-1 truncate">{p.cliente_equipamentos?.modelo}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">{p.disciplina}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
