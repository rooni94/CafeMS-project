import React, { useMemo, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { WebView } from "react-native-webview";

import { Button } from "../../components/ui";
import { api, parseApiError } from "../../services/api";
import Screen from "../../components/Screen";
import { useTheme } from "../../theme";
import { useI18n } from "../../i18n";

const CheckoutPaymentWebViewScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const theme = useTheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);

  const checkoutUrl = String(route.params?.checkoutUrl || "");

  const hostPrefix = useMemo(() => {
    try {
      const parsed = new URL(checkoutUrl);
      return `${parsed.protocol}//${parsed.host}`;
    } catch {
      return "";
    }
  }, [checkoutUrl]);

  const resolveSessionAndNavigate = async (targetUrl: string) => {
    if (resolving) return;
    setResolving(true);
    try {
      let sessionId = "";
      try {
        const parsed = new URL(targetUrl);
        sessionId = parsed.searchParams.get("session_id") || "";
      } catch {
        const match = targetUrl.match(/[?&]session_id=([^&]+)/);
        sessionId = match?.[1] ? decodeURIComponent(match[1]) : "";
      }

      if (!sessionId) {
        throw new Error("لم يتم العثور على session_id بعد الدفع.");
      }

      const res = await api.get("orders/stripe/session-status/", {
        params: { session_id: sessionId },
      });
      const orderId = Number(res.data?.order_id);
      if (!Number.isFinite(orderId)) {
        throw new Error("تم الدفع لكن لم يتم إنشاء الطلب بعد. حاول بعد ثوان.");
      }

      Alert.alert(
        t("checkout.orderCreatedTitle", "تم إنشاء الطلب"),
        t("checkout.onlineSuccessBody", "تم الدفع بنجاح. يمكنك الآن متابعة حالة الطلب.")
      );
      navigation.replace("OrderTracking", { orderId });
    } catch (error) {
      Alert.alert(
        t("checkout.paymentPendingTitle", "تم استلام الدفع"),
        parseApiError(
          error,
          t("checkout.paymentPendingBody", "تم الدفع لكن تأكيد الطلب ما زال قيد المعالجة. افتح تتبع الطلب بعد لحظات.")
        )
      );
      navigation.replace("OrderTracking");
    } finally {
      setResolving(false);
    }
  };

  if (!checkoutUrl) {
    return (
      <Screen scrollable={false} style={{ backgroundColor: theme.palette.background, padding: 12 }}>
        <View style={{ gap: 10 }}>
          <Button
            title={t("common.back", "رجوع")}
            onPress={() => navigation.goBack()}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen scrollable={false} style={{ backgroundColor: theme.palette.background }}>
      <View style={[styles.webviewWrap, { borderColor: theme.palette.border }]}> 
        {loading ? (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator color={theme.palette.accent} />
          </View>
        ) : null}

        <WebView
          source={{ uri: checkoutUrl }}
          onLoadEnd={() => setLoading(false)}
          onShouldStartLoadWithRequest={(request) => {
            const targetUrl = request.url || "";
            if (!targetUrl) return true;

            if (
              targetUrl.includes("/checkout/success") &&
              (!hostPrefix || targetUrl.startsWith(hostPrefix))
            ) {
              void resolveSessionAndNavigate(targetUrl);
              return false;
            }

            if (
              targetUrl.includes("/checkout/cancel") &&
              (!hostPrefix || targetUrl.startsWith(hostPrefix))
            ) {
              Alert.alert(
                t("checkout.paymentCancelledTitle", "تم إلغاء الدفع"),
                t(
                  "checkout.paymentCancelledBody",
                  "لم يتم إكمال عملية الدفع. يمكنك المحاولة مرة أخرى."
                )
              );
              navigation.goBack();
              return false;
            }

            return true;
          }}
        />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  webviewWrap: {
    flex: 1,
    overflow: "hidden",
    borderWidth: 0,
    borderRadius: 0,
    minHeight: 0,
  },
  loaderOverlay: {
    position: "absolute",
    inset: 0,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
  },
});

export default CheckoutPaymentWebViewScreen;
