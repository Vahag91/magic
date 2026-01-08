import * as React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import PlaceholderScreen from '../screens/PlaceholderScreen';
import RemoveBackgroundSelectScreen from '../screens/RemoveBackgroundSelectScreen';
import RemoveBackgroundProcessingScreen from '../screens/RemoveBackgroundProcessingScreen';
import RemoveObjectSelectScreen from '../screens/RemoveObjectSelectScreen';
import BackgroundEditorScreen from '../screens/BackgroundEditorScreen';
// import RefineScreen from '../screens/RefineScreen';  <-- Removed
// import AdjustScreen from '../screens/AdjustScreen';  <-- Removed
import ExportScreen from '../screens/ExportScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />

      <Stack.Screen
        name="RemoveBackgroundSelect"
        component={RemoveBackgroundSelectScreen}
      />
      <Stack.Screen
        name="RemoveBackgroundProcessing"
        component={RemoveBackgroundProcessingScreen}
      />
      <Stack.Screen name="BackgroundEditor" component={BackgroundEditorScreen} />
      {/* Removed Refine and Adjust routes */}
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