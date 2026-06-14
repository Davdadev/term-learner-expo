import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { Term, Collection, isLearned, masteryLabel, masteryColor } from '@/constants/types';
import { getAllTerms, getCollections } from '@/services/database';
import StatCard from '@/components/StatCard';

export default function Progress() {
  const db = useSQLiteContext();
  const [terms, setTerms] = useState<Term[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [streak, setStreak] = useState(0);

  useFocusEffect(useCallback(() => {
    Promise.all([getAllTerms(db), getCollections(db)]).then(([t, c]) => {
      setTerms(t);
      setCollections(c);
    });
    AsyncStorage.getItem('currentStreak').then(v => setStreak(Number(v) || 0));
  }, []));

  const totalReviews = terms.reduce((s, t) => s + t.timesCorrect + t.timesIncorrect, 0);
  const totalCorrect = terms.reduce((s, t) => s + t.timesCorrect, 0);
  const accuracy = totalReviews > 0 ? Math.round((totalCorrect / totalReviews) * 100) : 0;
  const mastered = terms.filter(isLearned).length;

  const distribution = [0, 1, 2, 3, 4, 5].map(level => ({
    level,
    label: masteryLabel(level),
    color: masteryColor(level),
    count: terms.filter(t => t.masteryLevel === level).length,
  })).filter(d => d.count > 0);

  const maxCount = Math.max(...distribution.map(d => d.count), 1);

  const motivation = [
    { icon: '🎯', text: 'Consistency beats perfection.' },
    { icon: '🧠', text: 'Every term you learn builds new connections.' },
    { icon: '🚀', text: 'Spaced repetition is scientifically proven.' },
    { icon: '🌟', text: "You're doing great. One term at a time." },
    { icon: '💡', text: 'Review daily for long-term retention.' },
  ][new Date().getDate() % 5];

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Progress</Text>

        <View style={styles.statsRow}>
          <StatCard value={String(mastered)}   label="Mastered"      icon="🏆" color={Colors.primary} />
          <StatCard value={`${accuracy}%`}     label="Accuracy"      icon="🎯" color={Colors.accent} />
          <StatCard value={String(streak)}     label="Day Streak"    icon="🔥" color={Colors.secondary} />
          <StatCard value={String(totalReviews)} label="Reviews"     icon="🔄" color="#3B82F6" />
        </View>

        {distribution.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Mastery Distribution</Text>
            <View style={styles.chart}>
              {distribution.map(d => (
                <View key={d.level} style={styles.bar}>
                  <Text style={styles.barCount}>{d.count}</Text>
                  <View style={[styles.barFill, {
                    height: Math.max(12, (d.count / maxCount) * 100),
                    backgroundColor: d.color,
                  }]} />
                  <Text style={styles.barLabel}>{d.label.slice(0, 3)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {collections.length > 0 && (
          <View style={[styles.card, Shadow.sm]}>
            <Text style={styles.cardTitle}>Collections</Text>
            {collections.map(col => {
              const progress = col.termCount ? (col.learnedCount ?? 0) / col.termCount : 0;
              return (
                <View key={col.id} style={styles.colRow}>
                  <View style={[styles.colDot, { backgroundColor: `#${col.colorHex}` }]} />
                  <View style={styles.colInfo}>
                    <View style={styles.colHeader}>
                      <Text style={styles.colName}>{col.name}</Text>
                      <Text style={styles.colPct}>{Math.round(progress * 100)}%</Text>
                    </View>
                    <View style={styles.progressBg}>
                      <View style={[styles.progressFill, {
                        width: `${progress * 100}%`,
                        backgroundColor: `#${col.colorHex}`,
                      }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={[styles.card, styles.motivationCard, Shadow.sm]}>
          <Text style={styles.motivationIcon}>{motivation.icon}</Text>
          <Text style={styles.motivationText}>{motivation.text}</Text>
        </View>

        {terms.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>Upload some terms to see your progress here.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  card: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 18, gap: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },

  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 130 },
  bar: { flex: 1, alignItems: 'center', gap: 4 },
  barCount: { fontSize: 11, fontWeight: '600', color: Colors.textSecondary },
  barFill: { width: '100%', borderRadius: 4 },
  barLabel: { fontSize: 10, color: Colors.textTertiary },

  colRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  colDot: { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  colInfo: { flex: 1, gap: 4 },
  colHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  colName: { fontSize: 14, fontWeight: '600', color: Colors.text },
  colPct: { fontSize: 12, color: Colors.textSecondary },
  progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },

  motivationCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  motivationIcon: { fontSize: 32 },
  motivationText: { flex: 1, fontSize: 15, color: Colors.textSecondary, lineHeight: 22 },

  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
