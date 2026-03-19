'use client';

import { useState, useEffect } from 'react';
import { ProcessedScorecard, ScorecardApiResponse } from '@/lib/types';
import { borderMid } from '@/lib/ascii';

interface ScorecardProps {
  playerName: string;
  playerId: string;
  tournId?: string | null;
  year?: string | null;
  isFavorited: boolean;
  toggleFavorite: (playerId: string) => void;
}

function getScoreColor(score: number | null, par: number): string {
  if (score === null) return 'text-[var(--text-dim)]';
  const diff = score - par;
  if (diff < 0) return 'score-under';
  if (diff > 0) return 'score-over';
  return 'score-even';
}

function formatHoleScore(score: number | null): string {
  if (score === null) return '-';
  return String(score);
}

function calculateNineTotal(holes: { score: number | null }[], start: number): string {
  let total = 0;
  let hasScores = false;
  for (let i = start; i < start + 9; i++) {
    if (holes[i]?.score !== null) {
      total += holes[i].score!;
      hasScores = true;
    }
  }
  return hasScores ? String(total) : '-';
}

// Render a row inside the full-width box
function ScorecardRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[var(--border)]">
      │<span className="inline-block w-[64ch] overflow-hidden pl-[1ch]">{children}</span>│
    </div>
  );
}

function FavoriteStar({ playerId, isFavorited, toggleFavorite }: { playerId: string; isFavorited: boolean; toggleFavorite: (id: string) => void }) {
  return (
    <span
      className="cursor-pointer hover:opacity-80 text-2xl leading-none"
      style={isFavorited ? { color: '#DAA520' } : undefined}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(playerId);
      }}
    >
      {isFavorited ? '★' : <span className="text-[var(--text-dim)]">☆</span>}
    </span>
  );
}

