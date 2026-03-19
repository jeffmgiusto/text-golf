export function Footer({ children }: { children?: React.ReactNode }) {
  return (
    <div className="mt-8 text-center text-[var(--text-dim)] text-xs">
      <div className="text-[var(--border)]">{'─'.repeat(40)}</div>
      <div className="mt-2">Data provided by SlashGolf API</div>
      {children}
    </div>
  );
}
