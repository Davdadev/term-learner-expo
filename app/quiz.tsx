import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Colors, Gradients, Radius, Shadow } from '@/constants/theme';
import { Term } from '@/constants/types';
import { getAllTerms, recordReview } from '@/services/database';
import MasteryBadge from '@/components/MasteryBadge';
import { LinearGradient } from 'expo-linear-gradient';

export default function Quiz() {
  const { termId, definition } = useLocalSearchParams<{ termId: string; definition: string }>();
  const [term, setTerm] = useState<Term | null>(null);
  const [answer, setAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState(false);

  useEffect(() => {
    if (!termId) return;
    getAllTerms().then(all => {
      setTerm(all.find(t => t.id === termId) ?? null);
    });
  }, [termId]);

  async function submit() {
    if (!term) return;
    const a = answer.trim().toLowerCase();
    const d = term.definition.trim().toLowerCase();
    const isCorrect = a === d || d.includes(a) || a.includes(d.slice(0, 8));
    setCorrect(isCorrect);
    setSubmitted(true);
    await recordReview(term, isCorrect);
    isCorrect ? Vibration.vibrate(50) : Vibration.vibrate([0, 50, 50, 50]);
  }

  const displayDef = term?.definition ?? definition ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Text style={styles.heading}>Quick Quiz</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.skip}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, Shadow.md]}>
          {term && <MasteryBadge level={term.masteryLevel} />}
          <Text style={styles.label}>What does this mean?</Text>
          <Text style={styles.word}>{term?.word ?? '…'}</Text>
        </View>

        {!submitted ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Type the meaning or translation…"
              placeholderTextColor={Colors.textTertiary}
              value={answer}
              onChangeText={setAnswer}
              multiline
              autoFocus
            />
            <TouchableOpacity
              style={[styles.submitBtn, !answer.trim() && styles.submitBtnDisabled]}
              onPress={submit}
              disabled={!answer.trim()}
            >
              <LinearGradient colors={Gradients.primary} style={styles.submitGrad}>
                <Text style={styles.submitText}>Submit</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={[styles.result, { backgroundColor: correct ? `${Colors.accent}18` : `${Colors.secondary}18` }]}>
              <Text style={styles.resultIcon}>{correct ? '✅' : '❌'}</Text>
              <View style={styles.resultInfo}>
                <Text style={[styles.resultLabel, { color: correct ? Colors.accent : Colors.secondary }]}>
                  {correct ? 'Correct!' : 'Almost!'}
                </Text>
                <Text style={styles.resultDef}>Answer: {displayDef}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
              <LinearGradient colors={Gradients.primary} style={styles.submitGrad}>
                <Text style={styles.submitText}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, padding: 24, gap: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text },
  skip: { fontSize: 15, color: Colors.textSecondary },

  card: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    padding: 32, alignItems: 'center', gap: 12,
  },
  label: { fontSize: 13, color: Colors.textSecondary },
  word: { fontSize: 36, fontWeight: '700', color: Colors.text, textAlign: 'center' },

  input: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: 16, fontSize: 16, color: Colors.text,
    minHeight: 80, textAlignVertical: 'top',
  },
  submitBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
  submitBtnDisabled: { opacity: 0.4 },
  submitGrad: { padding: 16, alignItems: 'center' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  result: { flexDirection: 'row', borderRadius: Radius.lg, padding: 18, gap: 12, alignItems: 'center' },
  resultIcon: { fontSize: 32 },
  resultInfo: { flex: 1, gap: 4 },
  resultLabel: { fontSize: 16, fontWeight: '700' },
  resultDef: { fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },
  doneBtn: { borderRadius: Radius.lg, overflow: 'hidden' },
});