export function Scorecard({ playerName, playerId, tournId, year, isFavorited, toggleFavorite }: ScorecardProps) {
  const [scorecard, setScorecard] = useState<ProcessedScorecard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({ player: playerName });
        if (tournId) params.set('tournId', tournId);
        if (year) params.set('year', year);
        const response = await fetch(`/api/scorecard?${params}`);
        const data: ScorecardApiResponse = await response.json();

        if (cancelled) return;

        if (data.error) {
          setError(data.error);
          setScorecard(null);
        } else {
          setScorecard(data.scorecard);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to fetch scorecard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [playerName, tournId, year]);

  // Loading state
  if (loading) {
    return (
      <div className="mt-2">
        <div className="text-[var(--border)]">{borderMid()}</div>
        <ScorecardRow>
          <span className="text-[var(--text-dim)] animate-pulse-slow">Loading scorecard...</span>
        </ScorecardRow>
      </div>
    );
  }

  // Error state or no data
  if (error || !scorecard || scorecard.rounds.length === 0) {
    return (
      <div className="mt-2">
        <div className="text-[var(--border)]">{borderMid()}</div>
        <ScorecardRow>
          <span className="inline-flex justify-between w-full">
            <span className="text-[var(--text-dim)]">SCORECARD</span>
            <FavoriteStar playerId={playerId} isFavorited={isFavorited} toggleFavorite={toggleFavorite} />
          </span>
        </ScorecardRow>
        <div className="text-[var(--border)]">{borderMid()}</div>
        <ScorecardRow>
          <span className="text-[var(--text-dim)] italic">
            {error || 'Scorecard data not available'}
          </span>
        </ScorecardRow>
      </div>
    );
  }

  const latestRound = scorecard.rounds[scorecard.rounds.length - 1];
  const holes = latestRound.holes;

  const frontNinePar = holes.slice(0, 9).reduce((sum, h) => sum + h.par, 0);
  const backNinePar = holes.slice(9, 18).reduce((sum, h) => sum + h.par, 0);
  const totalPar = frontNinePar + backNinePar;

  const frontNineScore = calculateNineTotal(holes, 0);
  const backNineScore = calculateNineTotal(holes, 9);
  const totalScore = latestRound.totalShots > 0 ? String(latestRound.totalShots) : '-';

  return (
    <div className="mt-2">
      {/* Scorecard header */}
      <div className="text-[var(--border)]">{borderMid()}</div>
      <ScorecardRow>
        <span className="inline-flex justify-between w-full">
          <span>
            <span className="text-[var(--text-dim)]">SCORECARD</span>
            <span className="text-[var(--text-dim)]"> - Round {latestRound.roundId}</span>
            {latestRound.complete ? (
              <span className="text-[var(--green)]"> (Complete)</span>
            ) : (
              <span className="text-[var(--yellow)]"> (Thru {latestRound.currentHole})</span>
            )}
          </span>
          <FavoriteStar playerId={playerId} isFavorited={isFavorited} toggleFavorite={toggleFavorite} />
        </span>
      </ScorecardRow>
      <div className="text-[var(--border)]">{borderMid()}</div>

      {/* Front 9 - Hole numbers */}
      <ScorecardRow>
        <span className="text-[var(--text-dim)]">HOLE</span>{' '}
        {holes.slice(0, 9).map((h) => (
          <span key={h.hole} className="text-[var(--text-dim)] inline-block w-[3ch] text-center">
            {h.hole}
          </span>
        ))}
        {' '}<span className="text-[var(--text-dim)] inline-block w-[4ch] text-center">OUT</span>
      </ScorecardRow>

      {/* Front 9 - Par */}
      <ScorecardRow>
        <span className="text-[var(--text-dim)]">PAR </span>{' '}
        {holes.slice(0, 9).map((h) => (
          <span key={h.hole} className="text-[var(--text-dim)] inline-block w-[3ch] text-center">
            {h.par}
          </span>
        ))}
        {' '}<span className="text-[var(--text-dim)] inline-block w-[4ch] text-center">{frontNinePar}</span>
      </ScorecardRow>

      {/* Front 9 - Scores */}
      <ScorecardRow>
        <span className="text-[var(--text-dim)]">R{latestRound.roundId}  </span>{' '}
        {holes.slice(0, 9).map((h) => (
          <span key={h.hole} className={`inline-block w-[3ch] text-center ${getScoreColor(h.score, h.par)}`}>
            {formatHoleScore(h.score)}
          </span>
        ))}
        {' '}<span className={`inline-block w-[4ch] text-center ${
          frontNineScore !== '-' && parseInt(frontNineScore) < frontNinePar ? 'score-under' :
          frontNineScore !== '-' && parseInt(frontNineScore) > frontNinePar ? 'score-over' : 'score-even'
        }`}>{frontNineScore}</span>
      </ScorecardRow>

      {/* Divider */}
      <div className="text-[var(--border)]">{borderMid()}</div>

      {/* Back 9 - Hole numbers */}
      <ScorecardRow>
        <span className="text-[var(--text-dim)]">HOLE</span>{' '}
        {holes.slice(9, 18).map((h) => (
          <span key={h.hole} className="text-[var(--text-dim)] inline-block w-[3ch] text-center">
            {h.hole}
          </span>
        ))}
        {' '}<span className="text-[var(--text-dim)] inline-block w-[4ch] text-center">IN</span>
        {' '}<span className="text-[var(--text-dim)] inline-block w-[4ch] text-center">TOT</span>
      </ScorecardRow>

      {/* Back 9 - Par */}
      <ScorecardRow>
        <span className="text-[var(--text-dim)]">PAR </span>{' '}
        {holes.slice(9, 18).map((h) => (
          <span key={h.hole} className="text-[var(--text-dim)] inline-block w-[3ch] text-center">
            {h.par}
          </span>
        ))}
        {' '}<span className="text-[var(--text-dim)] inline-block w-[4ch] text-center">{backNinePar}</span>
        {' '}<span className="text-[var(--text-dim)] inline-block w-[4ch] text-center">{totalPar}</span>
      </ScorecardRow>

      {/* Back 9 - Scores */}
      <ScorecardRow>
        <span className="text-[var(--text-dim)]">R{latestRound.roundId}  </span>{' '}
        {holes.slice(9, 18).map((h) => (
          <span key={h.hole} className={`inline-block w-[3ch] text-center ${getScoreColor(h.score, h.par)}`}>
            {formatHoleScore(h.score)}
          </span>
        ))}
        {' '}<span className={`inline-block w-[4ch] text-center ${
          backNineScore !== '-' && parseInt(backNineScore) < backNinePar ? 'score-under' :
          backNineScore !== '-' && parseInt(backNineScore) > backNinePar ? 'score-over' : 'score-even'
        }`}>{backNineScore}</span>
        {' '}<span className={`inline-block w-[4ch] text-center ${
          totalScore !== '-' && parseInt(totalScore) < totalPar ? 'score-under' :
          totalScore !== '-' && parseInt(totalScore) > totalPar ? 'score-over' : 'score-even'
        }`}>{totalScore}</span>
      </ScorecardRow>

      {/* All rounds summary if multiple rounds */}
      {scorecard.rounds.length > 1 && (
        <>
          <div className="text-[var(--border)]">{borderMid()}</div>
          <ScorecardRow>
            <span className="text-[var(--text-dim)]">ALL ROUNDS:</span>{' '}
            {scorecard.rounds.map((r, i) => (
              <span key={r.roundId}>
                <span className="text-[var(--text-dim)]">R{r.roundId}:</span>{' '}
                <span className={
                  r.score.startsWith('-') ? 'score-under' :
                  r.score.startsWith('+') ? 'score-over' : 'score-even'
                }>
                  {r.score.padStart(3)}
                </span>
                {i < scorecard.rounds.length - 1 ? '  ' : ''}
              </span>
            ))}
          </ScorecardRow>
        </>
      )}
    </div>
  );
}
