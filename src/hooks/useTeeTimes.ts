'use client';

import { useState, useEffect } from 'react';

const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes

export function useTeeTimes(): Record<string, string> {
  const [teeTimes, setTeeTimes] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    const fetchTeeTimes = async () => {
      try {
        const res = await fetch('/api/tee-times');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setTeeTimes(data.teeTimes ?? {});
        }
      } catch {
        // Tee times are non-blocking — silently ignore errors
      }
    };

    fetchTeeTimes();
    const interval = setInterval(fetchTeeTimes, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return teeTimes;
}
