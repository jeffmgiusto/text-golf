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
  if (!pos) return '-';
  if (pos === 'NT') return 'NT';
  if (pos === 'CUT' || pos === 'MC') return 'CUT';
  if (pos === 'WD') return 'WD';
  if (pos === 'DQ') return 'DQ';
  return pos;
}

function centerPad(str: string, width: number): string {
  if (str.length >= width) return str.slice(0, width);
  const total = width - str.length;
  const left = Math.floor(total / 2);
  const right = total - left;
  return ' '.repeat(left) + str + ' '.repeat(right);
}

export function MajorResultsGrid({ playerName, results, years, majors }: MajorResultsGridProps) {
  const sortedYears = [...years].sort((a, b) => a - b);

  const COL_W = 12;
  const YEAR_W = 8;

  const majorHeaders = majors.map(m => centerPad(MAJOR_SHORT[m.key] || m.name.slice(0, 3).toUpperCase(), COL_W)).join('│');
  const dividerSeg = majors.map(() => '─'.repeat(COL_W)).join('┼');

  const headerLine = `${centerPad('YEAR', YEAR_W)}│${majorHeaders}`;
  const dividerLine = `${'─'.repeat(YEAR_W)}┼${dividerSeg}`;

  const yearLines: { line: React.ReactElement; key: number }[] = sortedYears.map(year => {
    const cells: React.ReactElement[] = majors.map((major, i) => {
      const pos = results[major.key]?.[String(year)]?.position;
      const tier = getPositionTier(pos);
      const display = formatPos(pos);
      const padded = centerPad(display, COL_W);
      return (
        <span key={major.key}>
          <span style={{ color: 'var(--border)' }}>│</span>
          <span style={{ color: tierColor(tier) }}>{padded}</span>
        </span>
      );
    });

    const label = centerPad(`'${String(year).slice(-2)}`, YEAR_W);

    return {
      key: year,
      line: (
        <div key={year}>
          <span style={{ color: 'var(--text-dim)' }}>{label}</span>
          {cells}
        </div>
      ),
    };
  });

  return (
    <div className="overflow-x-auto py-2">
      <pre className="leading-relaxed whitespace-pre mx-auto w-fit" style={{ fontFamily: 'inherit' }}>
        <div className="text-[var(--green)] font-bold mb-1 text-center">
          {playerName} — MAJORS
        </div>
        <div>
          <span style={{ color: 'var(--text-dim)' }}>{headerLine}</span>
        </div>
        <div style={{ color: 'var(--border)' }}>{dividerLine}</div>
        {yearLines.map(m => m.line)}
        <div style={{ color: 'var(--border)' }}>{dividerLine}</div>
      </pre>
    </div>
  );
}
