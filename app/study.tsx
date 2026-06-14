import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Gradients, Radius, Shadow } from '@/constants/theme';
import { Term } from '@/constants/types';
import { getAllTerms, recordReview } from '@/services/database';
import MasteryBadge from '@/components/MasteryBadge';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;

export default function Study() {
  const { ids } = useLocalSearchParams<{ ids: string }>();

  const [terms, setTerms] = useState<Term[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setReveal] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [incorrect, setIncorrect] = useState(0);
  const [done, setDone] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const translateX = useSharedValue(0);
  const rotate = useSharedValue(0);
  const revealedRef = useSharedValue(false);

  React.useEffect(() => {
    if (!ids) return;
    const idList = ids.split(',');
    getAllTerms().then(all => {
      const filtered = all.filter(t => idList.includes(t.id));
      setTerms(filtered);
      setLoaded(true);
    });
  }, [ids]);

  const current = terms[index];

  const onSwipeEnd = useCallback((isCorrect: boolean) => {
    if (!current) return;
    recordReview(current, isCorrect).then(() => {
      if (isCorrect) {
        setCorrect(c => c + 1);
        Vibration.vibrate(50);
      } else {
        setIncorrect(i => i + 1);
        Vibration.vibrate([0, 50, 50, 50]);
      }
      translateX.value = 0;
      rotate.value = 0;
      revealedRef.value = false;
      setReveal(false);
      if (index + 1 >= terms.length) {
        updateStreak();
        setDone(true);
      } else {
        setIndex(i => i + 1);
      }
    });
  }, [current, index, terms.length]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (!revealedRef.value) return;
      translateX.value = e.translationX;
      rotate.value = e.translationX / 20;
    })
    .onEnd((e) => {
      if (!revealedRef.value) return;
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(width * 1.5);
        runOnJS(onSwipeEnd)(true);
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-width * 1.5);
        runOnJS(onSwipeEnd)(false);
      } else {
        translateX.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  function reveal() {
    revealedRef.value = true;
    setReveal(true);
  }

  async function updateStreak() {
    const last = await AsyncStorage.getItem('lastStudyDate');
    const streak = Number(await AsyncStorage.getItem('currentStreak')) || 0;
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = last && new Date(last).toDateString() === yesterday.toDateString();
    const isToday = last && new Date(last).toDateString() === new Date().toDateString();
    const newStreak = isYesterday ? streak + 1 : isToday ? streak : 1;
    await AsyncStorage.setItem('currentStreak', String(newStreak));
    await AsyncStorage.setItem('lastStudyDate', new Date().toISOString());
  }

  if (!loaded) return <View style={styles.safe} />;

  if (done) {
    const total = correct + incorrect;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.resultContainer}>
          <LinearGradient colors={Gradients.primary} style={styles.resultIcon}>
            <Text style={{ fontSize: 48 }}>⭐</Text>
          </LinearGradient>
          <Text style={styles.resultTitle}>Session Complete!</Text>
          <Text style={styles.resultSub}>You reviewed {terms.length} term{terms.length !== 1 ? 's' : ''}</Text>
          <View style={styles.resultStats}>
            <View style={styles.resultStat}>
              <Text style={[styles.resultNum, { color: Colors.accent }]}>{correct}</Text>
              <Text style={styles.resultLabel}>Correct</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={[styles.resultNum, { color: Colors.secondary }]}>{incorrect}</Text>
              <Text style={styles.resultLabel}>Missed</Text>
            </View>
            <View style={styles.resultStat}>
              <Text style={[styles.resultNum, { color: Colors.primary }]}>{accuracy}%</Text>
              <Text style={styles.resultLabel}>Accuracy</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
            <LinearGradient colors={Gradients.primary} style={styles.doneBtnGrad}>
              <Text style={styles.doneBtnText}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!current) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>{index + 1} / {terms.length}</Text>
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${((index + 1) / terms.length) * 100}%` }]} />
          </View>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreCorrect}>✓{correct}</Text>
          <Text style={styles.scoreIncorrect}>✗{incorrect}</Text>
        </View>
      </View>

      <View style={styles.cardArea}>
        <View style={[styles.card, styles.cardGhost2]} />
        <View style={[styles.card, styles.cardGhost1]} />

        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.card, cardStyle]}>
            <MasteryBadge level={current.masteryLevel} />
            <View style={styles.cardContent}>
              <Text style={styles.word}>{current.word}</Text>
              {revealed ? (
                <>
                  <View style={styles.divider} />
                  <Text style={styles.definition}>{current.definition}</Text>
                  {current.notes ? <Text style={styles.notes}>{current.notes}</Text> : null}
                </>
              ) : (
                <Text style={styles.tapHint}>Tap to reveal</Text>
              )}
            </View>
          </Animated.View>
        </GestureDetector>

        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => { if (!revealed) reveal(); }} />
      </View>

      <View style={styles.actions}>
        {revealed ? (
          <View style={styles.answerBtns}>
            <TouchableOpacity
              style={[styles.answerBtn, styles.incorrectBtn]}
              onPress={() => onSwipeEnd(false)}
            >
              <Text style={styles.answerBtnIcon}>✗</Text>
              <Text style={styles.answerBtnLabel}>Missed it</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.answerBtn, styles.correctBtn]}
              onPress={() => onSwipeEnd(true)}
            >
              <Text style={styles.answerBtnIcon}>✓</Text>
              <Text style={styles.answerBtnLabel}>Got it!</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.swipeHint}>Swipe right ✓ · left ✗ · tap to reveal</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  closeBtn: { fontSize: 20, color: Colors.textSecondary },
  progressInfo: { flex: 1, gap: 4 },
  progressText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'center' },
  progressBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  scoreBox: { flexDirection: 'row', gap: 8 },
  scoreCorrect: { fontSize: 14, fontWeight: '700', color: Colors.accent },
  scoreIncorrect: { fontSize: 14, fontWeight: '700', color: Colors.secondary },

  cardArea: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  card: {
    width: width - 48, backgroundColor: Colors.card,
    borderRadius: 24, padding: 32, gap: 16,
    minHeight: 340, justifyContent: 'center', ...Shadow.lg,
  },
  cardGhost1: {
    position: 'absolute', width: width - 64,
    opacity: 0.5, transform: [{ scale: 0.97 }, { translateY: 10 }],
  },
  cardGhost2: {
    position: 'absolute', width: width - 80,
    opacity: 0.25, transform: [{ scale: 0.94 }, { translateY: 20 }],
  },
  cardContent: { alignItems: 'center', gap: 16 },
  word: { fontSize: 36, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  tapHint: { fontSize: 14, color: Colors.textTertiary },
  divider: { width: '60%', height: 1, backgroundColor: Colors.border },
  definition: { fontSize: 22, fontWeight: '600', color: Colors.primary, textAlign: 'center' },
  notes: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  actions: { padding: 24, paddingBottom: 40 },
  answerBtns: { flexDirection: 'row', gap: 16 },
  answerBtn: { flex: 1, alignItems: 'center', padding: 18, borderRadius: Radius.lg, gap: 4 },
  incorrectBtn: { backgroundColor: `${Colors.secondary}18` },
  correctBtn: { backgroundColor: `${Colors.accent}18` },
  answerBtnIcon: { fontSize: 28 },
  answerBtnLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  swipeHint: { textAlign: 'center', fontSize: 13, color: Colors.textTertiary },

  resultContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  resultIcon: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center' },
  resultTitle: { fontSize: 28, fontWeight: '700', color: Colors.text },
  resultSub: { fontSize: 15, color: Colors.textSecondary },
  resultStats: { flexDirection: 'row', gap: 24 },
  resultStat: { alignItems: 'center', gap: 4 },
  resultNum: { fontSize: 40, fontWeight: '700' },
  resultLabel: { fontSize: 13, color: Colors.textSecondary },
  doneBtn: { width: '100%', borderRadius: Radius.lg, overflow: 'hidden', marginTop: 8 },
  doneBtnGrad: { padding: 16, alignItems: 'center' },
  doneBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
