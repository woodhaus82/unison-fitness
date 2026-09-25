import type { Database } from "./types/database";

type BenchmarkScoreType = Database["public"]["Tables"]["benchmarks"]["Row"]["score_type"];

export function formatScore(value: number, scoreType: BenchmarkScoreType): string {
  if (scoreType === "time") {
    const minutes = Math.floor(value / 60);
    const seconds = Math.round(value % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  }
  if (scoreType === "reps") return `${value} reps`;
  return `${value} kg`;
}
