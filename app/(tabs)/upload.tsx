import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useSQLiteContext } from 'expo-sqlite';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Gradients, CollectionColors, Radius, Shadow } from '@/constants/theme';
import { extractTermsFromImage, ExtractionResult } from '@/services/claude';
import { getCollections, createCollection, createTerms } from '@/services/database';
import { Collection } from '@/constants/types';
import { randomUUID } from 'expo-crypto';

interface DraftTerm { id: string; word: string; definition: string; notes: string; }

type Phase = 'idle' | 'processing' | 'review';

export default function Upload() {
  const db = useSQLiteContext();
  const [phase, setPhase] = useState<Phase>('idle');
  const [terms, setTerms] = useState<DraftTerm[]>([]);
  const [copyright, setCopyright] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedColId, setSelectedColId] = useState('');
  const [newColName, setNewColName] = useState('');
  const [showColPicker, setShowColPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pickFromLibrary() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.85 });
    if (!res.canceled) processImage(res.assets[0].uri);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Camera access needed'); return; }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.85 });
    if (!res.canceled) processImage(res.assets[0].uri);
  }

  async function processImage(uri: string) {
    setProcessing(true);
    setPhase('processing');
    setError('');
    try {
      const result: ExtractionResult = await extractTermsFromImage(uri);
      setTerms(result.terms.map(t => ({ ...t, id: randomUUID() })));
      setCopyright(result.copyrightWarning);
      setPhase('review');
      const cols = await getCollections(db);
      setCollections(cols);
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong.');
      setPhase('idle');
    } finally {
      setProcessing(false);
    }
  }

  async function importCSV() {
    const res = await DocumentPicker.getDocumentAsync({ type: ['text/csv', 'text/plain'] });
    if (res.canceled || !res.assets?.[0]) return;
    const raw = await FileSystem.readAsStringAsync(res.assets[0].uri);
    const lines = raw.split('\n').filter(Boolean);
    // Skip header
    const start = lines[0].toLowerCase().startsWith('word') ? 1 : 0;
    const parsed = lines.slice(start).map(line => {
      const fields = parseCSVLine(line);
      if (fields.length < 2 || !fields[0].trim() || !fields[1].trim()) return null;
      return { id: randomUUID(), word: fields[0].trim(), definition: fields[1].trim(), notes: (fields[2] ?? '').trim() };
    }).filter(Boolean) as DraftTerm[];

    if (parsed.length === 0) { Alert.alert('No valid terms found', 'CSV must have at least two columns: word, definition'); return; }
    setTerms(parsed);
    setCopyright(false);
    setPhase('review');
    setCollections(await getCollections(db));
  }

  async function save() {
    const colName = newColName.trim();
    if (!selectedColId && !colName) { Alert.alert('Choose or create a collection'); return; }
    setSaving(true);
    let colId = selectedColId;
    if (!colId) {
      const col = await createCollection(db, colName, '', CollectionColors[Math.floor(Math.random() * CollectionColors.length)]);
      colId = col.id;
    }
    await createTerms(db, terms.map(t => ({ word: t.word, definition: t.definition, notes: t.notes })), colId);
    setSaving(false);
    setPhase('idle');
    setTerms([]);
    setNewColName('');
    setSelectedColId('');
    Alert.alert('Saved!', `${terms.length} terms added.`);
  }

  function reset() { setPhase('idle'); setTerms([]); setError(''); }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Upload Terms</Text>

        {phase === 'idle' && (
          <>
            {error !== '' && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
            <View style={styles.uploadBox}>
              <Text style={styles.uploadIcon}>📷</Text>
              <Text style={styles.uploadTitle}>Upload an Image</Text>
              <Text style={styles.uploadSub}>From a single word to 70+ terms per photo</Text>
              <View style={styles.uploadBtns}>
                <TouchableOpacity style={styles.primaryBtn} onPress={pickFromLibrary}>
                  <LinearGradient colors={Gradients.primary} style={styles.btnGrad}>
                    <Text style={styles.primaryBtnText}>📱 Photo Library</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromCamera}>
                  <Text style={styles.secondaryBtnText}>📸 Camera</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={importCSV}>
                  <Text style={styles.secondaryBtnText}>📄 Import CSV</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.howBox}>
              <Text style={styles.howTitle}>How it works</Text>
              {['Take or upload a photo of any vocabulary list',
                'Claude AI extracts every term automatically',
                'Review and edit, then save to a collection',
                'Get daily reminders to study your terms'].map((s, i) => (
                <View key={i} style={styles.step}>
                  <View style={styles.stepNum}><Text style={styles.stepNumText}>{i + 1}</Text></View>
                  <Text style={styles.stepText}>{s}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {phase === 'processing' && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Claude AI is extracting terms…</Text>
          </View>
        )}

        {phase === 'review' && (
          <>
            {copyright && (
              <View style={styles.copyrightBox}>
                <Text style={styles.copyrightText}>
                  © This image may contain copyrighted material. Terms are for personal study only.
                </Text>
              </View>
            )}

            <View style={styles.reviewHeader}>
              <Text style={styles.reviewCount}>{terms.length} terms extracted</Text>
              <TouchableOpacity onPress={reset}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            {terms.map((term, i) => (
              <View key={term.id} style={styles.termCard}>
                <TextInput
                  style={styles.termWord}
                  value={term.word}
                  onChangeText={v => setTerms(ts => ts.map(t => t.id === term.id ? { ...t, word: v } : t))}
                  placeholder="Term"
                />
                <TextInput
                  style={styles.termDef}
                  value={term.definition}
                  onChangeText={v => setTerms(ts => ts.map(t => t.id === term.id ? { ...t, definition: v } : t))}
                  placeholder="Definition"
                />
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => setTerms(ts => ts.filter(t => t.id !== term.id))}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}

            <Text style={styles.saveLabel}>Save to Collection</Text>
            {collections.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colScroll}>
                {collections.map(col => (
                  <TouchableOpacity
                    key={col.id}
                    style={[styles.colChip, selectedColId === col.id && styles.colChipActive]}
                    onPress={() => { setSelectedColId(col.id); setNewColName(''); }}
                  >
                    <Text style={[styles.colChipText, selectedColId === col.id && styles.colChipTextActive]}>
                      {col.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
            <TextInput
              style={styles.newColInput}
              placeholder="Or create a new collection…"
              placeholderTextColor={Colors.textTertiary}
              value={newColName}
              onChangeText={v => { setNewColName(v); if (v) setSelectedColId(''); }}
            />

            <TouchableOpacity
              style={[styles.saveBtn, (saving || terms.length === 0) && styles.saveBtnDisabled]}
              onPress={save}
              disabled={saving || terms.length === 0}
            >
              <LinearGradient colors={Gradients.primary} style={styles.btnGrad}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save {terms.length} Terms</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
      else inQ = !inQ;
    } else if (ch === ',' && !inQ) { fields.push(cur); cur = ''; }
    else cur += ch;
  }
  fields.push(cur);
  return fields;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.text },

  errorBox: { backgroundColor: '#FEE2E2', borderRadius: Radius.md, padding: 14 },
  errorText: { color: '#DC2626', fontSize: 14, lineHeight: 20 },

  uploadBox: {
    backgroundColor: Colors.card, borderRadius: Radius.xl,
    padding: 32, alignItems: 'center', gap: 12,
    borderWidth: 2, borderStyle: 'dashed', borderColor: `${Colors.primary}44`,
  },
  uploadIcon: { fontSize: 48 },
  uploadTitle: { fontSize: 20, fontWeight: '700', color: Colors.text },
  uploadSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  uploadBtns: { width: '100%', gap: 10, marginTop: 8 },
  primaryBtn: { borderRadius: Radius.md, overflow: 'hidden' },
  btnGrad: { padding: 14, alignItems: 'center' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    padding: 14, borderRadius: Radius.md, alignItems: 'center',
    backgroundColor: `${Colors.primary}12`,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },

  howBox: { backgroundColor: Colors.card, borderRadius: Radius.lg, padding: 18, gap: 14 },
  howTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  stepText: { flex: 1, fontSize: 14, color: Colors.textSecondary, lineHeight: 20 },

  loadingBox: { backgroundColor: Colors.card, borderRadius: Radius.xl, padding: 48, alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 15, color: Colors.textSecondary },

  copyrightBox: { backgroundColor: '#FFF7ED', borderRadius: Radius.md, padding: 14 },
  copyrightText: { fontSize: 13, color: '#D97706', lineHeight: 18 },

  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewCount: { fontSize: 18, fontWeight: '700', color: Colors.text },
  clearText: { fontSize: 14, color: Colors.secondary, fontWeight: '600' },

  termCard: {
    backgroundColor: Colors.card, borderRadius: Radius.md, padding: 14,
    gap: 6, ...Shadow.sm,
  },
  termWord: { fontSize: 16, fontWeight: '600', color: Colors.text },
  termDef: { fontSize: 14, color: Colors.textSecondary },
  removeBtn: { position: 'absolute', top: 10, right: 12 },
  removeBtnText: { fontSize: 16, color: Colors.textTertiary },

  saveLabel: { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: 8 },
  colScroll: { marginBottom: 4 },
  colChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: `${Colors.primary}14`, marginRight: 8,
  },
  colChipActive: { backgroundColor: Colors.primary },
  colChipText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  colChipTextActive: { color: '#fff' },
  newColInput: {
    backgroundColor: Colors.card, borderRadius: Radius.md,
    padding: 14, fontSize: 15, color: Colors.text,
  },
  saveBtn: { borderRadius: Radius.lg, overflow: 'hidden', marginTop: 8 },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
