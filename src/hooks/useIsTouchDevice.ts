import { useEffect, useState } from "react";

/**
 * Detecta se o dispositivo é touch (tablet/celular) — usado para decidir
 * se o botão de câmera deve abrir a câmera nativa (`capture="environment"`)
 * ou um seletor de arquivos comum no desktop.
 */
export function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(pointer: coarse)").matches;
    const hasTouch =
      "ontouchstart" in window ||
      (typeof navigator !== "undefined" && (navigator.maxTouchPoints ?? 0) > 0);
    setIsTouch(Boolean(coarse || hasTouch));
  }, []);

  return isTouch;
}
