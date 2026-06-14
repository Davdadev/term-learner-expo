import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radius, Shadow } from '@/constants/theme';
import { Term, Collection, isDue, isLearned } from '@/constants/types';
import { getTerms, getCollection, deleteTerm, updateTerm, createTerms } from '@/services/database';
import TermRow from '@/components/TermRow';
import MasteryBadge from '@/components/MasteryBadge';

type Filter = 'all' | 'due' | 'learned' | 'new';

export default function CollectionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [terms, setTerms] = useState<Term[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [editTerm, setEditTerm] = useState<Term | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newDef, setNewDef] = useState('');

  useFocusEffect(useCallback(() => { load(); }, []));

  async function load() {
    const [col, ts] = await Promise.all([getCollection(id), getTerms(id)]);
    setCollection(col);
    setTerms(ts);
  }

  const filtered = terms.filter(t => {
    if (search && !t.word.toLowerCase().includes(search.toLowerCase()) &&
        !t.definition.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'due') return isDue(t);
    if (filter === 'learned') return isLearned(t);
    if (filter === 'new') return t.masteryLevel === 0;
    return true;
  });

  const dueTerms = terms.filter(isDue);
  const color = collection ? `#${collection.colorHex}` : Colors.primary;
  const progress = collection?.termCount ? (collection.learnedCount ?? 0) / collection.termCount : 0;

  async function handleDelete(term: Term) {
    Alert.alert('Delete Term', `Delete "${term.word}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteTerm(term.id); load(); } },
    ]);
  }

  async function handleAddTerm() {
    if (!newWord.trim() || !newDef.trim()) return;
    await createTerms([{ word: newWord.trim(), definition: newDef.trim(), notes: '' }], id);
    setNewWord(''); setNewDef(''); setShowAdd(false); load();
  }

  async function exportCSV() {
    let csv = 'Word,Definition,Notes,Mastery Level\n';
    for (const t of terms) {
      const row = [t.word, t.definition, t.notes, String(t.masteryLevel)]
        .map(v => `"${v.replace(/"/g, '""')}"`)
        .join(',');
      csv += row + '\n';
    }
    const path = FileSystem.cacheDirectory + `${collection?.name ?? 'terms'}_export.csv`;
    await FileSystem.writeAsStringAsync(path, csv, { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(path, { mimeType: 'text/csv' });
  }

  if (!collection) return null;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header Banner */}
      <LinearGradient colors={[color, `${color}aa`]} style={styles.banner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.bannerTitle}>{collection.name}</Text>
        <Text style={styles.bannerMeta}>
          {collection.termCount} terms · {collection.learnedCount ?? 0} learned · {collection.dueCount ?? 0} due
        </Text>
        <View style={styles.progressBg}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </LinearGradient>

      {/* Toolbar */}
      <View style={styles.toolbar}>
        <TextInput
          style={styles.search}
          placeholder="Search…"
          placeholderTextColor={Colors.textTertiary}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)}>
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
        {terms.length > 0 && (
          <TouchableOpacity style={styles.exportBtn} onPress={exportCSV}>
            <Text style={styles.exportText}>⬆</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filters}>
        {(['all', 'due', 'learned', 'new'] as Filter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterBtn, filter === f && { backgroundColor: color }]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {dueTerms.length > 0 && (
        <TouchableOpacity
          style={[styles.studyBtn, { backgroundColor: color }]}
          onPress={() => router.push({ pathname: '/study', params: { ids: dueTerms.map(t => t.id).join(',') } })}
        >
          <Text style={styles.studyBtnText}>▶  Study {dueTerms.length} Due Terms</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filtered}
        keyExtractor={t => t.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TermRow
            term={item}
            onPress={() => setEditTerm(item)}
          />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No terms match this filter.</Text>
        }
      />

      {/* Edit Modal */}
      {editTerm && (
        <EditModal
          term={editTerm}
          onSave={async (word, definition, notes) => {
            await updateTerm(editTerm.id, { word, definition, notes });
            setEditTerm(null);
            load();
          }}
          onDelete={() => { handleDelete(editTerm); setEditTerm(null); }}
          onClose={() => setEditTerm(null)}
        />
      )}

      {/* Add Term Modal */}
      <Modal visible={showAdd} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Add Term</Text>
            <TextInput style={styles.modalInput} placeholder="Word or phrase" value={newWord} onChangeText={setNewWord} autoFocus />
            <TextInput style={styles.modalInput} placeholder="Definition or translation" value={newDef} onChangeText={setNewDef} />
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowAdd(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!newWord.trim() || !newDef.trim()) && styles.saveBtnDisabled]}
                onPress={handleAddTerm}
                disabled={!newWord.trim() || !newDef.trim()}
              >
                <Text style={styles.saveText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function EditModal({ term, onSave, onDelete, onClose }: {
  term: Term;
  onSave: (word: string, definition: string, notes: string) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [word, setWord] = useState(term.word);
  const [def, setDef] = useState(term.definition);
  const [notes, setNotes] = useState(term.notes);

  return (
    <Modal visible transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Edit Term</Text>
          <TextInput style={styles.modalInput} value={word} onChangeText={setWord} placeholder="Word" />
          <TextInput style={styles.modalInput} value={def} onChangeText={setDef} placeholder="Definition" />
          <TextInput style={styles.modalInput} value={notes} onChangeText={setNotes} placeholder="Notes (optional)" />
          <MasteryBadge level={term.masteryLevel} />
          <Text style={styles.metaText}>Correct: {term.timesCorrect} · Incorrect: {term.timesIncorrect}</Text>
          <View style={styles.modalBtns}>
            <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
              <Text style={styles.deleteText}>Delete</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(word, def, notes)}>
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  banner: { padding: 20, paddingTop: 12, gap: 4 },
  backBtn: { marginBottom: 8 },
  backText: { fontSize: 17, color: '#fff', fontWeight: '600' },
  bannerTitle: { fontSize: 24, fontWeight: '700', color: '#fff' },
  bannerMeta: { fontSize: 13, color: 'rgba(255,255,255,0.85)' },
  progressBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 2, marginTop: 8 },
  progressFill: { height: 4, backgroundColor: '#fff', borderRadius: 2 },

  toolbar: { flexDirection: 'row', gap: 8, padding: 12, alignItems: 'center' },
  search: { flex: 1, backgroundColor: Colors.card, borderRadius: Radius.md, padding: 10, fontSize: 14, color: Colors.text },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { fontSize: 22, color: '#fff', fontWeight: '700' },
  exportBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  exportText: { fontSize: 16 },

  filters: { flexDirection: 'row', gap: 6, paddingHorizontal: 12, marginBottom: 8 },
  filterBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.full, backgroundColor: Colors.card },
  filterText: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  filterTextActive: { color: '#fff' },

  studyBtn: { marginHorizontal: 12, marginBottom: 8, padding: 12, borderRadius: Radius.md, alignItems: 'center' },
  studyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  list: { paddingHorizontal: 12, paddingBottom: 40 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  modalInput: { backgroundColor: Colors.background, borderRadius: Radius.md, padding: 14, fontSize: 15, color: Colors.text },
  metaText: { fontSize: 13, color: Colors.textSecondary },
  modalBtns: { flexDirection: 'row', gap: 8, marginTop: 4, paddingBottom: 16 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.background, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  saveBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: Colors.primary, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.4 },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  deleteBtn: { flex: 1, padding: 14, borderRadius: Radius.md, backgroundColor: '#FEE2E2', alignItems: 'center' },
  deleteText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },
});
