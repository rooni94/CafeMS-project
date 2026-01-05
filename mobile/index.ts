import { registerRootComponent } from "expo";
import { I18nManager } from "react-native";
import App from "./App";

// Force RTL before the app mounts to ensure TestFlight/Prod respect Arabic layout.
if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
  I18nManager.swapLeftAndRightInRTL(true);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
