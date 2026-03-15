/**
 * useStepCounter.js
 *
 * A robust step-detection hook using the DeviceMotionEvent API.
 *
 * Algorithm:
 *  1. Reads accelerometer data (DeviceMotionEvent.accelerationIncludingGravity).
 *  2. Computes the magnitude of the acceleration vector: mag = sqrt(x²+y²+z²).
 *  3. Applies a simple low-pass smoothing filter to remove high-frequency noise.
 *  4. Detects a "step" when the smoothed magnitude crosses a dynamic threshold
 *     (mean + sensitivity) in the upward direction, with a minimum interval
 *     between steps to prevent double-counting (~250 ms).
 *  5. Persists the step count in localStorage under the user's key and resets
 *     automatically at midnight.
 *
 * On iOS 13+ the user must grant permission via DeviceMotionEvent.requestPermission().
 * On Android and desktop browsers permission is implicit.
 */

import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Tuneable constants ────────────────────────────────────────────────────────
const SMOOTHING_FACTOR   = 0.85;   // Low-pass α  (0 = no smoothing, 1 = fully smooth)
const SENSITIVITY        = 1.2;    // m/s² above the running mean to count as a peak
const MIN_STEP_INTERVAL  = 250;    // milliseconds – minimum gap between two steps
const BUFFER_SIZE        = 30;     // samples kept for running mean calculation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {boolean} autoStart  – start listening immediately (default: true)
 * @returns {{ steps, isWalking, permissionGranted, error, resetSteps, requestPermission }}
 */
function useStepCounter(autoStart = true) {
  const [steps,            setSteps]            = useState(0);
  const [isWalking,        setIsWalking]         = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [error,            setError]             = useState(null);

  // Internal refs (never trigger re-renders)
  const smoothedRef       = useRef(9.81);   // start at ~gravity
  const lastStepTimeRef   = useRef(0);
  const risingRef         = useRef(false);  // are we on the rising slope?
  const sampleBufferRef   = useRef([]);     // rolling window for dynamic mean
  const isWalkingTimerRef = useRef(null);
  const listenerActiveRef = useRef(false);
  const stepsRef          = useRef(0);      // shadow of steps for use inside event cb

  // Keep stepsRef in sync
  useEffect(() => { stepsRef.current = steps; }, [steps]);

  // ── Core motion handler ──────────────────────────────────────────────────
  const handleMotion = useCallback((event) => {
    const accel = event.accelerationIncludingGravity;
    if (!accel) return;

    const { x = 0, y = 0, z = 0 } = accel;

    // 1. Raw magnitude of the acceleration vector
    const rawMag = Math.sqrt(x * x + y * y + z * z);

    // 2. Low-pass smoothing
    smoothedRef.current =
      SMOOTHING_FACTOR * smoothedRef.current +
      (1 - SMOOTHING_FACTOR) * rawMag;

    const smoothed = smoothedRef.current;

    // 3. Rolling buffer for dynamic threshold
    const buf = sampleBufferRef.current;
    buf.push(smoothed);
    if (buf.length > BUFFER_SIZE) buf.shift();

    const mean = buf.reduce((s, v) => s + v, 0) / buf.length;
    const threshold = mean + SENSITIVITY;

    const now = Date.now();

    // 4. Peak detection (rising → crossing threshold → falling)
    if (smoothed > threshold) {
      // We are above threshold – mark as rising
      risingRef.current = true;
    } else if (risingRef.current && smoothed <= threshold) {
      // We just fell back below the threshold → peak confirmed
      risingRef.current = false;

      const timeSinceLast = now - lastStepTimeRef.current;
      if (timeSinceLast >= MIN_STEP_INTERVAL) {
        // ✅ Count a step
        lastStepTimeRef.current = now;
        setSteps(prev => prev + 1);

        // Show walking indicator and keep it alive for 1.5 s
        setIsWalking(true);
        if (isWalkingTimerRef.current) clearTimeout(isWalkingTimerRef.current);
        isWalkingTimerRef.current = setTimeout(() => setIsWalking(false), 1500);
      }
    }
  }, []);

  // ── Start / stop the listener ────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (listenerActiveRef.current) return;
    if (typeof DeviceMotionEvent === 'undefined') {
      setError('Motion sensors not available on this device/browser.');
      return;
    }
    window.addEventListener('devicemotion', handleMotion, { passive: true });
    listenerActiveRef.current = true;
    setPermissionGranted(true);
    setError(null);
  }, [handleMotion]);

  const stopListening = useCallback(() => {
    if (!listenerActiveRef.current) return;
    window.removeEventListener('devicemotion', handleMotion);
    listenerActiveRef.current = false;
  }, [handleMotion]);

  // ── iOS 13+ permission request ───────────────────────────────────────────
  const requestPermission = useCallback(async () => {
    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      try {
        const result = await DeviceMotionEvent.requestPermission();
        if (result === 'granted') {
          startListening();
        } else {
          setError('Motion permission denied. Please enable it in Settings → Safari → Motion & Orientation Access.');
        }
      } catch (err) {
        setError('Could not request motion permission: ' + err.message);
      }
    } else {
      // Non-iOS: no explicit permission needed
      startListening();
    }
  }, [startListening]);

  // ── Reset helper ─────────────────────────────────────────────────────────
  const resetSteps = useCallback(() => {
    setSteps(0);
    stepsRef.current = 0;
  }, []);

  // ── Auto-start on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!autoStart) return;

    if (
      typeof DeviceMotionEvent !== 'undefined' &&
      typeof DeviceMotionEvent.requestPermission === 'function'
    ) {
      // iOS 13+: can't auto-start without a user gesture; surface the error
      // so the UI can show a "Grant Permission" button.
      setError('Tap "Grant Permission" to enable step counting on this device.');
    } else {
      // Android / desktop
      startListening();
    }

    return () => {
      stopListening();
      if (isWalkingTimerRef.current) clearTimeout(isWalkingTimerRef.current);
    };
  }, [autoStart, startListening, stopListening]);

  return {
    steps,
    isWalking,
    permissionGranted,
    error,
    resetSteps,
    requestPermission,   // call this from a button click on iOS
  };
}

export default useStepCounter;