import { useState, useEffect, useCallback } from 'react';
import type { Screen, FilterMode, SessionResult } from './types';
import { useWordEngine } from './hooks/useWordEngine';
import { HomeScreen } from './components/HomeScreen';
import { DrillScreen } from './components/DrillScreen';
import { SessionSummary } from './components/SessionSummary';

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [lastResult, setLastResult] = useState<SessionResult | null>(null);
  const [lastFilter, setLastFilter] = useState<FilterMode>('both');
  const [lastLength, setLastLength] = useState<number | 'unlimited'>(25);

  const engine = useWordEngine();

  // Watch for session auto-end (queue exhausted or session length reached)
  useEffect(() => {
    if (!engine.isSessionActive) return;
    if (screen !== 'drill') return;

    const sessionDone =
      engine.currentCard === null ||
      (engine.sessionLength !== 'unlimited' &&
        engine.cardsAnswered >= (engine.sessionLength as number));

    if (sessionDone && engine.cardsAnswered > 0) {
      const result = engine.endSession();
      setLastResult(result);
      setScreen('summary');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.currentCard, engine.cardsAnswered]);

  const handleStart = useCallback((filter: FilterMode, length: number | 'unlimited') => {
    setLastFilter(filter);
    setLastLength(length);
    engine.startSession(filter, length);
    setScreen('drill');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswer = useCallback((isCorrect: boolean) => {
    engine.answerCard(isCorrect);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.answerCard]);

  const handleEndDrill = useCallback(() => {
    const result = engine.endSession();
    setLastResult(result);
    setScreen('summary');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine.endSession, engine.cardsAnswered]);

  const handleStudyAgain = useCallback(() => {
    handleStart(lastFilter, lastLength);
  }, [handleStart, lastFilter, lastLength]);

  const handleHome = useCallback(() => {
    engine.resetSession();
    setScreen('home');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {screen === 'home' && (
        <HomeScreen
          onStart={handleStart}
          getDueCount={engine.getDueCount}
          getMasteredCount={engine.getMasteredCount}
          getAccuracy={engine.getAccuracy}
        />
      )}

      {screen === 'drill' && (
        <DrillScreen
          currentCard={engine.currentCard}
          cardsAnswered={engine.cardsAnswered}
          sessionLength={engine.sessionLength}
          streak={engine.streak}
          onAnswer={handleAnswer}
          onEnd={handleEndDrill}
        />
      )}

      {screen === 'summary' && lastResult && (
        <SessionSummary
          result={lastResult}
          onStudyAgain={handleStudyAgain}
          onHome={handleHome}
        />
      )}
    </>
  );
}
