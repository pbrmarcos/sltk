import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, MessageCircle, Mail, Link as LinkIcon } from "lucide-react";
import { createShareLink } from "@/lib/share-links.functions";
import { useFormDraft } from "@/hooks/use-form-draft";
import { confirmDiscard } from "@/lib/unsaved-guard";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tipo: "fat" | "sat";
  relatorioId: string;
  relatorioCodigo?: string | null;
};

export function ShareLinkDialog({ open, onOpenChange, tipo, relatorioId, relatorioCodigo }: Props) {
  const mint = useServerFn(createShareLink);
  const [ttlHours, setTtlHours] = useState(72);
  const [link, setLink] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { clearDraft, isDirty } = useFormDraft({
    formKey: `share-link:${tipo}:${relatorioId}`,
    value: { ttlHours },
    initialValue: { ttlHours: 72 },
    enabled: open && !link,
    onRestore: (saved) => setTtlHours(saved.ttlHours),
  });

  function requestClose() {
    if (!link && !confirmDiscard(isDirty)) return;
    clearDraft();
    onOpenChange(false);
  }

  async function gerar() {
    setLoading(true);
    try {
      const res = await mint({ data: { tipo, relatorio_id: relatorioId, ttl_hours: ttlHours } });
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${base}/p/relatorio/${tipo}/${res.token}`;
      setLink(url);
      setExpiresAt(res.expires_at);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao gerar link");
    } finally {
      setLoading(false);
    }
  }

  function copiar() {
    if (!link) return;
    navigator.clipboard.writeText(link).then(() => toast.success("Link copiado"));
  }

  const msg = `Preencher relatório ${tipo.toUpperCase()} ${relatorioCodigo ?? ""}: ${link ?? ""}`;
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(msg)}`;
  const email = `mailto:?subject=${encodeURIComponent(`Relatório ${tipo.toUpperCase()} ${relatorioCodigo ?? ""}`)}&body=${encodeURIComponent(msg)}`;

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) requestClose(); else onOpenChange(true); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de preenchimento em campo</DialogTitle>
          <DialogDescription>
            Gere um link assinado para o técnico em campo preencher pelo tablet/celular, sem precisar de login.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="ttl">Validade (horas)</Label>
            <Input
              id="ttl"
              type="number"
              min={1}
              max={720}
              value={ttlHours}
              onChange={(e) => setTtlHours(Math.max(1, Math.min(720, Number(e.target.value) || 72)))}
              disabled={loading || !!link}
            />
          </div>

          {!link ? (
            <Button onClick={gerar} disabled={loading} className="w-full">
              <LinkIcon className="mr-2 h-4 w-4" />
              {loading ? "Gerando…" : "Gerar link"}
            </Button>
          ) : (
            <>
              <div className="grid gap-2">
                <Label>Link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                  <Button variant="outline" onClick={copiar} title="Copiar">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {expiresAt && (
                  <p className="text-xs text-[var(--text-muted)]">
                    Expira em {new Date(expiresAt).toLocaleString("pt-BR")}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline">
                  <a href={whatsapp} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={email}>
                    <Mail className="mr-2 h-4 w-4" /> E-mail
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setLink(null);
                    setExpiresAt(null);
                  }}
                >
                  Gerar outro
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={requestClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
