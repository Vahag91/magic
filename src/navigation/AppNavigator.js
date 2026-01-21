import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import RemoveBackgroundSelectScreen from '../screens/RemoveBackgroundSelectScreen';
import RemoveBackgroundProcessingScreen from '../screens/RemoveBackgroundProcessingScreen';
import ObjectRemoverScreen from '../screens/ObjectRemoverScreen';
import BackgroundEditorScreen from '../screens/BackgroundEditorScreen';
import ExportScreen from '../screens/ExportScreen';
import CropScreen from '../screens/CropScreen';
import OnboardingScreen from '../screens/Onboarding/OnboardingScreen';
import PaywallScreen from '../screens/PaywallScreen';
import SimpleHeader from '../components/SimpleHeader';
import AppErrorBoundary from '../components/AppErrorBoundary';
import { colors } from '../styles';
import { shouldShowOnboarding } from '../lib/onboarding';

const Stack = createNativeStackNavigator();

function withScreenErrorBoundary(ScreenComponent) {
  function WrappedScreen(props) {
    return (
      <AppErrorBoundary>
        <ScreenComponent {...props} />
      </AppErrorBoundary>
    );
  }

  WrappedScreen.displayName = `WithScreenErrorBoundary(${ScreenComponent.displayName || ScreenComponent.name || 'Screen'})`;
  return WrappedScreen;
}

const HomeScreenWithBoundary = withScreenErrorBoundary(HomeScreen);
const SettingsScreenWithBoundary = withScreenErrorBoundary(SettingsScreen);
const RemoveBackgroundSelectScreenWithBoundary = withScreenErrorBoundary(RemoveBackgroundSelectScreen);
const RemoveBackgroundProcessingScreenWithBoundary = withScreenErrorBoundary(RemoveBackgroundProcessingScreen);
const ObjectRemoverScreenWithBoundary = withScreenErrorBoundary(ObjectRemoverScreen);
const BackgroundEditorScreenWithBoundary = withScreenErrorBoundary(BackgroundEditorScreen);
const ExportScreenWithBoundary = withScreenErrorBoundary(ExportScreen);
const CropScreenWithBoundary = withScreenErrorBoundary(CropScreen);
const OnboardingScreenWithBoundary = withScreenErrorBoundary(OnboardingScreen);
const PaywallScreenWithBoundary = withScreenErrorBoundary(PaywallScreen);

export default function AppNavigator() {
  const [initialRouteName, setInitialRouteName] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const showOnboarding = await shouldShowOnboarding();
        if (cancelled) return;
        setInitialRouteName(showOnboarding ? 'Onboarding' : 'Home');
      } catch {
        if (cancelled) return;
        setInitialRouteName('Home');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!initialRouteName) {
    return (
      <View style={styles.startup}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: true,
        header: ({ navigation, route, options, back }) => {
          const title = options.title ?? route.name;
          const rightNode = options.headerRight
            ? options.headerRight({ tintColor: colors.text, canGoBack: Boolean(back) })
            : undefined;
          const showBack = options.headerBackVisible ?? Boolean(back);
          const onBack = options.headerBackOnPress ?? (back ? navigation.goBack : undefined);

          return (
            <SafeAreaView edges={['top']} style={{ backgroundColor: colors.white }}>
              <SimpleHeader title={title} onBack={onBack} right={rightNode} showBack={showBack} />
            </SafeAreaView>
          );
        },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreenWithBoundary} options={{ headerShown: false }} />
      <Stack.Screen name="Onboarding" component={OnboardingScreenWithBoundary} options={{ title: '' }} />

      <Stack.Screen
        name="RemoveBackgroundSelect"
        component={RemoveBackgroundSelectScreenWithBoundary}
        options={{ title: 'Remove Background' }}
      />
      <Stack.Screen
        name="RemoveBackgroundProcessing"
        component={RemoveBackgroundProcessingScreenWithBoundary}
        options={{ title: 'Removing Background' }}
      />
      <Stack.Screen name="Crop" component={CropScreenWithBoundary} options={{ headerShown: false }} />
      <Stack.Screen name="BackgroundEditor" component={BackgroundEditorScreenWithBoundary} options={{ title: 'Skia Editor' }} />
      {/* Removed Refine and Adjust routes */}
      <Stack.Screen name="Export" component={ExportScreenWithBoundary} options={{ title: 'Export' }} />
      <Stack.Screen
        name="RemoveObjectSelect"
        component={RemoveBackgroundSelectScreenWithBoundary}
        initialParams={{ flow: 'objectRemoval' }}
        options={{ title: 'Remove Object' }}
      />
      <Stack.Screen name="ObjectRemover" component={ObjectRemoverScreenWithBoundary} options={{ title: 'Remove Object' }} />
      <Stack.Screen name="Settings" component={SettingsScreenWithBoundary} options={{ title: 'Settings' }} />
      <Stack.Screen name="Paywall" component={PaywallScreenWithBoundary} options={{ title: 'Magic Studio Pro' }} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  startup: { flex: 1, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
});
