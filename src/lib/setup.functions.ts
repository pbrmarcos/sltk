import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const bootstrapSchema = z.object({
  fullName: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.string().trim().toLowerCase().email("Email inválido").max(254),
  password: z.string().min(10, "Mínimo de 10 caracteres").max(72),
});

export const checkAdminExists = createServerFn({ method: "GET" }).handler(
  async () => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();
    const { count, error } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (error) {
      console.error("[setup] checkAdminExists failed", error);
      throw new Error("Não foi possível verificar o estado do sistema.");
    }
    return { exists: (count ?? 0) > 0 };
  },
);

export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => bootstrapSchema.parse(input))
  .handler(async ({ data }) => {
    const { getCriticalClient } = await import("@/lib/supabase-client.server");
    const supabaseAdmin = await getCriticalClient();

    // Re-check on the server to close the race window.
    const { count, error: countError } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (countError) {
      console.error("[setup] preflight count failed", countError);
      throw new Error("Não foi possível verificar o estado do sistema.");
    }
    if ((count ?? 0) > 0) {
      throw new Error("admin_already_exists");
    }

    // Create the auth user (pre-confirmed so they can sign in right away).
    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: { full_name: data.fullName },
      });
    if (createError || !created.user) {
      console.error("[setup] createUser failed", createError);
      throw new Error("Não foi possível criar o administrador.");
    }

    const userId = created.user.id;

    // Profile row is populated by handle_new_user trigger; ensure full_name is set.
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.fullName })
      .eq("id", userId);
    if (profileError) {
      console.error("[setup] profile update failed", profileError);
    }

    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "admin" });
    if (roleError) {
      console.error("[setup] role insert failed; rolling back user", roleError);
      await supabaseAdmin.auth.admin.deleteUser(userId);
      throw new Error("Não foi possível concluir a configuração.");
    }

    return { ok: true };
  });