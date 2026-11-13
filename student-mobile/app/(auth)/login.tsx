import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from "react-native";
import { Link } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useLogin } from "../../src/hooks";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const login = useLogin();

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>TechnoOne Learn</Text>
      <Text style={styles.subtitle}>Law, IELTS, IOE, Doctors, Loksewa — all in one place</Text>

      {login.isError && <Text style={styles.error}>Login failed. Check your credentials.</Text>}

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        textContentType="username"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
      />
      <View style={styles.passwordWrap}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          secureTextEntry={!showPassword}
          textContentType="password"
          autoComplete="password"
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={() => setShowPassword((v) => !v)}>
          <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.rememberRow} onPress={() => setRememberMe((v) => !v)}>
        <Ionicons name={rememberMe ? "checkbox" : "square-outline"} size={20} color={rememberMe ? "#fff" : "#DBEAFE"} />
        <Text style={styles.rememberText}>Remember Me</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.button} onPress={() => login.mutate({ email, password, rememberMe })} disabled={login.isPending}>
        {login.isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sign In</Text>}
      </TouchableOpacity>

      <Link href="/(auth)/forgot-password" style={styles.link}>
        <Text style={styles.linkBold}>Forgot password?</Text>
      </Link>

        <Text>
          New here? <Text style={styles.linkBold}>Create an account</Text>
        </Text>
      </Link>
   </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#2563EB" },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", textAlign: "center", marginBottom: 4 },
  subtitle: { fontSize: 14, color: "#DBEAFE", textAlign: "center", marginBottom: 32 },
  input: { backgroundColor: "#fff", borderRadius: 10, padding: 14, marginBottom: 12, fontSize: 15 },
  passwordWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 10, marginBottom: 12 },
  passwordInput: { flex: 1, padding: 14, fontSize: 15 },
  eyeButton: { paddingHorizontal: 14 },
  rememberRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  rememberText: { fontSize: 13, color: "#fff", fontWeight: "600" },
  button: { backgroundColor: "#1E40AF", borderRadius: 10, padding: 16, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: "#FEE2E2", backgroundColor: "#DC2626", padding: 10, borderRadius: 8, marginBottom: 12, textAlign: "center" },
  link: { marginTop: 20, alignItems: "center" },
  linkBold: { fontWeight: "700", color: "#fff", textDecorationLine: "underline" },
});
