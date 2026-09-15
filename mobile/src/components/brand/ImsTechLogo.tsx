import React, { useId } from 'react';
import Svg, { Defs, LinearGradient, Stop, Path, Rect, G } from 'react-native-svg';

/*
 * The IMS Tech wordmark — public/logo/imsTech.svg, the mark the web sign-in and footer
 * use, as native SVG. The source styles its letterforms through CSS classes and makes
 * six gradients inherit their stops from a seventh via xlink:href; react-native-svg
 * supports neither, so each gradient carries the shared stops itself and every shape
 * takes its fill directly. Geometry and colours are unchanged.
 */

const INK = '#29235c';
const STOPS: [string, string][] = [
  ['0.07', '#1e0f49'],
  ['0.5', '#006db6'],
  ['1', '#1a093e'],
];

// [gradient vector, letterform path] — in the source's paint order.
const MARKS: { g: [number, number, number, number]; d: string }[] = [
  { g: [89.57, 141.78, 89.57, 309.28], d: 'M68.07,150.85v139h43v-139Z' },
  { g: [71.82, 334.32, 93.31, 196.32], d: 'M68.07,150.85v139h43Z' },
  {
    g: [249.98, 141.78, 249.98, 309.28],
    d: 'M342.74,167.71c-3.77-12.9-13.32-19.14-24.12-19.14-11.19,0-18.68,5.82-23.67,14.76l-22.22,39.46c-12.25,21.42-17.65,31.58-22.22,41.36-4.79-9.78-10.2-20.17-22.45-41.55l-22.22-39.27c-5-9.13-12.48-14.76-23.47-14.76-10.81,0-20.59,6.24-24.32,19.14L122.14,289.85h42.15l13.09-48.4c4.15-15.6,7.27-27.21,9.36-38.24,4.34,9.36,9.32,19.14,19.52,38.24l18.68,35.08c7.27,13.73,14.35,15.6,24.73,15.6s17.47-1.87,24.74-15.6l3.84-7.19,14.84-27.7c9.55-18.07,14.76-28.65,19.33-38.43,2.28,11.22,5.17,22.45,9.55,38.24l13.08,48.4h42.77Z',
  },
  {
    g: [445.46, 141.78, 445.46, 309.28],
    d: 'M479.8,206.33H404.16c-10,0-14.72-2.7-14.72-9.74a13.13,13.13,0,0,1,.19-2.28,6.49,6.49,0,0,1,.19-.84c0-.19.11-.38.15-.53,1.56-4.34,6.2-5.94,14.19-5.94h96.42l27.62-36.15H407.51c-23.32,0-39.11,5.22-48.51,14.35l19,66.2A85.61,85.61,0,0,0,400,234h75.6c10.19,0,14.76,2.93,14.76,10,0,7.27-4.57,10.2-14.76,10.2H384.53l10.23,35.73h77.55c42.38,0,59.62-17.05,59.62-45.51C531.93,219,513.67,206.33,479.8,206.33Z',
  },
  {
    g: [314.17, 283.09, 314.17, 134.31],
    d: 'M377.82,289.85H335.05L322,241.45c-4.38-15.79-7.27-27-9.55-38.24-4.57,9.78-9.78,20.36-19.33,38.43l-14.84,27.7c-10.39,10-27.74-25.19-27.74-25.19,4.57-9.78,10-19.94,22.22-41.36L295,163.33c5-8.94,12.48-14.76,23.67-14.76,10.8,0,20.35,6.24,24.12,19.14Z',
  },
  {
    g: [437.51, 230.82, 437.51, 358.32],
    d: 'M443.31,289.85H394.76l-10.23-35.73h91.09c10.19,0,14.76-2.93,14.76-10.2C490.38,243.92,495,282.77,443.31,289.85Z',
  },
  {
    g: [452.33, 201.61, 457.91, 105.95],
    d: 'M523.24,150.85,500.58,187H404.16c-13.29,0-18,1.75-19.3,6.47,1.22-5.14,14.62-32.19,59.86-42.62Z',
  },
];

// The "TECH" lettering under the rule, in its source transforms.
const TECH = [
  { t: 'translate(-142.25 0)', d: 'M149.66,329.39h-7.41v-2.73H160.2v2.73h-7.42v21.84h-3.12Z' },
  { t: 'translate(-76.77 0)', d: 'M110.72,326.66h15.61v2.73H113.84v7.8h11.51v2.73H113.84v8.58h12.88v2.73h-16Z' },
  { t: undefined, d: 'M86.013,330.609A11.51,12.48 0 1 0 86.013,347.311L83.695,345.484A8.39,9.75 0 1 1 83.695,332.436Z' },
  { t: undefined, d: 'M102.01,326.66h3.12v10.53h13.26v-10.53h3.12v24.57h-3.12v-11.31h-13.26v11.31h-3.12Z' },
];

const VIEW_W = 484;
const VIEW_H = 250;

export function ImsTechLogo({
  width = 140,
  tone = 'brand',
}: {
  width?: number;
  /** 'brand' — the gradient wordmark; 'light' — solid white, for dark or photographic grounds. */
  tone?: 'brand' | 'light';
}) {
  // Gradient ids are document-global on some platforms: namespace them per instance.
  const ns = useId().replace(/[^a-zA-Z0-9]/g, '');
  const solid = tone === 'light' ? '#ffffff' : null;

  return (
    <Svg
      width={width}
      height={(width * VIEW_H) / VIEW_W}
      viewBox={`58 124 ${VIEW_W} ${VIEW_H}`}
      accessibilityRole="image"
      accessibilityLabel="IMS Tech"
    >
      {!solid && (
        <Defs>
          {MARKS.map((m, i) => (
            <LinearGradient
              key={i}
              id={`${ns}g${i}`}
              x1={m.g[0]}
              y1={m.g[1]}
              x2={m.g[2]}
              y2={m.g[3]}
              gradientUnits="userSpaceOnUse"
            >
              {STOPS.map(([offset, color]) => (
                <Stop key={offset} offset={offset} stopColor={color} />
              ))}
            </LinearGradient>
          ))}
        </Defs>
      )}
      {MARKS.map((m, i) => (
        <Path key={i} d={m.d} fill={solid ?? `url(#${ns}g${i})`} />
      ))}
      <Rect x={68.07} y={308.24} width={463.86} height={1.45} fill={solid ?? INK} />
      <G fill={solid ?? INK} transform="translate(208.87 -163.33) scale(1.5)">
        {TECH.map((p, i) => (
          <Path key={i} d={p.d} transform={p.t} />
        ))}
      </G>
    </Svg>
  );
}
