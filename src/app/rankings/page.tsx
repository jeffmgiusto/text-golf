'use client';

import { useState, useEffect } from 'react';
import { RankingEntry } from '@/lib/types';
import { tableBorder, RANKINGS_COLS, borderTop, borderBottom } from '@/lib/ascii';
import { AsciiBox, AsciiRow } from '@/components/AsciiBox';
import { Footer } from '@/components/Footer';

type RankingType = 'owgr' | 'fedex';

export default function RankingsPage() {
  const [rankingType, setRankingType] = useState<RankingType>('owgr');
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRankings() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/rankings?type=${rankingType}`);
        if (!response.ok) {
          throw new Error('Failed to fetch rankings');
        }
        const data = await response.json();
        setRankings(data.rankings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchRankings();
  }, [rankingType]);

  return (
    <main className="font-mono text-sm">
      {/* Header */}
      <AsciiBox className="mb-2">
        <AsciiRow>
          <span className="text-[var(--text)]">
            {rankingType === 'owgr' ? 'OFFICIAL WORLD GOLF RANKING' : 'FEDEX CUP STANDINGS'}
          </span>
        </AsciiRow>
      </AsciiBox>

      {/* Toggle */}
      <div className="my-4 flex gap-4 text-sm">
        <button
          onClick={() => setRankingType('owgr')}
          className={`px-4 py-1 border transition-colors ${
            rankingType === 'owgr'
              ? 'border-[var(--green)] text-[var(--green)] bg-[var(--bg-highlight)]'
              : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)]'
          }`}
        >
          OWGR
        </button>
        <button
          onClick={() => setRankingType('fedex')}
          className={`px-4 py-1 border transition-colors ${
            rankingType === 'fedex'
              ? 'border-[var(--green)] text-[var(--green)] bg-[var(--bg-highlight)]'
              : 'border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)]'
          }`}
        >
          FEDEX CUP
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-[var(--text-dim)] animate-pulse-slow">
            {borderTop(30)}<br />
            │{'  Loading rankings...      '.padEnd(30)}│<br />
            {borderBottom(30)}
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-[var(--red)] text-sm text-center py-8">
          Error: {error}
        </div>
      )}

      {/* Rankings table */}
      {!loading && !error && (
        <div className="text-xs">
          {/* Table header */}
          <div className="text-[var(--border)]">
            {tableBorder(RANKINGS_COLS, 'top')}
          </div>
          <div className="text-[var(--border)]">
            │{' '}
            <span className="inline-block w-[4ch] text-[var(--text-dim)]">RANK</span>
            {' '}│{' '}
            <span className="inline-block w-[36ch] text-left text-[var(--text-dim)]">PLAYER</span>
            {' '}│{' '}
            <span className="inline-block w-[15ch] text-right text-[var(--text-dim)]">
              {rankingType === 'owgr' ? 'AVG POINTS' : 'POINTS'}
            </span>
            {' '}│
          </div>
          <div className="text-[var(--border)]">
            {tableBorder(RANKINGS_COLS, 'mid')}
          </div>

          {/* Table rows */}
          {rankings.map((entry, index) => (
            <div key={index} className="text-[var(--border)]">
              │{' '}
              <span className="inline-block w-[4ch] text-right text-[var(--text-dim)]">
                {String(entry.rank).padStart(4)}
              </span>
              {' '}│{' '}
              <span className="inline-block w-[36ch] text-left text-[var(--text)]">
                {entry.playerName.length > 36
                  ? entry.playerName.substring(0, 35) + '…'
                  : entry.playerName.padEnd(36)}
              </span>
              {' '}│{' '}
              <span className="inline-block w-[15ch] text-right text-[var(--green)]">
                {rankingType === 'owgr'
                  ? entry.points.toFixed(2).padStart(15)
                  : String(Math.round(entry.points)).padStart(15)}
              </span>
              {' '}│
            </div>
          ))}

          {/* Table footer */}
          <div className="text-[var(--border)]">
            {tableBorder(RANKINGS_COLS, 'bottom')}
          </div>

          {/* Info */}
          <div className="text-[var(--text-dim)] text-center mt-4">
            {rankingType === 'owgr'
              ? 'Official World Golf Ranking - Top 100'
              : 'FedEx Cup Standings - Top 100'}
          </div>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </main>
  );
}
