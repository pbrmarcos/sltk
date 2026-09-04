import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

const OUTPUT_SIZE = 512;
const VIEWPORT = 320;

type Area = { x: number; y: number; size: number };

async function getCroppedBlob(imageSrc: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    i.src = imageSrc;
  });
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponível");
  ctx.drawImage(img, area.x, area.y, area.size, area.size, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.9,
    );
  });
}

/**
 * Recorte de avatar 100% local: sem dependências externas (evita falhas de
 * carregamento de chunk em produção). Arraste para posicionar, use o zoom
 * para aproximar.
 */
export function AvatarCropDialog({
  file,
  open,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  file: File | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (blob: Blob) => void;
  submitting: boolean;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!file) {
      setSrc(null);
      setNatural(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setSrc(url);
    setNatural(null);
    setOffset({ x: 0, y: 0 });
    setZoom(1);
    setError(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const geometry = useMemo(() => {
    if (!natural) return null;
    const base = VIEWPORT / Math.min(natural.w, natural.h);
    const scale = base * zoom;
    const dw = natural.w * scale;
    const dh = natural.h * scale;
    return { scale, dw, dh, maxX: (dw - VIEWPORT) / 2, maxY: (dh - VIEWPORT) / 2 };
  }, [natural, zoom]);

  const clamp = useCallback(
    (next: { x: number; y: number }) => {
      if (!geometry) return { x: 0, y: 0 };
      return {
        x: Math.max(-geometry.maxX, Math.min(geometry.maxX, next.x)),
        y: Math.max(-geometry.maxY, Math.min(geometry.maxY, next.y)),
      };
    },
    [geometry],
  );

  useEffect(() => {
    setOffset((prev) => clamp(prev));
  }, [clamp]);

  const area: Area | null = useMemo(() => {
    if (!geometry) return null;
    const size = VIEWPORT / geometry.scale;
    return {
      x: (geometry.maxX - offset.x) / geometry.scale,
      y: (geometry.maxY - offset.y) / geometry.scale,
      size,
    };
  }, [geometry, offset]);

  const handleConfirm = async () => {
    if (!src || !area) return;
    setWorking(true);
    setError(null);
    try {
      const blob = await getCroppedBlob(src, area);
      onConfirm(blob);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao recortar a imagem");
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Recortar avatar</DialogTitle>
          <DialogDescription>
            Arraste para posicionar e ajuste o zoom. A imagem será salva em {OUTPUT_SIZE}×
            {OUTPUT_SIZE}px.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <div
            className="relative overflow-hidden rounded-md bg-black/80 touch-none select-none"
            style={{ width: VIEWPORT, height: VIEWPORT, cursor: src ? "grab" : "default" }}
            onPointerDown={(e) => {
              if (!src) return;
              dragRef.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              const d = dragRef.current;
              if (!d) return;
              setOffset(clamp({ x: d.ox + (e.clientX - d.px), y: d.oy + (e.clientY - d.py) }));
            }}
            onPointerUp={() => {
              dragRef.current = null;
            }}
            onPointerCancel={() => {
              dragRef.current = null;
            }}
          >
            {src && (
              <img
                src={src}
                alt="Pré-visualização do avatar"
                draggable={false}
                onLoad={(e) =>
                  setNatural({
                    w: e.currentTarget.naturalWidth,
                    h: e.currentTarget.naturalHeight,
                  })
                }
                className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{
                  width: geometry ? geometry.dw : undefined,
                  height: geometry ? geometry.dh : undefined,
                  transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            )}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[12px] text-[var(--text-muted)]">Zoom</label>
          <Slider
            min={1}
            max={4}
            step={0.05}
            value={[zoom]}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
          />
        </div>

        {error && <p className="text-[12px] text-destructive">{error}</p>}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={working || submitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={working || submitting || !area}>
            {working || submitting ? "Salvando…" : "Salvar avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
