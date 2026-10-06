import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { clienteByCodigoQueryOptions, paisesQueryOptions } from "@/lib/clientes.queries";
import { segmentosQueryOptions } from "@/lib/cadastros.queries";
import { formatDocumento } from "@/lib/clientes.shared";
import { completudeCliente } from "@/lib/cliente-completude";
import type { MineracaoIA } from "@/lib/minerar-cliente.functions";
import { useMinerarCliente } from "@/components/clientes/MinerarDados";
import { ClienteTopbar } from "@/components/clientes/ficha/ClienteTopbar";
import { ClienteHeader } from "@/components/clientes/ficha/ClienteHeader";
import { ClienteVisaoTab } from "@/components/clientes/ficha/ClienteVisaoTab";
import { ClienteComercialTab } from "@/components/clientes/ficha/ClienteComercialTab";
import { ClienteEquipamentosTab } from "@/components/clientes/ficha/ClienteEquipamentosTab";
import { ClienteContatosTab } from "@/components/clientes/ficha/ClienteContatosTab";
import { ClienteDocumentosTab } from "@/components/clientes/ficha/ClienteDocumentosTab";
import { ClienteHistoricoTab } from "@/components/clientes/ficha/ClienteHistoricoTab";
import { FICHA_TABS, type FichaTab } from "@/components/clientes/ficha/ficha-utils";

const TAB_IDS = FICHA_TABS.map((t) => t.id) as [FichaTab, ...FichaTab[]];

/** Rotas antigas (Gestão/Time + pílulas) → abas novas. Mantido por uma versão. */
const LEGADO_SEC: Record<string, FichaTab> = {
  visao: "visao",
  equipamentos: "equipamentos",
  checklist: "comercial",
  socios: "contatos",
  documentos: "documentos",
  timeline: "historico",
};

const searchSchema = z.object({
  tab: fallback(z.enum(TAB_IDS), "visao").default("visao"),
  /** Vem do "Minerar dados" da oportunidade: dispara a mineração ao abrir. */
  minerar: fallback(z.boolean(), false).default(false),
  /** Abre a seção "Completar cadastro" (vindo do cadastro rápido). */
  completar: fallback(z.boolean(), false).default(false),
});

export const Route = createFileRoute("/_authenticated/clientes/$codigo")({
  validateSearch: zodValidator(searchSchema),
  beforeLoad: ({ search, params }) => {
    const raw = search as Record<string, unknown>;
    const legadoTab = raw.tab === "time" ? "contatos" : raw.tab === "gestao" ? null : undefined;
    const legadoSec = typeof raw.sec === "string" ? LEGADO_SEC[raw.sec] : undefined;
    if (legadoTab !== undefined || legadoSec) {
      throw redirect({
        to: "/clientes/$codigo",
        params,
        search: { tab: legadoTab ?? legadoSec ?? "visao", minerar: !!raw.minerar },
        replace: true,
      });
    }
  },
  loader: ({ context, params }) => {
    context.queryClient.ensureQueryData(clienteByCodigoQueryOptions(params.codigo));
    context.queryClient.ensureQueryData(paisesQueryOptions());
  },
  component: ClientePage,
});

function ClientePage() {
  const { codigo } = Route.useParams();
  const { tab, minerar, completar } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const { data } = useSuspenseQuery(clienteByCodigoQueryOptions(codigo));
  const paises = useSuspenseQuery(paisesQueryOptions());
  const segmentos = useQuery(segmentosQueryOptions());
  const cliente = data.cliente;
  const contatos = data.contatos ?? [];
  const socios = (data as { socios?: unknown[] }).socios ?? [];

  const paisCfg = paises.data.find((p) => p.codigo === cliente.pais);
  const documentoFmt = paisCfg
    ? formatDocumento(cliente.documento_fiscal_numero, paisCfg.documento_mascara)
    : cliente.documento_fiscal_numero;
  const segmentoNome =
    segmentos.data?.find((s) => s.id === cliente.segmento_id)?.nome ?? cliente.segmento ?? null;
  const mineracaoCols = cliente as typeof cliente & {
    mineracao_ia?: MineracaoIA | null;
    minerado_em?: string | null;
  };
  const completude = completudeCliente(cliente, {
    contatosComEmail: contatos.filter((c: { email?: string | null }) => !!c.email).length,
    socios: socios.length,
  });

  const minerarMut = useMinerarCliente(cliente.id);
  const minerarDisparado = useRef(false);
  useEffect(() => {
    if (!minerar || minerarDisparado.current) return;
    minerarDisparado.current = true;
    minerarMut.mutate();
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, minerar: undefined }),
      replace: true,
    });
  }, [minerar, minerarMut, navigate]);

  const setTab = (next: FichaTab) =>
    navigate({
      search: (prev: Record<string, unknown>) => ({ ...prev, tab: next, completar: undefined }),
      replace: true,
    });
  const irCompletar = () => {
    navigate({ search: { tab: "visao", completar: true }, replace: true });
    setTimeout(
      () => document.getElementById("completar-cadastro")?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  };

  return (
    <div className="w-full bg-muted/30 text-foreground">
      <ClienteTopbar
        cliente={cliente}
        minerando={minerarMut.isPending}
        onMinerar={() => minerarMut.mutate()}
      />
      <ClienteHeader
        cliente={cliente}
        paisNome={paisCfg?.nome ?? cliente.pais}
        segmentoNome={segmentoNome}
        completude={{ pct: completude.pct, faltantes: completude.faltantes.length }}
        onCompletar={irCompletar}
      />

      <div className="px-4 py-3 md:px-6 md:py-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FichaTab)}>
          <TabsList className="mb-4 h-auto w-full justify-start overflow-x-auto">
            {FICHA_TABS.map((t) => (
              <TabsTrigger key={t.id} value={t.id} className="text-[12.5px]">
                {t.label}
                {t.id === "contatos" && contatos.length > 0 && (
                  <span className="ml-1 text-muted-foreground">{contatos.length}</span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {tab === "visao" && (
          <ClienteVisaoTab
            cliente={cliente}
            completudePct={completude.pct}
            completarAberto={completar}
            minerando={minerarMut.isPending}
            mineracao={mineracaoCols.mineracao_ia}
            mineradoEm={mineracaoCols.minerado_em}
            onGoTo={setTab}
          />
        )}
        {tab === "comercial" && <ClienteComercialTab clienteId={cliente.id} />}
        {tab === "equipamentos" && <ClienteEquipamentosTab clienteId={cliente.id} />}
        {tab === "contatos" && (
          <ClienteContatosTab
            cliente={cliente}
            contatos={contatos}
            socios={socios}
            documentoFmt={documentoFmt}
            documentoNome={paisCfg?.documento_nome ?? "Documento"}
          />
        )}
        {tab === "documentos" && <ClienteDocumentosTab clienteId={cliente.id} />}
        {tab === "historico" && <ClienteHistoricoTab clienteId={cliente.id} />}
      </div>
    </div>
  );
}
