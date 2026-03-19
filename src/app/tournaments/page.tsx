'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ScheduledTournament,
  TournamentResult,
  TournamentsApiResponse,
} from '@/lib/types';
import { borderTop, borderBottom, borderMid } from '@/lib/ascii';
import { AsciiBox, AsciiRow, AsciiDivider } from '@/components/AsciiBox';
import { Footer } from '@/components/Footer';

function BoxRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[var(--border)]">
      │<span className="inline-block w-[64ch] overflow-hidden">{' '}{children}</span>│
    </div>
  );
}

export default function TournamentsPage() {
  const [upcoming, setUpcoming] = useState<ScheduledTournament[]>([]);
  const [past, setPast] = useState<TournamentResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/tournaments');
        const data: TournamentsApiResponse = await response.json();

        if (data.error) {
          setError(data.error);
        } else {
          setUpcoming(data.upcoming);
          setPast(data.past);
        }
      } catch {
        setError('Failed to fetch tournaments');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Loading state
  if (loading) {
    return (
      <main>
        <div className="text-center py-12">
          <div className="text-[var(--text-dim)] animate-pulse-slow">
            {borderTop(30)}
            <br />
            │{'  Loading tournaments...  '.padEnd(30)}│
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
        <div className="mb-4 p-4 bg-[var(--bg-secondary)] border border-red-500/50 rounded">
          <span className="text-red-400">Error: {error}</span>
        </div>
      </main>
    );
  }

  return (
    <main className="font-mono text-sm">
      {/* Page Title */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--green)]">TOURNAMENTS</span>
        </AsciiRow>
        <AsciiRow>
          <span className="text-[var(--text-dim)]">PGA TOUR Schedule & Results</span>
        </AsciiRow>
      </AsciiBox>

      {/* Upcoming Tournaments Section */}
      <section className="mb-8">
        <div className="text-[var(--border)]">
          {borderTop()}
        </div>
        <BoxRow>
          <span className="text-[var(--yellow)]">UPCOMING TOURNAMENTS</span>
        </BoxRow>
        <div className="text-[var(--border)]">
          {borderMid()}
        </div>

        {upcoming.length === 0 ? (
          <BoxRow>
            <span className="text-[var(--text-dim)]">No upcoming tournaments found</span>
          </BoxRow>
        ) : (
          upcoming.map((tournament, index) => (
            <div key={tournament.tournId}>
              <BoxRow>
                <span className={tournament.status === 'in_progress' ? 'text-[var(--green)]' : 'text-[var(--text)]'}>
                  {tournament.name.slice(0, 45)}
                </span>
                {tournament.status === 'in_progress' && (
                  <span className="text-[var(--green)]"> [LIVE]</span>
                )}
              </BoxRow>
              <BoxRow>
                {'  '}<span className="text-[var(--text-dim)]">
                  {tournament.startDate} - {tournament.endDate}
                </span>
              </BoxRow>
              <BoxRow>
                {'  '}<span className="text-[var(--text-dim)]">
                  {tournament.courseName.slice(0, 55)}
                </span>
              </BoxRow>
              <BoxRow>
                {'  '}<span className="text-[var(--text-dim)]">
                  {tournament.location.slice(0, 55)}
                </span>
              </BoxRow>
              {index < upcoming.length - 1 && (
                <div className="text-[var(--border)]">
                  {borderMid()}
                </div>
              )}
            </div>
          ))
        )}

        <div className="text-[var(--border)]">
          {borderBottom()}
        </div>
      </section>

      {/* Past Tournaments Section */}
      <section className="mb-8">
        <div className="text-[var(--border)]">
          {borderTop()}
        </div>
        <BoxRow>
          <span className="text-[var(--text-dim)]">RECENT RESULTS</span>
        </BoxRow>
        <div className="text-[var(--border)]">
          {borderMid()}
        </div>
        <BoxRow>
          <span className="text-[var(--text-dim)]">{'TOURNAMENT'.padEnd(30)} {'WINNER'.padEnd(20)} {'SCORE'.padEnd(8)}</span>
        </BoxRow>
        <div className="text-[var(--border)]">
          {borderMid()}
        </div>

        {past.length === 0 ? (
          <BoxRow>
            <span className="text-[var(--text-dim)]">No past tournaments found</span>
          </BoxRow>
        ) : (
          past.map((tournament) => (
            <Link
              key={`${tournament.tournId}-${tournament.year}`}
              href={`/tournaments/${tournament.tournId}?year=${tournament.year}&name=${encodeURIComponent(tournament.name)}`}
              className="block hover:bg-[var(--bg-highlight)] transition-colors"
            >
              <BoxRow>
                <span className="text-[var(--text)]">
                  {tournament.name.slice(0, 28).padEnd(30)}
                </span>
                <span className="text-[var(--text-dim)]">
                  {tournament.winner.slice(0, 18).padEnd(20)}
                </span>
                <span className={
                  tournament.winningScore.startsWith('-') ? 'score-under' :
                  tournament.winningScore.startsWith('+') ? 'score-over' : 'score-even'
                }>
                  {tournament.winningScore.padEnd(8)}
                </span>
              </BoxRow>
            </Link>
          ))
        )}

        <div className="text-[var(--border)]">
          {borderBottom()}
        </div>
        <div className="text-[var(--text-dim)] text-xs mt-2 ml-2">
          Click a tournament to view the full leaderboard
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </main>
  );
}
