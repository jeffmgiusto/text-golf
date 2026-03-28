'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AsciiBox, AsciiRow } from '@/components/AsciiBox';
import { tableBorder, borderTop, borderBottom } from '@/lib/ascii';
import { Footer } from '@/components/Footer';
import React from 'react';

interface PlayerTournamentResult {
  tournamentName: string;
  position: string;
  score: string | null;
}

interface PlayerResultsPageData {
  rankings: { rank: number; playerName: string }[];
  allPlayerNames: string[];
  playerResults: Record<string, { playerName: string; results: PlayerTournamentResult[] }>;
}

interface SearchedPlayer {
  name: string;
  results: PlayerTournamentResult[];
}

function getScoreColor(score: string | null): string {
  if (!score) return 'var(--text-dim)';
  if (score === 'E') return 'var(--gray)';
  if (score.startsWith('-')) return 'var(--red)';
  if (score.startsWith('+')) return 'var(--blue)';
  return 'var(--text)';
}

function getPositionColor(pos: string): string {
  const upper = pos.toUpperCase();
  if (upper === 'CUT' || upper === 'MC') return '#ff6b6b';
  if (upper === 'WD' || upper === 'DQ') return 'var(--text-dim)';
  const num = parseInt(pos.replace(/^T/, ''), 10);
  if (isNaN(num)) return 'var(--text-dim)';
  if (num === 1) return '#FFD700';
  if (num <= 10) return '#4ade80';
  if (num <= 25) return '#4a7a4a';
  return 'var(--text-dim)';
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.substring(0, max - 1) + '\u2026' : str;
}

