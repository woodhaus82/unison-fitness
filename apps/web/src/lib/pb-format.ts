import type { BenchmarkScoreType } from "@/lib/types/database";

export function formatScore(value: number, scoreType: BenchmarkScoreType): string {
  if (scoreType === "time") {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  if (scoreType === "reps") return `${value} reps`;
  return `${value} kg`;
}

// Lower is better for time; higher is better for reps/weight.
export function isBetter(scoreType: BenchmarkScoreType, candidate: number, current: number): boolean {
  return scoreType === "time" ? candidate < current : candidate > current;
}
