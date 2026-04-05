import { useEffect, useRef, useState, useCallback } from 'react';
import type { SessionCard } from '../types';
import { ThemeToggle } from './ThemeToggle';
import definitions from '../data/definitions.json';

const DEFINITIONS = definitions as Record<string, string>;

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
  | { status: 'correct' }
  // holdForUser=true: wrong answer on a real valid word — wait for "Got it" tap
  // holdForUser=false: wrong answer on a decoy — auto-advance after 1000ms
  | { status: 'wrong'; word: string; isDecoy: boolean; definition?: string; holdForUser: boolean };

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

      // Correct = user's answer matches what the card actually is
      // Decoys are invalid, so correct = user says INVALID (userSaysValid===false)
      const isCorrect = userSaysValid !== currentCard.isDecoy;
      const definition = DEFINITIONS[currentCard.word];

      if (isCorrect) {
        setFeedback({ status: 'correct' });
        timerRef.current = setTimeout(() => {
          onAnswer(true);
          setFeedback({ status: 'idle' });
          setAnswered(false);
        }, 1000);
      } else {
        // Wrong on a real valid word: hold until user taps "Got it"
        // Wrong on a decoy: auto-advance after 1000ms (nothing to memorize)
        const holdForUser = !currentCard.isDecoy;
        setFeedback({
          status: 'wrong',
          word: currentCard.word,
          isDecoy: currentCard.isDecoy,
          definition,
          holdForUser,
        });
        if (!holdForUser) {
          timerRef.current = setTimeout(() => {
            onAnswer(false);
            setFeedback({ status: 'idle' });
            setAnswered(false);
          }, 1000);
        }
        // If holdForUser, no timer — handleGotIt drives the advance
      }
    },
    [answered, currentCard, onAnswer]
  );

  // Called when user taps "Got it" after a wrong answer on a valid word
  const handleGotIt = useCallback(() => {
    onAnswer(false);
    setFeedback({ status: 'idle' });
    setAnswered(false);
  }, [onAnswer]);

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
          className={`fixed inset-0 flex items-center justify-center z-50 transition-opacity duration-200 ${
            feedback.status === 'wrong' && feedback.holdForUser ? '' : 'pointer-events-none'
          } ${
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
                {!feedback.isDecoy ? (
                  <>
                    <p className="font-bold text-lg">
                      {feedback.word} is valid
                    </p>
                    {feedback.definition && (
                      <p className="text-sm mt-1 opacity-90">{feedback.definition}</p>
                    )}
                    {feedback.holdForUser && (
                      <button
                        onClick={handleGotIt}
                        className="mt-4 px-6 py-2 bg-white text-red-600 font-bold rounded-xl pointer-events-auto"
                      >
                        Got it
                      </button>
                    )}
                  </>
                ) : (
                  <p className="font-bold text-lg">
                    {feedback.word} is not a valid NWL2023 word
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
