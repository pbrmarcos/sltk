import i18n from "i18next";
import { initReactI18next } from "react-i18next";

/**
 * i18n do app. Idioma padrão pt-BR, com espanhol disponível.
 * Hoje cobre os rótulos de status do cliente (fonte de verdade única).
 */
export const resources = {
  "pt-BR": {
    translation: {
      cliente: {
        statusLabel: "Status do cliente",
        status: {
          ativo: "Cliente Ativo",
          suspect: "Suspect",
          prospect: "Prospect",
          inativo: "Inativo",
        },
      },
      funil: {
        label: "Estágio do funil",
      },
    },
  },
  es: {
    translation: {
      cliente: {
        statusLabel: "Estado del cliente",
        status: {
          ativo: "Cliente Activo",
          suspect: "Suspect",
          prospect: "Prospect",
          inativo: "Inactivo",
        },
      },
      funil: {
        label: "Etapa del embudo",
      },
    },
  },
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources,
    lng: "pt-BR",
    fallbackLng: "pt-BR",
    supportedLngs: ["pt-BR", "es"],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
