import { type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Phone, MessageCircle } from "lucide-react";
import { LandingI18nProvider, useLandingI18n, type Lang } from "@/lib/landing-i18n";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";

/* ==============================================================
   Support-specific translations (pt/en/es)
   ============================================================== */

export type SuporteDict = {
  brand: string;
  nav: { site: string; access: string };
  hero: {
    kicker: string;
    title: string;
    subtitle: string;
  };
  form: {
    title: string;
    subtitle: string;
    nome: string;
    email: string;
    telefone: string;
    telefoneOpt: string;
    serie: string;
    assunto: string;
    assuntoOpt: string;
    descricao: string;
    descricaoPh: string;
    aceite: string;
    submit: string;
    submitting: string;
    haveCode: string;
  };
  consulta: {
    title: string;
    subtitle: string;
    codigo: string;
    codigoPh: string;
    email: string;
    verificar: string;
    verificando: string;
    localizado: string;
    statusLabel: string;
    newTicket: string;
  };
  success: {
    title: string;
    subtitle: string;
    ref: string;
    keep: string;
    open: string;
    another: string;
  };
  chat: {
    ticket: string;
    subject: string;
    serial: string;
    openedAt: string;
    placeholder: string;
    send: string;
    sending: string;
    resolve: string;
    reopen: string;
    closedNotice: string;
    notFoundTitle: string;
    notFoundBody: string;
    backToConsult: string;
    openNew: string;
    loading: string;
  };
  errors: {
    aceite: string;
    generic: string;
  };
  footer: {
    tagline: string;
    rights: string;
  };
  tabs: { new: string; consult: string };
};

