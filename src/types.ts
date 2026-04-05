export type Category = '2-letter' | '3-letter';
// Future categories will be added here: 'q-words' | 'vowel-dump' | etc.
// The filter UI reads this type, so adding a new category only requires:
//   1. Adding the string to this union
//   2. Adding entries with that category to the word list

export interface WordEntry {
  word: string;
  category: Category;
}

// Used during a drill session. isDecoy=true means the word is not in NWL2023
// and the correct answer is INVALID.
export interface SessionCard {
  word: string;
  category: Category;
  isDecoy: boolean;
}

export interface WordProgress {
  word: string;
  interval: number;       // days until next review
  easeFactor: number;     // SM-2 ease factor, starts at 2.5
  dueDate: string;        // ISO date string
  timesCorrect: number;
  timesWrong: number;
}

export type FilterMode = '2-letter' | '3-letter' | 'both';

export type Screen = 'home' | 'drill' | 'summary';

export interface SessionResult {
  totalAnswered: number;
  correct: number;
  wrong: number;
  bestStreak: number;
  missedWords: string[];
  filterMode: FilterMode;
  sessionLength: number | 'unlimited';
}
