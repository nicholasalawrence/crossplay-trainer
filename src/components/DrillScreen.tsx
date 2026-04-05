import { useEffect, useRef, useState, useCallback } from 'react';
import type { WordEntry } from '../types';
import { ThemeToggle } from './ThemeToggle';
import definitions from '../data/definitions.json';

const DEFINITIONS = definitions as Record<string, string>;

interface DrillScreenProps {
  currentCard: WordEntry | null;
  cardsAnswered: number;
  sessionLength: number | 'unlimited';
  streak: number;
  onAnswer: (isCorrect: boolean) => void;
  onEnd: () => void;
}

type FeedbackState =
  | { status: 'idle' }
  | { status: 'correct' }
  | { status: 'wrong'; word: string; isValid: boolean; definition?: string };

export function DrillScreen({
  currentCard,
  cardsAnswered,
  sessionLength,
  streak,
  onAnswer,
  onEnd,
}: DrillScreenProps) {
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle' });
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleAnswer = useCallback(
    (userSaysValid: boolean) => {
      if (answered || !currentCard) return;
      setAnswered(true);

      const isCorrect = userSaysValid === currentCard.isValid;
      // Capture definition now — currentCard will change after onAnswer fires
      const definition = DEFINITIONS[currentCard.word];

      if (isCorrect) {
        setFeedback({ status: 'correct' });
      } else {
        setFeedback({
          status: 'wrong',
          word: currentCard.word,
          isValid: currentCard.isValid,
          definition,
        });
      }

      // Record the answer and advance the card AFTER the feedback is visible.
      // Calling onAnswer here would immediately change currentCard, which would
      // clear feedback before the user sees it.
      timerRef.current = setTimeout(() => {
        onAnswer(isCorrect);
        setFeedback({ status: 'idle' });
        setAnswered(false);
      }, 1000);
    },
    [answered, currentCard, onAnswer]
  );

  // No card left — session should end (parent handles this via currentCard being null)
  if (!currentCard) return null;

  const progress =
    sessionLength !== 'unlimited'
      ? Math.min(cardsAnswered / (sessionLength as number), 1)
      : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={onEnd}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          ← End
        </button>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {sessionLength === 'unlimited'
            ? `${cardsAnswered} answered`
            : `${cardsAnswered} / ${sessionLength}`}
        </span>
        <ThemeToggle />
      </header>

      {/* Progress bar */}
      {progress !== null && (
        <div className="h-1 bg-gray-100 dark:bg-gray-800">
          <div
            className="h-1 bg-blue-500 transition-all duration-300"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Main area */}
      <main className="flex-1 flex flex-col items-center justify-between px-4 py-8 max-w-md mx-auto w-full">
        {/* Streak counter */}
        <div className="h-8 flex items-center">
          {streak >= 3 && (
            <span className="text-lg font-semibold text-orange-500 animate-pulse">
              🔥 {streak} in a row
            </span>
          )}
        </div>

        {/* Word display */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[4.5rem] sm:text-[6rem] font-extrabold tracking-widest leading-none select-none">
              {currentCard.word}
            </p>
            <p className="mt-4 text-sm text-gray-400 dark:text-gray-600">
              {currentCard.category}
            </p>
          </div>
        </div>

        {/* Answer buttons */}
        <div className="w-full flex gap-3 mb-4">
          <button
            onClick={() => handleAnswer(true)}
            disabled={answered}
            className={`flex-1 py-5 text-xl font-bold rounded-2xl transition-all ${
              answered
                ? 'opacity-50 cursor-not-allowed'
                : 'active:scale-95'
            } bg-green-600 hover:bg-green-700 text-white shadow-sm`}
          >
            VALID
          </button>
          <button
            onClick={() => handleAnswer(false)}
            disabled={answered}
            className={`flex-1 py-5 text-xl font-bold rounded-2xl transition-all ${
              answered
                ? 'opacity-50 cursor-not-allowed'
                : 'active:scale-95'
            } bg-red-600 hover:bg-red-700 text-white shadow-sm`}
          >
            INVALID
          </button>
        </div>
      </main>

      {/* Feedback overlay */}
      {feedback.status !== 'idle' && (
        <div
          className={`fixed inset-0 flex items-center justify-center pointer-events-none z-50 transition-opacity duration-200 ${
            feedback.status === 'correct'
              ? 'bg-green-600/30'
              : 'bg-red-600/30'
          }`}
        >
          <div
            className={`px-8 py-6 rounded-3xl text-center shadow-2xl max-w-xs mx-4 ${
              feedback.status === 'correct'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {feedback.status === 'correct' ? (
              <span className="text-4xl">✓</span>
            ) : (
              <div>
                <span className="text-4xl block mb-2">✗</span>
                {feedback.isValid ? (
                  <>
                    <p className="font-bold text-lg">
                      {feedback.word} is valid
                    </p>
                    {feedback.definition && (
                      <p className="text-sm mt-1 opacity-90">{feedback.definition}</p>
                    )}
                  </>
                ) : (
                  <p className="font-bold text-lg">
                    {feedback.word} is not valid in NWL2023
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
