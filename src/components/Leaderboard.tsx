'use client';

import { useState, useMemo } from 'react';
import { PlayerWithStats } from '@/lib/types';
import { PlayerRow } from './PlayerRow';
import { tableBorder, LEADERBOARD_COLS } from '@/lib/ascii';

interface LeaderboardProps {
  players: PlayerWithStats[];
}

type SortColumn = 'pos' | 'player' | 'score' | 'thru';
type SortDirection = 'asc' | 'desc';

function parsePosition(pos: string): number {
  const cleaned = String(pos).replace(/^T/, '');
  const num = parseInt(cleaned, 10);
  if (isNaN(num)) return 999;
  return num;
}

function parseThru(thru: string | number): number {
  const val = String(thru);
  if (val === 'F' || val === '18') return 18;
  return parseInt(val, 10) || 0;
}

export function Leaderboard({ players }: LeaderboardProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('pos');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedPlayers = useMemo(() => {
    const sorted = [...players].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'pos':
          comparison = parsePosition(a.current_pos) - parsePosition(b.current_pos);
          break;
        case 'player':
          comparison = a.player_name.localeCompare(b.player_name);
          break;
        case 'score':
          comparison = a.current_score - b.current_score;
          break;
        case 'thru':
          comparison = parseThru(a.thru) - parseThru(b.thru);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [players, sortColumn, sortDirection]);

  const getSortIndicator = (column: SortColumn): string => {
    if (sortColumn !== column) return '  ';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const ColumnHeader = ({
    column,
    label,
    width,
    align = 'center'
  }: {
    column: SortColumn;
    label: string;
    width: string;
    align?: 'left' | 'center';
  }) => {
    const indicator = getSortIndicator(column);
    const isActive = sortColumn === column;

    return (
      <span
        onClick={() => handleSort(column)}
        className={`inline-block ${width} text-${align} cursor-pointer hover:text-[var(--text)] transition-colors ${
          isActive ? 'text-[var(--green)]' : ''
        }`}
      >
        {label}{indicator}
      </span>
    );
  };

  if (players.length === 0) {
    return (
      <div className="text-[var(--text-dim)] text-center py-8">
        No tournament data available.
        <br />
        Check back during a live PGA Tour event.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto font-mono">
      <pre className="text-xs sm:text-sm leading-relaxed">
        {/* Top border */}
        <div className="text-[var(--border)]">{tableBorder(LEADERBOARD_COLS, 'top')}</div>

        {/* Header row */}
        <div className="text-[var(--text-dim)] select-none">
          <span className="text-[var(--border)]">│ </span>
          <ColumnHeader column="pos" label="POS" width="w-[4ch]" />
          <span className="text-[var(--border)]"> │ </span>
          <ColumnHeader column="player" label="PLAYER" width="w-[36ch]" align="left" />
          <span className="text-[var(--border)]"> │ </span>
          <ColumnHeader column="score" label="SCORE" width="w-[7ch]" />
          <span className="text-[var(--border)]"> │ </span>
          <ColumnHeader column="thru" label="THRU" width="w-[6ch]" />
          <span className="text-[var(--border)]"> │</span>
        </div>

        {/* Header separator */}
        <div className="text-[var(--border)]">{tableBorder(LEADERBOARD_COLS, 'mid')}</div>

        {/* Player rows */}
        {sortedPlayers.map((player, index) => (
          <PlayerRow
            key={player.playerId || index}
            player={player}
            isLast={index === sortedPlayers.length - 1}
          />
        ))}

        {/* Bottom border */}
        <div className="text-[var(--border)]">{tableBorder(LEADERBOARD_COLS, 'bottom')}</div>
      </pre>

      <div className="text-[var(--text-dim)] text-xs mt-2 text-center">
        Click column headers to sort
      </div>
    </div>
  );
}
