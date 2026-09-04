import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";

type DraftOptions<T> = {
  formKey: string;
  value: T;
  initialValue: T;
  enabled?: boolean;
  onRestore: (value: T) => void;
};

const PREFIX = "solutek:form-draft:v1";

export function useFormDraft<T>({
  formKey,
  value,
  initialValue,
  enabled = true,
  onRestore,
}: DraftOptions<T>) {
  const { user } = useAuth();
  const restoreRef = useRef(onRestore);
  const ignoredFingerprintRef = useRef<string | null>(null);
  const [readyKey, setReadyKey] = useState<string | null>(null);
  restoreRef.current = onRestore;

  const storageKey = useMemo(
    () => `${PREFIX}:${user?.id ?? "anonymous"}:${formKey}`,
    [formKey, user?.id],
  );
  const valueFingerprint = JSON.stringify(value);
  const initialFingerprint = JSON.stringify(initialValue);
  const isDirty = valueFingerprint !== initialFingerprint;

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    let active = true;
    ignoredFingerprintRef.current = null;
    const raw = window.localStorage.getItem(storageKey);
    queueMicrotask(() => {
      if (!active) return;
      if (raw) {
        try {
          restoreRef.current(JSON.parse(raw) as T);
        } catch {
          window.localStorage.removeItem(storageKey);
        }
      }
      setReadyKey(storageKey);
    });
    return () => {
      active = false;
    };
  }, [enabled, storageKey]);

  useEffect(() => {
    if (!enabled || readyKey !== storageKey || typeof window === "undefined") return;
    if (!isDirty || valueFingerprint === ignoredFingerprintRef.current) {
      if (!isDirty) window.localStorage.removeItem(storageKey);
      return;
    }
    const timer = window.setTimeout(() => {
      window.localStorage.setItem(storageKey, valueFingerprint);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [enabled, isDirty, readyKey, storageKey, valueFingerprint]);

  useEffect(() => {
    if (!enabled || !isDirty || typeof window === "undefined") return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [enabled, isDirty]);

  function clearDraft() {
    if (typeof window !== "undefined") window.localStorage.removeItem(storageKey);
    ignoredFingerprintRef.current = valueFingerprint;
  }

  return { clearDraft, isDirty, storageKey };
}