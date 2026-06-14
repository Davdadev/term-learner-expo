import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Gradients, Radius, Shadow } from '@/constants/theme';
import { Term, Collection, isDue, isLearned } from '@/constants/types';
import { getAllTerms, getDueTerms, getCollections } from '@/services/database';
import { scheduleReminders } from '@/services/notifications';
import GradientCard from '@/components/GradientCard';
import StatCard from '@/components/StatCard';
import CollectionCard from '@/components/CollectionCard';

export default function Home() {
  const db = useSQLiteContext();
  const [terms, setTerms] = useState<Term[]>([]);
  const [due, setDue] = useState<Term[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [greeting, setGreeting] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [streak, setStreak] = useState(0);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const [all, dueTerms, cols] = await Promise.all([
      getAllTerms(db), getDueTerms(db), getCollections(db),
    ]);
    setTerms(all);
    setDue(dueTerms);
    setCollections(cols);
    setStreak(Number(await AsyncStorage.getItem('currentStreak')) || 0);

    const remindersPerDay = Number(await AsyncStorage.getItem('remindersPerDay')) || 3;
    scheduleReminders(dueTerms.length ? dueTerms : all, remindersPerDay);
    updateGreeting();
  }

  function updateGreeting() {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Good morning');
    else if (h < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const learnedCount = terms.filter(isLearned).length;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        <Text style={styles.screenTitle}>Term Learner</Text>

        <GradientCard
          icon="🧠"
          gradient={Gradients.primary}
          title={greeting}
          subtitle={due.length === 0 ? "You're all caught up! 🎉" : `${due.length} term${due.length === 1 ? '' : 's'} due for review`}
        />

        {due.length > 0 && (
          <TouchableOpacity
            style={styles.studyBtn}
            onPress={() => router.push({ pathname: '/study', params: { ids: due.map(t => t.id).join(',') } })}
          >
            <LinearGradientInline />
            <Text style={styles.studyBtnText}>Start Review  →</Text>
          </TouchableOpacity>
        )}

        <View style={styles.statsRow}>
          <StatCard value={String(terms.length)} label="Total Terms"   icon="📖" color={Colors.primary} />
          <StatCard value={String(learnedCount)} label="Mastered"      icon="✅" color={Colors.accent} />
          <StatCard value={String(streak)}       label="Day Streak"    icon="🔥" color={Colors.secondary} />
        </View>

        {collections.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Collections</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/collections')}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {collections.slice(0, 3).map(col => (
              <CollectionCard
                key={col.id}
                collection={col}
                onPress={() => router.push({ pathname: '/collection/[id]', params: { id: col.id } })}
              />
            ))}
          </View>
        )}

        {terms.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>No terms yet</Text>
            <Text style={styles.emptyBody}>Go to Upload and take a photo of a vocabulary list to get started.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Inline helper to avoid importing LinearGradient twice
function LinearGradientInline() {
  const { LinearGradient } = require('expo-linear-gradient');
  return (
    <LinearGradient
      colors={['#6C63FF', '#8B85FF']}
      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
      style={StyleSheet.absoluteFill}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  screenTitle: { fontSize: 28, fontWeight: '700', color: Colors.text, marginBottom: 4 },

  studyBtn: {
    height: 52, borderRadius: Radius.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', ...Shadow.md,
  },
  studyBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', zIndex: 1 },

  statsRow: { flexDirection: 'row', gap: 10 },

  section: { gap: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  seeAll: { fontSize: 14, color: Colors.primary, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
