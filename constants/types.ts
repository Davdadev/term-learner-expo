export interface Term {
  id: string;
  word: string;
  definition: string;
  notes: string;
  masteryLevel: number;
  nextReviewDate: string;   // ISO string
  timesCorrect: number;
  timesIncorrect: number;
  createdAt: string;
  collectionId: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  colorHex: string;
  createdAt: string;
  termCount?: number;
  learnedCount?: number;
  dueCount?: number;
}

export interface ExtractedTerm {
  id: string;
  word: string;
  definition: string;
  notes: string;
}

export function isDue(term: Term): boolean {
  return new Date(term.nextReviewDate) <= new Date();
}

export function isLearned(term: Term): boolean {
  return term.masteryLevel >= 4;
}

export function masteryLabel(level: number): string {
  return ['New', 'Learning', 'Familiar', 'Practiced', 'Mastered', 'Expert'][level] ?? 'Unknown';
}

export function masteryColor(level: number): string {
  return ['#9CA3AF', '#FF9F43', '#EAB308', '#3B82F6', '#6C63FF', '#43C6AC'][level] ?? '#9CA3AF';
}

export function accuracyPct(term: Term): number {
  const total = term.timesCorrect + term.timesIncorrect;
  if (total === 0) return 0;
  return Math.round((term.timesCorrect / total) * 100);
}

export function scheduleReview(masteryLevel: number, correct: boolean): { newLevel: number; nextDate: Date } {
  if (correct) {
    const newLevel = Math.min(5, masteryLevel + 1);
    const days = [1, 3, 7, 14, 30, 60][newLevel];
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    return { newLevel, nextDate };
  } else {
    const newLevel = Math.max(0, masteryLevel - 1);
    const nextDate = new Date();
    nextDate.setHours(nextDate.getHours() + 4);
    return { newLevel, nextDate };
  }
}
