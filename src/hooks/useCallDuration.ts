'use client';

import { useEffect, useState } from 'react';

function elapsedSeconds(startTime: Date): number {
  return Math.max(0, Math.floor((Date.now() - startTime.getTime()) / 1000));
}

/**
 * Seconds elapsed since `startTime`, ticking once per second.
 * Returns 0 when there is no start time. Only the component that calls this
 * hook re-renders on the tick, so the call model itself stays untouched.
 */
export function useCallDuration(startTime?: Date | null): number {
  const startMs = startTime ? startTime.getTime() : null;
  const [duration, setDuration] = useState(() => (startTime ? elapsedSeconds(startTime) : 0));

  useEffect(() => {
    if (startMs === null) {
      setDuration(0);
      return;
    }
    const start = new Date(startMs);
    setDuration(elapsedSeconds(start));
    const timer = setInterval(() => setDuration(elapsedSeconds(start)), 1000);
    return () => clearInterval(timer);
  }, [startMs]);

  return duration;
}