const DICT: Record<Lang, SuporteDict> = {
  pt: {
    brand: "Solutek",
    nav: { site: "Voltar ao site", access: "Acessar sistema" },
    hero: {
      kicker: "CENTRAL DE SUPORTE TÉCNICO",
      title: "Abra um chamado com o time de pós-venda Solutek.",
      subtitle:
        "Registre uma ocorrência do seu equipamento em minutos. Nossa equipe responde por esta mesma página e mantém todo o histórico auditável do atendimento.",
    },
    form: {
      title: "Novo chamado",
      subtitle: "Informe o número de série e descreva a ocorrência.",
      nome: "Nome completo",
      email: "E-mail para contato",
      telefone: "Telefone",
      telefoneOpt: "(opcional)",
      serie: "Número de série do equipamento",
      assunto: "Assunto",
      assuntoOpt: "(opcional)",
      descricao: "Descrição da ocorrência",
      descricaoPh: "Descreva o comportamento, quando começou, mensagens de erro etc.",
      aceite:
        "Concordo em compartilhar os dados acima com a equipe de pós-venda para atendimento deste chamado. Um e-mail de confirmação será enviado.",
      submit: "Abrir chamado",
      submitting: "Enviando…",
      haveCode: "Já tenho um código de chamado",
    },
    consulta: {
      title: "Consultar chamado",
      subtitle:
        "Informe o código e o e-mail cadastrado. O link direto de conversa é enviado por e-mail.",
      codigo: "Código do chamado",
      codigoPh: "TCK-XXXX-1234",
      email: "E-mail cadastrado",
      verificar: "Verificar",
      verificando: "Verificando…",
      localizado: "Chamado localizado — status atual",
      statusLabel: "Verifique o e-mail cadastrado para receber o link de conversa.",
      newTicket: "Não tenho código — abrir novo",
    },
    success: {
      title: "Chamado registrado",
      subtitle:
        "Seu chamado foi aberto. Você receberá um e-mail com atualizações — as respostas continuam nesta página.",
      ref: "Código de referência",
      keep: "Guarde este código. Ele identifica seu chamado em e-mails e contatos.",
      open: "Abrir conversa do chamado",
      another: "Abrir outro chamado",
    },
    chat: {
      ticket: "Chamado",
      subject: "Suporte técnico",
      serial: "nº série",
      openedAt: "Aberto em",
      placeholder: "Digite sua mensagem…",
      send: "Enviar",
      sending: "Enviando…",
      resolve: "Marcar como resolvido",
      reopen: "Reabrir",
      closedNotice: "Este chamado está",
      notFoundTitle: "Chamado não encontrado",
      notFoundBody:
        "O link pode ter expirado ou está incorreto. Consulte pelo código ou abra um novo chamado.",
      backToConsult: "Consultar por código",
      openNew: "Abrir novo",
      loading: "Carregando…",
    },
    errors: {
      aceite: "Confirme o aceite para prosseguir.",
      generic: "Falha ao processar solicitação.",
    },
    footer: {
      tagline: "Engenharia de packaging e automação industrial para linhas que não podem parar.",
      rights: "Todos os direitos reservados.",
    },
    tabs: { new: "Abrir chamado", consult: "Consultar existente" },
  },
  en: {
    brand: "Solutek",
    nav: { site: "Back to site", access: "System login" },
    hero: {
      kicker: "TECHNICAL SUPPORT CENTER",
      title: "Open a ticket with Solutek's after-sales team.",
      subtitle:
        "Log an equipment issue in minutes. Our team replies on this same page and keeps a full auditable history of the service.",
    },
    form: {
      title: "New ticket",
      subtitle: "Enter the serial number and describe the issue.",
      nome: "Full name",
      email: "Contact e-mail",
      telefone: "Phone",
      telefoneOpt: "(optional)",
      serie: "Equipment serial number",
      assunto: "Subject",
      assuntoOpt: "(optional)",
      descricao: "Issue description",
      descricaoPh: "Describe the behavior, when it started, error messages, etc.",
      aceite:
        "I agree to share the data above with the after-sales team to handle this ticket. A confirmation e-mail will be sent.",
      submit: "Open ticket",
      submitting: "Sending…",
      haveCode: "I already have a ticket code",
    },
    consulta: {
      title: "Look up a ticket",
      subtitle:
        "Enter the ticket code and the registered e-mail. The direct conversation link is sent by e-mail.",
      codigo: "Ticket code",
      codigoPh: "TCK-XXXX-1234",
      email: "Registered e-mail",
      verificar: "Verify",
      verificando: "Verifying…",
      localizado: "Ticket found — current status",
      statusLabel: "Check the registered inbox for the conversation link.",
      newTicket: "No code — open a new ticket",
    },
    success: {
      title: "Ticket registered",
      subtitle:
        "Your ticket is open. You will receive an e-mail with updates — replies continue on this page.",
      ref: "Reference code",
      keep: "Keep this code. It identifies your ticket in e-mails and contacts.",
      open: "Open ticket conversation",
      another: "Open another ticket",
    },
    chat: {
      ticket: "Ticket",
      subject: "Technical support",
      serial: "serial",
      openedAt: "Opened on",
      placeholder: "Type your message…",
      send: "Send",
      sending: "Sending…",
      resolve: "Mark as resolved",
      reopen: "Reopen",
      closedNotice: "This ticket is",
      notFoundTitle: "Ticket not found",
      notFoundBody:
        "The link may have expired or is incorrect. Look up by code or open a new ticket.",
      backToConsult: "Look up by code",
      openNew: "Open new",
      loading: "Loading…",
    },
    errors: {
      aceite: "Please accept the terms to proceed.",
      generic: "Request failed.",
    },
    footer: {
      tagline: "Packaging engineering and industrial automation for lines that cannot stop.",
      rights: "All rights reserved.",
    },
    tabs: { new: "Open ticket", consult: "Look up existing" },
  },
  es: {
    brand: "Solutek",
    nav: { site: "Volver al sitio", access: "Ingresar al sistema" },
    hero: {
      kicker: "CENTRAL DE SOPORTE TÉCNICO",
      title: "Abra un ticket con el equipo de postventa Solutek.",
      subtitle:
        "Registre una incidencia de su equipo en minutos. Nuestro equipo responde en esta misma página y conserva el historial auditable del servicio.",
    },
    form: {
      title: "Nuevo ticket",
      subtitle: "Ingrese el número de serie y describa la incidencia.",
      nome: "Nombre completo",
      email: "Correo de contacto",
      telefone: "Teléfono",
      telefoneOpt: "(opcional)",
      serie: "Número de serie del equipo",
      assunto: "Asunto",
      assuntoOpt: "(opcional)",
      descricao: "Descripción de la incidencia",
      descricaoPh: "Describa el comportamiento, cuándo comenzó, mensajes de error, etc.",
      aceite:
        "Acepto compartir los datos anteriores con el equipo de postventa para atender este ticket. Se enviará un correo de confirmación.",
      submit: "Abrir ticket",
      submitting: "Enviando…",
      haveCode: "Ya tengo un código de ticket",
    },
    consulta: {
      title: "Consultar ticket",
      subtitle:
        "Ingrese el código y el correo registrado. El enlace directo de conversación se envía por correo.",
      codigo: "Código del ticket",
      codigoPh: "TCK-XXXX-1234",
      email: "Correo registrado",
      verificar: "Verificar",
      verificando: "Verificando…",
      localizado: "Ticket localizado — estado actual",
      statusLabel: "Revise el correo registrado para recibir el enlace de conversación.",
      newTicket: "No tengo código — abrir nuevo",
    },
    success: {
      title: "Ticket registrado",
      subtitle:
        "Su ticket fue abierto. Recibirá un correo con actualizaciones — las respuestas continúan en esta página.",
      ref: "Código de referencia",
      keep: "Guarde este código. Identifica su ticket en correos y contactos.",
      open: "Abrir conversación del ticket",
      another: "Abrir otro ticket",
    },
    chat: {
      ticket: "Ticket",
      subject: "Soporte técnico",
      serial: "n.º de serie",
      openedAt: "Abierto el",
      placeholder: "Escriba su mensaje…",
      send: "Enviar",
      sending: "Enviando…",
      resolve: "Marcar como resuelto",
      reopen: "Reabrir",
      closedNotice: "Este ticket está",
      notFoundTitle: "Ticket no encontrado",
      notFoundBody:
        "El enlace puede haber expirado o es incorrecto. Consulte por código o abra un nuevo ticket.",
      backToConsult: "Consultar por código",
      openNew: "Abrir nuevo",
      loading: "Cargando…",
    },
    errors: {
      aceite: "Confirme la aceptación para continuar.",
      generic: "Fallo al procesar la solicitud.",
    },
    footer: {
      tagline:
        "Ingeniería de packaging y automatización industrial para líneas que no pueden parar.",
      rights: "Todos los derechos reservados.",
    },
    tabs: { new: "Abrir ticket", consult: "Consultar existente" },
  },
};

