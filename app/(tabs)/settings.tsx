import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Switch, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSQLiteContext } from 'expo-sqlite';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { getAPIKey, setAPIKey } from '@/services/claude';
import { getPermissionStatus, requestPermissions, cancelAllReminders } from '@/services/notifications';
import { getAllTerms, getCollections, deleteTerm, deleteCollection } from '@/services/database';

export default function Settings() {
  const db = useSQLiteContext();
  const [apiKey, setApiKeyState] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [reminders, setReminders] = useState(3);
  const [notifAllowed, setNotifAllowed] = useState(false);
  const [termCount, setTermCount] = useState(0);
  const [colCount, setColCount] = useState(0);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [key, rem, perm, terms, cols] = await Promise.all([
      getAPIKey(),
      AsyncStorage.getItem('remindersPerDay'),
      getPermissionStatus(),
      getAllTerms(db),
      getCollections(db),
    ]);
    setApiKeyState(key ?? '');
    setReminders(Number(rem) || 3);
    setNotifAllowed(perm);
    setTermCount(terms.length);
    setColCount(cols.length);
  }

  async function saveKey() {
    await setAPIKey(apiKey.trim());
    Alert.alert('Saved', 'API key updated.');
  }

  async function updateReminders(val: number) {
    setReminders(val);
    await AsyncStorage.setItem('remindersPerDay', String(val));
  }

  async function enableNotifications() {
    const granted = await requestPermissions();
    setNotifAllowed(granted);
    if (!granted) Alert.alert('Permission denied', 'Enable notifications in your device Settings.');
  }

  async function resetData() {
    Alert.alert('Reset All Data', 'This deletes all terms, collections and progress. Cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset', style: 'destructive',
        onPress: async () => {
          const [terms, cols] = await Promise.all([getAllTerms(db), getCollections(db)]);
          for (const t of terms) await deleteTerm(db, t.id);
          for (const c of cols) await deleteCollection(db, c.id);
          await cancelAllReminders();
          await AsyncStorage.multiRemove(['currentStreak', 'lastStudyDate']);
          load();
          Alert.alert('Done', 'All data cleared.');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Settings</Text>

        {/* API Key */}
        <Section title="Claude AI">
          <Text style={styles.label}>API Key</Text>
          <View style={styles.keyRow}>
            <TextInput
              style={styles.keyInput}
              value={apiKey}
              onChangeText={setApiKeyState}
              placeholder="sk-ant-..."
              placeholderTextColor={Colors.textTertiary}
              secureTextEntry={!showKey}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setShowKey(v => !v)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showKey ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={saveKey}>
            <Text style={styles.saveBtnText}>Save Key</Text>
          </TouchableOpacity>
          <Text style={styles.hint}>
            Get a free key at console.anthropic.com{'\n'}
            Stored only on this device. Never used for training.
          </Text>
        </Section>

        {/* Notifications */}
        <Section title="Notifications">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Permission</Text>
            {notifAllowed
              ? <Text style={styles.granted}>✅ Allowed</Text>
              : <TouchableOpacity onPress={enableNotifications}><Text style={styles.enable}>Enable</Text></TouchableOpacity>
            }
          </View>
          <View style={styles.divider} />
          <Text style={styles.label}>Reminders per day: {reminders}</Text>
          <View style={styles.reminderRow}>
            {[1, 3, 5, 8, 10].map(n => (
              <TouchableOpacity
                key={n}
                style={[styles.reminderBtn, reminders === n && styles.reminderBtnActive]}
                onPress={() => updateReminders(n)}
              >
                <Text style={[styles.reminderText, reminders === n && styles.reminderTextActive]}>{n}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        {/* About */}
        <Section title="About">
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Total Terms" value={String(termCount)} />
          <InfoRow label="Collections" value={String(colCount)} />
          <InfoRow label="Platform" value={Platform.OS === 'ios' ? 'iPhone / iPad' : 'Android'} />
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone">
          <TouchableOpacity style={styles.resetBtn} onPress={resetData}>
            <Text style={styles.resetText}>🗑  Reset All Data</Text>
          </TouchableOpacity>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={sStyles.section}>
      <Text style={sStyles.sectionTitle}>{title}</Text>
      <View style={sStyles.sectionBody}>{children}</View>
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={sStyles.infoRow}>
      <Text style={sStyles.infoLabel}>{label}</Text>
      <Text style={sStyles.infoValue}>{value}</Text>
    </View>
  );
}

const sStyles = StyleSheet.create({
  section: { gap: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  sectionBody: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 16, gap: 12, ...Shadow.sm },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 15, color: Colors.text },
  infoValue: { fontSize: 15, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 20, paddingBottom: 60 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },

  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  hint: { fontSize: 12, color: Colors.textTertiary, lineHeight: 18 },

  keyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  keyInput: {
    flex: 1, backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: 12, fontSize: 14, color: Colors.text,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  eyeBtn: { padding: 8 },
  eyeText: { fontSize: 18 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, padding: 12, alignItems: 'center' },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontSize: 15, color: Colors.text },
  granted: { fontSize: 14, color: Colors.accent },
  enable: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.border },

  reminderRow: { flexDirection: 'row', gap: 8 },
  reminderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: Colors.background, alignItems: 'center',
  },
  reminderBtnActive: { backgroundColor: Colors.primary },
  reminderText: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  reminderTextActive: { color: '#fff' },

  resetBtn: { padding: 14, borderRadius: Radius.md, backgroundColor: '#FEE2E2', alignItems: 'center' },
  resetText: { fontSize: 15, fontWeight: '600', color: '#DC2626' },
});
