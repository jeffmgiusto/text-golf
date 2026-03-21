import { Suspense } from 'react';
import type { Metadata } from 'next';
import TournamentDetailContent from './tournament-detail';
import { borderTop, borderBottom } from '@/lib/ascii';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ name?: string; year?: string }> }): Promise<Metadata> {
  const { name, year } = await searchParams;
  const tournamentName = name ? decodeURIComponent(name) : 'Tournament';
  return { title: `${tournamentName}${year ? ` ${year}` : ''} | Text Golf` };
}

function LoadingFallback() {
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

export default function TournamentDetailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TournamentDetailContent />
    </Suspense>
  );
}
