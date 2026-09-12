import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/supabase/is-admin";
import { Sidebar } from "@/components/sidebar";

export async function SidebarGate() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isAdmin = user ? await isCurrentUserAdmin(supabase) : false;

  return <Sidebar isAdmin={isAdmin} />;
}
