import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { isSessionPast } from "@/lib/time";
import { WorkoutLink } from "./WorkoutLink";
import { colors, fonts } from "@/lib/theme";
import type { Database } from "@/lib/types/database";

type SessionRow = Database["public"]["Functions"]["list_sessions"]["Returns"][number];

export function SessionCard({ session, onChanged }: { session: SessionRow; onChanged: () => void }) {
  const [pending, setPending] = useState(false);
  const full = session.booked_count >= session.capacity;
  const past = isSessionPast(session.session_date, session.start_time);

  async function handleBook() {
    setPending(true);
    const { error } = await supabase.rpc("book_class", { p_session_id: session.id });
    setPending(false);
    if (error) Alert.alert("Couldn't book", error.message);
    else onChanged();
  }

  async function handleCancel() {
    if (!session.my_booking_id) return;
    setPending(true);
    const { error } = await supabase.rpc("cancel_booking", { p_booking_id: session.my_booking_id });
    setPending(false);
    if (error) Alert.alert("Couldn't cancel", error.message);
    else onChanged();
  }

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.flex1}>
          <Text style={styles.title}>
            {session.start_time.slice(0, 5)}–{session.end_time.slice(0, 5)} · {session.class_type_name}
          </Text>
          {session.coach_name && <Text style={styles.meta}>Coach: {session.coach_name}</Text>}
          <Text style={styles.meta}>
            {session.booked_count}/{session.capacity} booked
            {session.waitlist_count > 0 ? ` · ${session.waitlist_count} waitlisted` : ""}
          </Text>
          {session.my_booking_status === "waitlisted" && (
            <Text style={styles.waitlisted}>You&apos;re #{session.my_waitlist_position} on the waitlist</Text>
          )}
          {session.my_booking_status === "booked" && <Text style={styles.booked}>You&apos;re booked in</Text>}
        </View>

        <View>
          {pending ? (
            <ActivityIndicator />
          ) : past ? (
            <Text style={styles.pastText}>Class has passed</Text>
          ) : session.my_booking_id ? (
            <Pressable style={styles.secondaryButton} onPress={handleCancel}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </Pressable>
          ) : (
            <Pressable style={[styles.primaryButton, full && styles.waitlistButton]} onPress={handleBook}>
              <Text style={styles.primaryButtonText}>{full ? "Join waitlist" : "Book"}</Text>
            </Pressable>
          )}
        </View>
      </View>

      <View style={styles.workoutRow}>
        <WorkoutLink wod={session.wod} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 14, marginBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  flex1: { flex: 1, paddingRight: 12 },
  title: { fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink },
  meta: { fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: fonts.body },
  waitlisted: { fontSize: 13, color: colors.warning, marginTop: 2, fontFamily: fonts.body },
  booked: { fontSize: 13, color: colors.success, marginTop: 2, fontFamily: fonts.body },
  pastText: { fontSize: 13, color: colors.mutedLight, fontFamily: fonts.body },
  primaryButton: { backgroundColor: colors.brand, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  waitlistButton: { backgroundColor: "#f59e0b" },
  primaryButtonText: { color: "#000", fontSize: 14, fontFamily: fonts.bodySemiBold },
  secondaryButton: { borderWidth: 1, borderColor: colors.borderInput, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 16 },
  secondaryButtonText: { color: colors.ink, fontSize: 14, fontFamily: fonts.bodySemiBold },
  workoutRow: { marginTop: 10 },
});
