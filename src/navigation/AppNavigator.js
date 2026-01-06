import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import RemoveBackgroundSelectScreen from '../screens/RemoveBackgroundSelectScreen';
import RemoveBackgroundProcessingScreen from '../screens/RemoveBackgroundProcessingScreen';
import RemoveObjectSelectScreen from '../screens/RemoveObjectSelectScreen';
import BackgroundEditorScreen from '../screens/BackgroundEditorScreen';
import RefineScreen from '../screens/RefineScreen';
import AdjustScreen from '../screens/AdjustScreen';
import ExportScreen from '../screens/ExportScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />

      {/* Next screens (we’ll replace placeholders with real UIs later) */}
      <Stack.Screen
        name="RemoveBackgroundSelect"
        component={RemoveBackgroundSelectScreen}
      />
      <Stack.Screen
        name="RemoveBackgroundProcessing"
        component={RemoveBackgroundProcessingScreen}
      />
      <Stack.Screen name="BackgroundEditor" component={BackgroundEditorScreen} />
      <Stack.Screen name="Refine" component={RefineScreen} />
      <Stack.Screen name="Adjust" component={AdjustScreen} />
      <Stack.Screen name="Export" component={ExportScreen} />
      <Stack.Screen
        name="RemoveObjectSelect"
        component={RemoveObjectSelectScreen}
      />
      <Stack.Screen
        name="Settings"
        component={PlaceholderScreen}
        initialParams={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}
