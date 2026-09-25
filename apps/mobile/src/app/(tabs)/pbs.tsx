import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { BenchmarkCard } from "@/components/BenchmarkCard";
import { colors, fonts } from "@/lib/theme";
import type { Database } from "@/lib/types/database";

type Benchmark = Database["public"]["Tables"]["benchmarks"]["Row"];
type Entry = Database["public"]["Tables"]["personal_bests"]["Row"];

export default function PbsScreen() {
  const { profile } = useAuth();
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [{ data: b }, { data: e }] = await Promise.all([
      supabase.from("benchmarks").select("*").order("category").order("sort_order"),
      supabase
        .from("personal_bests")
        .select("*")
        .eq("user_id", profile.id)
        .order("recorded_date", { ascending: false }),
    ]);
    setBenchmarks(b ?? []);
    setEntries(e ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [profile]);

  useEffect(() => {
    // See the matching comment in (tabs)/index.tsx — standard
    // fetch-on-mount, not the anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  const entriesByBenchmark = new Map<string, Entry[]>();
  for (const e of entries) {
    if (!entriesByBenchmark.has(e.benchmark_id)) entriesByBenchmark.set(e.benchmark_id, []);
    entriesByBenchmark.get(e.benchmark_id)!.push(e);
  }

  const wods = benchmarks.filter((b) => b.category === "wod");
  const lifts = benchmarks.filter((b) => b.category === "lift");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <Text style={styles.sectionHeading}>Benchmark WODs</Text>
      {wods.map((b) => (
        <BenchmarkCard
          key={b.id}
          benchmarkId={b.id}
          name={b.name}
          description={b.description}
          scoreType={b.score_type}
          entries={entriesByBenchmark.get(b.id) ?? []}
          onLogged={load}
        />
      ))}

      <Text style={styles.sectionHeading}>Lifts</Text>
      {lifts.map((b) => (
        <BenchmarkCard
          key={b.id}
          benchmarkId={b.id}
          name={b.name}
          description={b.description}
          scoreType={b.score_type}
          entries={entriesByBenchmark.get(b.id) ?? []}
          onLogged={load}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  sectionHeading: {
    fontSize: 13,
    fontFamily: fonts.bodyBold,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 16,
    marginBottom: 8,
  },
});