export function useSuporteT() {
  const { lang } = useLandingI18n();
  return { t: DICT[lang], lang };
}

/* ==============================================================
   Shell
   ============================================================== */

function LanguageSwitcher() {
  const { lang, setLang } = useLandingI18n();
  const langs: { code: Lang; flag: string; label: string }[] = [
    { code: "pt", flag: "br", label: "PT" },
    { code: "en", flag: "us", label: "EN" },
    { code: "es", flag: "es", label: "ES" },
  ];
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 p-0.5 ring-1 ring-slate-200">
      {langs.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-label={l.label}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
              active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <img
              src={`https://flagcdn.com/${l.flag}.svg`}
              alt={l.label}
              className="h-3.5 w-5 rounded-[2px] object-cover ring-1 ring-black/10"
            />
            <span>{l.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function ShellHeader() {
  const { t } = useSuporteT();
  const { settings } = useBrandSettingsOptional();
  const logo =
    settings?.logo_url ||
    settings?.logo_url_dark ||
    settings?.logo_url_collapsed ||
    settings?.logo_url_collapsed_dark ||
    null;

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-5 md:h-20 md:px-8">
        <Link to="/" className="flex items-center gap-2">
          {logo ? (
            <img src={logo} alt={t.brand} className="h-10 w-auto md:h-12" />
          ) : (
            <span className="font-mono text-sm uppercase tracking-[0.32em] text-slate-900">
              {t.brand}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Link
            to="/"
            className="hidden text-[13px] font-medium text-slate-600 transition hover:text-slate-900 sm:inline"
          >
            {t.nav.site}
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-[12px] font-medium text-white transition hover:bg-slate-800"
          >
            {t.nav.access}
          </Link>
        </div>
      </div>
    </header>
  );
}

function ShellFooter() {
  const { t } = useSuporteT();
  const year = new Date().getFullYear();
  const { settings } = useBrandSettingsOptional();
  const logo =
    settings?.logo_url_dark ||
    settings?.logo_url ||
    settings?.logo_url_collapsed_dark ||
    settings?.logo_url_collapsed ||
    null;

  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-[1200px] px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr]">
          <div>
            {logo ? (
              <img src={logo} alt={t.brand} className="h-10 w-auto" />
            ) : (
              <span className="font-mono text-sm uppercase tracking-[0.32em] text-white">
                {t.brand}
              </span>
            )}
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-400">
              {t.footer.tagline}
            </p>
          </div>

          <div className="text-[13px] text-slate-400 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
              <span>Solutek Américas — Brasil</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 flex-none text-slate-500" />
              <span>+55 (47) 9635-0101</span>
            </div>
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 flex-none text-slate-500" />
              <span>WhatsApp +55 (11) 99000-0000</span>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-[12px] text-slate-500 md:flex-row">
          <span>
            © {year} Solutek Américas. {t.footer.rights}
          </span>
          <Link to="/" className="transition hover:text-white">
            solutek.com.br →
          </Link>
        </div>
      </div>
    </footer>
  );
}

export function PublicSuporteShell({ children }: { children: ReactNode }) {
  return (
    <LandingI18nProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <ShellHeader />
        <main className="flex-1">{children}</main>
        <ShellFooter />
      </div>
    </LandingI18nProvider>
  );
}
