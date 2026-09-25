import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts } from "@/lib/theme";

export function WorkoutLink({ wod }: { wod: string | null }) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable onPress={() => setOpen((v) => !v)}>
        <Text style={styles.link}>{open ? "Hide workout" : "View workout"}</Text>
      </Pressable>
      {open && (
        <View style={styles.box}>
          <Text style={wod ? styles.wodText : styles.emptyText}>
            {wod ?? "No workout posted, please check later."}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  link: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.ink, textDecorationLine: "underline" },
  box: { marginTop: 8, backgroundColor: colors.bgElevated, borderRadius: 8, padding: 10 },
  wodText: { fontSize: 14, color: colors.text, fontFamily: fonts.body },
  emptyText: { fontSize: 14, color: colors.muted, fontFamily: fonts.body },
});
