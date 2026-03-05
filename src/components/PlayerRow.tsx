'use client';

import { useState } from 'react';
import { PlayerWithStats } from '@/lib/types';
import { PlayerDetails } from './PlayerDetails';
import { tableBorder, LEADERBOARD_COLS } from '@/lib/ascii';

interface PlayerRowProps {
  player: PlayerWithStats;
  isLast: boolean;
  tournId?: string | null;
  year?: string | null;
}

function formatScore(score: number): { text: string; colorClass: string } {
  if (score < 0) {
    return { text: String(score), colorClass: 'score-under' };
  } else if (score === 0) {
    return { text: 'E', colorClass: 'score-even' };
  } else {
    return { text: `+${score}`, colorClass: 'score-over' };
  }
}

function formatThru(thru: number | string): string {
  const val = String(thru);
  if (val === '18') return 'F';
  return val;
}

export function PlayerRow({ player, isLast, tournId, year }: PlayerRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const score = formatScore(player.current_score);
  const thru = formatThru(player.thru);

  // Truncate player name (27 chars max, leaving room for expand icon)
  const displayName = player.player_name.length > 27
    ? player.player_name.substring(0, 26) + '…'
    : player.player_name;

  const rdRaw = ([player.R1, player.R2, player.R3, player.R4])[player.round - 1] ?? null;
  const rd = rdRaw !== null ? formatScore(rdRaw) : null;

  return (
    <>
      {/* Main row - clickable */}
      <div
        className="cursor-pointer hover:bg-[var(--bg-highlight)] transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="text-[var(--border)]">│ </span>
        <span className="inline-block w-[4ch] text-center text-[var(--text-dim)]">
          {String(player.current_pos).padStart(4)}
        </span>
        <span className="text-[var(--border)]"> │ </span>
        <span className="inline-block w-[29ch] text-left text-[var(--text)]">
          {isExpanded ? '▼' : '▶'} {displayName.padEnd(27)}
        </span>
        <span className="text-[var(--border)]"> │ </span>
        <span className={`inline-block w-[7ch] text-center ${score.colorClass}`}>
          {score.text.padStart(7)}
        </span>
        <span className="text-[var(--border)]"> │ </span>
        {rd !== null ? (
          <span className={`inline-block w-[4ch] text-center ${rd.colorClass}`}>
            {rd.text.padStart(4)}
          </span>
        ) : (
          <span className="inline-block w-[4ch] text-center text-[var(--text-dim)]">
            {'--'.padStart(4)}
          </span>
        )}
        <span className="text-[var(--border)]"> │ </span>
        <span className="inline-block w-[6ch] text-center text-[var(--text-dim)]">
          {thru.padStart(6)}
        </span>
        <span className="text-[var(--border)]"> │</span>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <PlayerDetails player={player} tournId={tournId} year={year} />
      )}

      {/* Row separator (except for last row) */}
      {!isLast && !isExpanded && (
        <div className="text-[var(--border)] opacity-30">
          {tableBorder(LEADERBOARD_COLS, 'mid')}
        </div>
      )}
    </>
  );
}
