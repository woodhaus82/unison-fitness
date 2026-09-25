import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { colors, fonts } from "@/lib/theme";
import type { Database } from "@/lib/types/database";

type BookingRow = {
  id: string;
  status: Database["public"]["Tables"]["bookings"]["Row"]["status"];
  waitlist_position: number | null;
  class_sessions: {
    session_date: string;
    start_time: string;
    class_types: { name: string } | { name: string }[] | null;
  } | null;
};

const STATUS_LABEL: Record<string, string> = {
  booked: "Booked",
  waitlisted: "Waitlisted",
  cancelled: "Cancelled",
  late_cancelled: "Late cancelled",
  attended: "Attended",
  no_show: "No-show",
};

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

export default function BookingsScreen() {
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const load = useCallback(
    async () => {
      if (!profile) return;
      const { data } = await supabase
        .from("bookings")
        .select("id, status, waitlist_position, class_sessions(session_date, start_time, class_types(name))")
        .eq("user_id", profile.id)
        .order("booked_at", { ascending: false })
        .limit(50);
      setBookings((data as unknown as BookingRow[]) ?? []);
      setLoading(false);
      setRefreshing(false);
    },
    [profile]
  );

  useEffect(() => {
    // See the matching comment in (tabs)/index.tsx — standard
    // fetch-on-mount, not the anti-pattern this rule targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleCancel(bookingId: string) {
    setCancellingId(bookingId);
    const { error } = await supabase.rpc("cancel_booking", { p_booking_id: bookingId });
    setCancellingId(null);
    if (error) Alert.alert("Couldn't cancel", error.message);
    else load();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
    >
      {bookings.length === 0 && <Text style={styles.empty}>No bookings yet — head to the schedule to book a class.</Text>}
      {bookings.map((b) => {
        const session = Array.isArray(b.class_sessions) ? b.class_sessions[0] : b.class_sessions;
        const classType = session ? (Array.isArray(session.class_types) ? session.class_types[0] : session.class_types) : null;
        const active = b.status === "booked" || b.status === "waitlisted";
        return (
          <View key={b.id} style={styles.card}>
            <View style={styles.row}>
              <View style={styles.flex1}>
                <Text style={styles.title}>
                  {session ? formatDate(session.session_date) : "—"}
                  {session ? ` · ${session.start_time.slice(0, 5)}` : ""} · {classType?.name ?? "Class"}
                </Text>
                <Text style={styles.meta}>
                  {STATUS_LABEL[b.status] ?? b.status}
                  {b.status === "waitlisted" && b.waitlist_position ? ` (#${b.waitlist_position})` : ""}
                </Text>
              </View>
              {active &&
                (cancellingId === b.id ? (
                  <ActivityIndicator />
                ) : (
                  <Pressable style={styles.secondaryButton} onPress={() => handleCancel(b.id)}>
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </Pressable>
                ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  empty: { color: colors.muted, marginTop: 24, fontFamily: fonts.body },
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  flex1: { flex: 1, paddingRight: 12 },
  title: { fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: fonts.body },
  secondaryButton: { borderWidth: 1, borderColor: colors.borderInput, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  secondaryButtonText: { color: colors.ink, fontSize: 14, fontFamily: fonts.bodySemiBold },
});
