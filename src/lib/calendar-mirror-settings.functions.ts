import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { friendlyDbError } from "@/lib/db-errors";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "@/lib/admin-guard";

export type CalendarMirrorCategoria = {
  categoria: string;
  label: string;
  mirror_enabled: boolean;
};

export type CalendarMirrorSettings = {
  mirrorAdminUserId: string | null;
  categorias: CalendarMirrorCategoria[];
};

export const getCalendarMirrorSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CalendarMirrorSettings> => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase as any;

    const [{ data: settings, error: sErr }, { data: categorias, error: cErr }] = await Promise.all([
      sb
        .from("calendar_mirror_settings")
        .select("mirror_admin_user_id")
        .eq("singleton", true)
        .maybeSingle(),
      sb
        .from("calendar_mirror_categories")
        .select("categoria, label, mirror_enabled")
        .order("categoria", { ascending: true }),
    ]);
    if (sErr) throw friendlyDbError(sErr);
    if (cErr) throw friendlyDbError(cErr);

    return {
      mirrorAdminUserId: settings?.mirror_admin_user_id ?? null,
      categorias: (categorias ?? []) as CalendarMirrorCategoria[],
    };
  });

const updateAdminInput = z.object({ mirrorAdminUserId: z.string().uuid().nullable() });

export const updateCalendarMirrorAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateAdminInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase as any;
    const { error } = await sb
      .from("calendar_mirror_settings")
      .update({ mirror_admin_user_id: data.mirrorAdminUserId, updated_by: context.userId })
      .eq("singleton", true);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });

const toggleInput = z.object({ categoria: z.string().min(1).max(60), mirror_enabled: z.boolean() });

export const toggleCalendarMirrorCategoria = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => toggleInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase as any;
    const { error } = await sb
      .from("calendar_mirror_categories")
      .update({ mirror_enabled: data.mirror_enabled, updated_by: context.userId })
      .eq("categoria", data.categoria);
    if (error) throw friendlyDbError(error);
    return { ok: true };
  });
