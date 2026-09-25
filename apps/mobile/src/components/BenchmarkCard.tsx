import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { formatScore } from "@/lib/pb-format";
import { colors, fonts } from "@/lib/theme";
import type { Database } from "@/lib/types/database";

type ScoreType = Database["public"]["Tables"]["benchmarks"]["Row"]["score_type"];
type Entry = Database["public"]["Tables"]["personal_bests"]["Row"];

export function BenchmarkCard({
  benchmarkId,
  name,
  description,
  scoreType,
  entries,
  onLogged,
}: {
  benchmarkId: string;
  name: string;
  description: string | null;
  scoreType: ScoreType;
  entries: Entry[];
  onLogged: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [value, setValue] = useState("");
  const [rx, setRx] = useState(true);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const best = entries.reduce<Entry | null>((acc, e) => {
    if (!acc) return e;
    const better = scoreType === "time" ? e.value < acc.value : e.value > acc.value;
    return better ? e : acc;
  }, null);

  async function handleSave() {
    const total = scoreType === "time" ? Number(minutes || 0) * 60 + Number(seconds || 0) : Number(value);
    if (!Number.isFinite(total) || total <= 0) {
      Alert.alert("Enter a valid score");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const { error } = await supabase.from("personal_bests").insert({
      user_id: user.id,
      benchmark_id: benchmarkId,
      value: total,
      rx,
      notes: notes.trim() || null,
      recorded_date: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);

    if (error) {
      Alert.alert("Couldn't save", error.message);
      return;
    }
    setMinutes("");
    setSeconds("");
    setValue("");
    setNotes("");
    setRx(true);
    setShowForm(false);
    onLogged();
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("personal_bests").delete().eq("id", id);
    if (error) Alert.alert("Couldn't delete", error.message);
    else onLogged();
  }

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.flex1}>
          <Text style={styles.name}>{name}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
          {best ? (
            <Text style={styles.pb}>
              PB: {formatScore(best.value, scoreType)} {best.rx ? "(Rx)" : "(Scaled)"}
            </Text>
          ) : (
            <Text style={styles.noPb}>No result logged yet</Text>
          )}
        </View>
        <Pressable style={styles.logButton} onPress={() => setShowForm((v) => !v)}>
          <Text style={styles.logButtonText}>{showForm ? "Cancel" : "Log result"}</Text>
        </Pressable>
      </View>

      {showForm && (
        <View style={styles.form}>
          {scoreType === "time" ? (
            <View style={styles.row}>
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                placeholder="min"
                style={styles.smallInput}
              />
              <TextInput
                value={seconds}
                onChangeText={setSeconds}
                keyboardType="number-pad"
                placeholder="sec"
                style={styles.smallInput}
              />
            </View>
          ) : (
            <TextInput
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder={scoreType === "weight" ? "kg" : "reps"}
              style={styles.input}
            />
          )}

          <View style={styles.rxRow}>
            <Text style={styles.rxLabel}>Rx</Text>
            <Switch value={rx} onValueChange={setRx} trackColor={{ true: colors.brand }} />
            <Text style={styles.rxLabel}>{rx ? "Rx" : "Scaled"}</Text>
          </View>

          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Notes (optional) — weight used, how it felt"
            style={styles.input}
          />

          <Pressable style={styles.saveButton} onPress={handleSave} disabled={saving}>
            {saving ? <ActivityIndicator color="#000" /> : <Text style={styles.saveButtonText}>Save result</Text>}
          </Pressable>
        </View>
      )}

      {entries.length > 0 && (
        <Pressable onPress={() => setShowHistory((v) => !v)}>
          <Text style={styles.historyToggle}>{showHistory ? "Hide history" : `History (${entries.length})`}</Text>
        </Pressable>
      )}

      {showHistory &&
        entries.map((e) => (
          <View key={e.id} style={styles.historyRow}>
            <Text style={styles.historyText}>
              {e.recorded_date} · {formatScore(e.value, scoreType)} · {e.rx ? "Rx" : "Scaled"}
              {e.notes ? ` · ${e.notes}` : ""}
            </Text>
            <Pressable onPress={() => handleDelete(e.id)}>
              <Text style={styles.deleteText}>Delete</Text>
            </Pressable>
          </View>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.bgSubtle, borderRadius: 10, padding: 14, marginBottom: 8 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  flex1: { flex: 1, paddingRight: 12 },
  name: { fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink },
  description: { fontSize: 13, color: colors.muted, marginTop: 2, fontFamily: fonts.body },
  pb: { fontSize: 13, color: colors.success, marginTop: 4, fontFamily: fonts.bodySemiBold },
  noPb: { fontSize: 13, color: colors.mutedLight, marginTop: 4, fontFamily: fonts.body },
  logButton: { borderWidth: 1, borderColor: colors.borderInput, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12 },
  logButtonText: { fontSize: 13, fontFamily: fonts.bodySemiBold, color: colors.ink },
  form: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12, gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  smallInput: { borderWidth: 1, borderColor: colors.borderInput, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, width: 70, fontSize: 15, fontFamily: fonts.body },
  input: { borderWidth: 1, borderColor: colors.borderInput, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, fontFamily: fonts.body },
  rxRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rxLabel: { fontSize: 14, color: colors.text, fontFamily: fonts.body },
  saveButton: { backgroundColor: colors.brand, borderRadius: 999, paddingVertical: 10, alignItems: "center" },
  saveButtonText: { color: "#000", fontSize: 14, fontFamily: fonts.bodySemiBold },
  historyToggle: { marginTop: 10, fontSize: 13, fontFamily: fonts.bodySemiBold, color: colors.text, textDecorationLine: "underline" },
  historyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.bgElevated, borderRadius: 8, padding: 8, marginTop: 6 },
  historyText: { flex: 1, fontSize: 12, color: colors.text, fontFamily: fonts.body },
  deleteText: { fontSize: 12, color: colors.danger, textDecorationLine: "underline" },
});