function centerPad(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  const total = width - str.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

const TABLE_COLS = [6, 54, 2];

const TOURN_W = 30;
const POS_W = 8;
const SCORE_W = 8;

function PlayerResultsTable({ playerName, results }: { playerName: string; results: PlayerTournamentResult[] }) {
  const headerLine = `${centerPad('TOURNAMENT', TOURN_W)}│${centerPad('POS', POS_W)}│${centerPad('SCORE', SCORE_W)}`;
  const dividerLine = `${'─'.repeat(TOURN_W)}┼${'─'.repeat(POS_W)}┼${'─'.repeat(SCORE_W)}`;

  return (
    <div className="overflow-x-auto py-2">
      <pre className="leading-relaxed whitespace-pre mx-auto w-fit" style={{ fontFamily: 'inherit' }}>
        <div className="text-[var(--green)] font-bold mb-1 text-center">
          {playerName} — RECENT RESULTS
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>{headerLine}</span>
        </div>
        <div style={{ color: 'var(--border)' }}>{dividerLine}</div>
        {results.map((r, i) => {
          const tournCell = truncate(r.tournamentName, TOURN_W).padEnd(TOURN_W);
          const posCell = centerPad(r.position, POS_W);
          const scoreCell = centerPad(r.score || '-', SCORE_W);

          return (
            <div key={i}>
              <span style={{ color: 'var(--text)' }}>{tournCell}</span>
              <span style={{ color: 'var(--border)' }}>│</span>
              <span style={{ color: getPositionColor(r.position) }}>{posCell}</span>
              <span style={{ color: 'var(--border)' }}>│</span>
              <span style={{ color: getScoreColor(r.score) }}>{scoreCell}</span>
            </div>
          );
        })}
        <div style={{ color: 'var(--border)' }}>{dividerLine}</div>
      </pre>
    </div>
  );
}

export default function PlayerResultsPage() {
  const [data, setData] = useState<PlayerResultsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedPlayer, setSearchedPlayer] = useState<SearchedPlayer | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/history/player-results');
        if (!res.ok) throw new Error('Failed to fetch');
        const json = await res.json();
        setData(json);
      } catch {
        // error handled by empty data
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Click outside to close suggestions
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const suggestions = data?.allPlayerNames
    .filter(name => searchQuery.length >= 2 && name.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 10) || [];

  async function handleSelectPlayer(name: string) {
    setSearchQuery(name);
    setShowSuggestions(false);

    // Check if player is in top 25 (data already loaded for all players)
    const key = name.toLowerCase();
    if (data?.playerResults[key]) {
      // Check if they're in the top 25 rankings list
      const isTop25 = data.rankings.some(r => r.playerName === name);
      if (isTop25) {
        setExpandedPlayer(name);
        setSearchedPlayer(null);
        return;
      }
      // Non-top-25 but we have their data already
      setSearchedPlayer({ name: data.playerResults[key].playerName, results: data.playerResults[key].results });
      setExpandedPlayer(null);
      return;
    }

    // Fetch from API (unlikely since we have all players, but fallback)
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/history/player-results?player=${encodeURIComponent(name)}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setSearchedPlayer({ name: json.playerName, results: json.results });
      setExpandedPlayer(null);
    } catch {
      // ignore
    } finally {
      setSearchLoading(false);
    }
  }

  function handleTogglePlayer(name: string) {
    setExpandedPlayer(prev => prev === name ? null : name);
    setSearchedPlayer(null);
  }

  function getPlayerResults(name: string): PlayerTournamentResult[] {
    if (!data) return [];
    const key = name.toLowerCase();
    return data.playerResults[key]?.results || [];
  }

  return (
    <main className="font-mono text-sm">
      {/* Title */}
      <AsciiBox className="mb-2">
        <AsciiRow>
          <span className="text-[var(--text)]">PLAYER RESULTS</span>
        </AsciiRow>
      </AsciiBox>

      {/* Toggle */}
      <div className="my-4 flex gap-4 text-sm">
        <Link href="/history"
          className="px-4 py-1 border transition-colors border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)]">
          TOURNAMENT HISTORY
        </Link>
        <Link href="/history/majors"
          className="px-4 py-1 border transition-colors border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)]">
          MAJORS
        </Link>
        <Link href="/history/player-results"
          className="px-4 py-1 border transition-colors border-[var(--green)] text-[var(--green)] bg-[var(--bg-highlight)]">
          PLAYER RESULTS
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-[var(--text-dim)] animate-pulse-slow">
            {borderTop(30)}<br />
            │{'  Loading player results... '.padEnd(30)}│<br />
            {borderBottom(30)}
          </div>
        </div>
      )}

      {data && !loading && (
        <>
          {/* Search */}
          <div ref={searchRef} className="relative my-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search players..."
              className="w-full bg-[var(--bg)] text-[var(--green)] border border-[var(--green)] font-mono text-sm px-3 py-1 outline-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full bg-[var(--bg)] border border-[var(--green)] mt-[-1px]">
                {suggestions.map(name => (
                  <button
                    key={name}
                    onClick={() => handleSelectPlayer(name)}
                    className="block w-full text-left px-3 py-1 text-[var(--text)] hover:bg-[var(--bg-highlight)] font-mono text-sm"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search loading */}
          {searchLoading && (
            <div className="text-[var(--text-dim)] py-2">Loading player data...</div>
          )}

          {/* Searched player result (non-top-25) */}
          {searchedPlayer && (
            <div className="mb-4 border border-[var(--border)]">
              {searchedPlayer.results.length > 0 ? (
                <PlayerResultsTable playerName={searchedPlayer.name} results={searchedPlayer.results} />
              ) : (
                <div className="px-4 py-2 text-[var(--text-dim)]">No results found</div>
              )}
            </div>
          )}

          {/* Top 25 table */}
          <div>
            <div className="text-[var(--border)]">
              {tableBorder(TABLE_COLS, 'top')}
            </div>
            <div className="text-[var(--border)]">
              │{' '}
              <span className="inline-block w-[4ch] text-[var(--text-dim)]">RANK</span>
              {' '}│{' '}
              <span className="inline-block w-[52ch] text-left text-[var(--text-dim)]">PLAYER</span>
              {' '}│
            </div>
            <div className="text-[var(--border)]">
              {tableBorder(TABLE_COLS, 'mid')}
            </div>

            {data.rankings.map((entry) => (
              <div key={entry.playerName}>
                <div
                  className="text-[var(--border)] cursor-pointer hover:bg-[var(--bg-highlight)]"
                  onClick={() => handleTogglePlayer(entry.playerName)}
                >
                  │{' '}
                  <span className="inline-block w-[4ch] text-right text-[var(--text-dim)]">
                    {String(entry.rank).padStart(4)}
                  </span>
                  {' '}│{' '}
                  <span className="inline-block w-[52ch] text-left text-[var(--text)]">
                    {entry.playerName.length > 52
                      ? entry.playerName.substring(0, 51) + '\u2026'
                      : entry.playerName.padEnd(52)}
                  </span>
                  {' '}│
                  <span className="text-[var(--text-dim)]">
                    {expandedPlayer === entry.playerName ? '\u25BC' : '\u25B6'}
                  </span>
                </div>
                {expandedPlayer === entry.playerName && (
                  <div className="border-t border-b border-[var(--border)]">
                    {getPlayerResults(entry.playerName).length > 0 ? (
                      <PlayerResultsTable playerName={entry.playerName} results={getPlayerResults(entry.playerName)} />
                    ) : (
                      <div className="px-4 py-2 text-[var(--text-dim)]">No recent results</div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <div className="text-[var(--border)]">
              {tableBorder(TABLE_COLS, 'bottom')}
            </div>

            <div className="text-[var(--text-dim)] text-center mt-4">
              Top 25 OWGR Players — Click to expand tournament results
            </div>
          </div>
        </>
      )}

      <Footer />
    </main>
  );
}
