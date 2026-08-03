import React, { useEffect, useState } from 'react';
import { StatusBar, View, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { LocationProvider } from './src/contexts/LocationContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { initLanguage } from './src/i18n';
import { colors } from './src/theme';

function AppContent() {
  const { isDark } = useTheme();

  return (
    <>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <LocationProvider>
        <AppNavigator />
      </LocationProvider>
    </>
  );
}

function App() {
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    initLanguage().then(() => setLangReady(true));
  }, []);

  if (!langReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors['primary-container']} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default App;
