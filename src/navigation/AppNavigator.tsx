import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationState } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBar } from '../components';
import { colors } from '../theme';

import { OnboardingScreen } from '../screens/onboarding';
import { LoginScreen } from '../screens/auth';
import { SignUpScreen } from '../screens/auth';
import { HomeScreen } from '../screens/home';
import { SearchScreen } from '../screens/search';
import { SearchFiltersScreen } from '../screens/search';
import { DealDetailScreen } from '../screens/deals';
import { CheckoutScreen } from '../screens/deals';
import { OrderConfirmedScreen } from '../screens/deals';
import { PostDealScreen } from '../screens/deals';
import { PostReviewScreen } from '../screens/deals';
import { OrdersScreen } from '../screens/orders';
import { ProfileScreen } from '../screens/profile';
import { ProfileSetupScreen } from '../screens/profile';
import { NotificationsScreen } from '../screens/notifications';
import { ChatInboxScreen } from '../screens/notifications';
import { SettingsScreen } from '../screens/settings';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const ROUTE_TO_TAB: Record<string, string> = {
  Home: 'home',
  Search: 'search',
  Orders: 'orders',
  Profile: 'profile',
};

// Reads current route name and highlights the correct tab
function TabBarWithActiveState({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const state = useNavigationState((s: any) => s);

  const currentRoute = state?.routes?.[state.index ?? 0]?.name ?? 'Home';
  const activeTab = ROUTE_TO_TAB[currentRoute] ?? 'home';

  const handlePress = (key: string) => {
    if (key === 'post') {
      navigation.navigate('PostDeal');
    } else {
      navigation.navigate(key);
    }
  };

  return (
    <View style={{ paddingBottom: Math.max(insets.bottom, 8) }}>
      <BottomTabBar activeTab={activeTab} onTabPress={handlePress} />
    </View>
  );
}

function MainTabs() {
  return (
    <View style={styles.tabContainer}>
      <Tab.Navigator
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <TabBarWithActiveState {...props} />}
      >
        <Tab.Screen
          name="home"
          component={HomeScreen}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen
          name="search"
          component={SearchScreen}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen
          name="orders"
          component={OrdersScreen}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen
          name="profile"
          component={ProfileScreen}
          options={{ tabBarButton: () => null }}
        />
      </Tab.Navigator>
    </View>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Auth Flow */}
        <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="ProfileSetup" component={ProfileSetupScreen} />

        {/* Main App with Bottom Tabs */}
        <Stack.Screen name="Main" component={MainTabs} />

        {/* Search */}
        <Stack.Screen
          name="SearchFilters"
          component={SearchFiltersScreen}
          options={{ animation: 'slide_from_bottom' }}
        />

        {/* Deal Flows */}
        <Stack.Screen
          name="DealDetail"
          component={DealDetailScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="Checkout" component={CheckoutScreen} />
        <Stack.Screen
          name="OrderConfirmed"
          component={OrderConfirmedScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />
        <Stack.Screen
          name="PostDeal"
          component={PostDealScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="PostReview"
          component={PostReviewScreen}
          options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
        />

        {/* Notifications & Chat */}
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ animation: 'slide_from_right' }}
        />
        <Stack.Screen
          name="ChatInbox"
          component={ChatInboxScreen}
          options={{ animation: 'slide_from_right' }}
        />

        {/* Settings */}
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ animation: 'slide_from_right' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabContainer: { flex: 1, backgroundColor: colors.background },
});
