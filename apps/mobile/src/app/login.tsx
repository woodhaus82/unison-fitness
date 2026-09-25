import { useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setPending(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setPending(false);
    if (error) setError(error.message);
    // On success, the root layout's Stack.Protected guard reacts to the
    // auth state change and switches to the (tabs) group automatically.
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Log in</Text>
      <Text style={styles.subtitle}>Unison Fitness member portal</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
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

      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          style={styles.input}
        />
      </View>

      <Pressable style={styles.button} onPress={handleLogin} disabled={pending}>
        {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Log in</Text>}
      </Pressable>

      <Link href="/forgot-password" style={styles.link}>
        Forgot your password?
      </Link>

      <View style={styles.footer}>
        <Text style={styles.footerText}>New here? </Text>
        <Link href="/signup" style={styles.footerLink}>
          Create an account
        </Link>
      </View>
    </KeyboardAvoidingView>
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
  errorBox: { marginTop: 16, backgroundColor: "#fef2f2", borderRadius: 8, padding: 12 },
  errorText: { color: "#b91c1c", fontSize: 14 },
  link: { marginTop: 16, fontSize: 14, color: "#171717", fontWeight: "500", textDecorationLine: "underline" },
  footer: { marginTop: 24, flexDirection: "row" },
  footerText: { fontSize: 14, color: "#737373" },
  footerLink: { fontSize: 14, color: "#171717", fontWeight: "500", textDecorationLine: "underline" },
});
