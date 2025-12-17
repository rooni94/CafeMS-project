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
