import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Calls the is_admin() Postgres function (see migration 016), which checks
 * the admin_users allowlist for the current session's user.
 */
export async function isCurrentUserAdmin(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("is_admin");
  if (error) {
    console.error("[is-admin] rpc failed:", error);
    return false;
  }
  return data === true;
}
