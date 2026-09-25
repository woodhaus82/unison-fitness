import { useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";

// The reset link opens in the phone's browser and completes on the web
// app (which already has a working reset flow) rather than trying to
// deep-link back into this native app — simplest correct option for now,
// since it's the same underlying Supabase Auth account either way.
const WEB_APP_URL = "https://unison-fitness-web.vercel.app";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleReset() {
    setPending(true);
    await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${WEB_APP_URL}/auth/confirm?next=/reset-password`,
    });
    setPending(false);
    // Always the same message, regardless of whether the email exists.
    setMessage("If an account exists for that email, a reset link is on its way — open it in your browser.");
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset your password</Text>
      <Text style={styles.subtitle}>We&apos;ll email you a link to set a new one.</Text>

      {message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          style={styles.input}
        />
      </View>

      <Pressable style={styles.button} onPress={handleReset} disabled={pending}>
        {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset link</Text>}
      </Pressable>

      <Link href="/login" style={styles.link}>
        Back to log in
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "600", color: "#171717" },
  subtitle: { marginTop: 4, fontSize: 14, color: "#737373" },
  field: { marginTop: 20 },
  label: { fontSize: 14, fontWeight: "500", color: "#171717", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: "#d4d4d4",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    marginTop: 24,
    backgroundColor: "#171717",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  messageBox: { marginTop: 16, backgroundColor: "#f0fdf4", borderRadius: 8, padding: 12 },
  messageText: { color: "#15803d", fontSize: 14 },
  link: { marginTop: 16, fontSize: 14, color: "#171717", fontWeight: "500", textDecorationLine: "underline" },
});
