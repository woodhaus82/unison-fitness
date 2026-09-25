import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { addDaysToDateString, addMonthsToDateString, startOfWeekMonday } from "@/lib/time";
import { SessionCard } from "@/components/SessionCard";
import { colors, fonts } from "@/lib/theme";
import type { Database } from "@/lib/types/database";

type SessionRow = Database["public"]["Functions"]["list_sessions"]["Returns"][number];

function formatWeekRange(weekStart: string) {
  const [y, m, d] = weekStart.split("-").map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(y, m - 1, d + 6);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-GB", opts)} – ${end.toLocaleDateString("en-GB", { ...opts, year: "numeric" })}`;
}

function formatDayHeading(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
}

export default function ScheduleScreen() {
  const today = startOfWeekMonday(new Date());
  const [weekStart, setWeekStart] = useState(today);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  // Doesn't set loading/refreshing state itself — callers (event handlers,
  // not the effect below) decide whether to show a spinner, so this stays
  // a plain async fetch with no synchronous setState in the effect body.
  const load = useCallback(async () => {
    const weekEnd = addDaysToDateString(weekStart, 6);

    // Idempotent — materializes this week's sessions from the recurring
    // template if they don't exist yet.
    await supabase.rpc("generate_sessions_from_schedule", { p_week_start: weekStart });

    const { data } = await supabase.rpc("list_sessions", { p_from: weekStart, p_to: weekEnd });
    setSessions(data ?? []);
    setLoading(false);
    setRefreshing(false);
  }, [weekStart]);

  useEffect(() => {
    // react-hooks/set-state-in-effect flags any setState reachable from a
    // function called in an effect, regardless of whether it happens
    // before or after an await — this is the standard fetch-on-mount
    // pattern, not the synchronous-derived-state anti-pattern the rule
    // targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function goToWeek(next: string) {
    setLoading(true);
    setWeekStart(next);
  }

  const byDay = new Map<string, SessionRow[]>();
  for (const s of sessions) {
    if (!byDay.has(s.session_date)) byDay.set(s.session_date, []);
    byDay.get(s.session_date)!.push(s);
  }
  const days = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));

  const isCurrentWeek = weekStart === today;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>
        {isCurrentWeek && <Text style={styles.thisWeek}>This week</Text>}
      </View>

      <View style={styles.navRow}>
        <Pressable onPress={() => goToWeek(addMonthsToDateString(weekStart, -1))}>
          <Text style={styles.navLink}>← Month</Text>
        </Pressable>
        <Pressable onPress={() => goToWeek(addDaysToDateString(weekStart, -7))}>
          <Text style={styles.navLink}>← Week</Text>
        </Pressable>
        {!isCurrentWeek && (
          <Pressable onPress={() => goToWeek(today)}>
            <Text style={styles.navLink}>This week</Text>
          </Pressable>
        )}
        <Pressable onPress={() => goToWeek(addDaysToDateString(weekStart, 7))}>
          <Text style={styles.navLink}>Week →</Text>
        </Pressable>
        <Pressable onPress={() => goToWeek(addMonthsToDateString(weekStart, 1))}>
          <Text style={styles.navLink}>Month →</Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loading} color={colors.brand} />
      ) : days.length === 0 ? (
        <Text style={styles.empty}>No classes scheduled this week.</Text>
      ) : (
        days.map(([date, daySessions]) => {
          const isOpen = !!openDays[date];
          return (
            <View key={date} style={styles.daySection}>
              <Pressable onPress={() => setOpenDays((prev) => ({ ...prev, [date]: !prev[date] }))}>
                <Text style={styles.dayHeading}>
                  {isOpen ? "▾" : "▸"} {formatDayHeading(date)}{" "}
                  <Text style={styles.dayCount}>
                    ({daySessions.length} class{daySessions.length === 1 ? "" : "es"})
                  </Text>
                </Text>
              </Pressable>
              {isOpen && (
                <View style={styles.dayBody}>
                  {daySessions.map((s) => (
                    <SessionCard key={s.id} session={s} onChanged={() => load()} />
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  weekRange: { fontSize: 19, fontFamily: fonts.heading, color: colors.ink },
  thisWeek: { fontSize: 13, color: colors.muted, fontFamily: fonts.body },
  navRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 8 },
  navLink: { fontSize: 13, fontFamily: fonts.bodyMedium, color: colors.brand, textDecorationLine: "underline" },
  loading: { marginTop: 32 },
  empty: { marginTop: 24, color: colors.muted, fontFamily: fonts.body },
  daySection: { marginTop: 20 },
  dayHeading: { fontSize: 13, fontFamily: fonts.bodyBold, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  dayCount: { fontFamily: fonts.body, textTransform: "none", color: colors.mutedLight },
  dayBody: { marginTop: 10 },
});
