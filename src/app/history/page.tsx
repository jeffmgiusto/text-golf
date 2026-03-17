'use client';

import { useState, useEffect } from 'react';
import { AsciiBox, AsciiRow, AsciiDivider } from '@/components/AsciiBox';
import { AsciiChart } from '@/components/AsciiChart';

interface Tournament {
  tournId: string;
  name: string;
}

interface YearData {
  year: number;
  winningScore: number | null;
  lowRound: number | null;
  top10: Array<{ playerName: string; position: string }>;
}

interface HistoryData {
  years: YearData[];
}

function formatScore(v: number): string {
  if (v === 0) return 'E';
  if (v > 0) return `+${v}`;
  return String(v);
}

export default function HistoryPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournId, setSelectedTournId] = useState<string>('');
  const [historyData, setHistoryData] = useState<HistoryData | null>(null);
  const [loadingTournaments, setLoadingTournaments] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch tournament list
  useEffect(() => {
    async function fetchTournaments() {
      try {
        const res = await fetch('/api/history/tournaments');
        if (!res.ok) throw new Error('Failed to fetch tournaments');
        const data = await res.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tournaments');
      } finally {
        setLoadingTournaments(false);
      }
    }
    fetchTournaments();
  }, []);

  // Fetch history when tournament selected
  useEffect(() => {
    if (!selectedTournId) {
      setHistoryData(null);
      return;
    }

    async function fetchHistory() {
      setLoadingHistory(true);
      setError(null);
      try {
        const res = await fetch(`/api/history?tournId=${selectedTournId}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        setHistoryData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoadingHistory(false);
      }
    }
    fetchHistory();
  }, [selectedTournId]);

  // Compute repeat top-10 finishers
  const repeatFinishers = (() => {
    if (!historyData?.years) return [];
    const playerMap = new Map<string, Array<{ year: number; position: string }>>();
    for (const y of historyData.years) {
      for (const p of y.top10) {
        if (!playerMap.has(p.playerName)) {
          playerMap.set(p.playerName, []);
        }
        playerMap.get(p.playerName)!.push({ year: y.year, position: p.position });
      }
    }
    return Array.from(playerMap.entries())
      .filter(([, appearances]) => appearances.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([name, appearances]) => ({
        name,
        appearances: appearances.sort((a, b) => a.year - b.year),
      }));
  })();

  // Chart data
  const winningScoreData = historyData?.years
    .filter((y) => y.winningScore !== null)
    .map((y) => ({ x: y.year, y: y.winningScore! })) || [];

  const lowRoundData = historyData?.years
    .filter((y) => y.lowRound !== null)
    .map((y) => ({ x: y.year, y: y.lowRound! })) || [];

  return (
    <main className="font-mono text-sm">
      {/* Header */}
      <AsciiBox className="mb-2">
        <AsciiRow>
          <span className="text-[var(--text)]">TOURNAMENT HISTORY</span>
        </AsciiRow>
      </AsciiBox>

      {/* Tournament selector */}
      <div className="my-4">
        <select
          value={selectedTournId}
          onChange={(e) => setSelectedTournId(e.target.value)}
          disabled={loadingTournaments}
          className="bg-[var(--bg)] text-[var(--green)] border border-[var(--green)] font-mono text-sm px-2 py-1 outline-none cursor-pointer"
        >
          <option value="">
            {loadingTournaments ? 'Loading tournaments...' : '-- Select Tournament --'}
          </option>
          {tournaments.map((t) => (
            <option key={t.tournId} value={t.tournId}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-[var(--bg-secondary)] border border-red-500/50 p-4 text-red-400 text-sm mb-4">
          Error: {error}
        </div>
      )}

      {/* Loading */}
      {loadingHistory && (
        <AsciiBox className="mb-4">
          <AsciiRow>
            <span className="text-[var(--text-dim)] animate-pulse-slow">
              Loading historical data...
            </span>
          </AsciiRow>
        </AsciiBox>
      )}

      {/* Results */}
      {historyData && !loadingHistory && (
        <div className="space-y-6">
          {/* Winning Score Chart */}
          {winningScoreData.length > 0 && (
            <AsciiBox>
              <AsciiRow>
                <AsciiChart
                  title="Winning Score by Year"
                  data={winningScoreData}
                  formatY={formatScore}
                />
              </AsciiRow>
            </AsciiBox>
          )}

          {/* Low Round Chart */}
          {lowRoundData.length > 0 && (
            <AsciiBox>
              <AsciiRow>
                <AsciiChart
                  title="Low Round by Year"
                  data={lowRoundData}
                  formatY={formatScore}
                />
              </AsciiRow>
            </AsciiBox>
          )}

          {/* Repeat Top-10 Finishers */}
          <AsciiBox>
            <AsciiRow>
              <span className="text-[var(--text)]">REPEAT TOP-10 FINISHERS</span>
            </AsciiRow>
            <AsciiDivider />
            {repeatFinishers.length === 0 ? (
              <AsciiRow>
                <span className="text-[var(--text-dim)]">
                  No repeat top-10 finishers in available data.
                </span>
              </AsciiRow>
            ) : (
              repeatFinishers.map((player) => (
                <AsciiRow key={player.name}>
                  <span className="text-[var(--text)]">
                    {player.name.length > 22
                      ? player.name.substring(0, 21) + '…'
                      : player.name.padEnd(22)}
                  </span>
                  <span className="text-[var(--text-dim)]">
                    {player.appearances
                      .map((a) => `${String(a.year).slice(-2)}:${a.position}`)
                      .join('  ')}
                  </span>
                </AsciiRow>
              ))
            )}
          </AsciiBox>

          {/* No data message */}
          {historyData.years.length === 0 && (
            <div className="text-[var(--text-dim)] text-center py-4">
              No historical data found for this tournament.
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="text-[var(--text-dim)] text-xs text-center mt-8">
        Data provided by SlashGolf API
      </div>
    </main>
  );
}
