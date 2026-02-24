/**
 * Shake Detection Hook
 * Detects device shake and triggers a callback
 * Uses accelerometer data to detect sudden movement
 */

import { useEffect, useRef, useCallback } from 'react';
import { Accelerometer } from 'expo-sensors';

const SHAKE_THRESHOLD = 25; // Sensitivity (higher = less sensitive)
const SHAKE_COUNT_THRESHOLD = 3; // Number of shakes to trigger

export function useShakeDetection(onShake: () => void) {
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const lastZRef = useRef(0);
  const shakeCountRef = useRef(0);
  const lastShakeTimeRef = useRef(0);

  const handleAccelerometerUpdate = useCallback(
    ({ x, y, z }: { x: number; y: number; z: number }) => {
      const currentTime = Date.now();

      // Calculate change in acceleration
      const deltaX = Math.abs(x - lastXRef.current);
      const deltaY = Math.abs(y - lastYRef.current);
      const deltaZ = Math.abs(z - lastZRef.current);

      // Check if shake is detected
      if (
        deltaX > SHAKE_THRESHOLD ||
        deltaY > SHAKE_THRESHOLD ||
        deltaZ > SHAKE_THRESHOLD
      ) {
        shakeCountRef.current += 1;

        // If multiple shakes detected within 500ms, trigger callback
        if (
          shakeCountRef.current >= SHAKE_COUNT_THRESHOLD &&
          currentTime - lastShakeTimeRef.current < 500
        ) {
          onShake();
          shakeCountRef.current = 0;
          lastShakeTimeRef.current = currentTime;
        }
      }

      lastXRef.current = x;
      lastYRef.current = y;
      lastZRef.current = z;
    },
    [onShake]
  );

  useEffect(() => {
    // Set accelerometer update interval (ms)
    Accelerometer.setUpdateInterval(100);

    // Subscribe to accelerometer updates
    const subscription = Accelerometer.addListener(handleAccelerometerUpdate);

    return () => {
      subscription.remove();
    };
  }, [handleAccelerometerUpdate]);
}
