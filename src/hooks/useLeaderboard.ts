'use client';

import { useState, useEffect, useCallback } from 'react';
import { TournamentInfo, PlayerWithStats, ApiLeaderboardResponse, CourseInfo } from '@/lib/types';

// Mon/Tue/Wed (days 1-3): no tournament action, poll once an hour
// Thu–Sun (days 4-6, 0): tournament days, poll every 5 minutes
function getRefreshInterval(): number {
  const day = new Date().getDay();
  return day >= 1 && day <= 3 ? 60 * 60 * 1000 : 5 * 60 * 1000;
}

interface UseLeaderboardReturn {
  tournament: TournamentInfo | null;
  players: PlayerWithStats[];
  courseInfo: CourseInfo | null;
  loading: boolean;
  error: string | null;
  lastFetched: Date | null;
  secondsUntilRefresh: number;
  refresh: () => Promise<void>;
}

export function useLeaderboard(): UseLeaderboardReturn {
  const [tournament, setTournament] = useState<TournamentInfo | null>(null);
  const [players, setPlayers] = useState<PlayerWithStats[]>([]);
  const [courseInfo, setCourseInfo] = useState<CourseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(() => getRefreshInterval() / 1000);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/leaderboard');

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }

      const data: ApiLeaderboardResponse = await response.json();

      setTournament(data.info);
      setPlayers(data.players);
      setCourseInfo(data.courseInfo || null);
      setLastFetched(new Date(data.fetchedAt));
      setSecondsUntilRefresh(getRefreshInterval() / 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh — interval depends on day of week
  useEffect(() => {
    const interval = setInterval(fetchData, getRefreshInterval());
    return () => clearInterval(interval);
  }, [fetchData]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsUntilRefresh((prev) => {
        if (prev <= 1) {
          return getRefreshInterval() / 1000;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return {
    tournament,
    players,
    courseInfo,
    loading,
    error,
    lastFetched,
    secondsUntilRefresh,
    refresh: fetchData,
  };
}
