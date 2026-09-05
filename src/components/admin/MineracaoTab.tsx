import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import {
  getMineracaoConfig,
  saveMineracaoConfig,
  testarMineracao,
} from "@/lib/mineracao.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px]">{label}</Label>
      {children}
      {hint && <p className="text-[11.5px] text-[var(--text-muted)]">{hint}</p>}
    </div>
  );
}

function errMsg(e: unknown): string {
  if (e instanceof Error && e.message) return e.message;
  if (typeof e === "string") return e;
  const anyE = e as { message?: string; error?: string; statusText?: string } | null;
  return (
    anyE?.message ||
    anyE?.error ||
    anyE?.statusText ||
    "Não foi possível concluir a operação. Tente novamente."
  );
}

export function MineracaoTab() {
  const qc = useQueryClient();
  const fetchConfig = useServerFn(getMineracaoConfig);
  const save = useServerFn(saveMineracaoConfig);
  const testar = useServerFn(testarMineracao);

  const { data, isLoading } = useQuery({
    queryKey: ["mineracao-config"],
    queryFn: () => fetchConfig(),
  });

  const [form, setForm] = React.useState<Record<string, string>>({});
  React.useEffect(() => {
    if (!data) return;
    setForm({
      api_base_url: data.api_base_url,
      usuario: data.usuario ?? "",
      senha: "",
      pais_padrao: data.pais_padrao ?? "",
      delay_ms: String(data.delay_ms),
      limite_consultas_dia: String(data.limite_consultas_dia),
      limite_bases: String(data.limite_bases),
      limite_bases_premium: String(data.limite_bases_premium),
      limite_rubros: String(data.limite_rubros),
      limite_empresas: String(data.limite_empresas),
    });
  }, [data]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const saveMut = useMutation({
    mutationFn: () =>
      save({
        data: {
          api_base_url: form["api_base_url"] ?? "",
          usuario: form["usuario"] ?? "",
          ...(form["senha"] ? { senha: form["senha"] } : {}),
          pais_padrao: form["pais_padrao"] ?? "",
          delay_ms: Number(form["delay_ms"] ?? 600),
          limite_consultas_dia: Number(form["limite_consultas_dia"] ?? 1000),
          limite_bases: Number(form["limite_bases"] ?? 25),
          limite_bases_premium: Number(form["limite_bases_premium"] ?? 15),
          limite_rubros: Number(form["limite_rubros"] ?? 30),
          limite_empresas: Number(form["limite_empresas"] ?? 1000),
        },
      }),
    onSuccess: () => {
      toast.success("Configuração da mineração salva.");
      setForm((f) => ({ ...f, senha: "" }));
      void qc.invalidateQueries({ queryKey: ["mineracao-config"] });
      void qc.invalidateQueries({ queryKey: ["mineracao-status"] });
    },
    onError: (e: unknown) => toast.error(errMsg(e)),
  });

  const testMut = useMutation({
    mutationFn: () => testar({} as never),
    onSuccess: (r) => {
      if (r.ok) toast.success(`Conexão OK — ${r.conta} (${r.latencia_ms} ms)`);
      else toast.error(r.erro);
    },
    onError: (e: unknown) => toast.error(errMsg(e)),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-[var(--text-muted)]">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando configuração…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
        <header className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Acesso ao provedor de mineração
          </h3>
          <p className="text-[12px] text-[var(--text-muted)]">
            Credenciais usadas pela tela Comercial › Mineração. A senha fica somente no servidor e
            nunca é devolvida para o navegador.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Endereço do serviço">
            <Input value={form["api_base_url"] ?? ""} onChange={set("api_base_url")} />
          </Field>
          <Field label="País padrão" hint="Sigla de 2 letras, ex.: BR, PA, AR.">
            <Input value={form["pais_padrao"] ?? ""} onChange={set("pais_padrao")} maxLength={4} />
          </Field>
          <Field label="Usuário">
            <Input value={form["usuario"] ?? ""} onChange={set("usuario")} autoComplete="off" />
          </Field>
          <Field
            label="Senha"
            hint={
              data?.senha_definida
                ? "Já existe uma senha salva. Preencha apenas para trocar."
                : "Nenhuma senha salva ainda."
            }
          >
            <Input
              type="password"
              value={form["senha"] ?? ""}
              onChange={set("senha")}
              placeholder={data?.senha_definida ? "••••••••" : ""}
              autoComplete="new-password"
            />
          </Field>
          <Field
            label="Intervalo entre consultas (ms)"
            hint="Mínimo exigido pelo provedor: 500 ms."
          >
            <Input
              type="number"
              min={500}
              value={form["delay_ms"] ?? ""}
              onChange={set("delay_ms")}
            />
          </Field>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            {saveMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
          <Button variant="outline" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
            {testMut.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : testMut.data?.ok ? (
              <CheckCircle2 className="h-4 w-4 text-[var(--success)]" />
            ) : testMut.data ? (
              <XCircle className="h-4 w-4 text-[var(--danger)]" />
            ) : null}
            Testar conexão
          </Button>
        </div>
      </section>

      <section className="rounded-lg border border-[var(--bg-border)] bg-[var(--bg-surface)] p-5">
        <header className="mb-4">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Limites do plano</h3>
          <p className="text-[12px] text-[var(--text-muted)]">
            Usados para os medidores de consumo na tela de mineração e para avisar quando o plano
            estiver perto do fim.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Bases (países)">
            <Input
              type="number"
              value={form["limite_bases"] ?? ""}
              onChange={set("limite_bases")}
            />
          </Field>
          <Field label="Bases premium">
            <Input
              type="number"
              value={form["limite_bases_premium"] ?? ""}
              onChange={set("limite_bases_premium")}
            />
          </Field>
          <Field label="Rubros / NCM (4 dígitos)">
            <Input
              type="number"
              value={form["limite_rubros"] ?? ""}
              onChange={set("limite_rubros")}
            />
          </Field>
          <Field label="Empresas">
            <Input
              type="number"
              value={form["limite_empresas"] ?? ""}
              onChange={set("limite_empresas")}
            />
          </Field>
          <Field label="Consultas por dia">
            <Input
              type="number"
              value={form["limite_consultas_dia"] ?? ""}
              onChange={set("limite_consultas_dia")}
            />
          </Field>
        </div>
        <div className="mt-5">
          <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
            Salvar limites
          </Button>
        </div>
      </section>
    </div>
  );
}
