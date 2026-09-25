import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { BenchmarkEntry } from "./BenchmarkEntry";

export default async function PbsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: benchmarks }, { data: results }] = await Promise.all([
    supabase.from("benchmarks").select("id, name, category, score_type, description").order("category").order("sort_order"),
    supabase
      .from("personal_bests")
      .select("id, benchmark_id, value, rx, notes, recorded_date")
      .eq("user_id", profile.id)
      .order("recorded_date", { ascending: false }),
  ]);

  const entriesByBenchmark = new Map<string, NonNullable<typeof results>>();
  for (const r of results ?? []) {
    if (!entriesByBenchmark.has(r.benchmark_id)) entriesByBenchmark.set(r.benchmark_id, []);
    entriesByBenchmark.get(r.benchmark_id)!.push(r);
  }

  const wods = (benchmarks ?? []).filter((b) => b.category === "wod");
  const lifts = (benchmarks ?? []).filter((b) => b.category === "lift");

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-semibold">PBs</h1>
      <p className="mt-1 text-sm text-neutral-500">Log your scores for benchmark WODs and lifts, and track them over time.</p>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Benchmark WODs</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {wods.map((b) => (
            <BenchmarkEntry
              key={b.id}
              benchmarkId={b.id}
              name={b.name}
              description={b.description}
              scoreType={b.score_type}
              entries={entriesByBenchmark.get(b.id) ?? []}
            />
          ))}
          {wods.length === 0 && <p className="text-neutral-500">None yet.</p>}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Lifts</h2>
        <ul className="mt-3 flex flex-col gap-2">
          {lifts.map((b) => (
            <BenchmarkEntry
              key={b.id}
              benchmarkId={b.id}
              name={b.name}
              description={b.description}
              scoreType={b.score_type}
              entries={entriesByBenchmark.get(b.id) ?? []}
            />
          ))}
          {lifts.length === 0 && <p className="text-neutral-500">None yet.</p>}
        </ul>
      </section>
    </main>
  );
}
