'use client';

import { PlayerWithStats } from '@/lib/types';
import { Scorecard } from './Scorecard';
import { tableBorder, LEADERBOARD_COLS } from '@/lib/ascii';

interface PlayerDetailsProps {
  player: PlayerWithStats;
}

export function PlayerDetails({ player }: PlayerDetailsProps) {
  return (
    <div className="bg-[var(--bg-highlight)] text-xs">
      {/* Scorecard */}
      <Scorecard playerName={player.player_name} />

      {/* Separator after details */}
      <div className="text-[var(--border)]">
        {tableBorder(LEADERBOARD_COLS, 'mid')}
      </div>
    </div>
  );
}
