import React, { useCallback, useMemo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import QRCode from "react-native-qrcode-svg";

import { Button } from "../../components/ui";
import DashboardTile from "../dashboard/components/DashboardTile";
import CurrencyAmount from "../../components/CurrencyAmount";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { useTheme } from "../../theme";
import DashboardShell from "../dashboard/components/DashboardShell";
import DashboardSection from "../dashboard/components/DashboardSection";
import DashboardListItem from "../dashboard/components/DashboardListItem";
import { useI18n } from "../../i18n";

type LoyaltyProfile = {
  points?: number;
  balance?: number;
  tier?: string;
  member_code?: string;
  membership_id?: string;
  qr_token?: string;
  apple_wallet_pass_url?: string;
  google_wallet_pass_url?: string;
};

type LoyaltyTransaction = {
  id: number;
  points?: number;
  amount?: number;
  created_at: string;
  description?: string;
};

const RewardsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { copy, t, isRTL } = useI18n();
  const styles = useMemo(() => createStyles(theme, isRTL), [theme, isRTL]);
  const { user, accessToken } = useAuth();
  const isAuthenticated = !!user && !!accessToken;
  const isGuest = !isAuthenticated;

  const handleWalletPass = useCallback(
    async (platform: "apple" | "google", url?: string) => {
      if (!url) return;
      try {
        await api.post(`loyalty/pass/${platform}/`);
      } catch {
        // Keep going to open the pass URL even if prep fails.
      }
      Linking.openURL(url);
    },
    [accessToken],
  );

  const tiers = useMemo(
    () => [
      {
        name: t("rewards.tier1Name", "المستوى 1"),
        points: t("rewards.tier1Points", "0 - 299 نقطة"),
        perks: [
          t("rewards.tier1Perk1", "خصم 10% على الطلبات"),
          t("rewards.tier1Perk2", "استبدال سريع عند الكاشير"),
        ],
      },
      {
        name: t("rewards.tier2Name", "المستوى 2"),
        points: t("rewards.tier2Points", "300 - 699 نقطة"),
        perks: [
          t("rewards.tier2Perk1", "خصم 15% على الطلبات"),
          t("rewards.tier2Perk2", "ترقية أسرع"),
          t("rewards.tier2Perk3", "مزايا موسمية"),
        ],
      },
      {
        name: t("rewards.tier3Name", "المستوى 3"),
        points: t("rewards.tier3Points", "700+ نقطة"),
        perks: [
          t("rewards.tier3Perk1", "خصومات أكبر"),
          t("rewards.tier3Perk2", "عروض حصرية"),
          t("rewards.tier3Perk3", "أولوية في الخدمة"),
        ],
      },
    ],
    [t],
  );

  const actions = useMemo(
    () => [
      {
        icon: "cart-outline",
        title: t("rewards.actionOrderTitle", "اطلب من التطبيق"),
        copy: t("rewards.actionOrderCopy", "كل طلب يزيد رصيدك من النقاط."),
      },
      {
        icon: "gift-outline",
        title: t("rewards.actionRedeemTitle", "استبدل مكافآتك"),
        copy: t("rewards.actionRedeemCopy", "حوّل نقاطك لخصومات أو هدايا."),
      },
      {
        icon: "people-outline",
        title: t("rewards.actionShareTitle", "شارك أصدقاءك"),
        copy: t("rewards.actionShareCopy", "قدّم دعوتك واحصل على نقاط إضافية."),
      },
    ],
    [t],
  );

  const { data: profile, isLoading: profileLoading } = useQuery<LoyaltyProfile>({
    queryKey: ["loyalty", "profile"],
    enabled: !isGuest,
    queryFn: async () => {
      const res = await api.get("loyalty/profile/");
      return res.data;
    },
  });

  const { data: transactions = [] } = useQuery<LoyaltyTransaction[]>({
    queryKey: ["loyalty", "transactions"],
    enabled: !isGuest,
    queryFn: async () => {
      const res = await api.get("loyalty/transactions/");
      return res.data?.results || res.data || [];
    },
  });

  return (
    <DashboardShell
      title={t("rewards.title", "المكافآت")}
      subtitle={t("rewards.subtitle", "تابع نقاطك واستبدلها بالمزايا المتاحة.")}
    >
      <DashboardSection
        title={t("rewards.summaryTitle", "ملخص النقاط")}
        subtitle={t("rewards.summarySubtitle", "تابع رصيدك والمستوى الحالي.")}
      >
        {isGuest ? (
          <View style={styles.guestBox}>
            <Text style={[styles.guestTitle, { color: theme.palette.text }]}>
              {t("rewards.guestTitle", "ابدأ رحلتك مع المكافآت")}
            </Text>
            <Text style={[styles.guestCopy, { color: theme.palette.muted }]}>
              {t("rewards.guestCopy", "بعد تسجيل الدخول ستحصل على نقاط مع كل طلب يمكنك استخدامها لاحقاً.")}
            </Text>
            <View style={styles.guestActions}>
              <DashboardTile
                title={copy.orders.login}
                subtitle={copy.orders.guestDescription}
                icon="log-in-outline"
                onPress={() => navigation.navigate("Login")}
                color={theme.palette.accent}
                style={{ width: "100%" }}
              />
              <DashboardTile
                title={copy.orders.register}
                subtitle={copy.orders.guestDescription}
                icon="person-add-outline"
                onPress={() => navigation.navigate("Register")}
                color={theme.palette.accentSoft}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        ) : (
          <View style={styles.summaryGrid}>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.palette.muted }]}>
                {t("rewards.pointsLabel", "النقاط")}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.palette.text }]}>
                {profileLoading ? t("rewards.pointsLoading", "جارٍ تحميل بيانات الولاء...") : profile?.points ?? 0}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.palette.muted }]}>
                {t("rewards.balanceLabel", "الرصيد")}
              </Text>
              <CurrencyAmount value={profile?.balance ?? 0} color={theme.palette.accent} symbolSize={12} textStyle={styles.balanceText} />
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.palette.muted }]}>
                {t("rewards.tierLabel", "المستوى")}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.palette.text }]}>{profile?.tier ?? "-"}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.palette.muted }]}>
                {t("rewards.memberCodeLabel", "رقم العضوية")}
              </Text>
              <Text style={[styles.summaryValue, { color: theme.palette.text }]}>{profile?.member_code ?? "-"}</Text>
            </View>
            {profile?.membership_id ? (
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, { color: theme.palette.muted }]}>
                  {t("rewards.membershipIdLabel", "معرّف العضوية")}
                </Text>
                <Text style={[styles.summaryValue, { color: theme.palette.text }]}>{profile.membership_id}</Text>
              </View>
            ) : null}
            {profile?.qr_token ? (
              <View style={styles.qrWrap}>
                <QRCode value={profile.qr_token} size={140} />
                <Text style={[styles.qrHint, { color: theme.palette.muted }]}>
                  {t("rewards.qrHint", "اعرض الكود عند الدفع لاحتساب نقاطك.")}
                </Text>
              </View>
            ) : null}
            {profile?.apple_wallet_pass_url ? (
              <Button
                title={t("rewards.appleWallet", "إضافة إلى Apple Wallet")}
                variant="secondary"
                onPress={() => Linking.openURL(profile.apple_wallet_pass_url!)}
              />
            ) : null}
            {profile?.google_wallet_pass_url ? (
              <Button
                title={t("rewards.googleWallet", "إضافة إلى Google Wallet")}
                variant="secondary"
                onPress={() => Linking.openURL(profile.google_wallet_pass_url!)}
              />
            ) : null}
          </View>
        )}
      </DashboardSection>

      {!isGuest ? (
        <DashboardSection
          title={t("rewards.transactionsTitle", "آخر الحركات")}
          subtitle={t("rewards.transactionsSubtitle", "أحدث العمليات في برنامج الولاء.")}
        >
          {transactions.length === 0 ? (
            <Text style={[styles.empty, { color: theme.palette.muted }]}>
              {t("rewards.transactionsEmpty", "لا توجد حركات بعد.")}
            </Text>
          ) : (
            <View style={{ gap: 10 }}>
              {transactions.slice(0, 20).map((item) => (
                <DashboardListItem
                  key={item.id}
                  title={item.description?.trim() ? item.description : t("rewards.transactionFallback", "حركة نقاط")}
                  subtitle={`${item.points ?? 0} ${t("rewards.pointsUnit", "نقطة")} • ${new Date(item.created_at).toLocaleString()}`}
                  icon="sparkles-outline"
                />
              ))}
            </View>
          )}
        </DashboardSection>
      ) : null}

      <DashboardSection
        title={t("rewards.programLevelsTitle", "مستويات البرنامج")}
        subtitle={t("rewards.programLevelsSubtitle", "كل مستوى يمنحك مزايا إضافية.")}
      >
        {tiers.map((tier) => (
          <View key={tier.name} style={[styles.tierCard, { borderColor: theme.palette.border, backgroundColor: theme.palette.surfaceAlt }]}>
            <View style={styles.tierHeader}>
              <Text style={[styles.tierName, { color: theme.palette.text }]}>{tier.name}</Text>
              <Text style={[styles.tierPoints, { color: theme.palette.accent }]}>{tier.points}</Text>
            </View>
            {tier.perks.map((perk) => (
              <View key={perk} style={styles.perkRow}>
                <View style={[styles.dot, { backgroundColor: theme.palette.accent }]} />
                <Text style={[styles.perkText, { color: theme.palette.text }]}>{perk}</Text>
              </View>
            ))}
          </View>
        ))}
      </DashboardSection>

      <DashboardSection
        title={t("rewards.earnPointsTitle", "كيف تكسب نقاطك؟")}
        subtitle={t("rewards.earnPointsSubtitle", "خطوات بسيطة لزيادة نقاطك.")}
      >
        {actions.map((action) => (
          <View key={action.title} style={styles.actionRow}>
            <View style={[styles.badge, { backgroundColor: theme.palette.surfaceAlt, borderColor: theme.palette.border }]}>
              <Ionicons name={action.icon as any} size={18} color={theme.palette.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.actionTitle, { color: theme.palette.text }]}>{action.title}</Text>
              <Text style={[styles.actionCopy, { color: theme.palette.muted }]}>{action.copy}</Text>
            </View>
          </View>
        ))}
      </DashboardSection>
    </DashboardShell>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>, isRTL: boolean) =>
  StyleSheet.create({
    guestBox: {
      gap: 10,
    },
    guestTitle: {
      fontSize: 16,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    guestCopy: {
      fontSize: 13,
      lineHeight: 20,
      textAlign: isRTL ? "right" : "left",
    },
    guestActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },
    summaryGrid: {
      gap: 8,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 10,
    },
    summaryLabel: {
      fontSize: 12,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    summaryValue: {
      fontSize: 13,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
      flex: 1,
    },
    balanceText: {
      fontSize: 13,
      fontWeight: "900",
    },
    empty: {
      fontSize: 13,
      textAlign: isRTL ? "right" : "left",
    },
    qrWrap: {
      alignItems: "center",
      gap: 10,
      marginTop: 6,
      marginBottom: 6,
    },
    qrHint: {
      fontSize: 12,
      textAlign: "center",
    },
    tierCard: {
      borderRadius: 20,
      borderWidth: 1,
      padding: 14,
      marginBottom: 12,
      gap: 8,
    },
    tierHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
    },
    tierName: {
      fontSize: 15,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    tierPoints: {
      fontSize: 12,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    perkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    perkText: {
      fontSize: 13,
      flex: 1,
      textAlign: isRTL ? "right" : "left",
    },
    actionRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 8,
    },
    badge: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    actionTitle: {
      fontSize: 14,
      fontWeight: "900",
      textAlign: isRTL ? "right" : "left",
    },
    actionCopy: {
      fontSize: 13,
      textAlign: isRTL ? "right" : "left",
    },
  });

export default RewardsScreen;
