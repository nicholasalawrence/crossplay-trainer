import { useState, useCallback, useMemo } from 'react';
import type { WordEntry, SessionCard, WordProgress, FilterMode, SessionResult, Category } from '../types';
import wordData from '../data/words_nwl23.json';

const STORAGE_KEY = 'nwl_progress';
const DECOY_RATIO = 0.25; // ~1 decoy per 3 real words

// ---------------------------------------------------------------------------
// Build the full word list from JSON
// ---------------------------------------------------------------------------

type WordData = {
  two_letter: string[];
  three_letter: string[];
  decoys_2: string[];
  decoys_3: string[];
};

function buildWordList(): WordEntry[] {
  const raw = wordData as WordData;
  const entries: WordEntry[] = [];
  raw.two_letter.forEach((w) => entries.push({ word: w.toUpperCase(), category: '2-letter' }));
  raw.three_letter.forEach((w) => entries.push({ word: w.toUpperCase(), category: '3-letter' }));
  return entries;
}

function buildDecoyList(): SessionCard[] {
  const raw = wordData as WordData;
  const decoys: SessionCard[] = [];
  raw.decoys_2.forEach((w) => decoys.push({ word: w.toUpperCase(), category: '2-letter', isDecoy: true }));
  raw.decoys_3.forEach((w) => decoys.push({ word: w.toUpperCase(), category: '3-letter', isDecoy: true }));
  return decoys;
}

// Cached globally — built once at module load
const ALL_WORDS: WordEntry[] = buildWordList();
const ALL_DECOYS: SessionCard[] = buildDecoyList();

// ---------------------------------------------------------------------------
// Derive unique categories from word list (extensibility hook)
// ---------------------------------------------------------------------------

export function getAvailableCategories(): Category[] {
  const cats = new Set<Category>();
  ALL_WORDS.forEach((w) => cats.add(w.category));
  return Array.from(cats).sort();
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

function loadProgress(): Record<string, WordProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, WordProgress>;
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<string, WordProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Silently fail if storage is full
  }
}

// ---------------------------------------------------------------------------
// SM-2 helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  const d = new Date();
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  );
}

