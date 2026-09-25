import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const { profile } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.field}>
        <Text style={styles.label}>Name</Text>
        <Text style={styles.value}>{profile?.full_name ?? "—"}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <Text style={styles.value}>{profile?.email}</Text>
      </View>
      <View style={styles.field}>
        <Text style={styles.label}>Role</Text>
        <Text style={styles.value}>{profile?.role}</Text>
      </View>

      <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: "#737373" },
  value: { fontSize: 16, color: "#171717", marginTop: 2 },
  button: {
    marginTop: 24,
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { fontSize: 15, fontWeight: "600", color: "#171717" },
});
