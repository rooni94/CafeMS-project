import React, { useMemo, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
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
import { useI18n } from "../../i18n";

const roles: Array<"customer" | "staff" | "supervisor" | "manager"> = ["customer", "staff", "supervisor", "manager"];

const DashboardUsers: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const qc = useQueryClient();
  const { user, permissions } = useAuth();

  const roleLabel = (role: string) => {
    if (role === "manager") return t("dashboard.usersRoleManager", "مدير");
    if (role === "supervisor") return t("dashboard.usersRoleSupervisor", "مشرف");
    if (role === "staff") return t("dashboard.usersRoleStaff", "موظف");
    return t("dashboard.usersRoleCustomer", "عميل");
  };

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
    return (
      <DashboardAccessDenied
        title={t("dashboard.usersDeniedTitle", "المستخدمون")}
        subtitle={t("dashboard.usersDeniedSubtitle", "إدارة المستخدمين")}
      />
    );
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
      Alert.alert(
        t("dashboard.usersMissingTitle", "بيانات ناقصة"),
        t("dashboard.usersMissingBody", "أدخل اسم المستخدم وكلمة المرور عند الإنشاء.")
      );
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
      Alert.alert(
        t("dashboard.usersSaveTitle", "تم الحفظ"),
        editingId ? t("dashboard.usersSaveBodyUpdate", "تم تحديث المستخدم.") : t("dashboard.usersSaveBodyCreate", "تم إنشاء المستخدم.")
      );
      resetForm();
    } catch {
      Alert.alert(
        t("dashboard.usersSaveErrorTitle", "تعذر الحفظ"),
        t("dashboard.usersSaveErrorBody", "حدث خطأ أثناء حفظ المستخدم.")
      );
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
    Alert.alert(t("dashboard.usersDeleteTitle", "حذف المستخدم"), t("dashboard.usersDeleteConfirm", "هل أنت متأكد؟"), [
      { text: t("common.cancel", "إلغاء"), style: "cancel" },
      {
        text: t("common.delete", "حذف"),
        style: "destructive",
        onPress: async () => {
          try {
            await api.delete(`auth/users/${id}/`);
            qc.invalidateQueries({ queryKey: ["dashboard", "users"] });
            if (editingId === id) resetForm();
          } catch {
            Alert.alert(
              t("dashboard.usersDeleteErrorTitle", "تعذر الحذف"),
              t("dashboard.usersDeleteErrorBody", "حدث خطأ أثناء حذف المستخدم.")
            );
          }
        },
      },
    ]);
  };

  return (
    <DashboardShell
      title={t("dashboard.usersTitle", "المستخدمون")}
      subtitle={t("dashboard.usersSubtitle", "إدارة المستخدمين وبياناتهم وصلاحياتهم.")}
    >
      <DashboardSection
        title={editingId ? t("dashboard.usersEditTitle", "تعديل مستخدم") : t("dashboard.usersAddTitle", "إضافة مستخدم")}
        subtitle={t("dashboard.usersFormSubtitle", "املأ الحقول ثم احفظ.")}
      >
        <Input
          label={t("dashboard.usersUsernameLabel", "اسم المستخدم")}
          value={username}
          onChangeText={setUsername}
          placeholder={t("dashboard.usersUsernamePlaceholder", "مثال: admin")}
        />
        <Input
          label={
            editingId
              ? t("dashboard.usersPasswordLabelOptional", "كلمة المرور (اختياري)")
              : t("dashboard.usersPasswordLabel", "كلمة المرور")
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          hint={editingId ? t("dashboard.usersPasswordHintOptional", "اتركها فارغة إن لم ترغب بتغييرها.") : undefined}
        />

        <Text style={[styles.label, { color: theme.palette.muted }]}>{t("dashboard.usersRoleLabel", "الدور")}</Text>
        <View style={styles.rolesRow}>
          {roles.map((r) => (
            <Button key={r} title={roleLabel(r)} variant={role === r ? "primary" : "ghost"} onPress={() => setRole(r)} />
          ))}
        </View>

        <Input
          label={t("dashboard.usersPhoneLabel", "رقم الجوال")}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          placeholder="05xxxxxxxx"
        />
        <Input
          label={t("dashboard.usersEmailLabel", "البريد الإلكتروني")}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          placeholder="name@example.com"
        />

        <Button title={saving ? t("common.saving", "جارٍ الحفظ...") : t("common.save", "حفظ")} onPress={saveUser} disabled={saving} />
        {editingId ? <Button title={t("dashboard.usersCancelEdit", "إلغاء التعديل")} variant="ghost" onPress={resetForm} /> : null}
      </DashboardSection>

      <DashboardSection
        title={t("dashboard.usersListTitle", "قائمة المستخدمين")}
        subtitle={
          isLoading
            ? t("dashboard.usersLoading", "جاري التحميل...")
            : t("dashboard.usersListSubtitle", "اضغط للتعديل أو استخدم حذف.")
        }
      >
        {users.length === 0 ? (
          <Text style={[styles.empty, { color: theme.palette.muted }]}>{t("dashboard.usersEmpty", "لا يوجد مستخدمون.")}</Text>
        ) : (
          <View style={{ gap: 10 }}>
            {users.slice(0, 50).map((u) => (
              <DashboardListItem
                key={u.id}
                title={u.username}
                subtitle={`${roleLabel((u.role as any) || "")} • ${u.email || t("dashboard.usersNoEmail", "بدون بريد")} • ${u.phone || t(
                  "dashboard.usersNoPhone",
                  "بدون رقم"
                )}`}
                icon="person-circle-outline"
                onPress={() => startEdit(u)}
                right={
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <Button title={t("dashboard.usersEditButton", "تعديل")} variant="secondary" onPress={() => startEdit(u)} />
                    <Button title={t("common.delete", "حذف")} variant="ghost" onPress={() => deleteUser(u.id)} />
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

const createStyles = (_theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    rolesRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      textAlign: isRTL ? "right" : "left",
    },
    empty: {
      textAlign: isRTL ? "right" : "left",
      fontSize: 13,
    },
  });

export default DashboardUsers;
