import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Headphones,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  X,
  Youtube,
} from "lucide-react";
import {
  LandingI18nProvider,
  useLandingI18n,
  type Lang,
} from "@/lib/landing-i18n";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";

type Variant = "overlay" | "solid";

/* =============== Language switcher =============== */

function LanguageSwitcher({ dark }: { dark: boolean }) {
  const { lang, setLang } = useLandingI18n();
  const langs: { code: Lang; flag: string; label: string }[] = [
    { code: "pt", flag: "br", label: "PT" },
    { code: "en", flag: "us", label: "EN" },
    { code: "es", flag: "es", label: "ES" },
  ];
  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-full p-0.5 ${
        dark ? "bg-white/10 ring-1 ring-inset ring-white/20" : "bg-slate-100 ring-1 ring-slate-200"
      }`}
    >
      {langs.map((l) => {
        const active = l.code === lang;
        return (
          <button
            key={l.code}
            onClick={() => setLang(l.code)}
            aria-label={l.label}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider transition ${
              active
                ? "bg-white text-slate-900 shadow-sm"
                : dark
                ? "text-white/80 hover:text-white"
                : "text-slate-500 hover:text-slate-900"
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

/* =============== Header =============== */

function Header({ variant }: { variant: Variant }) {
  const { t } = useLandingI18n();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { settings } = useBrandSettingsOptional();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isHome = pathname === "/";

  const overlay = variant === "overlay";
  // Solid header behaves like scrolled overlay
  const compact = !overlay || scrolled;

  const headerLogo = compact
    ? settings?.logo_url ||
      settings?.logo_url_dark ||
      settings?.logo_url_collapsed ||
      settings?.logo_url_collapsed_dark ||
      null
    : settings?.logo_url_dark ||
      settings?.logo_url ||
      settings?.logo_url_collapsed_dark ||
      settings?.logo_url_collapsed ||
      null;

  useEffect(() => {
    if (!overlay) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [overlay]);

  const hashes: { hash: string; label: string }[] = [
    { hash: "inicio", label: t.nav.home },
    { hash: "sobre", label: t.nav.about },
  ];


  return (
    <header
      className={`${
        overlay ? "fixed" : "sticky"
      } inset-x-0 top-0 z-50 transition-all duration-300 ${
        compact
          ? "border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-[0_1px_0_rgba(15,23,42,0.04)]"
          : "border-b border-white/10 bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-5 md:h-20 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          {headerLogo ? (
            <img
              src={headerLogo}
              alt="Solutek"
              className="h-12 w-auto transition md:h-14"
            />
          ) : (
            <span
              className={`font-mono text-sm uppercase tracking-[0.32em] ${
                compact ? "text-slate-900" : "text-white"
              }`}
            >
              Solutek
            </span>
          )}
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {hashes.map((n) => {
            const href = isHome ? `#${n.hash}` : `/#${n.hash}`;
            return (
              <a
                key={n.hash}
                href={href}
                className={`inline-flex w-[110px] justify-center text-[13.5px] font-medium tracking-tight transition ${
                  compact ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"
                }`}
              >
                {n.label}
              </a>
            );
          })}
          <div className="group relative">
            <button
              type="button"
              className={`inline-flex w-[110px] justify-center text-[13.5px] font-medium tracking-tight transition ${
                compact ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"
              }`}
            >
              Soluções
            </button>
            <div className="invisible absolute left-0 top-full z-50 w-[280px] pt-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                <Link to="/solucoes/projetos-industriais-automacao" className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                  <div className="font-semibold text-slate-900">Projetos & Automação</div>
                  <div className="text-xs text-slate-500">Linhas turn-key e integração</div>
                </Link>
                <Link to="/solucoes/tecnologia-de-processos" className="block border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                  <div className="font-semibold text-slate-900">Tecnologia de Processos</div>
                  <div className="text-xs text-slate-500">Flowpack, envase, codificação</div>
                </Link>
                <Link to="/solucoes/consultoria-implementacao" className="block border-t border-slate-100 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50">
                  <div className="font-semibold text-slate-900">Consultoria & Implementação</div>
                  <div className="text-xs text-slate-500">Diagnóstico OEE e roadmap 4.0</div>
                </Link>
              </div>
            </div>
          </div>
          <Link
            to="/equipamentos"
            className={`inline-flex w-[110px] justify-center text-[13.5px] font-medium tracking-tight transition ${
              compact ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"
            }`}
          >
            {t.nav.equipment}
          </Link>
          <Link
            to="/contato"
            className={`inline-flex w-[110px] justify-center text-[13.5px] font-medium tracking-tight transition ${
              compact ? "text-slate-600 hover:text-slate-900" : "text-white/80 hover:text-white"
            }`}
          >
            {t.nav.contact}
          </Link>

        </nav>


        <div className="flex items-center gap-2">
          <div className="hidden md:inline-flex">
            <LanguageSwitcher dark={!compact} />
          </div>
          <Link
            to="/login"
            className={`hidden w-[180px] items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-medium transition md:inline-flex ${
              compact
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-white/10 text-white ring-1 ring-inset ring-white/20 backdrop-blur hover:bg-white/20"
            }`}
          >
            <span className="truncate">{t.nav.access}</span>
            <ArrowUpRight className="h-3.5 w-3.5 flex-none" />
          </Link>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className={`inline-flex h-10 w-10 items-center justify-center rounded-md lg:hidden ${
              compact ? "text-slate-900" : "text-white"
            }`}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white lg:hidden">
          <nav className="flex flex-col px-5 py-3">
            {hashes.map((n) => {
              const href = isHome ? `#${n.hash}` : `/#${n.hash}`;
              return (
                <a
                  key={n.hash}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="py-2.5 text-sm font-medium text-slate-700"
                >
                  {n.label}
                </a>
              );
            })}
            <div className="mt-1 border-t border-slate-100 pt-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Soluções</div>
            <Link to="/solucoes/projetos-industriais-automacao" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-slate-700">Projetos & Automação</Link>
            <Link to="/solucoes/tecnologia-de-processos" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-slate-700">Tecnologia de Processos</Link>
            <Link to="/solucoes/consultoria-implementacao" onClick={() => setOpen(false)} className="py-2 text-sm font-medium text-slate-700">Consultoria & Implementação</Link>
            <Link
              to="/equipamentos"
              onClick={() => setOpen(false)}
              className="mt-1 border-t border-slate-100 pt-3 py-2.5 text-sm font-medium text-slate-700"
            >
              {t.nav.equipment}
            </Link>
            <Link
              to="/contato"
              onClick={() => setOpen(false)}
              className="py-2.5 text-sm font-medium text-slate-700"
            >
              {t.nav.contact}
            </Link>


            <div className="my-2">
              <LanguageSwitcher dark={false} />
            </div>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
            >
              {t.nav.access}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

