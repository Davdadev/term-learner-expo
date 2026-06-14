import * as SQLite from 'expo-sqlite';
import { Term, Collection, scheduleReview } from '@/constants/types';

let _db: SQLite.SQLiteDatabase | null = null;
let _ready: Promise<void> | null = null;

async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!_db) {
    _db = await SQLite.openDatabaseAsync('termlearner.db');
  }
  return _db;
}

export function initDatabase(): Promise<void> {
  if (_ready) return _ready;
  _ready = (async () => {
    const db = await getDb();
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS collections (
        id          TEXT PRIMARY KEY,
        name        TEXT NOT NULL,
        description TEXT DEFAULT '',
        color_hex   TEXT DEFAULT '6C63FF',
        created_at  TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS terms (
        id               TEXT PRIMARY KEY,
        word             TEXT NOT NULL,
        definition       TEXT NOT NULL,
        notes            TEXT DEFAULT '',
        mastery_level    INTEGER DEFAULT 0,
        next_review_date TEXT NOT NULL,
        times_correct    INTEGER DEFAULT 0,
        times_incorrect  INTEGER DEFAULT 0,
        created_at       TEXT NOT NULL,
        collection_id    TEXT NOT NULL,
        FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
      );
    `);
  })();
  return _ready;
}

// ── Collections ────────────────────────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  await initDatabase();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(`
    SELECT
      c.*,
      COUNT(t.id)                                      AS term_count,
      SUM(CASE WHEN t.mastery_level >= 4 THEN 1 END)  AS learned_count,
      SUM(CASE WHEN t.next_review_date <= datetime('now') THEN 1 END) AS due_count
    FROM collections c
    LEFT JOIN terms t ON t.collection_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at DESC
  `);
  return rows.map(rowToCollection);
}

export async function getCollection(id: string): Promise<Collection | null> {
  await initDatabase();
  const db = await getDb();
  const row = await db.getFirstAsync<any>(
    `SELECT c.*,
      COUNT(t.id) AS term_count,
      SUM(CASE WHEN t.mastery_level >= 4 THEN 1 END) AS learned_count,
      SUM(CASE WHEN t.next_review_date <= datetime('now') THEN 1 END) AS due_count
     FROM collections c LEFT JOIN terms t ON t.collection_id = c.id
     WHERE c.id = ? GROUP BY c.id`,
    [id]
  );
  return row ? rowToCollection(row) : null;
}

export async function createCollection(
  name: string, description = '', colorHex = '6C63FF'
): Promise<Collection> {
  await initDatabase();
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    'INSERT INTO collections (id, name, description, color_hex, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, description, colorHex, now]
  );
  return { id, name, description, colorHex, createdAt: now, termCount: 0, learnedCount: 0, dueCount: 0 };
}

export async function deleteCollection(id: string) {
  await initDatabase();
  const db = await getDb();
  await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
}

// ── Terms ──────────────────────────────────────────────────────────────────────

export async function getTerms(collectionId: string): Promise<Term[]> {
  await initDatabase();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM terms WHERE collection_id = ? ORDER BY word ASC', [collectionId]
  );
  return rows.map(rowToTerm);
}

export async function getAllTerms(): Promise<Term[]> {
  await initDatabase();
  const db = await getDb();
  const rows = await db.getAllAsync<any>('SELECT * FROM terms ORDER BY word ASC');
  return rows.map(rowToTerm);
}

export async function getDueTerms(): Promise<Term[]> {
  await initDatabase();
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    "SELECT * FROM terms WHERE next_review_date <= datetime('now') ORDER BY next_review_date ASC"
  );
  return rows.map(rowToTerm);
}

export async function createTerms(
  terms: Array<{ word: string; definition: string; notes: string }>,
  collectionId: string
) {
  await initDatabase();
  const db = await getDb();
  const now = new Date().toISOString();
  await db.withTransactionAsync(async () => {
    for (const t of terms) {
      await db.runAsync(
        `INSERT INTO terms (id, word, definition, notes, mastery_level, next_review_date, times_correct, times_incorrect, created_at, collection_id)
         VALUES (?, ?, ?, ?, 0, ?, 0, 0, ?, ?)`,
        [crypto.randomUUID(), t.word, t.definition, t.notes, now, now, collectionId]
      );
    }
  });
}

export async function updateTerm(id: string, updates: Partial<Term>) {
  await initDatabase();
  const db = await getDb();
  const fields = Object.entries(updates)
    .map(([k]) => `${camelToSnake(k)} = ?`)
    .join(', ');
  const values = [...Object.values(updates), id];
  await db.runAsync(`UPDATE terms SET ${fields} WHERE id = ?`, values as any);
}

export async function recordReview(term: Term, correct: boolean) {
  await initDatabase();
  const db = await getDb();
  const { newLevel, nextDate } = scheduleReview(term.masteryLevel, correct);
  await db.runAsync(
    `UPDATE terms SET
       mastery_level    = ?,
       next_review_date = ?,
       times_correct    = times_correct + ?,
       times_incorrect  = times_incorrect + ?
     WHERE id = ?`,
    [newLevel, nextDate.toISOString(), correct ? 1 : 0, correct ? 0 : 1, term.id]
  );
}

export async function deleteTerm(id: string) {
  await initDatabase();
  const db = await getDb();
  await db.runAsync('DELETE FROM terms WHERE id = ?', [id]);
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function rowToCollection(r: any): Collection {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    colorHex: r.color_hex ?? '6C63FF',
    createdAt: r.created_at,
    termCount: r.term_count ?? 0,
    learnedCount: r.learned_count ?? 0,
    dueCount: r.due_count ?? 0,
  };
}

function rowToTerm(r: any): Term {
  return {
    id: r.id,
    word: r.word,
    definition: r.definition,
    notes: r.notes ?? '',
    masteryLevel: r.mastery_level ?? 0,
    nextReviewDate: r.next_review_date,
    timesCorrect: r.times_correct ?? 0,
    timesIncorrect: r.times_incorrect ?? 0,
    createdAt: r.created_at,
    collectionId: r.collection_id,
  };
}

function camelToSnake(s: string): string {
  return s.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`);
}
