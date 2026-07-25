"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  Play,
  Settings,
} from "lucide-react";
import { getBrowserTimeZone } from "@/lib/local-day";

const navItems = [
  { label: "Overview", href: "/protected", icon: LayoutDashboard },
  { label: "Try Puzzles", href: "/protected/try-puzzles", icon: CalendarDays },
  { label: "Start Challenge", href: "/protected/start-challenge", icon: Play },
  { label: "Settings", href: "/protected/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [hasActiveWorkflow, setHasActiveWorkflow] = useState(false);
  const [completedToday, setCompletedToday] = useState(false);

  const refreshWorkflowStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        timeZone: getBrowserTimeZone(),
      });
      const response = await fetch(`/api/challenge-workflow?${params}`);
      if (!response.ok) return;
      const body = await response.json();
      setHasActiveWorkflow(Boolean(body.workflow));
      setCompletedToday(Boolean(body.completedToday));
    } catch {
      // Navigation remains usable if workflow status cannot be loaded.
    }
  }, []);

  useEffect(() => {
    void refreshWorkflowStatus();
    let midnightTimer: ReturnType<typeof setTimeout>;
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      );
      midnightTimer = setTimeout(() => {
        void refreshWorkflowStatus();
        scheduleMidnightRefresh();
      }, nextMidnight.getTime() - now.getTime() + 100);
    };

    scheduleMidnightRefresh();
    window.addEventListener(
      "ssep:challenge-workflow-changed",
      refreshWorkflowStatus,
    );
    window.addEventListener("focus", refreshWorkflowStatus);
    return () => {
      clearTimeout(midnightTimer);
      window.removeEventListener(
        "ssep:challenge-workflow-changed",
        refreshWorkflowStatus,
      );
      window.removeEventListener("focus", refreshWorkflowStatus);
    };
  }, [refreshWorkflowStatus]);

  return (
    <aside className="w-64 min-h-[calc(100vh-4rem)] bg-primary border-t border-r border-primary-foreground/15 flex flex-col">
      {/* Sidebar header */}
      <div className="p-6 pb-4">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-foreground/60">
          Navigation
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/protected" && pathname.startsWith(`${item.href}/`));
          const Icon = item.icon;
          const isChallengeItem =
            item.href === "/protected/start-challenge";
          const isUnavailable =
            isChallengeItem && completedToday && !hasActiveWorkflow;
          const itemContent = (
            <>
              <Icon
                size={18}
                className={
                  isActive ? "text-primary" : "text-primary-foreground/80"
                }
              />
              <span>
                {isChallengeItem && hasActiveWorkflow
                  ? "Continue Challenge"
                  : isUnavailable
                    ? "Challenge Complete"
                    : item.label}
                {isUnavailable && (
                  <span className="block text-[11px] font-normal">
                    Come back tomorrow
                  </span>
                )}
              </span>
            </>
          );

          if (isUnavailable) {
            return (
              <div
                key={item.href}
                aria-disabled="true"
                title="You've already completed your challenge for today. Come back tomorrow."
                className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-primary-foreground/40"
              >
                {itemContent}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-foreground text-primary"
                  : "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-white"
              }`}
            >
              {itemContent}
            </Link>
          );
        })}
      </nav>

      {/* Sidebar footer */}
      <div className="p-6 pt-4 border-t border-primary-foreground/10">
        <p className="text-xs text-primary-foreground/70 leading-relaxed">
          SSEP Dashboard
          <br />
          <span className="opacity-70">
            Provided by Caring for Caregivers
          </span>
        </p>
      </div>
    </aside>
  );
}
