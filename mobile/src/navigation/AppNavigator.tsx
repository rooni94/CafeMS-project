import React, { useMemo } from "react";

import { NavigationContainer, DefaultTheme, useNavigation, useNavigationState } from "@react-navigation/native";

import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";

import { PanGestureHandler, State } from "react-native-gesture-handler";

import { View } from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";



import HomeScreen from "../screens/HomeScreen";

import MenuScreen from "../screens/menu/MenuScreen";

import OrderTrackingScreen from "../screens/orders/OrderTrackingScreen";

import ProfileScreen from "../screens/profile/ProfileScreen";

import AddressesScreen from "../screens/profile/AddressesScreen";

import CartScreen from "../screens/menu/CartScreen";

import CheckoutScreen from "../screens/menu/CheckoutScreen";

import LoginScreen from "../screens/auth/LoginScreen";

import RegisterScreen from "../screens/auth/RegisterScreen";

import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

import ContactScreen from "../screens/ContactScreen";

import AboutScreen from "../screens/info/AboutScreen";

import RewardsScreen from "../screens/info/RewardsScreen";

import TermsScreen from "../screens/info/TermsScreen";

import PrivacyScreen from "../screens/info/PrivacyScreen";

import ProductDetailsScreen from "../screens/menu/ProductDetailsScreen";

import MyHRScreen from "../screens/hr/MyHRScreen";



import DashboardHome from "../screens/dashboard/DashboardHome";

import DashboardOrders from "../screens/dashboard/DashboardOrders";

import DashboardInventory from "../screens/dashboard/DashboardInventory";

import DashboardMessages from "../screens/dashboard/DashboardMessages";

import DashboardUsers from "../screens/dashboard/DashboardUsers";

import DashboardSettings from "../screens/dashboard/DashboardSettings";

import DashboardReports from "../screens/dashboard/DashboardReports";

import DashboardProducts from "../screens/dashboard/DashboardProducts";

import DashboardCategories from "../screens/dashboard/DashboardCategories";

import DashboardSupport from "../screens/dashboard/DashboardSupport";

import DashboardSupportChat from "../screens/dashboard/DashboardSupportChat";

import DashboardLogs from "../screens/dashboard/DashboardLogs";

import DashboardRolePermissions from "../screens/dashboard/DashboardRolePermissions";

import DashboardHRDocuments from "../screens/dashboard/DashboardHRDocuments";

import DashboardHRRequests from "../screens/dashboard/DashboardHRRequests";

import DashboardTables from "../screens/dashboard/DashboardTables";

import DashboardPOS from "../screens/dashboard/DashboardPOS";

import DashboardLoyalty from "../screens/dashboard/DashboardLoyalty";

import HRDashboard from "../screens/dashboard/HRDashboard";



import { useCart } from "../context/CartContext";

import { useAuth } from "../context/AuthContext";

import TabBar from "../components/ui/TabBar";

import { useTheme } from "../theme";

import { useI18n } from "../i18n";



export type MainTabParamList = {

  Home: undefined;

  Menu: { categoryId?: number } | undefined;

  Orders?: undefined;

  Support?: undefined;

  MyHR?: undefined;

  Dashboard?: undefined;

  Profile: undefined;

};



type TabNavigationPayload = {

  screen?: keyof MainTabParamList;

  params?: MainTabParamList[keyof MainTabParamList];

};



export type AppStackParamList = {

  Tabs: TabNavigationPayload | undefined;

  Cart: undefined;

  Checkout: undefined;

  OrderTracking: { orderId?: number } | undefined;

  Login: undefined;

  Register: undefined;

  ResetPassword: undefined;

  Contact: undefined;

  About: undefined;

  ProductDetails: { productId: number };

  Rewards: undefined;

  Terms: undefined;

  Privacy: undefined;

  Addresses: undefined;

  MyHR: undefined;



  Dashboard: undefined;

  DashboardOrders: undefined;

  DashboardInventory: undefined;

  DashboardMessages: undefined;

  DashboardUsers: undefined;

  DashboardSettings: undefined;

  DashboardReports: undefined;

  DashboardProducts: undefined;

  DashboardCategories: undefined;

  DashboardTables: undefined;

  DashboardPOS: undefined;

  DashboardLoyalty: undefined;

  DashboardSupport: undefined;

  DashboardSupportChat: { id: number; owner_name?: string; subject?: string; is_guest?: boolean; guest_email?: string } | undefined;

  DashboardLogs: undefined;

  DashboardRolePermissions: undefined;

  DashboardHRDocuments: undefined;

  DashboardHRRequests: undefined;

  HRDashboard: undefined;

};



const Stack = createNativeStackNavigator<AppStackParamList>();

const Tab = createBottomTabNavigator<MainTabParamList>();



const TabSwipeWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const navigation = useNavigation<any>();

  const state = useNavigationState((s) => s);

  const { isRTL } = useI18n();

  const routes = state?.routes || [];

  const index = state?.index ?? 0;



  const handleSwipe = ({ nativeEvent }: any) => {

    if (nativeEvent.state !== State.END) return;

    const { translationX, velocityX } = nativeEvent;

    const threshold = 40;

    const swipeDelta = translationX + velocityX * 0.02;



    if (swipeDelta > threshold) {

      if (isRTL) {

        if (index > 0) navigation.navigate(routes[index - 1].name as any);

      } else if (index < routes.length - 1) {

        navigation.navigate(routes[index + 1].name as any);

      }

    } else if (swipeDelta < -threshold) {

      if (isRTL) {

        if (index < routes.length - 1) navigation.navigate(routes[index + 1].name as any);

      } else if (index > 0) {

        navigation.navigate(routes[index - 1].name as any);

      }

    }

  };



  return (

    <PanGestureHandler onHandlerStateChange={handleSwipe}>

      <View style={{ flex: 1 }}>{children}</View>

    </PanGestureHandler>

  );

};



const withTabSwipe = <P extends object>(Component: React.ComponentType<P>) =>

  function Wrapped(props: P) {

    return (

      <TabSwipeWrapper>

        <Component {...(props as P)} />

      </TabSwipeWrapper>

    );

  };





const TabsNavigator = () => {

  const { totalQuantity } = useCart();

  const { user, permissions } = useAuth();

  const { t } = useI18n();



  const isEmployee = user?.role === "manager" || user?.role === "supervisor" || user?.role === "staff";

  const canViewDashboard = isEmployee;

  const canManageSupport = user?.role === "manager" || !!permissions?.can_manage_support;

  const menuTabTitle = isEmployee ? t("nav.dashboardPOS", "Cashier (POS)") : t("nav.menu", "Menu");

  const MenuTabComponent = isEmployee ? DashboardPOS : MenuScreen;

  const menuTabIcon = ({ color, size }: { color: string; size: number }) => (

    <Ionicons name={isEmployee ? "cash-outline" : "restaurant-outline"} color={color} size={size} />

  );



  const thirdTab = !isEmployee ? (

    <Tab.Screen name="Orders" component={withTabSwipe(OrderTrackingScreen)} options={{ title: t("nav.orders", "Orders") }} />

  ) : canManageSupport ? (

    <Tab.Screen name="Support" component={withTabSwipe(DashboardSupport)} options={{ title: t("nav.support", "Support") }} />

  ) : (

    <Tab.Screen name="MyHR" component={withTabSwipe(MyHRScreen)} options={{ title: t("nav.myHr", "My HR") }} />

  );



  return (

    <Tab.Navigator

      tabBar={(props) => <TabBar {...props} />}

      screenOptions={{

        headerShown: false,

      }}

    >

      <Tab.Screen name="Home" component={withTabSwipe(HomeScreen)} options={{ title: t("nav.home", "Home") }} />

      <Tab.Screen

        name="Menu"

        component={withTabSwipe(MenuTabComponent)}

        options={{ title: menuTabTitle, tabBarIcon: menuTabIcon }}

      />

      {thirdTab}

      {canViewDashboard ? (

        <Tab.Screen name="Dashboard" component={withTabSwipe(DashboardHome)} options={{ title: t("nav.dashboard", "Dashboard") }} />

      ) : null}

      <Tab.Screen

        name="Profile"

        component={withTabSwipe(ProfileScreen)}

        options={{

          title: t("nav.profile", "Profile"),

          tabBarBadge: totalQuantity > 0 ? totalQuantity : undefined,

        }}

      />

    </Tab.Navigator>

  );

};



