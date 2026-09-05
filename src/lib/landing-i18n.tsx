import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "pt" | "en" | "es";

type Dict = {
  nav: {
    home: string;
    about: string;
    services: string;
    equipment: string;
    contact: string;
    access: string;
  };
  hero: {
    kicker: string;
    title1: string;
    title2: string;
    subtitle: string;
    ctaPrimary: string;
    ctaSecondary: string;
  };
  services: {
    kicker: string;
    title: string;
    subtitle: string;
    items: { title: string; desc: string }[];
    cta: string;
  };
  about: {
    kicker: string;
    title: string;
    body: string;
    bullets: string[];
  };
  clients: { kicker: string };
  stats: {
    kicker: string;
    title: string;
    items: { value: string; label: string; desc: string }[];
  };
  equipment: {
    kicker: string;
    title: string;
    items: { name: string; desc: string }[];
    cta: string;
    seeAll: string;
  };
  cta: { title: string; subtitle: string; primary: string; secondary: string };
  footer: {
    tagline: string;
    columns: { title: string; links: { label: string; href: string }[] }[];
    address: string;
    phone: string;
    whatsapp: string;
    social: string;
    rights: string;
  };
  contato: {
    kicker: string;
    title: string;
    subtitle: string;
    infoTitle: string;
    hoursLabel: string;
    hoursValue: string;
    formTitle: string;
    formSubtitle: string;
    nome: string;
    email: string;
    telefone: string;
    telefoneOpt: string;
    assunto: string;
    mensagem: string;
    mensagemPh: string;
    aceite: string;
    submit: string;
    sending: string;
    successTitle: string;
    successBody: string;
    another: string;
    errorAceite: string;
    errorGeneric: string;
  };
  solucao: {
    requestDiagnosis: string;
    viewEquipment: string;
    whatWeDeliverKicker: string;
    whatWeDeliverTitle: string;
    portfolioKicker: string;
    portfolioTitle: string;
    whyKicker: string;
    whyTitle: string;
    midCtaTitle: string;
    midCtaBody: string;
    midCtaPrimary: string;
    whatsapp: string;
    howKicker: string;
    howTitle: string;
    step: string;
    sectorsKicker: string;
    sectorsTitle: string;
    finalCtaTitle: string;
    finalCtaBody: string;
    finalCtaBtn: string;
    waMsgPrefix: string;
  };
};

