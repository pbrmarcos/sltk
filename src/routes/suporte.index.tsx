import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useSuporteT } from "@/components/suporte/PublicShell";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";

import { publicAbrirChamado, publicResolverCodigo } from "@/lib/suporte-publico.functions";

export const Route = createFileRoute("/suporte/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Suporte Técnico Solutek — Abrir chamado" },
      {
        name: "description",
        content:
          "Abra um chamado de pós-venda Solutek. Registre o número de série do equipamento e converse com nossa equipe técnica.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PublicSiteShell>
      <SuporteHome />
    </PublicSiteShell>
  ),
});

function SuporteHome() {
  const { t } = useSuporteT();
  const [tab, setTab] = useState<"new" | "consult">("new");

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 10%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 60%, #fff 1px, transparent 1px)",
            backgroundSize: "40px 40px, 60px 60px",
          }}
        />
        <div className="mx-auto max-w-[1200px] px-5 py-12 md:px-8 md:py-20">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">
              <LifeBuoy className="h-3.5 w-3.5" />
              {t.hero.kicker}
            </div>
            <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-tight md:text-5xl">
              {t.hero.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
              {t.hero.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-[1200px] px-5 py-10 md:px-8 md:py-16">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            {/* Tabs */}
            <div className="mb-5 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
              <TabButton active={tab === "new"} onClick={() => setTab("new")}>
                {t.tabs.new}
              </TabButton>
              <TabButton active={tab === "consult"} onClick={() => setTab("consult")}>
                {t.tabs.consult}
              </TabButton>
            </div>

            {tab === "new" ? (
              <NovoChamadoForm />
            ) : (
              <ConsultarChamadoForm onNew={() => setTab("new")} />
            )}
          </div>

          {/* Side panel */}
          <aside className="space-y-4">
            <SidePanel />
          </aside>
        </div>
      </section>
    </>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 text-[13px] font-medium rounded-full transition ${
        active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"
      }`}
    >
      {children}
    </button>
  );
}

function SidePanel() {
  const { t } = useSuporteT();
  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">{t.form.title}</h3>
        <ul className="mt-3 space-y-2 text-[13px] text-slate-600">
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-slate-900" />
            <span>Serial do equipamento identificado no atendimento.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-slate-900" />
            <span>Histórico completo e auditável de cada mensagem.</span>
          </li>
          <li className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-slate-900" />
            <span>Resposta pela mesma página — sem trocar de canal.</span>
          </li>
        </ul>
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-900 p-5 text-slate-100 shadow-sm">
        <p className="text-sm leading-relaxed text-slate-300">
          Emergências de linha parada? Ligue diretamente:{" "}
          <span className="font-semibold text-white">+55 (47) 9635-0101</span>
        </p>
      </div>
    </>
  );
}

/* ==================== NOVO ==================== */

function NovoChamadoForm() {
  const { t } = useSuporteT();
  const navigate = useNavigate();
  const abrir = useServerFn(publicAbrirChamado);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [serie, setSerie] = useState("");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [aceite, setAceite] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{ codigo: string; token: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aceite) {
      toast.error(t.errors.aceite);
      return;
    }
    setEnviando(true);
    try {
      const r = await abrir({
        data: {
          nome,
          email,
          telefone: telefone || null,
          numero_serie: serie,
          assunto: assunto || null,
          descricao,
          aceite: true,
        },
      });
      setResultado({ codigo: r.codigo, token: r.token });
      toast.success(`${t.chat.ticket} ${r.codigo} · ${t.success.title}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setEnviando(false);
    }
  }

  if (resultado) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm md:p-8">
        <h2 className="text-2xl font-semibold text-emerald-700">{t.success.title}</h2>
        <p className="mt-1 text-sm text-slate-600">{t.success.subtitle}</p>
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {t.success.ref}
          </div>
          <div className="mt-1 font-mono text-2xl font-bold tracking-wider text-slate-900">
            {resultado.codigo}
          </div>
          <p className="mt-2 text-xs text-slate-500">{t.success.keep}</p>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button
            onClick={() => navigate({ to: "/suporte/$token", params: { token: resultado.token } })}
          >
            {t.success.open}
          </Button>
          <Button variant="outline" onClick={() => setResultado(null)}>
            {t.success.another}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <h2 className="text-xl font-semibold text-slate-900">{t.form.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{t.form.subtitle}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="nome">{t.form.nome} *</Label>
          <Input
            id="nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div>
          <Label htmlFor="email">{t.form.email} *</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div>
          <Label htmlFor="tel">
            {t.form.telefone} <span className="text-slate-400">{t.form.telefoneOpt}</span>
          </Label>
          <Input
            id="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="serie">{t.form.serie} *</Label>
          <Input
            id="serie"
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            required
            maxLength={80}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="assunto">
            {t.form.assunto} <span className="text-slate-400">{t.form.assuntoOpt}</span>
          </Label>
          <Input
            id="assunto"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="desc">{t.form.descricao} *</Label>
          <Textarea
            id="desc"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            required
            minLength={3}
            maxLength={4000}
            rows={6}
            placeholder={t.form.descricaoPh}
          />
        </div>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-slate-600">
        <Checkbox
          checked={aceite}
          onCheckedChange={(v) => setAceite(v === true)}
          className="mt-0.5"
        />
        <span>{t.form.aceite}</span>
      </label>

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={enviando || !aceite} size="lg">
          {enviando ? t.form.submitting : t.form.submit}
        </Button>
      </div>
    </form>
  );
}

/* ==================== CONSULTAR ==================== */

function ConsultarChamadoForm({ onNew }: { onNew: () => void }) {
  const { t } = useSuporteT();
  const resolver = useServerFn(publicResolverCodigo);
  const [codigo, setCodigo] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setStatus(null);
    try {
      const r = await resolver({ data: { codigo, email } });
      setStatus(r.status);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.errors.generic);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <h2 className="text-xl font-semibold text-slate-900">{t.consulta.title}</h2>
      <p className="mt-1 text-sm text-slate-600">{t.consulta.subtitle}</p>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="cod">{t.consulta.codigo} *</Label>
          <Input
            id="cod"
            placeholder={t.consulta.codigoPh}
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            required
            maxLength={40}
          />
        </div>
        <div>
          <Label htmlFor="em">{t.consulta.email} *</Label>
          <Input
            id="em"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
          />
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onNew}
          className="text-sm text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
        >
          {t.consulta.newTicket}
        </button>
        <Button type="submit" disabled={enviando}>
          {enviando ? t.consulta.verificando : t.consulta.verificar}
        </Button>
      </div>

      {status ? (
        <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          {t.consulta.localizado}: <strong>{status}</strong>. {t.consulta.statusLabel}
        </div>
      ) : null}
    </form>
  );
}
