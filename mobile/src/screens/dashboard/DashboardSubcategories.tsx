import React from "react";
import { useNavigation } from "@react-navigation/native";
import { Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import { hasAny } from "./components/permissions";

const DashboardSubcategories: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, permissions } = useAuth();

  const allowed = hasAny(user, permissions, ["can_manage_categories", "can_manage_subcategories"]);
  if (!allowed) {
    return <DashboardAccessDenied title="الأقسام الفرعية" subtitle="إدارة الأقسام الفرعية." />;
  }

  return (
    <DashboardShell title="التصنيفات الفرعية" subtitle="تم دمج إدارة التصنيفات ضمن شاشة التصنيفات.">
      <DashboardSection title="معلومة" subtitle="لإدارة الفئات والتصنيفات الفرعية من مكان واحد انتقل إلى شاشة التصنيفات.">
        <Button title="الانتقال إلى التصنيفات" onPress={() => navigation.navigate("DashboardCategories")} />
      </DashboardSection>
    </DashboardShell>
  );
};

export default DashboardSubcategories;
