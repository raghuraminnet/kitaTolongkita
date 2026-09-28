import React, { useEffect, useState } from 'react';
import { StatusBar, View, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { LocationProvider } from './src/contexts/LocationContext';
import { ThemeProvider, useTheme } from './src/contexts/ThemeContext';
import { initLanguage } from './src/i18n';
import { colors } from './src/theme';

// Inject modern Google Fonts and enforce native sans-serif typography on Web
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const fontId = 'ktk-google-fonts';
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link');
    link.id = fontId;
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
  }

  const styleId = 'ktk-global-typography-override';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700;800&display=swap');

      * {
        font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif !important;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      
      div, span, p, input, button {
        font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif !important;
      }
    `;
    document.head.appendChild(style);
  }
}

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
