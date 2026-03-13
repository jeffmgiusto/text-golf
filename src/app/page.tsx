'use client';

import { useState } from 'react';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { useWeather } from '@/hooks/useWeather';
import { Header } from '@/components/Header';
import { Leaderboard } from '@/components/Leaderboard';
import { borderTop, borderBottom, borderMid, BOX_WIDTH } from '@/lib/ascii';

export default function Home() {
  const [selectedTournId, setSelectedTournId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);

  const {
    tournament,
    players,
    courseInfo,
    activeTournaments,
    loading,
    error,
    lastFetched,
    secondsUntilRefresh,
  } = useLeaderboard(selectedTournId, selectedYear);

  const weather = useWeather(courseInfo?.location);

  const padLine = (content: string) => `│${content.padEnd(BOX_WIDTH)}│`;

  // Format last fetched time for display
  const lastUpdatedStr = lastFetched
    ? lastFetched.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })
    : null;

  // Determine which tournament is selected for the toggle highlight
  const effectiveTournId = selectedTournId || tournament?.tournId || null;

  return (
    <main className="font-mono text-sm">
      {/* Header */}
      <Header
        tournamentName={tournament?.event_name || 'Loading...'}
        currentRound={tournament?.current_round || 1}
        lastUpdated={lastUpdatedStr}
        nextRefreshIn={secondsUntilRefresh}
        isLoading={loading && players.length > 0}
        courseName={courseInfo?.courseName}
        coursePar={courseInfo?.par}
        isPreview={tournament?.isPreview}
        weather={weather}
      />

      {/* Tournament toggle — only shown when 2+ tournaments are active */}
      {activeTournaments.length > 1 && (
        <div className="my-4 flex gap-4 text-sm">
          {activeTournaments.map((t) => (
            <button
              key={t.tournId}
              onClick={() => {
                setSelectedTournId(t.tournId);
                setSelectedYear(t.year);
              }}
              className={`px-4 py-1 border transition-colors ${
                effectiveTournId === t.tournId
                  ? 'border-[var(--green)] text-[var(--green)] bg-[var(--bg-highlight)]'
                  : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)]'
              }`}
            >
              {t.name.split(' ').slice(0, 3).join(' ').toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] border border-red-500/50 rounded">
          <span className="text-red-400">Error: {error}</span>
        </div>
      )}

      {/* Loading state (initial load) */}
      {loading && players.length === 0 && (
        <div className="text-center py-12">
          <div className="text-[var(--text-dim)] animate-pulse-slow">
            {borderTop(30)}
            <br />
            │{'  Loading leaderboard...  '.padEnd(30)}│
            <br />
            {borderBottom(30)}
          </div>
        </div>
      )}

      {/* Preview card — shown between tournaments when the next event hasn't started */}
      {!loading && tournament?.isPreview && players.length === 0 && (
        <div className="text-[var(--text-dim)]">
          <div>{borderTop(BOX_WIDTH)}</div>
          <div>{padLine('  UPCOMING TOURNAMENT')}</div>
          <div>{borderMid(BOX_WIDTH)}</div>
          <div>{padLine('')}</div>
          {tournament.event_name && <div>{padLine('  ' + tournament.event_name)}</div>}
          {(tournament.startDate || tournament.endDate) && (
            <div>{padLine('  ' + [tournament.startDate, tournament.endDate].filter(Boolean).join(' \u2013 '))}</div>
          )}
          {courseInfo?.courseName && <div>{padLine('  ' + courseInfo.courseName)}</div>}
          {courseInfo?.location && <div>{padLine('  ' + courseInfo.location)}</div>}
          <div>{padLine('')}</div>
          <div>{borderBottom(BOX_WIDTH)}</div>
        </div>
      )}

      {/* Leaderboard */}
      {(!loading || players.length > 0) && !(tournament?.isPreview && players.length === 0) ? (
        <Leaderboard players={players} tournId={selectedTournId || tournament?.tournId} year={selectedYear || tournament?.year} />
      ) : null}

      {/* Footer */}
      <div className="mt-8 text-center text-[var(--text-dim)] text-xs">
        <div className="text-[var(--border)]">{'─'.repeat(40)}</div>
        <div className="mt-2">
          Powered by SlashGolf API | Updates every 5 minutes
        </div>
        <div className="mt-1">
          Click any player row to see their scorecard
        </div>
      </div>
    </main>
  );
}
