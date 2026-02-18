// Tour filtering logic - only show PGA Tour events and majors

// Major championship patterns (always include these)
const MAJOR_PATTERNS = [
  /masters/i,
  /u\.?s\.?\s*open/i,
  /the\s+open/i,
  /open\s+championship/i,
  /british\s+open/i,
  /pga\s+championship/i,
];

// Patterns to exclude (non-PGA Tour events)
const EXCLUDE_PATTERNS = [
  /q-school/i,
  /qualifying/i,
  /korn\s*ferry/i,
  /liv\s+golf/i,
  /dp\s+world/i,
  /european\s+tour/i,
  /asian\s+tour/i,
  /pga\s+tour\s+champions/i,
  /lpga/i,
  /ladies/i,
  /ryder\s+cup/i,        // Team event - no individual winner
  /presidents\s+cup/i,   // Team event - no individual winner
];

// Check if tournament name is a major championship
export function isMajor(name: string): boolean {
  return MAJOR_PATTERNS.some((pattern) => pattern.test(name));
}

// Check if tournament should be excluded
export function shouldExclude(name: string): boolean {
  // Never exclude majors
  if (isMajor(name)) return false;

  // Check against exclusion patterns
  return EXCLUDE_PATTERNS.some((pattern) => pattern.test(name));
}

// Check if tournament is a valid PGA Tour event (regular or major)
export function isValidPGATourEvent(name: string): boolean {
  // Majors are always valid
  if (isMajor(name)) return true;

  // Exclude non-PGA Tour events
  if (shouldExclude(name)) return false;

  // Otherwise, it's a valid PGA Tour event
  return true;
}
