import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import * as React from "react";
import { Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Upload, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { updateMyProfile, changeMyPassword, removeMyAvatar } from "@/lib/account.functions";
import { AgendaPrefsCard } from "@/components/account/AgendaPrefsCard";

// Lazy: o recorte usa APIs de browser (canvas/pointer) e não deve rodar no SSR.
const AvatarCropDialog = React.lazy(() =>
  import("@/components/account/AvatarCropDialog").then((m) => ({ default: m.AvatarCropDialog })),
);

export const Route = createFileRoute("/_authenticated/conta")({
  component: ContaPage,
});

function ContaPage() {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setFullName(profile?.full_name ?? "");
    setAvatarUrl(profile?.avatar_url ?? null);
  }, [profile?.full_name, profile?.avatar_url]);

  const updateProfileFn = useServerFn(updateMyProfile);
  const profileMut = useMutation({
    mutationFn: (vars: { full_name: string; avatar_url?: string | null }) =>
      updateProfileFn({ data: vars }),
    onSuccess: () => {
      toast.success("Perfil atualizado");
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeAvatarFn = useServerFn(removeMyAvatar);
  const removeAvatarMut = useMutation({
    mutationFn: () => removeAvatarFn({}),
    onSuccess: () => {
      toast.success("Avatar removido");
      setAvatarUrl(null);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleUpload = async (blob: Blob) => {
    if (!user) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      const path = `${user.id}/avatar-${Date.now()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, {
          upsert: true,
          contentType: "image/jpeg",
          onUploadProgress: (e: { loaded: number; total?: number }) => {
            const pct = Math.round((e.loaded / (e.total || blob.size)) * 100);
            setUploadProgress(pct);
          },
        } as any);
      if (upErr) throw upErr;
      const { data: signed, error: sErr } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10); // 10y signed url
      if (sErr) throw sErr;
      const url = signed.signedUrl;
      setAvatarUrl(url);
      await profileMut.mutateAsync({ full_name: fullName.trim() || (profile?.full_name ?? ""), avatar_url: url });
      setPendingFile(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelected = (file: File) => {
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máx 8MB.");
      return;
    }
    if (!/^image\/(png|jpe?g|webp|gif)$/i.test(file.type)) {
      toast.error("Formato não suportado. Use PNG, JPG, WEBP ou GIF.");
      return;
    }
    setPendingFile(file);
  };

  const initials =
    (fullName || user?.email || "U")
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Minha conta" }]}
        title="Minha conta"
        subtitle="Atualize seu perfil e troque sua senha."
      />

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
          <h2 className="mb-4 text-sm font-semibold">Perfil</h2>

          <div className="mb-4 flex items-center gap-4">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-16 w-16 rounded-full object-cover border border-[var(--bg-border)]"
              />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--bg-elevated)] text-base font-bold text-[var(--text-primary)]">
                {initials}
              </div>
            )}
            <div className="flex-1">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelected(f);
                  e.target.value = "";
                }}
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || removeAvatarMut.isPending}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                  {uploading ? "Enviando…" : "Trocar avatar"}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    disabled={uploading || removeAvatarMut.isPending}
                    onClick={() => removeAvatarMut.mutate()}
                  >
                    {removeAvatarMut.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                    Remover
                  </Button>
                )}
              </div>
              {uploading && (
                <div className="mt-2 w-48">
                  <Progress value={uploadProgress} />
                  <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                    {uploadProgress}%
                  </p>
                </div>
              )}
              <p className="mt-1 text-[11px] text-[var(--text-muted)]">
                PNG, JPG, WEBP ou GIF. Máx 8MB. Você poderá recortar antes de salvar.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nome completo</Label>
              <Input
                id="c-name"
                value={fullName}
                maxLength={120}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">Email</Label>
              <Input id="c-email" value={user?.email ?? ""} disabled />
              <p className="text-[11px] text-[var(--text-muted)]">
                Para alterar o email, fale com um administrador.
              </p>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                disabled={profileMut.isPending || !fullName.trim()}
                onClick={() =>
                  profileMut.mutate({
                    full_name: fullName.trim(),
                  })
                }
              >
                {profileMut.isPending ? "Salvando…" : "Salvar perfil"}
              </Button>
            </div>
          </div>
        </section>

        <PasswordCard />

        <AgendaPrefsCard />
      </div>

      <ClientOnly fallback={null}>
        {pendingFile && (
          <Suspense fallback={null}>
            <AvatarCropDialog
              file={pendingFile}
              open={!!pendingFile}
              onOpenChange={(v) => {
                if (!v && !uploading) setPendingFile(null);
              }}
              submitting={uploading}
              onConfirm={(blob) => void handleUpload(blob)}
            />
          </Suspense>
        )}
      </ClientOnly>
    </PageContainer>
  );
}

function PasswordCard() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);

  const changeFn = useServerFn(changeMyPassword);
  const mut = useMutation({
    mutationFn: (v: { current_password: string; new_password: string }) =>
      changeFn({ data: v }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso");
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submit = () => {
    if (next.length < 12) return toast.error("A nova senha deve ter ao menos 12 caracteres.");
    if (next !== confirm) return toast.error("As senhas não conferem.");
    if (next === current) return toast.error("A nova senha deve ser diferente da atual.");
    mut.mutate({ current_password: current, new_password: next });
  };

  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--bg-border)] bg-[var(--bg-surface)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="mb-4 text-sm font-semibold">Alterar senha</h2>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="p-cur">Senha atual</Label>
          <Input
            id="p-cur"
            type={show ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-new">Nova senha</Label>
          <Input
            id="p-new"
            type={show ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
          />
          <p className="text-[11px] text-[var(--text-muted)]">Mínimo 12 caracteres.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="p-conf">Confirmar nova senha</Label>
          <Input
            id="p-conf"
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            className="flex items-center gap-1 text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            onClick={() => setShow((s) => !s)}
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {show ? "Ocultar" : "Mostrar"} senhas
          </button>
          <Button size="sm" onClick={submit} disabled={mut.isPending}>
            {mut.isPending ? "Alterando…" : "Alterar senha"}
          </Button>
        </div>
      </div>
    </section>
  );
}