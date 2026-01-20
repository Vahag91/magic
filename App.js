import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setupTypography } from './src/styles';
import { SubscriptionProvider } from './src/providers/SubscriptionProvider';
import { ErrorProvider } from './src/providers/ErrorProvider';
import AppErrorBoundary from './src/components/AppErrorBoundary';

setupTypography();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorProvider>
          <AppErrorBoundary>
            <SubscriptionProvider>
              <NavigationContainer>
                <AppNavigator />
              </NavigationContainer>
            </SubscriptionProvider>
          </AppErrorBoundary>
        </ErrorProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>

  );
}
