import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentUserAdmin } from "@/lib/supabase/is-admin";
import { Suspense } from "react";

async function AdminGate({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const isAdmin = await isCurrentUserAdmin(supabase);
  if (!isAdmin) redirect("/protected");

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl space-y-8">
      <Suspense
        fallback={<div className="h-64 bg-muted animate-pulse rounded-lg" />}
      >
        <AdminGate>{children}</AdminGate>
      </Suspense>
    </div>
  );
}
