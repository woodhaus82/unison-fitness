import { useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";

export default function SignupScreen() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSignup() {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setPending(true);
    setError(null);
    const { error, data } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setPending(false);
    if (error) {
      setError(error.message);
      return;
    }
    if (!data.session) {
      setMessage("Check your email to confirm your account, then log in.");
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.subtitle}>Book into classes at Unison Fitness</Text>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <View style={styles.field}>
        <Text style={styles.label}>Full name</Text>
        <TextInput value={fullName} onChangeText={setFullName} autoComplete="name" style={styles.input} />
      </View>

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
          autoComplete="new-password"
          style={styles.input}
        />
      </View>

      <Pressable style={styles.button} onPress={handleSignup} disabled={pending}>
        {pending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign up</Text>}
      </Pressable>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <Link href="/login" style={styles.footerLink}>
          Log in
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
  messageBox: { marginTop: 16, backgroundColor: "#f0fdf4", borderRadius: 8, padding: 12 },
  messageText: { color: "#15803d", fontSize: 14 },
  footer: { marginTop: 24, flexDirection: "row" },
  footerText: { fontSize: 14, color: "#737373" },
  footerLink: { fontSize: 14, color: "#171717", fontWeight: "500", textDecorationLine: "underline" },
});
