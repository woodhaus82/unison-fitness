import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
  link: { fontSize: 14, fontWeight: "500", color: "#171717", textDecorationLine: "underline" },
  box: { marginTop: 8, backgroundColor: "#fafafa", borderRadius: 8, padding: 10 },
  wodText: { fontSize: 14, color: "#404040" },
  emptyText: { fontSize: 14, color: "#737373" },
});
