import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase } from '@/services/database';
import { addResponseListener } from '@/services/notifications';
import { router } from 'expo-router';

export default function RootLayout() {
  useEffect(() => {
    // Handle notification taps → open quiz popup
    const sub = addResponseListener((response) => {
      const data = response.notification.request.content.data as any;
      if (data?.termId) {
        router.push({ pathname: '/quiz', params: { termId: data.termId, definition: data.definition } });
      }
    });
    return () => sub.remove();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SQLiteProvider databaseName="termlearner.db" onInit={initDatabase}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="collection/[id]" />
          <Stack.Screen name="study" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="quiz" options={{ presentation: 'modal' }} />
        </Stack>
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
