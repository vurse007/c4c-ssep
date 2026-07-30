"use client";

import { useEffect, useState } from "react";
import { CalendarDays } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getBrowserTimeZone, getCurrentStreak } from "@/lib/local-day";

type Props = {
  days: string[];
  requiredDays: number;
};

export function CurrentStreakCard({ days, requiredDays }: Props) {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    setStreak(getCurrentStreak(days, getBrowserTimeZone()));
  }, [days]);

  return (
    <Card className="border-border/50 shadow-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Current Streak
        </CardTitle>
        <CalendarDays size={16} className="text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {streak && streak > 0 ? `${streak} / ${requiredDays}` : "—"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Consecutive days completing the official challenge
        </p>
      </CardContent>
    </Card>
  );
}
