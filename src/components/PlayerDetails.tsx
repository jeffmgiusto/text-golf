'use client';

import { PlayerWithStats } from '@/lib/types';
import { Scorecard } from './Scorecard';
import { tableBorder, LEADERBOARD_COLS } from '@/lib/ascii';

interface PlayerDetailsProps {
  player: PlayerWithStats;
  tournId?: string | null;
  year?: string | null;
  isFavorited: boolean;
  toggleFavorite: (playerId: string) => void;
}

export function PlayerDetails({ player, tournId, year, isFavorited, toggleFavorite }: PlayerDetailsProps) {
  return (
    <div className="bg-[var(--bg-highlight)] text-xs">
      {/* Scorecard */}
      <Scorecard playerName={player.player_name} playerId={player.playerId} tournId={tournId} year={year} isFavorited={isFavorited} toggleFavorite={toggleFavorite} />

      {/* Separator after details */}
      <div className="text-[var(--border)]">
        {tableBorder(LEADERBOARD_COLS, 'mid')}
      </div>
    </div>
  );
}
