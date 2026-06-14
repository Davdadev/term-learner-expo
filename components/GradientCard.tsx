import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Radius, Shadow } from '@/constants/theme';

interface Props {
  title: string;
  subtitle: string;
  gradient: readonly [string, string, ...string[]];
  icon: string;
}

export default function GradientCard({ title, subtitle, gradient, icon }: Props) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, Shadow.lg]}>
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.xl,
    padding: 18,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 24 },
  text: { flex: 1 },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 2 },
  subtitle: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
});
