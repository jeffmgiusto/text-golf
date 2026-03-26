// Standard inner width for all ASCII boxes
export const BOX_WIDTH = 64;

// Simple border generators
export function borderTop(width = BOX_WIDTH): string {
  return `┌${'─'.repeat(width)}┐`;
}

export function borderBottom(width = BOX_WIDTH): string {
  return `└${'─'.repeat(width)}┘`;
}

export function borderMid(width = BOX_WIDTH): string {
  return `├${'─'.repeat(width)}┤`;
}

// Table border with column junctions
// position: 'top' = ┌┬┐, 'mid' = ├┼┤, 'bottom' = └┴┘
export function tableBorder(
  columnWidths: number[],
  position: 'top' | 'mid' | 'bottom'
): string {
  const chars = {
    top: { left: '┌', junction: '┬', right: '┐' },
    mid: { left: '├', junction: '┼', right: '┤' },
    bottom: { left: '└', junction: '┴', right: '┘' },
  }[position];

  const segments = columnWidths.map((w) => '─'.repeat(w));
  return chars.left + segments.join(chars.junction) + chars.right;
}

// Leaderboard columns: POS(6) + PLAYER(31) + SCORE(9) + RD(6) + THRU(8) = 60 dashes + 6 junctions = 66ch
export const LEADERBOARD_COLS = [6, 31, 9, 6, 8];

// Rankings columns: RANK(6) + PLAYER(39) + POINTS(17) = 62 dashes + 4 junctions = 66ch
export const RANKINGS_COLS = [6, 39, 17];
