import { useEffect, useRef, useState, useCallback } from 'react';
import type { SessionCard } from '../types';
import { ThemeToggle } from './ThemeToggle';
import wordData from '../data/words_nwl23.json';

// Definitions are now embedded in the word list JSON.
// The map is complete for all real (non-decoy) words.
const DEFINITIONS = (wordData as { definitions: Record<string, string> }).definitions;

// When true: real-word cards with a definition wait for a tap to advance.
// When false: everything auto-advances after ~1000ms (legacy behavior).
const SELF_PACED = true;

interface DrillScreenProps {
  currentCard: SessionCard | null;
  cardsAnswered: number;
  sessionLength: number | 'unlimited';
  streak: number;
  onAnswer: (isCorrect: boolean) => void;
  onExit: () => void;
}

type FeedbackState =
  | { status: 'idle' }
  | { status: 'correct'; definition?: string }
  | { status: 'wrong'; word: string; isDecoy: boolean; definition?: string };

export function DrillScreen({
  currentCard,
  cardsAnswered,
  sessionLength,
  streak,
  onAnswer,
  onExit,
}: DrillScreenProps) {
  const [feedback, setFeedback] = useState<FeedbackState>({ status: 'idle' });
  const [answered, setAnswered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Shared advance — called by timer (auto) or overlay tap (self-paced)
  const advance = useCallback(
    (isCorrect: boolean) => {
      setFeedback({ status: 'idle' });
      onAnswer(isCorrect);
      setAnswered(false);
    },
    [onAnswer]
  );

  const handleAnswer = useCallback(
    (userSaysValid: boolean) => {
      if (answered || !currentCard) return;
      setAnswered(true);

      const isCorrect = userSaysValid !== currentCard.isDecoy;
      // Only look up definitions for real words; decoys have none
      const definition = currentCard.isDecoy ? undefined : DEFINITIONS[currentCard.word];

      if (isCorrect) {
        setFeedback({ status: 'correct', definition });
      } else {
        setFeedback({ status: 'wrong', word: currentCard.word, isDecoy: currentCard.isDecoy, definition });
      }

      // Hold for tap when: SELF_PACED + definition exists + not a decoy
      // Decoys always auto-advance (nothing to absorb); SELF_PACED=false reverts to old behavior
      const shouldHold = SELF_PACED && !!definition && !currentCard.isDecoy;
      if (!shouldHold) {
        timerRef.current = setTimeout(() => advance(isCorrect), 1000);
      }
    },
    [answered, currentCard, advance]
  );

  // Tapping anywhere on the overlay advances when self-paced hold is active.
  // Clear feedback immediately so a second tap hits the idle guard.
  const handleOverlayTap = useCallback(() => {
    if (feedback.status === 'idle') return;
    const isCorrect = feedback.status === 'correct';
    setFeedback({ status: 'idle' });
    onAnswer(isCorrect);
    setAnswered(false);
  }, [feedback, onAnswer]);

  if (!currentCard) return null;

  const progress =
    sessionLength !== 'unlimited'
      ? Math.min(cardsAnswered / (sessionLength as number), 1)
      : null;

  // Overlay is tappable when SELF_PACED and the current feedback has a definition
  const overlayIsTappable =
    SELF_PACED &&
    feedback.status !== 'idle' &&
    (feedback.status === 'correct'
      ? !!feedback.definition
      : !feedback.isDecoy && !!feedback.definition);

  return (
    <div className="min-h-screen bg-white dark:bg-[#111] text-gray-900 dark:text-gray-100 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <button
          onClick={onExit}
          className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          ← Exit
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
              answered ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
            } bg-green-600 hover:bg-green-700 text-white shadow-sm`}
          >
            VALID
          </button>
          <button
            onClick={() => handleAnswer(false)}
            disabled={answered}
            className={`flex-1 py-5 text-xl font-bold rounded-2xl transition-all ${
              answered ? 'opacity-50 cursor-not-allowed' : 'active:scale-95'
            } bg-red-600 hover:bg-red-700 text-white shadow-sm`}
          >
            INVALID
          </button>
        </div>
      </main>

      {/* Feedback overlay */}
      {feedback.status !== 'idle' && (
        <div
          onClick={overlayIsTappable ? handleOverlayTap : undefined}
          className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${
            overlayIsTappable ? 'cursor-pointer' : 'pointer-events-none'
          } ${
            feedback.status === 'correct' ? 'bg-green-600/30' : 'bg-red-600/30'
          }`}
        >
          <div
            className={`px-8 py-6 rounded-3xl text-center shadow-2xl max-w-xs mx-4 ${
              feedback.status === 'correct' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {feedback.status === 'correct' ? (
              <div>
                <span className="text-4xl">✓</span>
                {feedback.definition && (
                  <p className="text-sm mt-2 opacity-90">{feedback.definition}</p>
                )}
              </div>
            ) : (
              <div>
                <span className="text-4xl block mb-2">✗</span>
                {!feedback.isDecoy ? (
                  <>
                    <p className="font-bold text-lg">{feedback.word} is valid</p>
                    {feedback.definition && (
                      <p className="text-sm mt-1 opacity-90">{feedback.definition}</p>
                    )}
                  </>
                ) : (
                  <p className="font-bold text-lg">
                    {feedback.word} is not a valid NWL2023 word
                  </p>
                )}
              </div>
            )}
            {overlayIsTappable && (
              <p className="text-xs opacity-50 mt-3">tap to continue</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
