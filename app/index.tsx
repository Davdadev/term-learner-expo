import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Colors } from '@/constants/theme';

export default function Index() {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('onboardingDone').then(v => {
      setDone(v === 'true');
      setReady(true);
    });
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return <Redirect href={done ? '/(tabs)' : '/onboarding'} />;
}
