import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { LocationProvider } from './src/contexts/LocationContext';
import { initLanguage } from './src/i18n';

function App() {
  const [langReady, setLangReady] = useState(false);

  useEffect(() => {
    initLanguage().then(() => setLangReady(true));
  }, []);

  if (!langReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF7A30" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <LocationProvider>
        <AppNavigator />
      </LocationProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
});

export default App;
