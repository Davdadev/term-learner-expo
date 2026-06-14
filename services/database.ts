import * as SQLite from 'expo-sqlite/legacy';
import { Term, Collection, scheduleReview } from '@/constants/types';

const db = SQLite.openDatabase('termlearner.db');
let _ready: Promise<void> | null = null;

export function initDatabase(): Promise<void> {
  if (_ready) return _ready;
  _ready = new Promise<void>((resolve, reject) => {
    db.transaction(
      tx => {
        tx.executeSql('PRAGMA journal_mode = WAL');
        tx.executeSql('PRAGMA foreign_keys = ON');
        tx.executeSql(`
          CREATE TABLE IF NOT EXISTS collections (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL,
            description TEXT DEFAULT '',
            color_hex   TEXT DEFAULT '6C63FF',
            created_at  TEXT NOT NULL
          )
        `);
        tx.executeSql(`
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
          )
        `);
      },
      reject,
      resolve
    );
  });
  return _ready;
}

function exec(
  sql: string,
  args: (string | number | null)[] = []
): Promise<SQLite.SQLResultSet> {
  return new Promise((resolve, reject) => {
    db.transaction(
      tx => tx.executeSql(sql, args, (_, res) => resolve(res), (_, err) => { reject(err); return false; }),
      reject
    );
  });
}

// ── Collections ────────────────────────────────────────────────────────────────

export async function getCollections(): Promise<Collection[]> {
  await initDatabase();
  const res = await exec(`
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
  return Array.from({ length: res.rows.length }, (_, i) => rowToCollection(res.rows.item(i)));
}

export async function getCollection(id: string): Promise<Collection | null> {
  await initDatabase();
  const res = await exec(
    `SELECT c.*,
      COUNT(t.id) AS term_count,
      SUM(CASE WHEN t.mastery_level >= 4 THEN 1 END) AS learned_count,
      SUM(CASE WHEN t.next_review_date <= datetime('now') THEN 1 END) AS due_count
     FROM collections c LEFT JOIN terms t ON t.collection_id = c.id
     WHERE c.id = ? GROUP BY c.id`,
    [id]
  );
  return res.rows.length > 0 ? rowToCollection(res.rows.item(0)) : null;
}

export async function createCollection(
  name: string, description = '', colorHex = '6C63FF'
): Promise<Collection> {
  await initDatabase();
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  await exec(
    'INSERT INTO collections (id, name, description, color_hex, created_at) VALUES (?, ?, ?, ?, ?)',
    [id, name, description, colorHex, now]
  );
  return { id, name, description, colorHex, createdAt: now, termCount: 0, learnedCount: 0, dueCount: 0 };
}

export async function deleteCollection(id: string) {
  await initDatabase();
  await exec('DELETE FROM collections WHERE id = ?', [id]);
}

// ── Terms ──────────────────────────────────────────────────────────────────────

export async function getTerms(collectionId: string): Promise<Term[]> {
  await initDatabase();
  const res = await exec(
    'SELECT * FROM terms WHERE collection_id = ? ORDER BY word ASC', [collectionId]
  );
  return Array.from({ length: res.rows.length }, (_, i) => rowToTerm(res.rows.item(i)));
}

export async function getAllTerms(): Promise<Term[]> {
  await initDatabase();
  const res = await exec('SELECT * FROM terms ORDER BY word ASC');
  return Array.from({ length: res.rows.length }, (_, i) => rowToTerm(res.rows.item(i)));
}

export async function getDueTerms(): Promise<Term[]> {
  await initDatabase();
  const res = await exec(
    "SELECT * FROM terms WHERE next_review_date <= datetime('now') ORDER BY next_review_date ASC"
  );
  return Array.from({ length: res.rows.length }, (_, i) => rowToTerm(res.rows.item(i)));
}

export async function createTerms(
  terms: Array<{ word: string; definition: string; notes: string }>,
  collectionId: string
) {
  await initDatabase();
  const now = new Date().toISOString();
  await new Promise<void>((resolve, reject) => {
    db.transaction(
      tx => {
        for (const t of terms) {
          tx.executeSql(
            `INSERT INTO terms (id, word, definition, notes, mastery_level, next_review_date, times_correct, times_incorrect, created_at, collection_id)
             VALUES (?, ?, ?, ?, 0, ?, 0, 0, ?, ?)`,
            [crypto.randomUUID(), t.word, t.definition, t.notes, now, now, collectionId]
          );
        }
      },
      reject,
      resolve
    );
  });
}

export async function updateTerm(id: string, updates: Partial<Term>) {
  await initDatabase();
  const fields = Object.entries(updates)
    .map(([k]) => `${camelToSnake(k)} = ?`)
    .join(', ');
  const values = [...Object.values(updates), id];
  await exec(`UPDATE terms SET ${fields} WHERE id = ?`, values as any);
}

export async function recordReview(term: Term, correct: boolean) {
  await initDatabase();
  const { newLevel, nextDate } = scheduleReview(term.masteryLevel, correct);
  await exec(
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
  await exec('DELETE FROM terms WHERE id = ?', [id]);
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
