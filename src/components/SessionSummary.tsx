import type { SessionResult } from '../types';
import { ThemeToggle } from './ThemeToggle';

interface SessionSummaryProps {
  result: SessionResult;
  onStudyAgain: () => void;
  onHome: () => void;
}

export function SessionSummary({ result, onStudyAgain, onHome }: SessionSummaryProps) {
  const { totalAnswered, correct, wrong, bestStreak, missedWords } = result;
  const pct = totalAnswered > 0 ? Math.round((correct / totalAnswered) * 100) : 0;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <h1 className="text-lg font-bold tracking-tight">Session Summary</h1>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-8 max-w-md mx-auto w-full">
        {/* Score stats */}
        <div className="w-full grid grid-cols-2 gap-3 mb-6">
          <Stat label="Cards answered" value={String(totalAnswered)} />
          <Stat label="Correct" value={`${correct} (${pct}%)`} color="text-green-600" />
          <Stat label="Wrong" value={String(wrong)} color="text-red-600" />
          <Stat label="Best streak" value={String(bestStreak)} color="text-orange-500" />
        </div>

        {/* Missed words */}
        {missedWords.length > 0 && (
          <section className="w-full mb-6">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
              Words you missed ({missedWords.length})
            </h2>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
              {missedWords.map((w) => (
                <div
                  key={w}
                  className="px-4 py-2 flex items-center justify-between bg-white dark:bg-gray-900"
                >
                  <span className="font-mono font-bold tracking-wider">{w}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {missedWords.length === 0 && (
          <p className="text-green-600 font-semibold mb-6">
            Perfect session — no words missed!
          </p>
        )}

        {/* Action buttons */}
        <div className="w-full flex flex-col gap-3">
          <button
            onClick={onStudyAgain}
            className="w-full py-4 text-lg font-bold bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl transition-colors shadow-sm"
          >
            Study Again
          </button>
          <button
            onClick={onHome}
            className="w-full py-4 text-lg font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-xl transition-colors"
          >
            Home
          </button>
        </div>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  color = '',
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col items-center bg-gray-50 dark:bg-gray-900 rounded-xl p-4">
      <span className={`text-2xl font-bold ${color || 'text-gray-900 dark:text-gray-100'}`}>
        {value}
      </span>
      <span className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">{label}</span>
    </div>
  );
}
