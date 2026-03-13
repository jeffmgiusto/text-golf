'use client';

import { AsciiBox, AsciiRow, AsciiDivider } from './AsciiBox';
import { WeatherData } from '@/lib/types';

interface HeaderProps {
  tournamentName: string;
  currentRound: number;
  lastUpdated: string | null;
  nextRefreshIn: number;
  isLoading: boolean;
  courseName?: string;
  coursePar?: number;
  isPreview?: boolean;
  weather?: WeatherData | null;
}

export function Header({
  tournamentName,
  currentRound,
  lastUpdated,
  nextRefreshIn,
  isLoading,
  courseName,
  coursePar,
  isPreview,
  weather,
}: HeaderProps) {
  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AsciiBox className="mb-6">
      {/* Title */}
      <AsciiRow>
        <span className="text-[var(--green)] font-bold">TEXT GOLF</span>
      </AsciiRow>

      {/* Tournament name */}
      <AsciiRow>
        <span className="text-[var(--text)]">
          {tournamentName.substring(0, isPreview ? 40 : 50)}
        </span>
        {isPreview && (
          <span className="text-[var(--yellow)]"> [PREVIEW]</span>
        )}
      </AsciiRow>

      {/* Course info */}
      {courseName && (
        <AsciiRow>
          <span className="text-[var(--text-dim)]">
            {courseName.substring(0, 45)}{coursePar ? ` (Par ${coursePar})` : ''}
          </span>
        </AsciiRow>
      )}

      {/* Round info + weather */}
      <AsciiRow>
        <span className="text-[var(--text-dim)]">
          Round {currentRound}
        </span>
        {weather && (
          <>
            <span className="text-[var(--text-dim)]">{'  |  '}</span>
            <span className="text-[var(--blue)]">
              {weather.temp}°F {weather.icon} {weather.condition}{'  '}
              AM: {weather.windAm}mph{'  '}PM: {weather.windPm}mph
            </span>
          </>
        )}
      </AsciiRow>

      {/* Divider */}
      <AsciiDivider />

      {/* Last updated */}
      <AsciiRow>
        <span className="text-[var(--text-dim)]">
          Updated: {lastUpdated || 'Loading...'}
        </span>
      </AsciiRow>

      {/* Next refresh */}
      <AsciiRow>
        {isLoading ? (
          <span className="text-[var(--yellow)] animate-pulse-slow">
            Refreshing...
          </span>
        ) : (
          <span className="text-[var(--text-dim)]">
            Next refresh: {formatCountdown(nextRefreshIn)}
          </span>
        )}
      </AsciiRow>
    </AsciiBox>
  );
}
