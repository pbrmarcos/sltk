import {
  Gauge,
  Settings2,
  ShieldCheck,
  Zap,
  Wrench,
  Beaker,
  Factory,
  LineChart,
  Sparkles,
  Plus,
  Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { BLOCO_ICONES, type IconeNome } from "@/lib/equipamento-pagina.shared";

const ICONE_COMPONENTES = {
  Gauge,
  Settings2,
  ShieldCheck,
  Zap,
  Wrench,
  Beaker,
  Factory,
  LineChart,
  Sparkles,
} satisfies Record<IconeNome, unknown>;

const IDIOMAS = [
  { valor: "pt", label: "PT" },
  { valor: "es", label: "ES" },
  { valor: "en", label: "EN" },
] as const;

type ConteudoObj = Record<string, unknown>;

function campoStr(obj: ConteudoObj, key: string): string {
  return typeof obj[key] === "string" ? (obj[key] as string) : "";
}

/** Campo de texto curto com abas PT/ES/EN (edita `${base}_pt/es/en`). */
export function CampoTextoIdiomas({
  label,
  base,
  value,
  onChange,
  obrigatorio,
  placeholder,
}: {
  label: string;
  base: string;
  value: ConteudoObj;
  onChange: (next: ConteudoObj) => void;
  obrigatorio?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {obrigatorio && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Tabs defaultValue="pt">
        <TabsList className="h-8">
          {IDIOMAS.map((i) => (
            <TabsTrigger key={i.valor} value={i.valor} className="text-xs">
              {i.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {IDIOMAS.map((i) => {
          const key = `${base}_${i.valor}`;
          return (
            <TabsContent key={i.valor} value={i.valor} className="mt-2">
              <Input
                value={campoStr(value, key)}
                placeholder={placeholder}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

/** Campo de texto longo com abas PT/ES/EN. */
export function CampoTextareaIdiomas({
  label,
  base,
  value,
  onChange,
  obrigatorio,
  rows = 4,
}: {
  label: string;
  base: string;
  value: ConteudoObj;
  onChange: (next: ConteudoObj) => void;
  obrigatorio?: boolean;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label}
        {obrigatorio && <span className="ml-0.5 text-destructive">*</span>}
      </Label>
      <Tabs defaultValue="pt">
        <TabsList className="h-8">
          {IDIOMAS.map((i) => (
            <TabsTrigger key={i.valor} value={i.valor} className="text-xs">
              {i.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {IDIOMAS.map((i) => {
          const key = `${base}_${i.valor}`;
          return (
            <TabsContent key={i.valor} value={i.valor} className="mt-2">
              <Textarea
                rows={rows}
                value={campoStr(value, key)}
                onChange={(e) => onChange({ ...value, [key]: e.target.value })}
              />
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

/** Campo de texto simples, sem variação por idioma (ex.: imagem_url). */
export function CampoTextoSimples({
  label,
  field,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  field: string;
  value: ConteudoObj;
  onChange: (next: ConteudoObj) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Input
        value={campoStr(value, field)}
        placeholder={placeholder}
        onChange={(e) => onChange({ ...value, [field]: e.target.value })}
      />
    </div>
  );
}

/** Lista simples de textos por idioma (ex.: bullets_pt/es/en). */
export function ListaTextosIdiomas({
  label,
  base,
  value,
  onChange,
}: {
  label: string;
  base: string;
  value: ConteudoObj;
  onChange: (next: ConteudoObj) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      <Tabs defaultValue="pt">
        <TabsList className="h-8">
          {IDIOMAS.map((i) => (
            <TabsTrigger key={i.valor} value={i.valor} className="text-xs">
              {i.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {IDIOMAS.map((i) => {
          const key = `${base}_${i.valor}`;
          const itens = Array.isArray(value[key]) ? (value[key] as string[]) : [];
          return (
            <TabsContent key={i.valor} value={i.valor} className="mt-2 space-y-2">
              {itens.map((linha, idx) => (
                <div key={idx} className="flex gap-2">
                  <Input
                    value={linha}
                    onChange={(e) => {
                      const next = [...itens];
                      next[idx] = e.target.value;
                      onChange({ ...value, [key]: next });
                    }}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => onChange({ ...value, [key]: itens.filter((_, j) => j !== idx) })}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onChange({ ...value, [key]: [...itens, ""] })}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Adicionar linha
              </Button>
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

/** Seletor do ícone fixo usado no bloco "benefícios". */
export function SeletorIcone({
  value,
  onChange,
}: {
  value: IconeNome | undefined;
  onChange: (icone: IconeNome) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">Ícone</Label>
      <div className="flex flex-wrap gap-1.5">
        {BLOCO_ICONES.map((nome) => {
          const Icon = ICONE_COMPONENTES[nome];
          const ativo = value === nome;
          return (
            <Button
              key={nome}
              type="button"
              size="icon"
              variant={ativo ? "default" : "outline"}
              title={nome}
              onClick={() => onChange(nome)}
            >
              <Icon className="h-4 w-4" />
            </Button>
          );
        })}
      </div>
    </div>
  );
}

/** Editor genérico de lista de objetos (adicionar/remover linha). */
export function ListaEditor<T>({
  label,
  itens,
  onChange,
  novoItem,
  renderItem,
}: {
  label: string;
  itens: T[];
  onChange: (next: T[]) => void;
  novoItem: () => T;
  renderItem: (item: T, onChangeItem: (next: T) => void) => React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">{label}</Label>
      <div className="space-y-3">
        {itens.map((item, idx) => (
          <div key={idx} className="rounded-md border border-border p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Item {idx + 1}</span>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => onChange(itens.filter((_, j) => j !== idx))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
            {renderItem(item, (next) => {
              const copia = [...itens];
              copia[idx] = next;
              onChange(copia);
            })}
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...itens, novoItem()])}
      >
        <Plus className="mr-1.5 h-3.5 w-3.5" />
        Adicionar item
      </Button>
    </div>
  );
}
