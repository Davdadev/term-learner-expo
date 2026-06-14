import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initDatabase } from '@/services/database';
import { addResponseListener } from '@/services/notifications';
import { router } from 'expo-router';

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
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
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="collection/[id]" />
        <Stack.Screen name="study" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="quiz" options={{ presentation: 'modal' }} />
      </Stack>
    </GestureHandlerRootView>
  );
}