const PT: Dict = {
  nav: {
    home: "Início",
    about: "Sobre",
    services: "Serviços",
    equipment: "Equipamentos",
    contact: "Contato",
    access: "Acessar sistema",
  },
  hero: {
    kicker: "SOLUTEK AMÉRICAS",
    title1: "Engenharia de packaging",
    title2: "para indústrias que não param.",
    subtitle:
      "Projetamos, fabricamos e implantamos linhas completas de embalagem e automação — do envase à paletização — em mais de 35 países.",
    ctaPrimary: "Solicitar cotação",
    ctaSecondary: "Ver equipamentos",
  },
  services: {
    kicker: "NOSSOS SERVIÇOS",
    title: "Soluções completas para impulsionar sua operação.",
    subtitle: "Da consultoria inicial ao SAT em campo, entregamos engenharia de ponta a ponta.",
    items: [
      {
        title: "Projetos Industriais & Automação",
        desc: "Desenhamos plantas inteligentes que integram máquinas, robótica e supervisão em uma arquitetura única.",
      },
      {
        title: "Tecnologia de Processos",
        desc: "Conhecemos a fundo cada etapa do seu produto — propomos melhorias mensuráveis em throughput e OEE.",
      },
      {
        title: "Consultoria & Implementação",
        desc: "Time multidisciplinar acompanha do FAT à partida em campo, garantindo ramp-up sem surpresas.",
      },
    ],
    cta: "Saiba mais",
  },
  about: {
    kicker: "QUEM SOMOS",
    title: "Uma equipe brasileira movida por tecnologia, inovação e resultado.",
    body: "Há mais de 15 anos a Solutek desenvolve linhas integradas para envase, agrupamento, paletização e movimentação de produtos industrializados. Atuamos lado a lado com indústrias de alimentos, bebidas, química e cosmética, fornecendo soluções chave-na-mão.",
    bullets: [
      "Envasadoras lineares e rotativas",
      "Agrupadoras e empacotadoras",
      "Despaletizadores e paletizadores",
      "Células de paletização robotizada",
      "Sistemas de inspeção e detecção de metais",
      "Transporte e movimentação de materiais",
    ],
  },
  clients: { kicker: "QUEM CONFIA NA SOLUTEK" },
  stats: {
    kicker: "POR QUE ESCOLHER A SOLUTEK?",
    title: "Inovação e resultados que transformam.",
    items: [
      {
        value: "15+",
        label: "Anos de expertise",
        desc: "Mais de uma década e meia entregando engenharia de packaging para o setor industrial.",
      },
      {
        value: "35+",
        label: "Países atendidos",
        desc: "Presença consolidada nas Américas, com suporte técnico em campo.",
      },
      {
        value: "100%",
        label: "Satisfação garantida",
        desc: "Comprometimento com SLA, ramp-up sem surpresas e pós-venda dedicado.",
      },
    ],
  },
  equipment: {
    kicker: "EQUIPAMENTOS",
    title: "Tecnologia que move sua linha.",
    items: [
      {
        name: "Empacotadora Vertical",
        desc: "VFFS BAG-LINE de alta performance para múltiplos formatos de embalagem flexível.",
      },
      {
        name: "Checkpeso",
        desc: "Inspeção dinâmica de peso e detecção integrada à sua linha de produção.",
      },
      {
        name: "Sacheteira",
        desc: "CombiFlex multi-pistas para sachês líquidos, pastosos e em pó com alta cadência.",
      },
      {
        name: "Envasadora Rotativa",
        desc: "Linha 100 FLEX para envase rotativo de líquidos, cremes e produtos viscosos com troca rápida de formato.",
      },
    ],
    cta: "Ver equipamento",
    seeAll: "Conhecer",
  },
  cta: {
    title: "Soluções que transformam a sua indústria.",
    subtitle: "Fale com um especialista e descubra o ganho real em produtividade.",
    primary: "Conversar agora",
    secondary: "Solicitar uma chamada",
  },
  footer: {
    tagline: "Engenharia de packaging para as Américas.",
    columns: [
      {
        title: "Empresa",
        links: [
          { label: "Sobre", href: "/#sobre" },
          { label: "Equipamentos", href: "/equipamentos" },
          { label: "Contato", href: "/contato" },
        ],
      },
      {
        title: "Soluções",
        links: [
          {
            label: "Projetos Industriais & Automação",
            href: "/solucoes/projetos-industriais-automacao",
          },
          { label: "Tecnologia de Processos", href: "/solucoes/tecnologia-de-processos" },
          { label: "Consultoria & Implementação", href: "/solucoes/consultoria-implementacao" },
        ],
      },
      {
        title: "Suporte",
        links: [
          { label: "Suporte Técnico", href: "/suporte" },
          { label: "Acessar sistema", href: "/login" },
        ],
      },
    ],
    address: "Av. Santa Catarina, 1207 — Santo Amaro, Joinville/SC",
    phone: "+55 (47) 9635-0101",
    whatsapp: "+55 (47) 9635-0101",
    social: "Redes sociais",
    rights: "Todos os direitos reservados.",
  },
  contato: {
    kicker: "FALE COM A GENTE",
    title: "Vamos conversar sobre o seu projeto.",
    subtitle:
      "Preencha o formulário e nossa equipe comercial responde em até 1 dia útil. Prefere falar agora? Use os canais ao lado.",
    infoTitle: "Canais diretos",
    hoursLabel: "Horário de atendimento",
    hoursValue: "Seg a Sex · 08h – 18h (BRT)",
    formTitle: "Envie sua mensagem",
    formSubtitle: "Nossa equipe retorna em até 1 dia útil.",
    nome: "Nome completo",
    email: "E-mail corporativo",
    telefone: "Telefone",
    telefoneOpt: "(opcional)",
    assunto: "Assunto",
    mensagem: "Mensagem",
    mensagemPh: "Conte-nos brevemente sobre o produto, cadência esperada e desafios da linha.",
    aceite: "Concordo em compartilhar meus dados com a equipe Solutek para retorno deste contato.",
    submit: "Enviar mensagem",
    sending: "Enviando…",
    successTitle: "Mensagem enviada",
    successBody:
      "Recebemos seu contato. Nossa equipe responderá em até 1 dia útil no e-mail informado.",
    another: "Enviar outra mensagem",
    errorAceite: "Confirme o aceite para prosseguir.",
    errorGeneric: "Falha ao enviar. Tente novamente em instantes.",
  },
  solucao: {
    requestDiagnosis: "Solicitar diagnóstico",
    viewEquipment: "Ver equipamentos",
    whatWeDeliverKicker: "O que entregamos",
    whatWeDeliverTitle: "Escopo técnico completo, executado por especialistas.",
    portfolioKicker: "Portfólio visual",
    portfolioTitle: "Projetos e equipamentos em operação.",
    whyKicker: "Por que Solutek",
    whyTitle: "Diferenciais que aceleram o retorno do investimento.",
    midCtaTitle: "Quer avaliar esta solução para o seu processo?",
    midCtaBody: "Fale com um engenheiro Solutek e receba um diagnóstico técnico gratuito.",
    midCtaPrimary: "Falar com um especialista",
    whatsapp: "WhatsApp",
    howKicker: "Como trabalhamos",
    howTitle: "Um processo previsível, do primeiro contato ao pós-venda.",
    step: "Passo",
    sectorsKicker: "Setores atendidos",
    sectorsTitle: "Experiência aplicada em cadeias produtivas exigentes.",
    finalCtaTitle: "Pronto para levar sua operação ao próximo nível?",
    finalCtaBody:
      "Fale com um engenheiro Solutek. Diagnóstico técnico gratuito e proposta em até 5 dias úteis.",
    finalCtaBtn: "Solicitar diagnóstico",
    waMsgPrefix: "Olá! Gostaria de falar sobre",
  },
};

