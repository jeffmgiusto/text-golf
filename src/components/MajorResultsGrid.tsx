'use client';

import React from 'react';

interface MajorResultsGridProps {
  playerName: string;
  results: Record<string, Record<string, { position: string }>>;
  years: number[];
  majors: { key: string; name: string }[];
}

type Tier = 'win' | 'top10' | 'top25' | 'made' | 'cut' | 'none';

function getPositionTier(pos: string | undefined): Tier {
  if (!pos || pos === '-' || pos === 'NT') return 'none';
  if (pos === 'CUT' || pos === 'MC') return 'cut';
  if (pos === 'WD' || pos === 'DQ') return 'made';
  const num = parseInt(pos.replace(/^T/, ''), 10);
  if (isNaN(num)) return 'none';
  if (num === 1) return 'win';
  if (num <= 10) return 'top10';
  if (num <= 25) return 'top25';
  return 'made';
}

function tierColor(tier: Tier): string {
  switch (tier) {
    case 'win': return '#FFD700';
    case 'top10': return '#4ade80';
    case 'top25': return '#4a7a4a';
    case 'cut': return '#ff6b6b';
    case 'made':
    case 'none':
    default: return 'var(--text-dim)';
  }
}

const MAJOR_SHORT: Record<string, string> = {
  masters: 'MASTERS',
  pga: 'PGA',
  usopen: 'US OPEN',
  theopen: 'THE OPEN',
};

function formatPos(pos: string | undefined): string {
  if (!pos) return ' - ';
  if (pos === 'NT') return 'NT ';
  if (pos === 'CUT' || pos === 'MC') return 'CUT';
  if (pos === 'WD') return 'WD ';
  if (pos === 'DQ') return 'DQ ';
  // Pad to 3 chars
  return pos.length >= 3 ? pos : pos.padStart(3);
}

export function MajorResultsGrid({ playerName, results, years, majors }: MajorResultsGridProps) {
  const sortedYears = [...years].sort((a, b) => a - b);

  // Calculate totals per major row
  function getMajorTotals(majorKey: string) {
    let wins = 0;
    let top10s = 0;
    for (const year of sortedYears) {
      const pos = results[majorKey]?.[String(year)]?.position;
      const tier = getPositionTier(pos);
      if (tier === 'win') { wins++; top10s++; }
      else if (tier === 'top10') { top10s++; }
    }
    return { wins, top10s };
  }

  // Build the grid lines
  const COL_W = 5; // width per year column including padding
  const NAME_W = 14;
  const TOTALS_W = 10;
  const yearHeaders = sortedYears.map(y => ` '${String(y).slice(-2)} `).join('│');
  const dividerSeg = sortedYears.map(() => '─'.repeat(COL_W)).join('┼');

  const headerLine = `${'TOURNAMENT'.padEnd(NAME_W)}│${yearHeaders}│${'  TOTALS'.padEnd(TOTALS_W)}`;
  const dividerLine = `${'─'.repeat(NAME_W)}┼${dividerSeg}┼${'─'.repeat(TOTALS_W)}`;

  const majorLines: { line: React.ReactElement; key: string }[] = majors.map(major => {
    const totals = getMajorTotals(major.key);
    const cells: React.ReactElement[] = sortedYears.map((year, i) => {
      const pos = results[major.key]?.[String(year)]?.position;
      const tier = getPositionTier(pos);
      const display = formatPos(pos);
      const padded = display.length < COL_W ? ' ' + display + ' '.repeat(COL_W - display.length - 1) : display;
      return (
        <span key={year}>
          {i > 0 && <span style={{ color: 'var(--border)' }}>│</span>}
          <span style={{ color: tierColor(tier) }}>{padded}</span>
        </span>
      );
    });

    const wStr = totals.wins > 0
      ? <span style={{ color: '#FFD700' }}>{totals.wins}W</span>
      : <span style={{ color: 'var(--text-dim)' }}>0W</span>;
    const t10Str = totals.top10s > 0
      ? <span style={{ color: '#4ade80' }}> {totals.top10s}T10</span>
      : <span style={{ color: 'var(--text-dim)' }}> 0T10</span>;

    const label = (MAJOR_SHORT[major.key] || major.name).padEnd(NAME_W);

    return {
      key: major.key,
      line: (
        <div key={major.key}>
          <span style={{ color: 'var(--text)' }}>{label}</span>
          <span style={{ color: 'var(--border)' }}>│</span>
          {cells}
          <span style={{ color: 'var(--border)' }}>│</span>
          <span>  {wStr}{t10Str}</span>
        </div>
      ),
    };
  });

  return (
    <div className="overflow-x-auto py-2 pl-4">
      <pre className="text-xs leading-relaxed whitespace-pre" style={{ fontFamily: 'inherit' }}>
        <div className="text-[var(--green)] font-bold mb-1">
          {playerName} — MAJOR CHAMPIONSHIP RESULTS
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>{headerLine}</span>
        </div>
        <div style={{ color: 'var(--border)' }}>{dividerLine}</div>
        {majorLines.map(m => m.line)}
        <div style={{ color: 'var(--border)' }}>{dividerLine}</div>
      </pre>
    </div>
  );
}
