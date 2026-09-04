import { useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type ComboOption = { id: string; nome: string };

export function ComboboxAdd({
  options,
  value,
  onChange,
  onCreate,
  placeholder = "Selecione…",
  emptyText = "Nada encontrado.",
  canCreate = true,
  disabled,
}: {
  options: ComboOption[];
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  onCreate?: (nome: string) => Promise<ComboOption | null>;
  placeholder?: string;
  emptyText?: string;
  canCreate?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  const selected = options.find((o) => o.id === value);
  const trimmed = query.trim();
  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const exactExists = options.some((o) => norm(o.nome) === norm(trimmed));
  const showCreate = canCreate && onCreate && trimmed.length >= 2 && !exactExists;

  async function handleCreate() {
    if (!onCreate || !trimmed) return;
    setCreating(true);
    try {
      const created = await onCreate(trimmed);
      if (created) {
        onChange(created.id);
        setOpen(false);
        setQuery("");
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          <span className={cn(!selected && "text-muted-foreground")}>
            {selected?.nome ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder="Buscar…" value={query} onValueChange={setQuery} />
          <CommandList>
            <CommandEmpty>
              {showCreate ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={handleCreate}
                  disabled={creating}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar <strong className="ml-1">{trimmed}</strong>
                </button>
              ) : (
                <span className="block px-3 py-2 text-sm text-muted-foreground">{emptyText}</span>
              )}
            </CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear"
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  className="text-muted-foreground"
                >
                  — Limpar seleção —
                </CommandItem>
              )}
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.nome}
                  onSelect={() => {
                    onChange(opt.id);
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5", value === opt.id ? "opacity-100" : "opacity-0")} />
                  {opt.nome}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem
                  value={`__create_${trimmed}`}
                  onSelect={handleCreate}
                  disabled={creating}
                  className="text-primary"
                >
                  <Plus className="mr-2 h-3.5 w-3.5" />
                  Adicionar "{trimmed}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}