import { useSyncExternalStore } from "react";

export type DrawerErrorRecord = {
  id: string;
  at: string; // ISO
  incidentId?: string;
  message: string;
  stack?: string;
  componentStack?: string;
  route?: string;
  version: string;
  sessionId: string;
  processoId?: string | null;
  processoCode?: string;
  stage?: string;
  progresso?: number;
  risco?: string;
  sla?: { status: string; diasNoEstagio: number; limite: number };
  count: number;
};

const MAX = 200;

type State = { records: DrawerErrorRecord[] };
let state: State = { records: [] };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): State {
  return state;
}

export function useDrawerErrors<T>(selector: (s: State) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(getSnapshot()),
    () => selector(getSnapshot()),
  );
}

function dedupeKey(r: Pick<DrawerErrorRecord, "message" | "stack">): string {
  return `${r.message}::${(r.stack ?? "").split("\n").slice(0, 3).join("|")}`;
}

/**
 * Insere ou agrupa o registro por (message + 3 primeiras linhas de stack).
 * Mantém os últimos MAX registros (FIFO).
 */
export function recordDrawerError(
  partial: Omit<DrawerErrorRecord, "id" | "at" | "count">,
): DrawerErrorRecord {
  const key = dedupeKey(partial);
  const existing = state.records.find((r) => dedupeKey(r) === key);
  if (existing) {
    existing.count += 1;
    existing.at = new Date().toISOString();
    if (partial.incidentId) existing.incidentId = partial.incidentId;
    state = { records: [...state.records] };
    emit();
    return existing;
  }
  const record: DrawerErrorRecord = {
    ...partial,
    id: `dre-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    count: 1,
  };
  const records = [record, ...state.records].slice(0, MAX);
  state = { records };
  emit();
  return record;
}

export function clearDrawerErrors() {
  state = { records: [] };
  emit();
}
