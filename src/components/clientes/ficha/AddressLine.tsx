import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2, MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";
import { geocodeCliente } from "@/lib/clientes.functions";
import { cn } from "@/lib/utils";

type ClienteAddr = {
  id: string;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_bairro?: string | null;
  endereco_cidade?: string | null;
  endereco_estado?: string | null;
  endereco_codigo_postal?: string | null;
  pais: string;
  latitude?: number | null;
  longitude?: number | null;
  geocoded_at?: string | null;
};

/** Cidade — UF, país, com link para o mapa e geocodificação sob demanda. */
export function AddressLine({ cliente, paisNome }: { cliente: ClienteAddr; paisNome: string }) {
  const qc = useQueryClient();
  const display =
    [cliente.endereco_cidade, cliente.endereco_estado].filter(Boolean).join(" — ") || null;
  const queryParts = [
    [cliente.endereco_logradouro, cliente.endereco_numero].filter(Boolean).join(", "),
    cliente.endereco_bairro,
    cliente.endereco_cidade,
    cliente.endereco_estado,
    cliente.endereco_codigo_postal,
    paisNome,
  ].filter(Boolean) as string[];
  const hasCoords = typeof cliente.latitude === "number" && typeof cliente.longitude === "number";
  const mapsHref = hasCoords
    ? `https://www.openstreetmap.org/?mlat=${cliente.latitude}&mlon=${cliente.longitude}#map=15/${cliente.latitude}/${cliente.longitude}`
    : queryParts.length > 1
      ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(queryParts.join(", "))}`
      : null;
  const canGeocode = queryParts.length >= 2 && !hasCoords;

  const geoMut = useMutation({
    mutationFn: () => geocodeCliente({ data: { clienteId: cliente.id } }),
    onSuccess: (r) => {
      toast.success(`Geocodificado (${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)})`);
      qc.invalidateQueries({ queryKey: ["clientes", "detail-codigo"] });
      qc.invalidateQueries({ queryKey: ["clientes", cliente.id, "timeline"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Falha ao geocodificar."),
  });

  return (
    <span className="inline-flex items-center gap-1.5">
      <MapPin className="h-3.5 w-3.5" />
      <span>{display ? `${display}, ${paisNome}` : paisNome}</span>
      {mapsHref && (
        <a
          href={mapsHref}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center text-muted-foreground hover:text-foreground"
          title={hasCoords ? "Abrir no mapa" : "Buscar endereço no mapa"}
        >
          <Navigation className="h-3 w-3" />
        </a>
      )}
      {(canGeocode || geoMut.isError) && !geoMut.isPending && (
        <button
          type="button"
          onClick={() => geoMut.mutate()}
          className={cn(
            "inline-flex items-center gap-0.5 text-[10.5px] hover:underline",
            geoMut.isError ? "text-destructive" : "text-muted-foreground",
          )}
          title={geoMut.isError ? "Tentar geocodificar novamente" : "Salvar coordenadas"}
        >
          {geoMut.isError ? <AlertCircle className="h-3 w-3" /> : "geocodificar"}
        </button>
      )}
      {geoMut.isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
    </span>
  );
}
