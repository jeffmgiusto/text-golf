import type { Metadata } from 'next';

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ name?: string; year?: string }> }): Promise<Metadata> {
  const { name, year } = await searchParams;
  const tournamentName = name ? decodeURIComponent(name) : 'Tournament';
  return { title: `${tournamentName}${year ? ` ${year}` : ''} | Text Golf` };
}

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
