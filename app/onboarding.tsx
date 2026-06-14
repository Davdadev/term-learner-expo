import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, Dimensions, TextInput, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Gradients, Radius } from '@/constants/theme';
import { requestPermissions } from '@/services/notifications';
import { setAPIKey } from '@/services/claude';

const { width } = Dimensions.get('window');

const PAGES = [
  {
    icon: '🧠',
    gradient: Gradients.primary,
    title: 'Welcome to\nTerm Learner',
    body: 'Upload photos of vocabulary lists — from a single word to 70 terms — and let AI extract them all instantly.',
  },
  {
    icon: '🔔',
    gradient: Gradients.secondary,
    title: 'Daily Reminders',
    body: 'Get quizzed on your terms throughout the day. Set how many reminders you want.',
  },
  {
    icon: '📈',
    gradient: Gradients.accent,
    title: 'Track Progress',
    body: 'Spaced repetition keeps the right terms in rotation. Watch your mastery grow day by day.',
  },
  {
    icon: '🔑',
    gradient: [Colors.warning, '#FFC371'] as const,
    title: 'Set Your API Key',
    body: 'Term Learner uses Claude AI to read your images. Your data is never used for training.',
  },
] as const;

export default function Onboarding() {
  const [page, setPage] = useState(0);
  const [reminders, setReminders] = useState(3);
  const [apiKey, setApiKeyState] = useState('');
  const flatRef = useRef<FlatList>(null);

  const goNext = () => {
    if (page < PAGES.length - 1) {
      flatRef.current?.scrollToIndex({ index: page + 1, animated: true });
      setPage(page + 1);
    } else {
      finish();
    }
  };

  const goBack = () => {
    if (page > 0) {
      flatRef.current?.scrollToIndex({ index: page - 1, animated: true });
      setPage(page - 1);
    }
  };

  const finish = async () => {
    await requestPermissions();
    if (apiKey.trim()) await setAPIKey(apiKey.trim());
    await AsyncStorage.setItem('remindersPerDay', String(reminders));
    await AsyncStorage.setItem('onboardingDone', 'true');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatRef}
        data={PAGES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View style={styles.page}>
            <LinearGradient colors={item.gradient} style={styles.iconCircle}>
              <Text style={styles.emoji}>{item.icon}</Text>
            </LinearGradient>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>

            {index === 1 && (
              <View style={styles.reminderRow}>
                {[1, 3, 5, 8].map(n => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.reminderBtn, reminders === n && styles.reminderBtnActive]}
                    onPress={() => setReminders(n)}
                  >
                    <Text style={[styles.reminderText, reminders === n && styles.reminderTextActive]}>
                      {n}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {index === 3 && (
              <View style={styles.apiBox}>
                <Text style={styles.apiLabel}>Claude API Key</Text>
                <TextInput
                  style={styles.apiInput}
                  placeholder="sk-ant-..."
                  placeholderTextColor={Colors.textTertiary}
                  value={apiKey}
                  onChangeText={setApiKeyState}
                  secureTextEntry
                  autoCapitalize="none"
                />
                <Text style={styles.apiHint}>
                  Get a free key at console.anthropic.com{'\n'}
                  Your key stays on this device only.
                </Text>
              </View>
            )}
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {PAGES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttons}>
        <LinearGradient colors={Gradients.primary} style={styles.primaryBtn}>
          <TouchableOpacity style={styles.primaryBtnInner} onPress={goNext}>
            <Text style={styles.primaryBtnText}>
              {page < PAGES.length - 1 ? 'Continue' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </LinearGradient>
        {page > 0 && (
          <TouchableOpacity onPress={goBack}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  page: {
    width,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 20,
    gap: 20,
  },
  iconCircle: {
    width: 140, height: 140, borderRadius: 70,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 12,
  },
  emoji: { fontSize: 64 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text, textAlign: 'center', lineHeight: 36 },
  body: { fontSize: 16, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },

  reminderRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  reminderBtn: {
    width: 56, height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${Colors.primary}18`,
  },
  reminderBtnActive: { backgroundColor: Colors.primary },
  reminderText: { fontSize: 18, fontWeight: '700', color: Colors.primary },
  reminderTextActive: { color: '#fff' },

  apiBox: { width: '100%', gap: 8, marginTop: 8 },
  apiLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  apiInput: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: `${Colors.primary}44`,
  },
  apiHint: { fontSize: 12, color: Colors.textTertiary, textAlign: 'center', lineHeight: 18 },

  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: `${Colors.primary}33` },
  dotActive: { width: 24, backgroundColor: Colors.primary },

  buttons: { paddingHorizontal: 24, paddingBottom: 48, gap: 12 },
  primaryBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
  primaryBtnInner: { padding: 16, alignItems: 'center' },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  backText: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', padding: 8 },
});
