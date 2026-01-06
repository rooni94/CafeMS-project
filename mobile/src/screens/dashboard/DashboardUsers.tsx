import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View, I18nManager } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Input } from "../../components/ui";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import { User } from "../../types";
import { useAuth } from "../../context/AuthContext";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import DashboardListItem from "./components/DashboardListItem";
import { has } from "./components/permissions";

const roles: Array<"customer" | "staff" | "supervisor" | "manager"> = ["customer", "staff", "supervisor", "manager"];

const roleLabel = (role: string) => {
  if (role === "manager") return "مدير";
  if (role === "supervisor") return "مشرف";
  if (role === "staff") return "موظف";
  return "عميل";
};

const DashboardUsers: React.FC = () => {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const allowed = has(user, permissions, "can_manage_users");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "staff" | "supervisor" | "manager">("staff");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["dashboard", "users"],
    enabled: allowed,
    queryFn: async () => {
      const res = await api.get("auth/users/");
      return res.data?.results || res.data || [];
    },
  });

  if (!allowed) {
    return <DashboardAccessDenied title="المستخدمون" subtitle="إدارة المستخدمين" />;
  }

  const resetForm = () => {
    setEditingId(null);
    setUsername("");
    setPassword("");
    setRole("staff");
    setPhone("");
    setEmail("");
  };

  const saveUser = async () => {
    if (!username.trim() || (!editingId && !password.trim())) {
      Alert.alert("بيانات ناقصة", "أدخل اسم المستخدم وكلمة المرور عند الإنشاء.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        username: username.trim(),
        role,
        phone: phone || undefined,
        email: email || undefined,
      };
      if (password.trim()) payload.password = password;

      if (editingId) {
        await api.patch(`auth/users/${editingId}/`, payload);
      } else {
        await api.post("auth/users/", payload);
      }
      qc.invalidateQueries({ queryKey: ["dashboard", "users"] });
      Alert.alert("تم الحفظ", editingId ? "تم تحديث المستخدم." : "تم إنشاء المستخدم.");
      resetForm();
    } catch {
      Alert.alert("تعذر الحفظ", "حدث خطأ أثناء حفظ المستخدم.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (u: User) => {
    setEditingId(u.id);
    setUsername(u.username);
    setPassword("");
    setRole((u.role as any) || "staff");
    setPhone(u.phone || "");
    setEmail(u.email || "");
  };

  const deleteUser = async (id: number) => {
    Alert.alert("حذف المستخدم", "هل أنت متأكد؟", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`auth/users/${id}/`);
            qc.invalidateQueries({ queryKey: ["dashboard", "users"] });
            if (editingId === id) resetForm();
          } catch {
            Alert.alert("تعذر الحذف", "حدث خطأ أثناء حذف المستخدم.");
          }
        },
      },
    ]);
  };

  return (
    <DashboardShell title="المستخدمون" subtitle="إدارة المستخدمين وبياناتهم وصلاحياتهم.">
      <DashboardSection title={editingId ? "تعديل مستخدم" : "إضافة مستخدم"} subtitle="املأ الحقول ثم احفظ.">
        <Input label="اسم المستخدم" value={username} onChangeText={setUsername} placeholder="مثال: admin" />
        <Input
          label={editingId ? "كلمة المرور (اختياري)" : "كلمة المرور"}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          hint={editingId ? "اتركها فارغة إن لم ترغب بتغييرها." : undefined}
        />

        <Text style={[styles.label, { color: theme.palette.muted }]}>الدور</Text>
        <View style={styles.rolesRow}>
          {roles.map((r) => (
            <Button key={r} title={roleLabel(r)} variant={role === r ? "primary" : "ghost"} onPress={() => setRole(r)} />
          ))}
        </View>

        <Input label="رقم الجوال" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="05xxxxxxxx" />
        <Input label="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="name@example.com" />

        <Button title={saving ? "جارٍ الحفظ..." : "حفظ"} onPress={saveUser} disabled={saving} />
        {editingId ? <Button title="إلغاء التعديل" variant="ghost" onPress={resetForm} /> : null}
      </DashboardSection>

      <DashboardSection title="قائمة المستخدمين" subtitle={isLoading ? "جاري التحميل..." : "اضغط للتعديل أو استخدم حذف."}>
        {users.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>لا يوجد مستخدمون.</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {users.slice(0, 50).map((u) => (
              <DashboardListItem
                key={u.id}
                title={u.username}
                subtitle={`${roleLabel((u.role as any) || "")} • ${u.email || "بدون بريد"} • ${u.phone || "بدون رقم"}`}
                icon="person-circle-outline"
                onPress={() => startEdit(u)}
                right={
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button title="تعديل" variant="secondary" onPress={() => startEdit(u)} />
                    <Button title="حذف" variant="ghost" onPress={() => deleteUser(u.id)} />
                  </View>
                }
              />
            ))}
          </View>
        )}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (_theme: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    rolesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: I18nManager.isRTL ? "right" : "left",
    },
    empty: {
      textAlign: I18nManager.isRTL ? "right" : "left",
      fontSize: 13,
    },
  });

export default DashboardUsers;
