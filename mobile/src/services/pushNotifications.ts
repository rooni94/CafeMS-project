import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";

import { api } from "./api";

const STORAGE_KEY = "cafe_push_token";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const ensureAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
};

const getProjectId = () => {
  return Constants.easConfig?.projectId || Constants.expoConfig?.extra?.eas?.projectId;
};

export const registerForPushNotifications = async (): Promise<string | null> => {
  await ensureAndroidChannel();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const request = await Notifications.requestPermissionsAsync();
    finalStatus = request.status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = getProjectId();
  const tokenResponse = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  return tokenResponse.data;
};

export const syncPushToken = async (): Promise<string | null> => {
  const token = await registerForPushNotifications();
  if (!token) return null;

  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (stored === token) return token;

  await api.post("auth/push-tokens/", {
    token,
    platform: Platform.OS,
  });
  await AsyncStorage.setItem(STORAGE_KEY, token);
  return token;
};

export const clearPushToken = async () => {
  const token = await AsyncStorage.getItem(STORAGE_KEY);
  if (token) {
    try {
      await api.delete("auth/push-tokens/", { data: { token } });
    } catch (error) {
      console.warn("push token delete error", error);
    }
  }
  await AsyncStorage.removeItem(STORAGE_KEY);
};
