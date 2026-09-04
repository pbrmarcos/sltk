import { useState } from "react";
import { Eye } from "lucide-react";
import { useAuth, type AppRole } from "@/hooks/use-auth";

/**
 * Sanitização de telas: dados sensíveis (financeiro, documentos fiscais,
 * contatos diretos e anexos do cliente) só ficam visíveis para papéis com
 * privilégio. Os demais veem o valor mascarado, com opção de revelar apenas
 * onde faz sentido operacional (contatos).
 */
const PRIVILEGED_ROLES: AppRole[] = ["admin", "manager"];

export function useSensitiveAccess() {
  const { role, roleLoading } = useAuth();
  const canSee = !!role && PRIVILEGED_ROLES.includes(role);
  return { canSee, role, loading: roleLoading };
}

export function maskDocumento(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `•••.•••.•••-${digits.slice(-2)}`;
}

export function maskEmail(value: string | null | undefined) {
  if (!value) return "—";
  const [user, domain] = value.split("@");
  if (!domain) return "•••";
  const head = user.slice(0, 2);
  return `${head}${"•".repeat(Math.max(3, user.length - 2))}@${domain}`;
}

export function maskPhone(value: string | null | undefined) {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length < 4) return "•••";
  return `••• ••• ${digits.slice(-4)}`;
}

export function maskMoney() {
  return "R$ ••••";
}

/** Texto mascarado com botão "revelar" (usado em contatos diretos). */
export function RevealableValue({
  value,
  masked,
  className,
}: {
  value: string;
  masked: string;
  className?: string;
}) {
  const { canSee } = useSensitiveAccess();
  const [revealed, setRevealed] = useState(false);
  if (canSee || revealed) return <span className={className}>{value}</span>;
  return (
    <button
      type="button"
      onClick={() => setRevealed(true)}
      title="Revelar dado protegido"
      className={`inline-flex items-center gap-1 hover:underline ${className ?? ""}`}
    >
      {masked}
      <Eye className="h-3 w-3" />
    </button>
  );
}

/** Renderiza os filhos apenas para papéis privilegiados. */
export function SensitiveOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const { canSee } = useSensitiveAccess();
  return <>{canSee ? children : fallback}</>;
}

export function RestrictedNotice({ what }: { what: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-[12.5px] text-muted-foreground">
      {what} disponível apenas para perfis de gestão.
    </div>
  );
}
