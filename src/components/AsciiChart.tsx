interface AsciiChartProps {
  title: string;
  data: Array<{ x: number; y: number }>;
  formatY?: (v: number) => string;
}

export function AsciiChart({ title, data, formatY }: AsciiChartProps) {
  if (data.length === 0) {
    return (
      <div className="font-mono text-sm text-[var(--text-dim)]">
        {title}: No data available
      </div>
    );
  }

  const PLOT_WIDTH = 52;
  const ROWS = 13;
  const LABEL_WIDTH = 6;

  const format = formatY || ((v: number) => String(v));

  const sortedData = [...data].sort((a, b) => a.x - b.x);
  const minX = sortedData[0].x;
  const maxX = sortedData[sortedData.length - 1].x;
  const yValues = sortedData.map((d) => d.y);
  let minY = Math.min(...yValues);
  let maxY = Math.max(...yValues);

  // Handle single value or all-same-value
  if (minY === maxY) {
    minY = minY - 2;
    maxY = maxY + 2;
  }

  // Add small padding to Y range
  const yRange = maxY - minY;
  const yPad = Math.max(1, Math.ceil(yRange * 0.1));
  minY -= yPad;
  maxY += yPad;

  // Map data to grid positions
  const xSpan = maxX - minX || 1;
  const ySpan = maxY - minY;

  const points = sortedData.map((d) => ({
    col: Math.round(((d.x - minX) / xSpan) * (PLOT_WIDTH - 1)),
    row: Math.round(((maxY - d.y) / ySpan) * (ROWS - 1)),
    x: d.x,
    y: d.y,
  }));

  // Build point lookup: row -> col -> point
  const pointMap = new Map<string, { x: number; y: number }>();
  for (const p of points) {
    pointMap.set(`${p.row},${p.col}`, { x: p.x, y: p.y });
  }

  // Build chart lines
  type Segment = { text: string; color: string; label?: string; labelBelow?: boolean };
  const lines: Array<{ label: string; segments: Segment[] }> = [];

  // Title
  lines.push({
    label: '',
    segments: [{ text: `  ${title}`, color: 'var(--text)' }],
  });
  lines.push({ label: '', segments: [{ text: '', color: '' }] });

  // Plot rows
  for (let r = 0; r < ROWS; r++) {
    const segments: Segment[] = [];
    segments.push({ text: ' '.repeat(LABEL_WIDTH) + ' ', color: '' });
    segments.push({ text: '│', color: 'var(--border)' });

    // Build row content character by character
    let rowSegments: Segment[] = [];
    let currentText = '';
    let currentColor = 'var(--border)';

    for (let c = 0; c < PLOT_WIDTH; c++) {
      const key = `${r},${c}`;
      const point = pointMap.get(key);
      if (point) {
        if (currentText) {
          rowSegments.push({ text: currentText, color: currentColor });
          currentText = '';
        }
        rowSegments.push({ text: '●', color: 'var(--green)', label: format(point.y), labelBelow: r === 0 });
      } else {
        const char = ' ';
        if (currentColor !== 'var(--border)') {
          if (currentText) {
            rowSegments.push({ text: currentText, color: currentColor });
            currentText = '';
          }
          currentColor = 'var(--border)';
        }
        currentText += char;
      }
    }
    if (currentText) {
      rowSegments.push({ text: currentText, color: currentColor });
    }

    segments.push(...rowSegments);
    lines.push({ label: '', segments });
  }

  // X-axis
  const axisSegments: Segment[] = [];
  axisSegments.push({ text: ' '.repeat(LABEL_WIDTH) + ' ', color: '' });
  axisSegments.push({ text: '└' + '─'.repeat(PLOT_WIDTH), color: 'var(--border)' });
  lines.push({ label: '', segments: axisSegments });

  // X-axis labels
  const xLabelLine = new Array(PLOT_WIDTH).fill(' ');
  for (const p of points) {
    const label = `'${String(p.x).slice(-2)}`;
    const startCol = Math.min(p.col, PLOT_WIDTH - label.length);
    if (startCol >= 0) {
      for (let i = 0; i < label.length; i++) {
        xLabelLine[startCol + i] = label[i];
      }
    }
  }
  const xLabelSegments: Segment[] = [];
  xLabelSegments.push({ text: ' '.repeat(LABEL_WIDTH + 1) + ' ', color: '' });
  xLabelSegments.push({ text: xLabelLine.join(''), color: 'var(--text-dim)' });
  lines.push({ label: '', segments: xLabelSegments });

  return (
    <div className="font-mono text-sm leading-tight">
      {lines.map((line, i) => (
        <div key={i} className="whitespace-pre">
          {line.segments.map((seg, j) =>
            seg.label != null ? (
              <span key={j} style={{ position: 'relative', color: seg.color }}>
                {seg.text}
                <span
                  style={{
                    position: 'absolute',
                    fontSize: '0.55em',
                    color: 'var(--text-dim)',
                    whiteSpace: 'nowrap',
                    pointerEvents: 'none',
                    lineHeight: 1,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    ...(seg.labelBelow
                      ? { top: '100%' }
                      : { bottom: '100%' }),
                  }}
                >
                  {seg.label}
                </span>
              </span>
            ) : (
              <span key={j} style={seg.color ? { color: seg.color } : undefined}>
                {seg.text}
              </span>
            )
          )}
        </div>
      ))}
    </div>
  );
}
