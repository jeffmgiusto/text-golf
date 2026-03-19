import type { Metadata } from 'next';
import { AsciiBox, AsciiRow, AsciiDivider } from '@/components/AsciiBox';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = { title: 'About | Text Golf' };

export default function AboutPage() {
  return (
    <main className="font-mono text-sm">
      {/* Page Title */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--green)]">ABOUT TEXT GOLF</span>
        </AsciiRow>
      </AsciiBox>

      {/* What is Text Golf */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--yellow)]">WHAT IS THIS?</span>
        </AsciiRow>
        <AsciiDivider />
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">Text Golf is a live PGA Tour leaderboard that displays</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">scores in a retro ASCII terminal style.</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text-dim)]">No ads. No clutter. Just scores.</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
      </AsciiBox>

      {/* Support Text Golf */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--yellow)]">SUPPORT TEXT GOLF</span>
        </AsciiRow>
        <AsciiDivider />
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">Text Golf is free and always will be.</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">If you enjoy it, consider buying me a coffee.</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span>{' '}
          <a href="https://buymeacoffee.com/txtgolf" target="_blank" rel="noopener noreferrer" className="text-[var(--green)] underline">
            buymeacoffee.com/txtgolf
          </a>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
      </AsciiBox>

      {/* Features */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--yellow)]">FEATURES</span>
        </AsciiRow>
        <AsciiDivider />
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Live leaderboard updated every 3 minutes</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Click any player to see their scorecard</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Hole-by-hole scorecards for each round</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">PGA Tour events and major championships</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Color-coded scores: </span>
          <span className="score-under">red</span><span className="text-[var(--text-dim)]">=under, </span>
          <span className="score-over">blue</span><span className="text-[var(--text-dim)]">=over</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Sortable columns - click any header</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Tournament schedule and historical results</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
      </AsciiBox>

      {/* Why ASCII */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--yellow)]">WHY THE RETRO LOOK?</span>
        </AsciiRow>
        <AsciiDivider />
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">Modern sports websites are bloated with ads, popups,</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">and auto-playing videos. This site strips away all</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">that noise.</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">The ASCII aesthetic is inspired by BBS systems from</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">the 1980s and sites like</span> <span className="text-[var(--green)]">plaintextsports.com</span><span className="text-[var(--text)]">.</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text-dim)]">┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼</span>  <span className="text-[var(--text-dim)]">&lt;-- Box-drawing characters</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
      </AsciiBox>

      {/* Data Sources */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--yellow)]">DATA SOURCES</span>
        </AsciiRow>
        <AsciiDivider />
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text)]">Powered by SlashGolf API</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--text-dim)]">Real-time PGA Tour scoring data</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Live leaderboards</span> <span className="text-[var(--text-dim)]">- Updated every 3 minutes</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Hole-by-hole scorecards</span> <span className="text-[var(--text-dim)]">- Real-time updates</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Tournament schedule</span> <span className="text-[var(--text-dim)]">- PGA Tour + Majors</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Historical results</span> <span className="text-[var(--text-dim)]">- Full leaderboards</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
      </AsciiBox>

      {/* Tech Stack */}
      <AsciiBox className="mb-6">
        <AsciiRow>
          <span className="text-[var(--yellow)]">BUILT WITH</span>
        </AsciiRow>
        <AsciiDivider />
        <AsciiRow>{'\u00A0'}</AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Next.js 16</span> <span className="text-[var(--text-dim)]">- React framework</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">TypeScript</span> <span className="text-[var(--text-dim)]">- Type-safe JavaScript</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">Tailwind CSS</span> <span className="text-[var(--text-dim)]">- Utility-first styling</span>
        </AsciiRow>
        <AsciiRow>
          {' '}<span className="text-[var(--green)]">▸</span> <span className="text-[var(--text)]">JetBrains Mono</span> <span className="text-[var(--text-dim)]">- Monospace font</span>
        </AsciiRow>
        <AsciiRow>{'\u00A0'}</AsciiRow>
      </AsciiBox>

      {/* Footer */}
      <Footer>
        <div className="mt-4">
          <span className="text-[var(--text)]">TEXT GOLF</span> © {new Date().getFullYear()}
        </div>
        <div className="mt-2">
          Made with ♥ for golf fans who appreciate simplicity
        </div>
      </Footer>
    </main>
  );
}
