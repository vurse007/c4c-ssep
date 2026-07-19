import { ChallengeGrid } from "@/components/challenge-grid";

export default function TryPuzzlesPage() {
  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Try Puzzles</h1>
        <p className="text-muted-foreground mt-1">
          Explore five cognitive puzzles for practice. Practice attempts are not
          included in your results.
        </p>
      </div>

      <ChallengeGrid basePath="/protected/try-puzzles" />
    </div>
  );
}