/* =============== Footer =============== */

function Footer() {
  const { t } = useLandingI18n();
  const year = new Date().getFullYear();
  const { settings } = useBrandSettingsOptional();
  const s = settings as
    | (typeof settings & {
        contact_address?: string | null;
        contact_phone?: string | null;
        contact_whatsapp?: string | null;
        social_instagram?: string | null;
        social_linkedin?: string | null;
        social_youtube?: string | null;
      })
    | null;
  const footerLogo =
    settings?.logo_url_dark ||
    settings?.logo_url ||
    settings?.logo_url_collapsed_dark ||
    settings?.logo_url_collapsed ||
    null;

  const address = s?.contact_address || t.footer.address;
  const phone = s?.contact_phone || t.footer.phone;
  const whatsapp = s?.contact_whatsapp || t.footer.whatsapp;
  const instagram = s?.social_instagram || "#";
  const linkedin = s?.social_linkedin || "#";
  const youtube = s?.social_youtube || "#";
  const supportEmail = settings?.support_email
    ? `mailto:${settings.support_email}`
    : "#";

  const socials: { icon: typeof Instagram; href: string }[] = [
    { icon: Instagram, href: instagram },
    { icon: Linkedin, href: linkedin },
    { icon: Youtube, href: youtube },
    { icon: Mail, href: supportEmail },
  ];

  return (
    <footer className="bg-slate-950 text-slate-300">
      <div className="mx-auto max-w-[1280px] px-5 py-16 md:px-10 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            {footerLogo ? (
              <img src={footerLogo} alt="Solutek" className="h-12 w-auto" />
            ) : (
              <span className="font-mono text-sm uppercase tracking-[0.32em] text-white">
                Solutek
              </span>
            )}
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-slate-400">{t.footer.tagline}</p>
            <div className="mt-6 space-y-2 text-[13px] text-slate-400">
              <div className="flex items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-none text-slate-500" />
                <span>{address}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 flex-none text-slate-500" />
                <span>{phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 flex-none text-slate-500" />
                <span>WhatsApp: {whatsapp}</span>
              </div>
            </div>
          </div>

          {t.footer.columns.map((col) => (
            <div key={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => {
                  const cls = "text-sm text-slate-400 transition hover:text-white";
                  const isInternal = l.href.startsWith("/") && !l.href.startsWith("/#");
                  return (
                    <li key={l.label}>
                      {isInternal ? (
                        <Link to={l.href} className={cls}>{l.label}</Link>
                      ) : (
                        <a href={l.href} className={cls}>{l.label}</a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
              {t.footer.social}
            </h4>
            <div className="mt-4 flex items-center gap-2">
              {socials.map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
            <div className="mt-8 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>ISO · CE · NR-12</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <Headphones className="h-3.5 w-3.5" />
              <span>Suporte 24/7</span>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-[12px] text-slate-500 md:flex-row">
          <span>© {year} Solutek Américas. {t.footer.rights}</span>
          <Link to="/login" className="transition hover:text-white">
            {t.nav.access} →
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* =============== Shell =============== */

export function PublicSiteShell({
  children,
  variant = "solid",
}: {
  children: ReactNode;
  variant?: Variant;
}) {
  return (
    <LandingI18nProvider>
      <div className="min-h-screen flex flex-col bg-white text-slate-900 antialiased [font-feature-settings:'ss01','cv11']">
        <Header variant={variant} />
        <main className={`flex-1 ${variant === "solid" ? "" : ""}`}>{children}</main>
        <Footer />
      </div>
    </LandingI18nProvider>
  );
}
