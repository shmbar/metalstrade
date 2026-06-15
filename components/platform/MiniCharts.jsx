'use client';

import { useId } from 'react';

// Lightweight inline-SVG charts for the marketing landing page. The cards render
// static, decorative data, so pulling in a full charting library (recharts) just
// for them is overkill — this keeps the public landing bundle free of any chart
// dependency. The real, data-driven app charts (dashboard, accounting) use Chart.js.

const valuesOf = (data) => data.map((d) => (typeof d === 'number' ? d : d.value));

// Map a series to viewBox coordinates (0–100 on both axes). All series in one
// chart share a y-domain so their relative heights match (as recharts does).
const buildPoints = (values, min, max, padY) => {
  const n = values.length;
  const range = max - min || 1;
  return values.map((v, i) => [
    n === 1 ? 50 : (i / (n - 1)) * 100,
    100 - padY - ((v - min) / range) * (100 - 2 * padY),
  ]);
};

// Catmull-Rom spline → cubic bezier, approximating recharts' smooth (monotone)
// curves with a plain SVG path.
const smoothPath = (points) => {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
};

const hasFill = (fill) =>
  fill === true || (typeof fill === 'string' && fill !== 'transparent' && fill !== 'none');

// Area / line sparkline. Pass a single `data` series, or `series` for several
// overlaid lines sharing one y-domain.
export function Sparkline({
  data,
  series,
  stroke = 'var(--endeavour)',
  strokeWidth = 2.5,
  fill = false,
  gradientFrom,
  gradientFromOpacity = 0.2,
  gradientToOpacity = 0,
}) {
  const baseId = useId().replace(/:/g, '');
  const all = series || [
    { data, stroke, strokeWidth, fill, gradientFrom, gradientFromOpacity, gradientToOpacity },
  ];
  const allValues = all.flatMap((s) => valuesOf(s.data));
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {all.map((s, i) =>
          s.fill === true ? (
            <linearGradient key={i} id={`${baseId}-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.gradientFrom || s.stroke} stopOpacity={s.gradientFromOpacity ?? 0.2} />
              <stop offset="100%" stopColor={s.gradientFrom || s.stroke} stopOpacity={s.gradientToOpacity ?? 0} />
            </linearGradient>
          ) : null
        )}
      </defs>
      {all.map((s, i) => {
        const sw = s.strokeWidth ?? 2.5;
        const pts = buildPoints(valuesOf(s.data), min, max, sw + 2);
        const line = smoothPath(pts);
        const area = `${line} L 100 100 L 0 100 Z`;
        const fillVal = s.fill === true ? `url(#${baseId}-${i})` : s.fill;
        return (
          <g key={i}>
            {hasFill(s.fill) && <path d={area} fill={fillVal} stroke="none" />}
            <path
              d={line}
              fill="none"
              stroke={s.stroke || 'var(--endeavour)'}
              strokeWidth={sw}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </g>
        );
      })}
    </svg>
  );
}

// Pie / donut from N segments. innerRadius 0 → solid pie; >0 → donut ring.
// Radii are in viewBox units (0–50). Starts at the top, sweeps clockwise.
export function Donut({ segments, innerRadius = 0, outerRadius = 48 }) {
  const r = (innerRadius + outerRadius) / 2;
  const sw = outerRadius - innerRadius || outerRadius;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let acc = 0;

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100">
      <g transform="rotate(-90 50 50)">
        {segments.map((seg, i) => {
          const len = (seg.value / total) * C;
          const node = (
            <circle
              key={i}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={sw}
              strokeDasharray={`${len} ${C - len}`}
              strokeDashoffset={-acc}
            />
          );
          acc += len;
          return node;
        })}
      </g>
    </svg>
  );
}
