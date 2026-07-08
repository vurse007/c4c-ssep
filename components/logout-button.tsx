"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <button 
      onClick={logout} 
      className="text-[#1A1A1A] text-[13px] font-medium tracking-[0.02em] hover:underline"
    >
      Sign Out
    </button>
  );
}
