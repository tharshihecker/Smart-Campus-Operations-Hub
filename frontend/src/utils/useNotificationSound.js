import { useRef, useEffect, useCallback } from 'react';

/**
 * useNotificationSound
 * Plays the campus bell sound whenever the unread notification count increases.
 *
 * Usage:
 *   const playSound = useNotificationSound();
 *   // Call playSound() manually, OR pass count and it plays automatically when count goes up.
 *
 * @param {number|null} count  - current unread count (optional – for auto-play on increase)
 */
export function useNotificationSound(count = null) {
  const audioRef = useRef(null);
  const prevCountRef = useRef(null);

  // Lazy-initialise the Audio object once
  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(`${process.env.PUBLIC_URL}/mixkit-bell-notification-933.wav`);
      audioRef.current.volume = 0.7;
    }
    return audioRef.current;
  }, []);

  /** Play the bell sound (safe – handles browser autoplay policy gracefully) */
  const playSound = useCallback(() => {
    try {
      const audio = getAudio();
      audio.currentTime = 0;
      const promise = audio.play();
      if (promise !== undefined) {
        promise.catch(() => {
          // Autoplay blocked by browser – silently ignore
        });
      }
    } catch {
      // Ignore any audio errors
    }
  }, [getAudio]);

  // Auto-play whenever count increases (new notifications arrived)
  useEffect(() => {
    if (count === null) return;
    if (prevCountRef.current !== null && count > prevCountRef.current) {
      playSound();
    }
    prevCountRef.current = count;
  }, [count, playSound]);

  return playSound;
}

export default useNotificationSound;
