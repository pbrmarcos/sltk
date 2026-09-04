export function confirmDiscard(dirty: boolean): boolean {
  if (!dirty) return true;
  return typeof window === "undefined"
    ? true
    : window.confirm(
        "Você tem alterações não salvas. Tem certeza que deseja sair sem salvar?",
      );
}
