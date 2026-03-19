'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { HistoricalLeaderboardResponse, HistoricalPlayer } from '@/lib/types';
import { borderTop, borderBottom, borderMid } from '@/lib/ascii';
import { AsciiBox, AsciiRow } from '@/components/AsciiBox';
import { Footer } from '@/components/Footer';

function BoxRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[var(--border)]">
      │<span className="inline-block w-[64ch] overflow-hidden">{' '}{children}</span>│
    </div>
  );
}

export default function TournamentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const tournId = params.tournId as string;
  const year = searchParams.get('year') || String(new Date().getFullYear());
  const tournamentNameFromUrl = searchParams.get('name') || '';

  const [tournament, setTournament] = useState<{ name: string; year: string; courseName: string } | null>(null);
  const [players, setPlayers] = useState<HistoricalPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/tournaments/leaderboard?tournId=${tournId}&year=${year}`);
        const data: HistoricalLeaderboardResponse = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          const tournamentData = {
            name: data.tournament.name !== 'Unknown Tournament' ? data.tournament.name : tournamentNameFromUrl,
            year: data.tournament.year || year,
            courseName: data.tournament.courseName,
          };
          setTournament(tournamentData);
          setPlayers(data.players);
        }
      } catch {
        setError('Failed to fetch leaderboard');
      } finally {
        setLoading(false);
      }
    }

    if (tournId && year) {
      fetchData();
    }
  }, [tournId, year, tournamentNameFromUrl]);

  // Loading state
  if (loading) {
    return (
      <main>
        <div className="text-center py-12">
          <div className="text-[var(--text-dim)] animate-pulse-slow">
            {borderTop(30)}
            <br />
            │{'  Loading leaderboard...  '.padEnd(30)}│
            <br />
            {borderBottom(30)}
          </div>
        </div>
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main>
        <Link href="/tournaments" className="text-[var(--green)] hover:underline mb-4 block">
          ← Back to Tournaments
        </Link>
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] border border-red-500/50 rounded">
          <span className="text-red-400">Error: {error}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="font-mono text-sm">
      {/* Back link */}
      <Link href="/tournaments" className="text-[var(--green)] hover:underline mb-4 block">
        ← Back to Tournaments
      </Link>

      {/* Tournament Header */}
      <AsciiBox className="mb-4">
        <AsciiRow>
          <span className="text-[var(--green)]">{tournament?.name?.slice(0, 55).toUpperCase() || 'TOURNAMENT'}</span>
        </AsciiRow>
        <AsciiRow>
          <span className="text-[var(--text-dim)]">{tournament?.year || year}</span>
        </AsciiRow>
        <AsciiRow>
          <span className="text-[var(--text-dim)]">{tournament?.courseName?.slice(0, 55) || 'Course'}</span>
        </AsciiRow>
      </AsciiBox>

      {/* Leaderboard Table */}
      <div className="text-[var(--border)]">
        {borderTop()}
      </div>
      <BoxRow>
        <span className="text-[var(--text-dim)]">{'POS'.padEnd(5)} {'PLAYER'.padEnd(25)} {'SCORE'.padEnd(8)} {'ROUNDS'.padEnd(22)}</span>
      </BoxRow>
      <div className="text-[var(--border)]">
        {borderMid()}
      </div>

      {players.length === 0 ? (
        <BoxRow>
          <span className="text-[var(--text-dim)]">No players found</span>
        </BoxRow>
      ) : (
        players.slice(0, 50).map((player, index) => (
          <BoxRow key={index}>
            <span className="text-[var(--text-dim)]">{player.position.padEnd(5)}</span>
            <span className="text-[var(--text)]">{player.playerName.slice(0, 23).padEnd(25)}</span>
            <span className={
              player.totalScore.startsWith('-') ? 'score-under' :
              player.totalScore.startsWith('+') ? 'score-over' : 'score-even'
            }>
              {player.totalScore.padEnd(8)}
            </span>
            <span className="text-[var(--text-dim)]">
              {player.rounds.slice(0, 4).map(r => r.padStart(3)).join(' ').padEnd(22)}
            </span>
          </BoxRow>
        ))
      )}

      <div className="text-[var(--border)]">
        {borderBottom()}
      </div>

      {players.length > 50 && (
        <div className="text-[var(--text-dim)] text-xs mt-2 ml-2">
          Showing top 50 of {players.length} players
        </div>
      )}

      {/* Footer */}
      <Footer />
    </main>
  );
}
