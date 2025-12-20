import { NavigationProp } from "@react-navigation/native";
import { AppStackParamList, MainTabParamList } from "./AppNavigator";

export const goToTab = (
  navigation: NavigationProp<AppStackParamList>,
  tab: keyof MainTabParamList,
  params?: MainTabParamList[typeof tab]
) => {
  const payload = params ? { screen: tab, params } : { screen: tab };
  const parent = navigation.getParent?.();
  const target =
    parent && typeof parent.navigate === "function" ? parent : navigation;
  (target.navigate as any)("Tabs", payload);
};

export const goToStack = <Route extends keyof AppStackParamList>(
  navigation: NavigationProp<AppStackParamList>,
  route: Route,
  params?: AppStackParamList[Route]
) => {
  const parent = navigation.getParent?.();
  const target =
    parent && typeof parent.navigate === "function" ? parent : navigation;
  (target.navigate as any)(route, params);
};

export const safeGoBack = (
  navigation: NavigationProp<AppStackParamList> & { canGoBack?: () => boolean; goBack?: () => void },
  fallback?: { tab?: keyof MainTabParamList; stack?: keyof AppStackParamList; params?: any }
) => {
  try {
    if (navigation.canGoBack?.()) {
      navigation.goBack?.();
      return;
    }
  } catch {
    // ignore
  }

  if (fallback?.tab) {
    goToTab(navigation, fallback.tab, fallback.params);
    return;
  }

  if (fallback?.stack) {
    goToStack(navigation, fallback.stack as any, fallback.params);
    return;
  }
};
