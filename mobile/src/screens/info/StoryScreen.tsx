import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { Button } from "../../components/ui";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import { useI18n } from "../../i18n";

const StoryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(isRTL), [isRTL]);

  return (
    <DashboardShell title={t("story.title", "CafeMS Demo")} subtitle={t("story.subtitle", "تعرف على قصتنا ورؤيتنا ومزايا الخدمة.")}>
      <DashboardSection title={t("story.aboutTitle", "نبذة")} subtitle={t("story.aboutSubtitle", "حكاية بدأت بفكرة بسيطة")}>
        <Text style={[styles.paragraph, { color: theme.palette.text }]}>
          {t(
            "story.aboutBody",
            "CafeMS Demo بدأت كفكرة بسيطة: مكان يجتمع فيه الأصدقاء للاستمتاع بسندويتشات لذيذة ومشروبات طازجة وخدمة سريعة وودودة. مع الوقت تحولت هذه الفكرة إلى علامة موثوقة في الحي، تقدم تجربة مختلفة عن الكافيهات التقليدية."
          )}
        </Text>
      </DashboardSection>

      <DashboardSection title={t("story.visionTitle", "رؤيتنا")} subtitle={t("story.visionSubtitle", "الخيار الأول للوجبة السريعة")}>
        <Text style={[styles.paragraph, { color: theme.palette.text }]}>
          {t(
            "story.visionBody",
            "أن نكون الخيار الأول لكل شخص يبحث عن وجبة سريعة، طازجة، وبسعر مناسب، سواءً للاستلام من الفرع أو التوصيل للمنزل أو مكان العمل."
          )}
        </Text>
      </DashboardSection>

      <DashboardSection title={t("story.highlightsTitle", "ماذا يميزنا؟")} subtitle={t("story.highlightsSubtitle", "نقاط نعتز بها")}>
        <View style={styles.list}>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.highlight1", "• تحضير الطلبات عند الطلب باستخدام مكونات مختارة بعناية.")}
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.highlight2", "• قائمة متنوعة تناسب مختلف الأذواق.")}
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.highlight3", "• إمكانية الطلب أونلاين وتتبع حالة الطلب لحظة بلحظة.")}
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.highlight4", "• فريق عمل ودود يحرص على رضا العميل في كل مرة.")}
          </Text>
        </View>
      </DashboardSection>

      <DashboardSection title={t("story.digitalTitle", "خدمتنا الإلكترونية")} subtitle={t("story.digitalSubtitle", "كل ما تحتاجه من داخل التطبيق")}>
        <Text style={[styles.paragraph, { color: theme.palette.text }]}>
          {t("story.digitalIntro", "من خلال هذا التطبيق يمكنك:")}
        </Text>
        <View style={styles.list}>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.digitalBullet1", "• استعراض القائمة واختيار الأطباق المفضلة.")}
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.digitalBullet2", "• إضافة الطلب إلى السلة وتحديد طريقة الاستلام والدفع.")}
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.digitalBullet3", "• إنشاء حساب لمتابعة طلباتك السابقة والاحتفاظ بعناوينك.")}
          </Text>
          <Text style={[styles.listItem, { color: theme.palette.text }]}>
            {t("story.digitalBullet4", "• تتبع طلبك ومعرفة حالته بدقة حتى لحظة الاستلام.")}
          </Text>
        </View>

        <Text style={[styles.note, { color: theme.palette.muted }]}>
          {t("story.note", "نسعد بخدمتكم دائماً، ويسعدنا سماع اقتراحاتكم عبر صفحة \"اتصل بنا\".")}
        </Text>

        <Button title={t("story.contactButton", "تواصل معنا")} variant="secondary" onPress={() => navigation.navigate("Contact")} />
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (isRTL: boolean) =>
  StyleSheet.create({
  paragraph: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: isRTL ? "right" : "left",
  },
  list: {
    gap: 8,
  },
  listItem: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: isRTL ? "right" : "left",
  },
  note: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    textAlign: isRTL ? "right" : "left",
  },
});

export default StoryScreen;
