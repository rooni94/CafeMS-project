import React from "react";
import { useNavigation } from "@react-navigation/native";
import { Button } from "../../components/ui";
import { useAuth } from "../../context/AuthContext";
import DashboardShell from "./components/DashboardShell";
import DashboardAccessDenied from "./components/DashboardAccessDenied";
import DashboardSection from "./components/DashboardSection";
import { hasAny } from "./components/permissions";
import { useI18n } from "../../i18n";

const DashboardSubcategories: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user, permissions } = useAuth();
  const { t } = useI18n();

  const allowed = hasAny(user, permissions, ["can_manage_categories", "can_manage_subcategories"]);
  if (!allowed) {
    return (
      <DashboardAccessDenied
        title={t("dashboard.subcategoriesDeniedTitle", "الأقسام الفرعية")}
        subtitle={t("dashboard.subcategoriesDeniedSubtitle", "إدارة الأقسام الفرعية.")}
      />
    );
  }

  return (
    <DashboardShell
      title={t("dashboard.subcategoriesTitle", "التصنيفات الفرعية")}
      subtitle={t("dashboard.subcategoriesSubtitle", "تم دمج إدارة التصنيفات ضمن شاشة التصنيفات.")}
    >
      <DashboardSection
        title={t("dashboard.subcategoriesInfoTitle", "معلومة")}
        subtitle={t(
          "dashboard.subcategoriesInfoSubtitle",
          "لإدارة الفئات والتصنيفات الفرعية من مكان واحد انتقل إلى شاشة التصنيفات."
        )}
      >
        <Button
          title={t("dashboard.subcategoriesGoToCategories", "الانتقال إلى التصنيفات")}
          onPress={() => navigation.navigate("DashboardCategories")}
        />
      </DashboardSection>
    </DashboardShell>
  );
};

export default DashboardSubcategories;
