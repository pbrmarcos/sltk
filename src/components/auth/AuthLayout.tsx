import { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Factory, Globe2, Wrench } from "lucide-react";
import { useBrandSettingsOptional } from "@/hooks/use-brand-settings";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, children }: AuthLayoutProps) {
  const { settings } = useBrandSettingsOptional();
  const darkPanelLogo =
    settings?.logo_url_dark ||
    settings?.logo_url ||
    settings?.logo_url_collapsed_dark ||
    settings?.logo_url_collapsed ||
    null;
  const lightPanelLogo =
    settings?.logo_url ||
    settings?.logo_url_dark ||
    settings?.logo_url_collapsed ||
    settings?.logo_url_collapsed_dark ||
    null;
  const wordmark = (
    <span className="font-mono text-sm uppercase tracking-[0.32em] text-white/85">
      SLTK Americas
    </span>
  );
  const wordmarkLight = (
    <span
      className="font-mono text-sm uppercase tracking-[0.32em]"
      style={{ color: "var(--color-text-primary)" }}
    >
      SLTK Americas
    </span>
  );
  return (
    <div
      className="relative min-h-screen w-full lg:grid lg:grid-cols-[1.05fr_1fr] xl:grid-cols-[1.15fr_1fr]"
      style={{ background: "var(--color-bg-base)", color: "var(--color-text-primary)" }}
    >
      {/* ============ Brand panel ============ */}
      <div
        className="relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14"
        style={{
          background: "#0A0B12",
          color: "#fff",
        }}
      >
        {/* mesh gradient backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 60% at 15% 10%, rgba(63,74,151,0.55) 0%, transparent 60%), radial-gradient(50% 50% at 85% 0%, rgba(59,130,246,0.35) 0%, transparent 60%), radial-gradient(70% 70% at 90% 95%, rgba(124,138,224,0.30) 0%, transparent 60%), radial-gradient(45% 45% at 0% 100%, rgba(52,49,96,0.65) 0%, transparent 60%)",
          }}
        />
        {/* noise / grain via SVG */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
        {/* subtle grid */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage:
              "radial-gradient(ellipse 80% 60% at 50% 40%, black 30%, transparent 80%)",
          }}
        />

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex h-28 w-72 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] px-2.5 backdrop-blur-sm transition hover:bg-white/[0.08]">
              {darkPanelLogo ? (
                <img src={darkPanelLogo} alt="SLTK Americas" className="h-full w-full object-contain" />
              ) : (
                wordmark
              )}
            </Link>
          </div>
          <a
            href="https://sltkamericas.com"
            target="_blank"
            rel="noreferrer"
            className="group hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs text-white/70 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06] hover:text-white xl:inline-flex"
          >
            sltkamericas.com
            <ArrowUpRight className="h-3 w-3 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </div>

        {/* Headline */}
        <div className="relative z-10 max-w-xl space-y-10">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-white/65 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              Engenharia industrial
            </span>
            <h2 className="text-[2.6rem] font-semibold leading-[1.05] tracking-tight xl:text-[3.25rem]">
              Soluções industriais<br />
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #ffffff 0%, #cbd5ff 55%, #7c8ae0 100%)",
                }}
              >
                que movem as Américas.
              </span>
            </h2>
            <p className="max-w-md text-[15px] leading-relaxed text-white/65">
              A SLTK Americas projeta, fabrica e mantém equipamentos industriais
              de alta performance — do comercial à assistência técnica em campo,
              com presença em toda a América Latina.
            </p>
          </div>

          {/* Pillars grid */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Factory, k: "Fabricação", l: "Engenharia própria" },
              { icon: Wrench, k: "SAT", l: "Assistência em campo" },
              { icon: Globe2, k: "Américas", l: "Cobertura regional" },
            ].map(({ icon: Icon, k, l }) => (
              <div
                key={l}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/[0.06]"
              >
                <Icon className="mb-3 h-4 w-4 text-white/60" strokeWidth={1.75} />
                <div className="text-base font-semibold tracking-tight">{k}</div>
                <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                  {l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
          <span>© {new Date().getFullYear()} SLTK Americas</span>
          <span className="flex items-center gap-2">
            <span className="h-1 w-1 rounded-full bg-emerald-400" />
            Operação ativa
          </span>
        </div>
      </div>

      {/* ============ Form panel ============ */}
      <div className="relative flex min-h-screen flex-col px-5 py-8 sm:px-10 sm:py-10 lg:min-h-0 lg:px-12 lg:py-10 xl:px-14 xl:py-14">
        {/* Mobile/tablet ambient gradient */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 lg:hidden"
          style={{
            background:
              "radial-gradient(80% 100% at 50% 0%, color-mix(in oklab, var(--color-brand-blue) 22%, transparent) 0%, transparent 70%)",
          }}
        />

        {/* Mobile/tablet header */}
        <div className="mb-10 flex items-center justify-between lg:hidden">
          <Link to="/" className="flex h-24 w-64 items-center justify-center transition hover:opacity-80">
            {lightPanelLogo ? (
              <img src={lightPanelLogo} alt="SLTK Americas" className="h-full w-full object-contain" />
            ) : (
              wordmarkLight
            )}
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[420px]">
            <div className="mb-9 space-y-2">
              <h1 className="text-[2rem] font-semibold leading-tight tracking-tight sm:text-[2.25rem]">
                {title}
              </h1>
              <p
                className="text-[15px] leading-relaxed"
                style={{ color: "var(--color-text-secondary)" }}
              >
                {subtitle}
              </p>
            </div>
            {children}
          </div>
        </div>

        <div
          className="mt-10 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.22em]"
          style={{ color: "var(--color-text-muted)" }}
        >
          <span>Área restrita · colaboradores SLTK</span>
          <a
            href="https://sltkamericas.com"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            sltkamericas.com ↗
          </a>
        </div>
      </div>
    </div>
  );
}