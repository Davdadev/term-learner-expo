import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, Modal, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect, router } from 'expo-router';
import { Colors, CollectionColors, Radius, Shadow } from '@/constants/theme';
import { Collection } from '@/constants/types';
import { getCollections, createCollection, deleteCollection } from '@/services/database';
import CollectionCard from '@/components/CollectionCard';

export default function Collections() {
  const db = useSQLiteContext();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CollectionColors[0]);

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    setCollections(await getCollections(db));
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    await createCollection(db, newName.trim(), '', selectedColor);
    setNewName('');
    setShowAdd(false);
    load();
  }

  async function handleDelete(col: Collection) {
    Alert.alert('Delete Collection', `Delete "${col.name}" and all its terms?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => { await deleteCollection(db, col.id); load(); },
      },
    ]);
  }

  const filtered = search
    ? collections.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : collections;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.title}>Collections</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.search}
        placeholder="Search collections…"
        placeholderTextColor={Colors.textTertiary}
        value={search}
        onChangeText={setSearch}
      />

      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No collections yet</Text>
          <Text style={styles.emptyBody}>Upload a photo to create your first collection.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CollectionCard
              collection={item}
              onPress={() => router.push({ pathname: '/collection/[id]', params: { id: item.id } })}
            />
          )}
        />
      )}

      {/* Add Collection Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>New Collection</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Collection name"
              placeholderTextColor={Colors.textTertiary}
              value={newName}
              onChangeText={setNewName}
              autoFocus
            />
            <Text style={styles.colorLabel}>Colour</Text>
            <View style={styles.colorGrid}>
              {CollectionColors.map(hex => (
                <TouchableOpacity
                  key={hex}
                  style={[
                    styles.colorCircle,
                    { backgroundColor: `#${hex}` },
                    selectedColor === hex && styles.colorCircleSelected,
                  ]}
                  onPress={() => setSelectedColor(hex)}
                />
              ))}
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.createBtn, !newName.trim() && styles.createBtnDisabled]}
                onPress={handleCreate}
                disabled={!newName.trim()}
              >
                <Text style={styles.createText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  addBtnText: { fontSize: 22, color: '#fff', fontWeight: '700', lineHeight: 26 },
  search: {
    marginHorizontal: 16, marginBottom: 12,
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: 12, fontSize: 15, color: Colors.text,
    ...Shadow.sm,
  },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  emptyBody: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalInput: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    padding: 14, fontSize: 16, color: Colors.text,
  },
  colorLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorCircle: { width: 44, height: 44, borderRadius: 22 },
  colorCircleSelected: { borderWidth: 3, borderColor: '#fff', ...Shadow.md },
  modalBtns: { flexDirection: 'row', gap: 12, marginTop: 8, paddingBottom: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.background, alignItems: 'center' },
  cancelText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  createBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  createBtnDisabled: { opacity: 0.4 },
  createText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
