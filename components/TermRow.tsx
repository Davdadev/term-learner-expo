import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { Term, isDue } from '@/constants/types';
import MasteryBadge from './MasteryBadge';

interface Props {
  term: Term;
  onPress?: () => void;
}

export default function TermRow({ term, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.left}>
        <Text style={styles.word} numberOfLines={1}>{term.word}</Text>
        <Text style={styles.definition} numberOfLines={1}>{term.definition}</Text>
        {term.notes ? <Text style={styles.notes} numberOfLines={1}>{term.notes}</Text> : null}
      </View>
      <View style={styles.right}>
        <MasteryBadge level={term.masteryLevel} />
        {isDue(term) && (
          <Text style={styles.due}>⏰ Due</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  left: { flex: 1 },
  word: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  definition: { fontSize: 14, color: Colors.textSecondary },
  notes: { fontSize: 12, color: Colors.textTertiary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  due: { fontSize: 11, color: Colors.secondary, fontWeight: '500' },
});
