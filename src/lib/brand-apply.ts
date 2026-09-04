/**
 * DOM side-effects para aplicar brand_settings em runtime.
 * Idempotente — pode ser chamado várias vezes.
 */

export type BrandApplyInput = {
  system_name?: string | null;
  primary_color?: string | null;
  favicon_url?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  allow_indexing?: boolean | null;
  canonical_base_url?: string | null;
  default_theme?: "light" | "dark" | "system" | null;
};

const THEME_USER_KEY = "sltk:theme-user-choice";

function setMeta(selector: string, attr: string, value: string, create: () => HTMLElement) {
  let el = document.head.querySelector<HTMLElement>(selector);
  if (!el) {
    el = create();
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
}

function removeMeta(selector: string) {
  const el = document.head.querySelector(selector);
  if (el) el.remove();
}

export function applyBrand(s: BrandApplyInput) {
  if (typeof document === "undefined") return;

  // Primary color (hex aceito direto pela var --primary deste projeto)
  if (s.primary_color) {
    document.documentElement.style.setProperty("--primary", s.primary_color);
    document.documentElement.style.setProperty("--ring", s.primary_color);
    document.documentElement.style.setProperty("--info", s.primary_color);
  }

  // Title base
  if (s.meta_title || s.system_name) {
    document.title = s.meta_title || s.system_name || document.title;
  }

  // Favicon — sobrescreve TODAS as variantes de ícone declaradas no head
  if (s.favicon_url) {
    const iconLinks = document.head.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
    );
    if (iconLinks.length === 0) {
      const el = document.createElement("link");
      el.setAttribute("rel", "icon");
      el.setAttribute("href", s.favicon_url);
      document.head.appendChild(el);
    } else {
      iconLinks.forEach((el) => el.setAttribute("href", s.favicon_url!));
    }
    // og:image / twitter:image também passam a usar o favicon da marca
    setMeta('meta[property="og:image"]', "content", s.favicon_url, () => {
      const el = document.createElement("meta");
      el.setAttribute("property", "og:image");
      return el;
    });
    setMeta('meta[name="twitter:image"]', "content", s.favicon_url, () => {
      const el = document.createElement("meta");
      el.setAttribute("name", "twitter:image");
      return el;
    });
  }

  // Meta description
  if (s.meta_description) {
    setMeta('meta[name="description"]', "content", s.meta_description, () => {
      const el = document.createElement("meta");
      el.setAttribute("name", "description");
      return el;
    });
  }

  // Robots
  if (s.allow_indexing === false) {
    setMeta('meta[name="robots"]', "content", "noindex,nofollow", () => {
      const el = document.createElement("meta");
      el.setAttribute("name", "robots");
      return el;
    });
  } else {
    removeMeta('meta[name="robots"]');
  }

  // Canonical
  if (s.canonical_base_url) {
    const path = typeof window !== "undefined" ? window.location.pathname || "/" : "/";
    const base = s.canonical_base_url.replace(/\/+$/, "");
    const href = base + path;
    setMeta('link[rel="canonical"]', "href", href, () => {
      const el = document.createElement("link");
      el.setAttribute("rel", "canonical");
      return el;
    });
  } else {
    removeMeta('link[rel="canonical"]');
  }

  // Default theme — só aplica se o usuário não escolheu
  if (s.default_theme) {
    let userChoice: string | null = null;
    try {
      if (typeof localStorage !== "undefined") {
        userChoice = localStorage.getItem(THEME_USER_KEY);
      }
    } catch {
      /* ignore */
    }
    if (!userChoice) {
      const root = document.documentElement;
      // Light é o padrão do projeto. Só ativa dark quando explicitamente
      // configurado — "system" mantém light para não escurecer o app
      // automaticamente conforme o SO do usuário.
      root.classList.toggle("dark", s.default_theme === "dark");
    }
  }
}