const EN: Dict = {
  nav: {
    home: "Home",
    about: "About",
    services: "Services",
    equipment: "Equipment",
    contact: "Contact",
    access: "Sign in",
  },
  hero: {
    kicker: "SOLUTEK AMERICAS",
    title1: "Packaging engineering",
    title2: "for industries that never stop.",
    subtitle:
      "We design, build and deploy complete packaging and automation lines — from filling to palletizing — across more than 35 countries.",
    ctaPrimary: "Request a quote",
    ctaSecondary: "Browse equipment",
  },
  services: {
    kicker: "OUR SERVICES",
    title: "Complete solutions to boost your operation.",
    subtitle: "From the first consultation to on-site SAT, we deliver end-to-end engineering.",
    items: [
      {
        title: "Industrial Projects & Automation",
        desc: "Smart plants that integrate machines, robotics and SCADA into a single architecture.",
      },
      {
        title: "Process Technology",
        desc: "We understand every step of your product — measurable gains in throughput and OEE.",
      },
      {
        title: "Consulting & Implementation",
        desc: "A multidisciplinary team from FAT to commissioning, guaranteeing a smooth ramp-up.",
      },
    ],
    cta: "Learn more",
  },
  about: {
    kicker: "WHO WE ARE",
    title: "A Brazilian team driven by technology, innovation and results.",
    body: "For more than 15 years Solutek has developed integrated lines for filling, grouping, palletizing and material handling. We work shoulder to shoulder with food, beverage, chemical and cosmetics industries, delivering turn-key solutions.",
    bullets: [
      "Linear and rotary fillers",
      "Groupers and wrappers",
      "Depalletizers and palletizers",
      "Robotic palletizing cells",
      "Inspection and metal detection systems",
      "Material handling and conveyors",
    ],
  },
  clients: { kicker: "TRUSTED BY" },
  stats: {
    kicker: "WHY SOLUTEK?",
    title: "Innovation and results that transform.",
    items: [
      {
        value: "15+",
        label: "Years of expertise",
        desc: "Over a decade and a half delivering packaging engineering to industry.",
      },
      {
        value: "35+",
        label: "Countries served",
        desc: "Consolidated presence across the Americas with on-site support.",
      },
      {
        value: "100%",
        label: "Guaranteed satisfaction",
        desc: "SLA commitment, smooth ramp-up and dedicated after-sales.",
      },
    ],
  },
  equipment: {
    kicker: "EQUIPMENT",
    title: "Technology that powers your line.",
    items: [
      {
        name: "Vertical Wrapper",
        desc: "BAG-LINE VFFS for high-performance flexible packaging across multiple formats.",
      },
      {
        name: "Checkweigher",
        desc: "Dynamic weighing and detection integrated into your production line.",
      },
      {
        name: "Sachet Machine",
        desc: "Multi-lane CombiFlex for liquid, paste and powder sachets at high throughput.",
      },
      {
        name: "Rotary Filler",
        desc: "100 FLEX rotary filling line for liquids, creams and viscous products with fast format changeover.",
      },
    ],
    cta: "View equipment",
    seeAll: "Discover",
  },
  cta: {
    title: "Solutions that transform your industry.",
    subtitle: "Talk to a specialist and discover real productivity gains.",
    primary: "Talk to us",
    secondary: "Request a call",
  },
  footer: {
    tagline: "Packaging engineering for the Americas.",
    columns: [
      {
        title: "Company",
        links: [
          { label: "About", href: "/#sobre" },
          { label: "Equipment", href: "/equipamentos" },
          { label: "Contact", href: "/contato" },
        ],
      },
      {
        title: "Solutions",
        links: [
          {
            label: "Industrial Projects & Automation",
            href: "/solucoes/projetos-industriais-automacao",
          },
          { label: "Process Technology", href: "/solucoes/tecnologia-de-processos" },
          { label: "Consulting & Implementation", href: "/solucoes/consultoria-implementacao" },
        ],
      },
      {
        title: "Support",
        links: [
          { label: "Technical Support", href: "/suporte" },
          { label: "Sign in", href: "/login" },
        ],
      },
    ],
    address: "Av. Santa Catarina, 1207 — Santo Amaro, Joinville/SC, Brazil",
    phone: "+55 (47) 9635-0101",
    whatsapp: "+55 (47) 9635-0101",
    social: "Social",
    rights: "All rights reserved.",
  },
  contato: {
    kicker: "GET IN TOUCH",
    title: "Let's talk about your project.",
    subtitle:
      "Fill out the form and our team responds within 1 business day. Prefer to talk now? Use the channels on the side.",
    infoTitle: "Direct channels",
    hoursLabel: "Business hours",
    hoursValue: "Mon–Fri · 8am – 6pm (BRT)",
    formTitle: "Send us a message",
    formSubtitle: "Our team replies within 1 business day.",
    nome: "Full name",
    email: "Business e-mail",
    telefone: "Phone",
    telefoneOpt: "(optional)",
    assunto: "Subject",
    mensagem: "Message",
    mensagemPh: "Tell us briefly about the product, expected throughput and line challenges.",
    aceite: "I agree to share my data with the Solutek team to reply to this contact.",
    submit: "Send message",
    sending: "Sending…",
    successTitle: "Message sent",
    successBody:
      "We received your message. Our team will reply within 1 business day at the e-mail provided.",
    another: "Send another message",
    errorAceite: "Please accept the terms to continue.",
    errorGeneric: "Failed to send. Please try again shortly.",
  },
  solucao: {
    requestDiagnosis: "Request diagnosis",
    viewEquipment: "Browse equipment",
    whatWeDeliverKicker: "What we deliver",
    whatWeDeliverTitle: "Full technical scope, executed by specialists.",
    portfolioKicker: "Visual portfolio",
    portfolioTitle: "Projects and equipment in operation.",
    whyKicker: "Why Solutek",
    whyTitle: "Differentiators that accelerate ROI.",
    midCtaTitle: "Want to evaluate this solution for your process?",
    midCtaBody: "Talk to a Solutek engineer and get a free technical diagnosis.",
    midCtaPrimary: "Talk to a specialist",
    whatsapp: "WhatsApp",
    howKicker: "How we work",
    howTitle: "A predictable process, from first contact to after-sales.",
    step: "Step",
    sectorsKicker: "Sectors we serve",
    sectorsTitle: "Applied expertise in demanding production chains.",
    finalCtaTitle: "Ready to take your operation to the next level?",
    finalCtaBody:
      "Talk to a Solutek engineer. Free technical diagnosis and proposal within 5 business days.",
    finalCtaBtn: "Request diagnosis",
    waMsgPrefix: "Hi! I'd like to talk about",
  },
};

