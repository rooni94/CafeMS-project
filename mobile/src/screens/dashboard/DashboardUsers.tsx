import React, { useState } from "react";
import { Text, StyleSheet, View, TextInput, Alert } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, Button } from "../../components/ui";
import { useTheme } from "../../theme";
import { api } from "../../services/api";
import { User } from "../../types";
import DashboardShell from "./components/DashboardShell";

const roles: ("customer" | "staff" | "supervisor" | "manager")[] = ["customer", "staff", "supervisor", "manager"];

const DashboardUsers: React.FC = () => {
  const theme = useTheme();
  const qc = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "staff" | "supervisor" | "manager">("staff");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const { data: users } = useQuery<User[]>({
    queryKey: ["dashboard-users"],
    queryFn: async () => {
      const res = await api.get("auth/users/");
      return res.data.results || res.data;
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setUsername("");
    setPassword("");
    setRole("staff");
    setPhone("");
    setEmail("");
  };

  const saveUser = async () => {
    if (!username.trim() || (!editingId && !password)) {
      Alert.alert("تنبيه", "أدخل اسم المستخدم وكلمة المرور (للإنشاء).");
      return;
    }
    const payload: any = {
      username: username.trim(),
      role,
      phone: phone || undefined,
      email: email || undefined,
    };
    if (password) payload.password = password;
    try {
      if (editingId) {
        await api.patch(`auth/users/${editingId}/`, payload);
      } else {
        await api.post("auth/users/", payload);
      }
      qc.invalidateQueries({ queryKey: ["dashboard-users"] });
      Alert.alert("تم", editingId ? "تم تحديث المستخدم." : "تم إنشاء المستخدم.");
      resetForm();
    } catch {
      Alert.alert("خطأ", "تعذر حفظ المستخدم.");
    }
  };

  const editUser = (u: User) => {
    setEditingId(u.id);
    setUsername(u.username);
    setPassword("");
    setRole((u.role as any) || "staff");
    setPhone(u.phone || "");
    setEmail(u.email || "");
  };

  const deleteUser = async (id: number) => {
    try {
      await api.delete(`auth/users/${id}/`);
      qc.invalidateQueries({ queryKey: ["dashboard-users"] });
      if (editingId === id) resetForm();
    } catch {
      Alert.alert("خطأ", "تعذر حذف المستخدم.");
    }
  };

  return (
    <DashboardShell title="المستخدمون" subtitle="إضافة مستخدمين وتعديل الأدوار وكلمات المرور.">
        <Card>
          <Text style={styles.title}>إدارة المستخدمين</Text>
          <Text style={styles.helper}>إنشاء وتعديل وحذف المستخدمين مع تحديد الدور (عميل، موظف، مشرف، مدير).</Text>
        </Card>

        <Card style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>{editingId ? "تعديل مستخدم" : "إنشاء مستخدم جديد"}</Text>
          <TextInput placeholder="اسم المستخدم" value={username} onChangeText={setUsername} style={styles.input} textAlign="right" />
          <TextInput
            placeholder="كلمة المرور (اتركها فارغة إن لم ترغب بتغييرها)"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
            textAlign="right"
          />
          <View style={styles.rolesRow}>
            {roles.map((r) => (
              <Button
                key={r}
                title={r === "manager" ? "مدير" : r === "supervisor" ? "مشرف" : r === "staff" ? "موظف" : "عميل"}
                variant={role === r ? "primary" : "ghost"}
                onPress={() => setRole(r)}
              />
            ))}
          </View>
          <TextInput placeholder="الجوال" value={phone} onChangeText={setPhone} style={styles.input} textAlign="right" />
          <TextInput placeholder="البريد الإلكتروني" value={email} onChangeText={setEmail} style={styles.input} textAlign="right" />
          <Button title="حفظ" onPress={saveUser} />
          {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>قائمة المستخدمين</Text>
          {users && users.length > 0 ? (
            <View style={{ marginTop: 8, gap: 10 }}>
              {users.slice(0, 20).map((u) => (
                <View key={u.id} style={styles.row}>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text style={styles.userName}>{u.username}</Text>
                    <Text style={styles.sub}>الدور: {u.role}</Text>
                    {u.email ? <Text style={styles.sub}>{u.email}</Text> : null}
                    {u.phone ? <Text style={styles.sub}>{u.phone}</Text> : null}
                  </View>
                  <View style={{ gap: 6 }}>
                    <Button title="تعديل" variant="secondary" onPress={() => editUser(u)} />
                    <Button title="حذف" variant="ghost" onPress={() => deleteUser(u.id)} />
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.helper}>لا يوجد مستخدمون.</Text>
          )}
        </Card>
    </DashboardShell>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "right",
  },
  helper: {
    fontSize: 13,
    color: "#6b7280",
    textAlign: "right",
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "right",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
    textAlign: "right",
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  userName: {
    fontSize: 14,
    fontWeight: "700",
  },
  sub: {
    fontSize: 12,
    color: "#6b7280",
  },
  rolesRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 6,
  },
});

export default DashboardUsers;
