"use client";

export function TimeGreeting({ firstName }: { firstName?: string }) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" :
    hour < 17 ? "Good afternoon" :
                "Good evening";

  return (
    <h1 className="text-3xl font-bold tracking-tight">
      {greeting}, <span className="text-primary">{firstName}</span>
    </h1>
  );
}