const AppNavigator = () => {

  const theme = useTheme();

  const { t, isRTL } = useI18n();

  const navTheme = useMemo(

    () => ({

      ...DefaultTheme,

      colors: {

        ...DefaultTheme.colors,

        background: theme.palette.background,

      },

    }),

    [theme.palette.background]

  );



  return (

    <NavigationContainer theme={navTheme}>

      <Stack.Navigator

        screenOptions={{

          headerTitleAlign: isRTL ? "left" : "center",

          headerBackTitle: t("nav.back", "رجوع"),

          headerTintColor: theme.palette.accent,

        }}

      >

        <Stack.Screen name="Tabs" component={TabsNavigator} options={{ headerShown: false }} />



        <Stack.Screen name="Cart" component={CartScreen} options={{ title: t("nav.cart", "السلة") }} />

        <Stack.Screen
          name="ProductDetails"
          component={ProductDetailsScreen}
          options={{
            title: t("nav.productDetails"),
            headerTitleStyle: { fontSize: 16, fontWeight: "700" },
          }}
        />

        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: t("nav.checkout", "إتمام الطلب") }} />

        <Stack.Screen

          name="OrderTracking"

          component={OrderTrackingScreen}

          options={{ title: t("nav.orderTracking", "تتبع الطلب") }}

        />

        <Stack.Screen name="Login" component={LoginScreen} options={{ title: t("nav.login", "تسجيل الدخول") }} />

        <Stack.Screen name="Register" component={RegisterScreen} options={{ title: t("nav.register", "إنشاء حساب") }} />

        <Stack.Screen

          name="ResetPassword"

          component={ResetPasswordScreen}

          options={{ title: t("nav.resetPassword", "إعادة تعيين كلمة المرور") }}

        />

        <Stack.Screen name="Contact" component={ContactScreen} options={{ title: t("nav.contact", "تواصل معنا") }} />

        <Stack.Screen name="Rewards" component={RewardsScreen} options={{ title: t("nav.rewards", "المكافآت") }} />

        <Stack.Screen name="Terms" component={TermsScreen} options={{ title: t("nav.terms", "الشروط والأحكام") }} />

        <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: t("nav.privacy", "سياسة الخصوصية") }} />

        <Stack.Screen name="Addresses" component={AddressesScreen} options={{ title: t("nav.addresses", "العناوين") }} />

        <Stack.Screen name="MyHR" component={MyHRScreen} options={{ title: t("nav.myHr", "طلباتي") }} />



        <Stack.Screen name="Dashboard" component={DashboardHome} options={{ title: t("nav.dashboard", "لوحة التحكم") }} />

        <Stack.Screen

          name="DashboardOrders"

          component={DashboardOrders}

          options={{ title: t("nav.dashboardOrders", "طلبات العملاء") }}

        />

        <Stack.Screen

          name="DashboardInventory"

          component={DashboardInventory}

          options={{ title: t("nav.dashboardInventory", "المخزون") }}

        />

        <Stack.Screen

          name="DashboardMessages"

          component={DashboardMessages}

          options={{ title: t("nav.dashboardMessages", "رسائل التواصل") }}

        />

        <Stack.Screen

          name="DashboardUsers"

          component={DashboardUsers}

          options={{ title: t("nav.dashboardUsers", "المستخدمون") }}

        />

        <Stack.Screen

          name="DashboardSettings"

          component={DashboardSettings}

          options={{ title: t("nav.dashboardSettings", "إعدادات المتجر") }}

        />

        <Stack.Screen

          name="DashboardReports"

          component={DashboardReports}

          options={{ title: t("nav.dashboardReports", "التقارير") }}

        />

        <Stack.Screen

          name="DashboardProducts"

          component={DashboardProducts}

          options={{ title: t("nav.dashboardProducts", "المنتجات") }}

        />

        <Stack.Screen

          name="DashboardCategories"

          component={DashboardCategories}

          options={{ title: t("nav.dashboardCategories", "التصنيفات") }}

        />

        <Stack.Screen

          name="DashboardTables"

          component={DashboardTables}

          options={{ title: t("nav.dashboardTables", "الطاولات") }}

        />

        <Stack.Screen

          name="DashboardPOS"

          component={DashboardPOS}

          options={{ title: t("nav.dashboardPOS", "الكاشير (POS)") }}

        />

        <Stack.Screen

          name="DashboardLoyalty"

          component={DashboardLoyalty}

          options={{ title: t("nav.dashboardLoyalty", "برنامج الولاء") }}

        />

        <Stack.Screen

          name="DashboardSupport"

          component={DashboardSupport}

          options={{ title: t("nav.dashboardSupport", "تذاكر الدعم") }}

        />

        <Stack.Screen

          name="DashboardSupportChat"

          component={DashboardSupportChat}

          options={{ title: t("nav.dashboardSupportChat", "المحادثة") }}

        />

        <Stack.Screen name="DashboardLogs" component={DashboardLogs} options={{ title: t("nav.dashboardLogs", "السجلات") }} />

        <Stack.Screen

          name="DashboardRolePermissions"

          component={DashboardRolePermissions}

          options={{ title: t("nav.dashboardRolePermissions", "الأدوار والصلاحيات") }}

        />

        <Stack.Screen

          name="DashboardHRDocuments"

          component={DashboardHRDocuments}

          options={{ title: t("nav.dashboardHRDocuments", "وثائق الموارد البشرية") }}

        />

        <Stack.Screen

          name="DashboardHRRequests"

          component={DashboardHRRequests}

          options={{ title: t("nav.dashboardHRRequests", "طلبات الموارد البشرية") }}

        />

        <Stack.Screen

          name="HRDashboard"

          component={HRDashboard}

          options={{ title: t("nav.hrDashboard", "لوحة الموارد البشرية") }}

        />

      </Stack.Navigator>

    </NavigationContainer>

  );

};



export default AppNavigator;