const ES: Dict = {
  nav: {
    home: "Inicio",
    about: "Nosotros",
    services: "Servicios",
    equipment: "Equipos",
    contact: "Contacto",
    access: "Acceder",
  },
  hero: {
    kicker: "SOLUTEK AMÉRICAS",
    title1: "Ingeniería de packaging",
    title2: "para industrias que no se detienen.",
    subtitle:
      "Diseñamos, fabricamos e implementamos líneas completas de envasado y automatización — del llenado a la paletización — en más de 35 países.",
    ctaPrimary: "Solicitar cotización",
    ctaSecondary: "Ver equipos",
  },
  services: {
    kicker: "NUESTROS SERVICIOS",
    title: "Soluciones completas para impulsar tu operación.",
    subtitle: "Desde la consultoría inicial hasta el SAT en campo, entregamos ingeniería integral.",
    items: [
      {
        title: "Proyectos Industriales y Automatización",
        desc: "Plantas inteligentes que integran máquinas, robótica y supervisión en una sola arquitectura.",
      },
      {
        title: "Tecnología de Procesos",
        desc: "Conocemos cada etapa de tu producto — mejoras medibles en throughput y OEE.",
      },
      {
        title: "Consultoría e Implementación",
        desc: "Equipo multidisciplinario del FAT a la puesta en marcha, garantizando un ramp-up sin sorpresas.",
      },
    ],
    cta: "Saber más",
  },
  about: {
    kicker: "QUIÉNES SOMOS",
    title: "Un equipo brasileño movido por tecnología, innovación y resultados.",
    body: "Hace más de 15 años Solutek desarrolla líneas integradas de envasado, agrupado, paletizado y movimiento de productos industriales. Trabajamos junto a industrias de alimentos, bebidas, química y cosmética, entregando soluciones llave en mano.",
    bullets: [
      "Envasadoras lineales y rotativas",
      "Agrupadoras y envolvedoras",
      "Despaletizadores y paletizadores",
      "Células de paletizado robotizado",
      "Sistemas de inspección y detección de metales",
      "Transporte y movimiento de materiales",
    ],
  },
  clients: { kicker: "CONFÍAN EN NOSOTROS" },
  stats: {
    kicker: "¿POR QUÉ SOLUTEK?",
    title: "Innovación y resultados que transforman.",
    items: [
      {
        value: "15+",
        label: "Años de experiencia",
        desc: "Más de una década entregando ingeniería de packaging al sector industrial.",
      },
      {
        value: "35+",
        label: "Países atendidos",
        desc: "Presencia consolidada en las Américas con soporte técnico en sitio.",
      },
      {
        value: "100%",
        label: "Satisfacción garantizada",
        desc: "Compromiso con SLA, ramp-up sin sorpresas y posventa dedicado.",
      },
    ],
  },
  equipment: {
    kicker: "EQUIPOS",
    title: "Tecnología que mueve tu línea.",
    items: [
      {
        name: "Envasadora Vertical",
        desc: "VFFS BAG-LINE de alto rendimiento para múltiples formatos de envase flexible.",
      },
      {
        name: "Checkweigher",
        desc: "Pesaje dinámico y detección integrados a tu línea de producción.",
      },
      {
        name: "Sachetadora",
        desc: "CombiFlex multi-pista para sachets líquidos, pastosos y en polvo con alta cadencia.",
      },
      {
        name: "Llenadora Rotativa",
        desc: "Línea 100 FLEX para llenado rotativo de líquidos, cremas y productos viscosos con cambio rápido de formato.",
      },
    ],
    cta: "Ver equipo",
    seeAll: "Conocer",
  },
  cta: {
    title: "Soluciones que transforman tu industria.",
    subtitle: "Habla con un especialista y descubre la ganancia real en productividad.",
    primary: "Hablar ahora",
    secondary: "Solicitar una llamada",
  },
  footer: {
    tagline: "Ingeniería de packaging para las Américas.",
    columns: [
      {
        title: "Empresa",
        links: [
          { label: "Nosotros", href: "/#sobre" },
          { label: "Equipos", href: "/equipamentos" },
          { label: "Contacto", href: "/contato" },
        ],
      },
      {
        title: "Soluciones",
        links: [
          {
            label: "Proyectos Industriales y Automatización",
            href: "/solucoes/projetos-industriais-automacao",
          },
          { label: "Tecnología de Procesos", href: "/solucoes/tecnologia-de-processos" },
          { label: "Consultoría e Implementación", href: "/solucoes/consultoria-implementacao" },
        ],
      },
      {
        title: "Soporte",
        links: [
          { label: "Soporte Técnico", href: "/suporte" },
          { label: "Acceder", href: "/login" },
        ],
      },
    ],
    address: "Av. Santa Catarina, 1207 — Santo Amaro, Joinville/SC, Brasil",
    phone: "+55 (47) 9635-0101",
    whatsapp: "+55 (47) 9635-0101",
    social: "Redes sociales",
    rights: "Todos los derechos reservados.",
  },
  contato: {
    kicker: "HABLA CON NOSOTROS",
    title: "Conversemos sobre tu proyecto.",
    subtitle:
      "Completa el formulario y nuestro equipo responde en 1 día hábil. ¿Prefieres hablar ahora? Usa los canales al costado.",
    infoTitle: "Canales directos",
    hoursLabel: "Horario de atención",
    hoursValue: "Lun a Vie · 8h – 18h (BRT)",
    formTitle: "Envía tu mensaje",
    formSubtitle: "Nuestro equipo responde en 1 día hábil.",
    nome: "Nombre completo",
    email: "Correo corporativo",
    telefone: "Teléfono",
    telefoneOpt: "(opcional)",
    assunto: "Asunto",
    mensagem: "Mensaje",
    mensagemPh:
      "Cuéntanos brevemente sobre el producto, la cadencia esperada y los desafíos de la línea.",
    aceite: "Acepto compartir mis datos con el equipo Solutek para responder a este contacto.",
    submit: "Enviar mensaje",
    sending: "Enviando…",
    successTitle: "Mensaje enviado",
    successBody:
      "Recibimos tu mensaje. Nuestro equipo responderá en 1 día hábil al correo indicado.",
    another: "Enviar otro mensaje",
    errorAceite: "Confirma la aceptación para continuar.",
    errorGeneric: "No se pudo enviar. Inténtalo nuevamente en unos minutos.",
  },
  solucao: {
    requestDiagnosis: "Solicitar diagnóstico",
    viewEquipment: "Ver equipos",
    whatWeDeliverKicker: "Lo que entregamos",
    whatWeDeliverTitle: "Alcance técnico completo, ejecutado por especialistas.",
    portfolioKicker: "Portafolio visual",
    portfolioTitle: "Proyectos y equipos en operación.",
    whyKicker: "Por qué Solutek",
    whyTitle: "Diferenciales que aceleran el retorno de la inversión.",
    midCtaTitle: "¿Quieres evaluar esta solución para tu proceso?",
    midCtaBody: "Habla con un ingeniero Solutek y recibe un diagnóstico técnico gratuito.",
    midCtaPrimary: "Hablar con un especialista",
    whatsapp: "WhatsApp",
    howKicker: "Cómo trabajamos",
    howTitle: "Un proceso previsible, del primer contacto a la posventa.",
    step: "Paso",
    sectorsKicker: "Sectores atendidos",
    sectorsTitle: "Experiencia aplicada a cadenas productivas exigentes.",
    finalCtaTitle: "¿Listo para llevar tu operación al siguiente nivel?",
    finalCtaBody:
      "Habla con un ingeniero Solutek. Diagnóstico técnico gratuito y propuesta en hasta 5 días hábiles.",
    finalCtaBtn: "Solicitar diagnóstico",
    waMsgPrefix: "¡Hola! Me gustaría hablar sobre",
  },
};

const DICTS: Record<Lang, Dict> = { pt: PT, en: EN, es: ES };
const LANG_KEY = "sltk:landing-lang";

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: Dict };
const LandingI18nContext = createContext<Ctx | undefined>(undefined);

export function LandingI18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved && ["pt", "en", "es"].includes(saved)) {
        setLangState(saved);
        return;
      }
      const nav = navigator.language?.toLowerCase() ?? "pt";
      if (nav.startsWith("en")) setLangState("en");
      else if (nav.startsWith("es")) setLangState("es");
      else setLangState("pt");
    } catch {
      /* ignore */
    }
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* ignore */
    }
  };

  return (
    <LandingI18nContext.Provider value={{ lang, setLang, t: DICTS[lang] }}>
      {children}
    </LandingI18nContext.Provider>
  );
}

export function useLandingI18n() {
  const ctx = useContext(LandingI18nContext);
  if (!ctx) throw new Error("useLandingI18n must be inside LandingI18nProvider");
  return ctx;
}
