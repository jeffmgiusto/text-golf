'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { AsciiBox, AsciiRow } from '@/components/AsciiBox';
import { tableBorder, borderTop, borderBottom } from '@/lib/ascii';
import { MajorResultsGrid } from '@/components/MajorResultsGrid';
import { Footer } from '@/components/Footer';

interface RankingEntry {
  rank: number;
  playerName: string;
}

interface MajorInfo {
  key: string;
  name: string;
}

interface MajorsPageData {
  rankings: RankingEntry[];
  allPlayerNames: string[];
  years: number[];
  majors: MajorInfo[];
  playerResults: Record<string, Record<string, Record<string, { position: string }>>>;
}

interface SearchedPlayer {
  name: string;
  results: Record<string, Record<string, { position: string }>>;
}

const TABLE_COLS = [6, 38, 2];

export default function MajorsPage() {
  const [data, setData] = useState<MajorsPageData | null>(null);
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
        const res = await fetch('/api/history/majors');
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

    // Check if player is in top 25
    if (data?.playerResults[name]) {
      setExpandedPlayer(name);
      setSearchedPlayer(null);
      return;
    }

    // Fetch from API
    setSearchLoading(true);
    try {
      const res = await fetch(`/api/history/majors?player=${encodeURIComponent(name)}`);
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

  return (
    <main className="font-mono text-sm">
      {/* Title */}
      <AsciiBox className="mb-2">
        <AsciiRow>
          <span className="text-[var(--text)]">MAJOR CHAMPIONSHIP HISTORY</span>
        </AsciiRow>
      </AsciiBox>

      {/* Toggle */}
      <div className="my-4 flex gap-4 text-sm">
        <Link href="/history"
          className="px-4 py-1 border transition-colors border-[var(--border)] text-[var(--text-dim)] hover:border-[var(--text)]">
          TOURNAMENT HISTORY
        </Link>
        <Link href="/history/majors"
          className="px-4 py-1 border transition-colors border-[var(--green)] text-[var(--green)] bg-[var(--bg-highlight)]">
          MAJORS
        </Link>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="text-[var(--text-dim)] animate-pulse-slow">
            {borderTop(30)}<br />
            │{'  Loading majors data...    '.padEnd(30)}│<br />
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
              placeholder="Search for a player..."
              className="w-full max-w-md bg-[var(--bg)] text-[var(--green)] border border-[var(--green)] font-mono text-sm px-3 py-1 outline-none"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full max-w-md bg-[var(--bg)] border border-[var(--green)] mt-[-1px]">
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
          {searchedPlayer && data && (
            <div className="mb-4 border border-[var(--border)]">
              <MajorResultsGrid
                playerName={searchedPlayer.name}
                results={searchedPlayer.results}
                years={data.years}
                majors={data.majors}
              />
            </div>
          )}

          {/* Top 25 table */}
          <div className="text-xs">
            <div className="text-[var(--border)]">
              {tableBorder(TABLE_COLS, 'top')}
            </div>
            <div className="text-[var(--border)]">
              │{' '}
              <span className="inline-block w-[4ch] text-[var(--text-dim)]">RANK</span>
              {' '}│{' '}
              <span className="inline-block w-[36ch] text-left text-[var(--text-dim)]">PLAYER</span>
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
                  <span className="inline-block w-[36ch] text-left text-[var(--text)]">
                    {entry.playerName.length > 36
                      ? entry.playerName.substring(0, 35) + '\u2026'
                      : entry.playerName.padEnd(36)}
                  </span>
                  {' '}│
                  <span className="text-[var(--text-dim)]">
                    {expandedPlayer === entry.playerName ? '\u25BC' : '\u25B6'}
                  </span>
                </div>
                {expandedPlayer === entry.playerName && data.playerResults[entry.playerName] && (
                  <div className="border-t border-b border-[var(--border)]">
                    <MajorResultsGrid
                      playerName={entry.playerName}
                      results={data.playerResults[entry.playerName]}
                      years={data.years}
                      majors={data.majors}
                    />
                  </div>
                )}
              </div>
            ))}

            <div className="text-[var(--border)]">
              {tableBorder(TABLE_COLS, 'bottom')}
            </div>

            <div className="text-[var(--text-dim)] text-center mt-4">
              Top 25 OWGR Players — Click to expand major results
            </div>
          </div>
        </>
      )}

      <Footer />
    </main>
  );
}
