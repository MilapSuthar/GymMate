import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { router } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/authStore";
import { authApi } from "@/api/auth";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(1, "Password required"),
});

type FormData = z.infer<typeof schema>;

export default function LogInScreen() {
  const { setTokens, setUser } = useAuthStore();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data);
      await setTokens(res.accessToken, res.refreshToken);
      setUser(res.user);
      router.replace("/(app)/discover");
    } catch (err: unknown) {
      Alert.alert("Error", (err as Error).message ?? "Login failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome back</Text>

      <Controller control={control} name="email" render={({ field: { onChange, value } }) => (
        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="you@example.com" placeholderTextColor="#555" keyboardType="email-address" autoCapitalize="none" />
          {errors.email && <Text style={styles.error}>{errors.email.message}</Text>}
        </View>
      )} />

      <Controller control={control} name="password" render={({ field: { onChange, value } }) => (
        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput style={styles.input} value={value} onChangeText={onChange} placeholder="Your password" placeholderTextColor="#555" secureTextEntry />
          {errors.password && <Text style={styles.error}>{errors.password.message}</Text>}
        </View>
      )} />

      <TouchableOpacity style={[styles.btn, isSubmitting && styles.btnDisabled]} onPress={handleSubmit(onSubmit)} disabled={isSubmitting}>
        <Text style={styles.btnText}>{isSubmitting ? "Logging in..." : "Log In"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/(auth)/sign-up")}>
        <Text style={styles.link}>Don't have an account? Sign up</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f0f0f", padding: 24, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: "800", color: "#fff", marginBottom: 32 },
  field: { marginBottom: 20 },
  label: { color: "#aaa", fontSize: 13, marginBottom: 6, fontWeight: "600" },
  input: { backgroundColor: "#1a1a1a", color: "#fff", borderRadius: 12, padding: 14, fontSize: 16, borderWidth: 1, borderColor: "#2a2a2a" },
  error: { color: "#ff4d4d", fontSize: 12, marginTop: 4 },
  btn: { backgroundColor: "#FF6B35", borderRadius: 14, padding: 16, alignItems: "center", marginTop: 8 },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 17 },
  link: { color: "#aaa", textAlign: "center", marginTop: 20 },
});
