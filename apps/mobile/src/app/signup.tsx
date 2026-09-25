import { useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";

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
        {pending ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Sign up</Text>}
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
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: colors.bg },
  title: { fontSize: 26, fontFamily: fonts.heading, color: colors.ink },
  subtitle: { marginTop: 6, fontSize: 14, color: colors.muted, fontFamily: fonts.body },
  field: { marginTop: 20 },
  label: { fontSize: 14, fontFamily: fonts.bodyMedium, color: colors.ink, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    fontFamily: fonts.body,
  },
  button: {
    marginTop: 24,
    backgroundColor: colors.brand,
    borderRadius: 999,
    paddingVertical: 13,
    alignItems: "center",
  },
  buttonText: { color: "#000", fontSize: 16, fontFamily: fonts.bodySemiBold },
  errorBox: { marginTop: 16, backgroundColor: colors.dangerBg, borderRadius: 8, padding: 12 },
  errorText: { color: colors.danger, fontSize: 14, fontFamily: fonts.body },
  messageBox: { marginTop: 16, backgroundColor: colors.successBg, borderRadius: 8, padding: 12 },
  messageText: { color: colors.success, fontSize: 14, fontFamily: fonts.body },
  footer: { marginTop: 24, flexDirection: "row" },
  footerText: { fontSize: 14, color: colors.muted, fontFamily: fonts.body },
  footerLink: { fontSize: 14, color: colors.ink, fontFamily: fonts.bodyMedium, textDecorationLine: "underline" },
});