function addDays(dateStr: string, days: number): string {
  // Parse as local midnight to avoid UTC offset shifting the date
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day + days);
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, '0')}-` +
    `${String(d.getDate()).padStart(2, '0')}`
  );
}

function getOrCreateProgress(
  word: string,
  progress: Record<string, WordProgress>
): WordProgress {
  if (progress[word]) return progress[word];
  return {
    word,
    interval: 1,
    easeFactor: 2.5,
    dueDate: todayStr(),
    timesCorrect: 0,
    timesWrong: 0,
  };
}

function applyCorrect(p: WordProgress): WordProgress {
  const newInterval = Math.round(p.interval * p.easeFactor);
  const newEase = Math.min(3.0, p.easeFactor + 0.1);
  return {
    ...p,
    interval: newInterval,
    easeFactor: newEase,
    dueDate: addDays(todayStr(), newInterval),
    timesCorrect: p.timesCorrect + 1,
  };
}

function applyWrong(p: WordProgress): WordProgress {
  return {
    ...p,
    interval: 1,
    easeFactor: Math.max(1.3, p.easeFactor - 0.2),
    dueDate: todayStr(),
    timesWrong: p.timesWrong + 1,
  };
}

// ---------------------------------------------------------------------------
// Shuffle helper
// ---------------------------------------------------------------------------

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// Build session queue
// ---------------------------------------------------------------------------

function buildQueue(
  filterMode: FilterMode,
  sessionLength: number | 'unlimited',
  progress: Record<string, WordProgress>
): SessionCard[] {
  const today = todayStr();

  // Filter real words and decoys by category
  const filteredWords = ALL_WORDS.filter(
    (w) => filterMode === 'both' || w.category === filterMode
  );
  const filteredDecoys = ALL_DECOYS.filter(
    (w) => filterMode === 'both' || w.category === filterMode
  );

  // Determine target session length
  const targetLength =
    sessionLength === 'unlimited'
      ? Math.round(filteredWords.length / (1 - DECOY_RATIO))
      : sessionLength;

  // Split real words into due vs non-due
  const due = filteredWords.filter((w) => {
    const p = progress[w.word];
    return !p || p.dueDate <= today;
  });
  const nonDue = filteredWords.filter((w) => {
    const p = progress[w.word];
    return p && p.dueDate > today;
  });

  // How many real vs decoy cards
  const decoyCount = Math.round(targetLength * DECOY_RATIO);
  const realCount = targetLength - decoyCount;

  // Real side: due words first, pad with non-due if needed
  let realQueue = shuffle(due);
  if (realQueue.length < realCount) {
    realQueue = [...realQueue, ...shuffle(nonDue).slice(0, realCount - realQueue.length)];
  } else {
    realQueue = realQueue.slice(0, realCount);
  }

  // Convert real WordEntry[] to SessionCard[]
  const realCards: SessionCard[] = realQueue.map((w) => ({ ...w, isDecoy: false }));

  // Decoy side
  const decoyCards = shuffle(filteredDecoys).slice(0, decoyCount);

  // Shuffle everything together
  return shuffle([...realCards, ...decoyCards]);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface WordEngineState {
  // All words
  allWords: WordEntry[];

  // Session state
  queue: SessionCard[];
  currentIndex: number;
  currentCard: SessionCard | null;
  isSessionActive: boolean;
  sessionLength: number | 'unlimited';
  filterMode: FilterMode;

  // Stats
  cardsAnswered: number;
  correct: number;
  wrong: number;
  streak: number;
  bestStreak: number;
  missedWords: string[];

  // Progress map
  progress: Record<string, WordProgress>;

  // Actions
  startSession: (filter: FilterMode, length: number | 'unlimited') => void;
  answerCard: (isCorrect: boolean) => void;
  endSession: () => SessionResult;
  resetSession: () => void;

  // Home stats
  getDueCount: (filter: FilterMode) => number;
  getMasteredCount: (filter: FilterMode) => number;
  getAccuracy: () => number;
}

export function useWordEngine(): WordEngineState {
  const [progress, setProgress] = useState<Record<string, WordProgress>>(() =>
    loadProgress()
  );
  const [queue, setQueue] = useState<SessionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [sessionLength, setSessionLength] = useState<number | 'unlimited'>(25);
  const [filterMode, setFilterMode] = useState<FilterMode>('both');
  const [cardsAnswered, setCardsAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [missedWords, setMissedWords] = useState<string[]>([]);

  const currentCard = useMemo(
    () => (isSessionActive && currentIndex < queue.length ? queue[currentIndex] : null),
    [isSessionActive, currentIndex, queue]
  );

  const startSession = useCallback(
    (filter: FilterMode, length: number | 'unlimited') => {
      const prog = loadProgress();
      setProgress(prog);
      const q = buildQueue(filter, length, prog);
      setQueue(q);
      setCurrentIndex(0);
      setFilterMode(filter);
      setSessionLength(length);
      setCardsAnswered(0);
      setCorrect(0);
      setWrong(0);
      setStreak(0);
      setBestStreak(0);
      setMissedWords([]);
      setIsSessionActive(true);
    },
    []
  );

  const answerCard = useCallback(
    (isCorrect: boolean) => {
      if (!currentCard) return;

      // Only update SRS for real words — decoys are not tracked
      if (!currentCard.isDecoy) {
        const word = currentCard.word;
        const existing = getOrCreateProgress(word, progress);
        const updated = isCorrect ? applyCorrect(existing) : applyWrong(existing);
        // Buffer in memory — written to localStorage only on natural session end
        setProgress((prev) => ({ ...prev, [word]: updated }));
      }

      setCardsAnswered((c) => c + 1);

      if (isCorrect) {
        setCorrect((c) => c + 1);
        setStreak((s) => {
          const ns = s + 1;
          setBestStreak((b) => Math.max(b, ns));
          return ns;
        });
      } else {
        setWrong((w) => w + 1);
        setStreak(0);
        if (!currentCard.isDecoy) {
          setMissedWords((m) => [...m, currentCard.word]);
        }
      }

      setCurrentIndex((i) => i + 1);
    },
    [currentCard, progress]
  );

  const endSession = useCallback((): SessionResult => {
    setIsSessionActive(false);
    // Commit buffered SRS progress to localStorage
    saveProgress(progress);
    return {
      totalAnswered: cardsAnswered,
      correct,
      wrong,
      bestStreak,
      missedWords,
      filterMode,
      sessionLength,
    };
  }, [progress, cardsAnswered, correct, wrong, bestStreak, missedWords, filterMode, sessionLength]);

  const resetSession = useCallback(() => {
    // Discard buffered progress by reloading from localStorage (no write)
    setProgress(loadProgress());
    setIsSessionActive(false);
    setQueue([]);
    setCurrentIndex(0);
    setCardsAnswered(0);
    setCorrect(0);
    setWrong(0);
    setStreak(0);
    setBestStreak(0);
    setMissedWords([]);
  }, []);

  const getDueCount = useCallback(
    (filter: FilterMode): number => {
      const today = todayStr();
      const prog = loadProgress();
      return ALL_WORDS.filter((w) => {
        if (filter !== 'both' && w.category !== filter) return false;
        const p = prog[w.word];
        return !p || p.dueDate <= today;
      }).length;
    },
    []
  );

  const getMasteredCount = useCallback(
    (filter: FilterMode): number => {
      const prog = loadProgress();
      return ALL_WORDS.filter((w) => {
        if (filter !== 'both' && w.category !== filter) return false;
        const p = prog[w.word];
        return p && p.interval >= 21;
      }).length;
    },
    []
  );

  const getAccuracy = useCallback((): number => {
    const prog = loadProgress();
    let totalCorrect = 0;
    let totalAnswered = 0;
    Object.values(prog).forEach((p) => {
      totalCorrect += p.timesCorrect;
      totalAnswered += p.timesCorrect + p.timesWrong;
    });
    if (totalAnswered === 0) return 0;
    return Math.round((totalCorrect / totalAnswered) * 100);
  }, []);

  return {
    allWords: ALL_WORDS,
    queue,
    currentIndex,
    currentCard,
    isSessionActive,
    sessionLength,
    filterMode,
    cardsAnswered,
    correct,
    wrong,
    streak,
    bestStreak,
    missedWords,
    progress,
    startSession,
    answerCard,
    endSession,
    resetSession,
    getDueCount,
    getMasteredCount,
    getAccuracy,
  };
}
