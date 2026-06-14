import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Radius, Shadow } from '@/constants/theme';

interface Props {
  value: string;
  label: string;
  icon: string;
  color: string;
}

export default function StatCard({ value, label, icon, color }: Props) {
  return (
    <View style={[styles.card, Shadow.sm]}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 16,
    alignItems: 'center',
    gap: 4,
  },
  icon: { fontSize: 22, marginBottom: 2 },
  value: { fontSize: 24, fontWeight: '700', color: Colors.text },
  label: { fontSize: 12, fontWeight: '500', color: Colors.textSecondary, textAlign: 'center' },
});
