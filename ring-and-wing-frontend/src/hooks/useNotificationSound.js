import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_COOLDOWN_MS = 8000;

/**
 * Play a notification sound with basic safeguards:
 * - Autoplay restrictions: attempts to unlock on first user interaction
 * - Cooldown: prevents spammy repeated plays
 * - Batch behavior: if multiple events happen during cooldown, plays once after cooldown
 */
export function useNotificationSound(
  src = '/sounds/notification.mp3',
  { cooldownMs = DEFAULT_COOLDOWN_MS, volume = 1 } = {}
) {
  const audioRef = useRef(null);
  const lastPlayedAtRef = useRef(0);
  const cooldownTimerRef = useRef(null);
  const pendingPlayRef = useRef(false);

  const [isUnlocked, setIsUnlocked] = useState(false);

  const clearCooldownTimer = useCallback(() => {
    if (cooldownTimerRef.current) {
      clearTimeout(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    const now = Date.now();
    const elapsed = now - lastPlayedAtRef.current;

    if (elapsed < cooldownMs) {
      pendingPlayRef.current = true;
      clearCooldownTimer();
      cooldownTimerRef.current = setTimeout(() => {
        cooldownTimerRef.current = null;
        if (!pendingPlayRef.current) return;
        pendingPlayRef.current = false;
        void play();
      }, cooldownMs - elapsed);
      return false;
    }

    try {
      audio.volume = volume;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      lastPlayedAtRef.current = Date.now();
      return true;
    } catch {
      // Most common: autoplay restrictions on tablets until user interacts.
      pendingPlayRef.current = true;
      setIsUnlocked(false);
      return false;
    }
  }, [clearCooldownTimer, cooldownMs, volume]);

  const unlock = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return false;

    try {
      const previousVolume = audio.volume;
      audio.volume = 0;
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        await playPromise;
      }
      audio.pause();
      audio.currentTime = 0;
      audio.volume = previousVolume;

      setIsUnlocked(true);

      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        void play();
      }

      return true;
    } catch {
      return false;
    }
  }, [play]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audioRef.current = audio;

    return () => {
      clearCooldownTimer();
      try {
        audio.pause();
      } catch {
        // ignore
      }
      audioRef.current = null;
    };
  }, [src, clearCooldownTimer]);

  // Try to unlock after first user gesture (tablet browsers often require this).
  useEffect(() => {
    if (isUnlocked) return;
    if (typeof window === 'undefined') return;

    const handleFirstGesture = () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      void unlock();
    };

    window.addEventListener('pointerdown', handleFirstGesture);
    window.addEventListener('touchstart', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture);

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('touchstart', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, [isUnlocked, unlock]);

  return { play, unlock, isUnlocked };
}
