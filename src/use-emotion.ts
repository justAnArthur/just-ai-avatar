import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import { EMOTION_DURATION, type EmotionInput, emotionName } from './emotions.ts';

export interface EmotionHandle {
  emotion: EmotionInput | null;
  /** Changes on every `emote()`, so replaying the same emotion restarts its animation. */
  emotionKey: number;
  /** Play an emotion for `duration` ms (default: the emotion's own length; `Infinity` holds it). */
  emote: (emotion: EmotionInput, duration?: number) => void;
  /** Return to the calm face now. */
  calm: () => void;
}

/**
 * Trigger emotions from app events:
 *
 *   const mood = useEmotion();
 *   <Avatar seed="bot" emotion={mood.emotion} emotionKey={mood.emotionKey} />
 *   fetch(url).catch(() => mood.emote('error'));
 */
export function useEmotion(defaultDuration?: number): EmotionHandle {
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
      const name = emotionName(emotion);
      const ms = duration ?? defaultDuration ?? (name ? EMOTION_DURATION[name] : 2500);
      if (Number.isFinite(ms)) timer.current = setTimeout(() => setState((s) => ({ ...s, emotion: null })), ms);
    },
    [defaultDuration],
  );

  useEffect(() => () => clearTimeout(timer.current), []);
  return { emotion: state.emotion, emotionKey: state.key, emote, calm };
}
