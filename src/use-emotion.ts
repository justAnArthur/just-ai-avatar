import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { type EmotionInput, playTime } from './emotions.ts';

export type EmotionHandle = {
  emotion: EmotionInput | null;
  emotionKey: number;
  /** Plays for `duration` ms, the emotion's own length by default; `Infinity` holds it. */
  emote: (emotion: EmotionInput, duration?: number) => void;
  calm: () => void;
};

/**
 * const mood = useEmotion();
 * <Avatar seed="bot" emotion={mood.emotion} emotionKey={mood.emotionKey} />
 * fetch(url).catch(() => mood.emote('error'));
 */
export function useEmotion(): EmotionHandle {
  const [state, setState] = useState<{ emotion: EmotionInput | null; key: number }>({ emotion: null, key: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const calm = useCallback(() => {
    clearTimeout(timer.current);
    setState((s) => ({ ...s, emotion: null }));
  }, []);

  const emote = useCallback(
    (emotion: EmotionInput, duration?: number) => {
      clearTimeout(timer.current);
      setState((s) => ({ emotion, key: s.key + 1 }));
      const ms = playTime(emotion, duration);
      if (Number.isFinite(ms)) timer.current = setTimeout(calm, ms);
    },
    [calm],
  );

  useEffect(() => () => clearTimeout(timer.current), []);

  return { emotion: state.emotion, emotionKey: state.key, emote, calm };
}
