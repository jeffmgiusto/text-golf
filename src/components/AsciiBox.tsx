import { borderTop, borderBottom, borderMid } from '@/lib/ascii';

// Wraps children in ASCII top/bottom borders
export function AsciiBox({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="text-[var(--border)]">{borderTop()}</div>
      {children}
      <div className="text-[var(--border)]">{borderBottom()}</div>
    </div>
  );
}

// Renders content between │...│ using CSS width to eliminate manual padding
export function AsciiRow({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-[var(--border)] ${className}`}>
      │<span className="inline-block w-[64ch] overflow-hidden">{' '}{children}</span>│
    </div>
  );
}

// Renders a mid-border divider ├─┤
export function AsciiDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`text-[var(--border)] ${className}`}>{borderMid()}</div>
  );
}
