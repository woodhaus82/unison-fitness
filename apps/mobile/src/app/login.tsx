import { useState } from "react";
import { Link } from "expo-router";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { supabase } from "@/lib/supabase";
import { colors, fonts } from "@/lib/theme";

const LOGO_RATIO = 2434 / 528;
const LOGO_HEIGHT = 32;

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
      <Image
        source={require("../../assets/logo-white.png")}
        resizeMode="contain"
        style={styles.logo}
      />
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
        {pending ? <ActivityIndicator color="#000" /> : <Text style={styles.buttonText}>Log in</Text>}
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
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24, backgroundColor: colors.bg },
  logo: { height: LOGO_HEIGHT, width: LOGO_HEIGHT * LOGO_RATIO, marginBottom: 24 },
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
  link: { marginTop: 16, fontSize: 14, color: colors.ink, fontFamily: fonts.bodyMedium, textDecorationLine: "underline" },
  footer: { marginTop: 24, flexDirection: "row" },
  footerText: { fontSize: 14, color: colors.muted, fontFamily: fonts.body },
  footerLink: { fontSize: 14, color: colors.ink, fontFamily: fonts.bodyMedium, textDecorationLine: "underline" },
});
