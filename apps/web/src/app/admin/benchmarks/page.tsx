import { createClient } from "@/lib/supabase/server";
import { AddBenchmarkForm } from "./AddBenchmarkForm";
import { BenchmarkRow } from "./BenchmarkRow";

export default async function BenchmarksPage() {
  const supabase = await createClient();
  const { data: benchmarks } = await supabase
    .from("benchmarks")
    .select("id, name, category, score_type, description")
    .order("category")
    .order("sort_order");

  const wods = (benchmarks ?? []).filter((b) => b.category === "wod");
  const lifts = (benchmarks ?? []).filter((b) => b.category === "lift");

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="text-2xl font-semibold">Benchmark WODs &amp; lifts</h1>
        <p className="mt-1 text-sm text-neutral-500">
          The list members log their PBs against, on the &quot;PBs&quot; page. Click a name or description to edit
          it.
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Add a benchmark</h2>
        <div className="mt-4">
          <AddBenchmarkForm />
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold">WODs</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {wods.map((b) => (
            <BenchmarkRow key={b.id} id={b.id} initialName={b.name} initialDescription={b.description} scoreType={b.score_type} />
          ))}
          {wods.length === 0 && <p className="text-sm text-neutral-500">None yet.</p>}
        </ul>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Lifts</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {lifts.map((b) => (
            <BenchmarkRow key={b.id} id={b.id} initialName={b.name} initialDescription={b.description} scoreType={b.score_type} />
          ))}
          {lifts.length === 0 && <p className="text-sm text-neutral-500">None yet.</p>}
        </ul>
      </section>
    </div>
  );
}
