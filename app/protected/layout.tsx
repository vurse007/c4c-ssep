import { AuthButton } from "@/components/auth-button";
import { Sidebar } from "@/components/sidebar";
import Link from "next/link";
import { Suspense } from "react";

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAFA]">
      {/* Top navbar */}
      <nav className="w-full border-b border-black/6 bg-white h-16 flex items-center px-6 shrink-0">
        <div className="flex items-center justify-between w-full">
          {/* Left: Wordmark */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span
                className="text-xl font-bold tracking-tight text-primary"
              >
                SSEP
              </span>
              <span
                className="text-xl font-light tracking-tight text-foreground"
              >
                Dashboard
              </span>
            </Link>
            <span className="hidden sm:inline-block text-xs text-muted-foreground border-l border-border pl-3 ml-1">
              by Caring for Caregivers
            </span>
          </div>

          {/* Right: Auth */}
          <Suspense>
            <AuthButton />
          </Suspense>
        </div>
      </nav>

      {/* Body: Sidebar + Content */}
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 pl-16 pr-8 pt-14 pb-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
