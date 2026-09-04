import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock, Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { PublicSiteShell } from "@/components/site/PublicSiteShell";
import { useLandingI18n } from "@/lib/landing-i18n";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";
import { enviarContato } from "@/lib/contato.functions";

export const Route = createFileRoute("/contato")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Contato — Solutek Américas" },
      {
        name: "description",
        content:
          "Fale com a Solutek Américas. Envie sua mensagem e nossa equipe comercial responde em até 1 dia útil.",
      },
      { property: "og:title", content: "Contato — Solutek Américas" },
      {
        property: "og:description",
        content: "Fale com a Solutek Américas. Resposta em até 1 dia útil.",
      },
      { property: "og:url", content: "https://sltkamericas.com/contato" },
    ],
    links: [{ rel: "canonical", href: "https://sltkamericas.com/contato" }],
  }),
  component: () => (
    <PublicSiteShell variant="solid">
      <ContatoPage />
    </PublicSiteShell>
  ),
});

function ContatoPage() {
  const { t } = useLandingI18n();
  return (
    <>
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 text-white">
        <div className="mx-auto max-w-[1200px] px-5 py-14 md:px-10 md:py-20">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-300">
            {t.contato.kicker}
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">
            {t.contato.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
            {t.contato.subtitle}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1200px] px-5 py-14 md:px-10 md:py-20">
        <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:gap-12">
          <ContactInfo />
          <ContactForm />
        </div>
      </section>
    </>
  );
}

function ContactInfo() {
  const { t } = useLandingI18n();
  const { settings } = useBrandSettingsOptional();
  const s = settings as
    | (typeof settings & {
        contact_address?: string | null;
        contact_phone?: string | null;
        contact_whatsapp?: string | null;
        contact_email?: string | null;
        contact_hours?: string | null;
      })
    | null;

  const address = s?.contact_address || t.footer.address;
  const phone = s?.contact_phone || t.footer.phone;
  const whatsapp = s?.contact_whatsapp || t.footer.whatsapp;
  const email = s?.contact_email || settings?.support_email || "contato@solutekgroup.com";
  const hours = s?.contact_hours || t.contato.hoursValue;

  const cards: { icon: typeof MapPin; label: string; value: string; href?: string }[] = [
    { icon: MapPin, label: t.footer.address.split(",")[0] || "Endereço", value: address },
    { icon: Phone, label: "Telefone", value: phone, href: `tel:${phone.replace(/\s|\(|\)|-/g, "")}` },
    {
      icon: MessageCircle,
      label: "WhatsApp",
      value: whatsapp,
      href: `https://wa.me/${whatsapp.replace(/\D/g, "")}`,
    },
    { icon: Mail, label: "E-mail", value: email, href: `mailto:${email}` },
    { icon: Clock, label: t.contato.hoursLabel, value: hours },
  ];

  return (
    <aside>
      <h2 className="text-lg font-semibold text-slate-900">{t.contato.infoTitle}</h2>
      <div className="mt-5 space-y-3">
        {cards.map((c) => {
          const inner = (
            <>
              <div className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-100">
                <c.icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {c.label}
                </div>
                <div className="mt-0.5 truncate text-sm text-slate-800">{c.value}</div>
              </div>
            </>
          );
          const cls =
            "flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm";
          return c.href ? (
            <a
              key={c.label}
              href={c.href}
              target={c.href.startsWith("http") ? "_blank" : undefined}
              rel="noreferrer"
              className={cls}
            >
              {inner}
            </a>
          ) : (
            <div key={c.label} className={cls}>
              {inner}
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function ContactForm() {
  const { t } = useLandingI18n();
  const enviar = useServerFn(enviarContato);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [aceite, setAceite] = useState(false);
  const [website, setWebsite] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!aceite) {
      toast.error(t.contato.errorAceite);
      return;
    }
    setEnviando(true);
    try {
      await enviar({
        data: {
          nome,
          email,
          telefone: telefone || null,
          assunto: assunto || null,
          mensagem,
          aceite: true,
          website,
        },
      });
      setSucesso(true);
      toast.success(t.contato.successTitle);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t.contato.errorGeneric);
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm">
        <h2 className="text-2xl font-semibold text-emerald-700">{t.contato.successTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{t.contato.successBody}</p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => {
            setNome("");
            setEmail("");
            setTelefone("");
            setAssunto("");
            setMensagem("");
            setAceite(false);
            setSucesso(false);
          }}
        >
          {t.contato.another}
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8"
    >
      <h2 className="text-xl font-semibold text-slate-900">{t.contato.formTitle}</h2>
      <p className="mt-1 text-sm text-slate-600">{t.contato.formSubtitle}</p>

      {/* Honeypot */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <Label htmlFor="c-nome">{t.contato.nome} *</Label>
          <Input
            id="c-nome"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            required
            maxLength={120}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="c-email">{t.contato.email} *</Label>
          <Input
            id="c-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={255}
          />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Label htmlFor="c-tel">
            {t.contato.telefone} <span className="text-slate-400">{t.contato.telefoneOpt}</span>
          </Label>
          <Input
            id="c-tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            maxLength={40}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="c-assunto">{t.contato.assunto}</Label>
          <Input
            id="c-assunto"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            maxLength={200}
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="c-msg">{t.contato.mensagem} *</Label>
          <Textarea
            id="c-msg"
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            required
            minLength={5}
            maxLength={4000}
            rows={6}
            placeholder={t.contato.mensagemPh}
          />
        </div>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-slate-600">
        <Checkbox
          checked={aceite}
          onCheckedChange={(v) => setAceite(v === true)}
          className="mt-0.5"
        />
        <span>{t.contato.aceite}</span>
      </label>

      <div className="mt-5 flex justify-end">
        <Button type="submit" disabled={enviando || !aceite} size="lg">
          <Send className="mr-2 h-4 w-4" />
          {enviando ? t.contato.sending : t.contato.submit}
        </Button>
      </div>
    </form>
  );
}
