import { useState } from 'react';
import type { FilterMode } from '../types';
import { getAvailableCategories } from '../hooks/useWordEngine';
import { ThemeToggle } from './ThemeToggle';

interface HomeScreenProps {
  onStart: (filter: FilterMode, sessionLength: number | 'unlimited') => void;
  getDueCount: (filter: FilterMode) => number;
  getMasteredCount: (filter: FilterMode) => number;
  getAccuracy: () => number;
}

const SESSION_LENGTHS: (number | 'unlimited')[] = [10, 25, 50, 'unlimited'];

// Build filter options dynamically from available categories.
// Adding a new category to the word list data automatically adds it here.
function buildFilterOptions(): { label: string; value: FilterMode }[] {
  const cats = getAvailableCategories();
  const options: { label: string; value: FilterMode }[] = cats.map((cat) => ({
    label: `${cat} only`,
    value: cat as FilterMode,
  }));
  if (cats.length >= 2) {
    options.unshift({ label: 'Both', value: 'both' });
  }
  return options;
}

export function HomeScreen({ onStart, getDueCount, getMasteredCount, getAccuracy }: HomeScreenProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>('both');
  const [sessionLength, setSessionLength] = useState<number | 'unlimited'>(25);

  const filterOptions = buildFilterOptions();
  const dueCount = getDueCount(filterMode);
  const masteredCount = getMasteredCount(filterMode);
  const accuracy = getAccuracy();

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">NWL Word Trainer</h1>
        <ThemeToggle />
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-md mx-auto w-full">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 text-center">
          2- and 3-letter NWL2023 Scrabble words. See a word — tap Valid or Invalid.
        </p>

        {/* Category filter */}
        <section className="w-full mb-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Category
          </h2>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {filterOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterMode(opt.value)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  filterMode === opt.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>

        {/* Session length */}
        <section className="w-full mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            Session length
          </h2>
          <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            {SESSION_LENGTHS.map((len) => (
              <button
                key={String(len)}
                onClick={() => setSessionLength(len)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  sessionLength === len
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {len === 'unlimited' ? '∞' : len}
              </button>
            ))}
          </div>
        </section>

        {/* Start button */}
        <button
          onClick={() => onStart(filterMode, sessionLength)}
          className="w-full py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-colors shadow-sm"
        >
          Start Session
        </button>

        {/* Stats */}
        <section className="w-full mt-8 grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <span className="text-2xl font-bold text-blue-600">{dueCount}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Due today</span>
          </div>
          <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <span className="text-2xl font-bold text-green-600">{masteredCount}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Mastered</span>
          </div>
          <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
            <span className="text-2xl font-bold text-purple-600">{accuracy}%</span>
            <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">Accuracy</span>
          </div>
        </section>
      </main>
    </div>
  );
}
