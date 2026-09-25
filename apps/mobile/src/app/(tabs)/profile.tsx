import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";

// Admin/coach tools live in the web portal, not as native screens here —
// same split Wodify itself uses (member app vs. web backend).
const WEB_ADMIN_URL = "https://unison-fitness-web.vercel.app/admin/schedule";

export default function ProfileScreen() {
  const { profile } = useAuth();
  const isStaff = profile?.role === "admin" || profile?.role === "coach";

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

      {isStaff && (
        <Pressable style={styles.adminButton} onPress={() => Linking.openURL(WEB_ADMIN_URL)}>
          <Text style={styles.adminButtonText}>Open Admin Portal</Text>
        </Pressable>
      )}

      <Pressable style={styles.button} onPress={() => supabase.auth.signOut()}>
        <Text style={styles.buttonText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: 16 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: colors.muted, fontFamily: fonts.body },
  value: { fontSize: 16, color: colors.ink, marginTop: 2, fontFamily: fonts.body },
  adminButton: {
    marginTop: 8,
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  adminButtonText: { fontSize: 15, fontFamily: fonts.bodySemiBold, color: "#000" },
  button: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: { fontSize: 15, fontFamily: fonts.bodySemiBold, color: colors.ink },
});
