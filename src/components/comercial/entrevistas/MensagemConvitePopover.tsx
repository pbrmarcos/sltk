import { useState } from "react";
import { Copy, MessageSquareText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { shareMessage, type Idioma } from "@/lib/entrevistas-shared";

export function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://sltkamericas.com";
}

const IDIOMAS: Array<{ v: Idioma; label: string }> = [
  { v: "pt", label: "Português" },
  { v: "es", label: "Español" },
  { v: "en", label: "English" },
];

/** Mensagem pronta para colar (WhatsApp/e-mail) com o link da entrevista, em 1 idioma por vez. */
export function MensagemConvitePopover({
  codigo,
  idiomaPadrao = "pt",
  trigger,
}: {
  codigo: string;
  idiomaPadrao?: Idioma;
  trigger?: React.ReactNode;
}) {
  const [lang, setLang] = useState<Idioma>(idiomaPadrao);
  const msg = shareMessage(codigo, lang, appOrigin());
  return (
    <Popover>
      <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
        {trigger ?? (
          <Button size="sm" variant="ghost" className="h-7 px-2" title="Mensagem para colar">
            <MessageSquareText className="h-3.5 w-3.5" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Mensagem para colar
          </span>
          <Select value={lang} onValueChange={(v) => setLang(v as Idioma)}>
            <SelectTrigger className="h-7 w-[120px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IDIOMAS.map((i) => (
                <SelectItem key={i.v} value={i.v}>
                  {i.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Textarea
          readOnly
          value={msg}
          rows={4}
          className="text-xs"
          onFocus={(ev) => ev.currentTarget.select()}
        />
        <Button
          size="sm"
          className="w-full"
          onClick={() => {
            navigator.clipboard.writeText(msg);
            toast.success("Mensagem copiada.");
          }}
        >
          <Copy className="mr-1 h-3.5 w-3.5" /> Copiar mensagem
        </Button>
      </PopoverContent>
    </Popover>
  );
}
