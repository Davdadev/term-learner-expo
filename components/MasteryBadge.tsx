import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { masteryLabel, masteryColor } from '@/constants/types';
import { Radius } from '@/constants/theme';

export default function MasteryBadge({ level }: { level: number }) {
  return (
    <View style={[styles.badge, { backgroundColor: masteryColor(level) }]}>
      <Text style={styles.label}>{masteryLabel(level)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '600', color: '#fff' },
});
