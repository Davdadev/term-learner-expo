import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { Collection } from '@/constants/types';

interface Props {
  collection: Collection;
  onPress: () => void;
}

export default function CollectionCard({ collection, onPress }: Props) {
  const color = `#${collection.colorHex}`;
  const progress = collection.termCount
    ? (collection.learnedCount ?? 0) / collection.termCount
    : 0;

  return (
    <TouchableOpacity style={[styles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.avatar, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.avatarText, { color }]}>
          {collection.name.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>{collection.name}</Text>
          {(collection.dueCount ?? 0) > 0 && (
            <View style={[styles.badge, { backgroundColor: Colors.secondary }]}>
              <Text style={styles.badgeText}>{collection.dueCount}</Text>
            </View>
          )}
        </View>
        <Text style={styles.meta}>
          {collection.termCount ?? 0} terms · {collection.learnedCount ?? 0} learned
        </Text>
        <View style={styles.barBg}>
          <View style={[styles.barFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  avatar: {
    width: 48, height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },
  badge: {
    paddingHorizontal: 7, paddingVertical: 2,
    borderRadius: Radius.full,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#fff' },
  meta: { fontSize: 12, color: Colors.textSecondary },
  barBg: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginTop: 2 },
  barFill: { height: 4, borderRadius: 2 },
  chevron: { fontSize: 22, color: Colors.textTertiary },
});
