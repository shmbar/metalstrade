
'use client';
import { useContext, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { cssVar, cssVarRgba, CHART_ACCENT, brandRamp } from '../../../utils/chartTheme';
import { useTheme } from '../../../contexts/useThemeContext';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import VideoLoader from '@components/videoLoader';
import { CardsSkeleton } from "@components/skeletons";
import { UserAuth } from "@contexts/useAuthContext"
import { SettingsContext } from "@contexts/useSettingsContext";
import Toast from '@components/toast.js'
import { loadData, buildInvoiceIndex, contractInvoicesFromIndex, loadCompanyExpenses } from '@utils/utils'
import { receivables as financeReceivables, agingBuckets } from '@utils/finance'
import { setMonthsInvoices, calContracts } from './funcs'
import { getTtl } from '@utils/languages';
import DateRangePicker from '@components/dateRangePicker';
import TooltipComp from '@components/tooltip';
import Tltip from '@components/tlTip';
// MarketsTicker pulls in ~250 inlined flag images (react-world-flags); load it
// off the first-paint critical path so it doesn't bloat the dashboard bundle.
const MarketsTicker = dynamic(() => import('@components/Dashboard/MarketsTicker'), { ssr: false });
import AIAlertsBar from '@components/Dashboard/AIAlertsBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { TONES } from '@components/statusUtils';
import ProgressBar from '@components/ProgressBar';
import Avatar from '@components/Avatar';
import Modal from '@components/modal';
import { BtnIcon } from '@components/buttonIcons';
import { Gauge, Receipt, Percent, Truck, Warehouse, TrendingUp, FileWarning, Ship, Building2, Info } from 'lucide-react';

import { HorizontalBar } from './charts';

// chart.js + react-chartjs-2 are loaded on demand (not in the first-load bundle).
const Line = dynamic(() => import('./LazyCharts').then((mod) => mod.Line), { ssr: false });
const Doughnut = dynamic(() => import('./LazyCharts').then((mod) => mod.Doughnut), { ssr: false });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmtMoney = (n, decimals = 2) => {
  const num = typeof n === "string"
    ? Number(n.replace(/[^0-9.-]+/g, ""))
    : Number(n);

  if (!Number.isFinite(num)) return (0).toFixed(decimals);

  return num.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

const fmtK = (n, decimals = 2) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return `$0.00K`;
  return `$${fmtMoney(num / 1000, decimals)}K`;
};

const fmtAutoKM = (n, decimals = 2) => {
  const num = Number(n);
  if (!Number.isFinite(num)) return "$0";

  if (Math.abs(num) >= 1_000_000) {
    return `$${fmtMoney(num / 1_000_000, decimals)}M`;
  }

  if (Math.abs(num) >= 1_000) {
    return `$${fmtMoney(num / 1_000, decimals)}K`;
  }

  return `$${fmtMoney(num, decimals)}`;
};

const sumObj = (obj) => Object.values(obj || {}).reduce((a, v) => a + (Number(v) || 0), 0);

function CardShell({ className = "", children }) {
  return (
    <m.div
      className={`bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card ${className}`}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {children}
    </m.div>
  );
}

function SectionHeader({ title, subtitle, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h3 className="responsiveTextTitle font-semibold font-sans text-[var(--chathams-blue)]">{title}</h3>
        {subtitle && <p className="responsiveTextTable text-[var(--regent-gray)] mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

// Month-over-month delta from a monthly series: compares the latest non-zero
// month to the most recent prior month that has data. Returns null when there
// isn't enough data to compute a meaningful change.
function computeTrend(series) {
  if (!Array.isArray(series) || series.length < 2) return null;
  let last = -1;
  for (let i = series.length - 1; i >= 0; i--) {
    if (Number.isFinite(series[i]) && series[i] !== 0) { last = i; break; }
  }
  if (last <= 0) return null;
  let prev = -1;
  for (let i = last - 1; i >= 0; i--) {
    if (Number.isFinite(series[i])) { prev = i; break; }
  }
  if (prev < 0) return null;
  const before = series[prev];
  if (!before) return null;
  const pct = ((series[last] - before) / Math.abs(before)) * 100;
  if (!Number.isFinite(pct)) return null;
  return { pct, up: pct >= 0 };
}

/* `accent` may arrive as a token (`var(--ok-text)`) or a literal (`#0ea5e9`).
 * Two things downstream cannot cope with a token:
 *   - canvas (chart.js) has no CSS parser, so `var()` is not a colour
 *   - the old `${accent}1A` trick appends hex-alpha digits, which yields
 *     `var(--ok-text)1A` — invalid CSS, so the tint silently disappears
 * Six of the eight call sites were already passing tokens BEFORE this audit, so
 * both bugs predate it; the audit added two more by tokenising the last literals.
 * Resolving to a real colour here fixes all eight. */
const solidColor = (c) =>
  typeof c === 'string' && c.startsWith('var(')
    ? cssVar(c.slice(4, -1).trim(), '#2563eb')
    : c;

/* ── Business summary tile ────────────────────────────────────────────────────
   Client revision 2026-08-08: "business summaries, not big charts."

   Deliberately flat — a label, a figure and one line of context. No sparkline,
   no trend pill, no icon tile. Those belong on StatKpiCard, which stays for the
   four headline metrics; repeating them eight more times is how a dashboard
   turns into decoration. Every figure here comes from an aggregate that already
   existed on this page (calContracts / setMonthsInvoices / utils/finance), so a
   card can never disagree with the page it sits on.

   `note` is not optional-by-accident: each tile says which basis it is on
   (period, sold, outstanding), because "Expenses" and "Profit" are exactly the
   words that mean three different things to three different people. */
/* Each tile carries a tone, and the tone lands on the ICON only — a soft tinted
   square with the icon in the strong tone. The figure itself stays ink unless it
   is genuinely signed (loss, overdue, incomplete), so colour keeps meaning
   something instead of decorating eight tiles at once. .kpi-card gives the hover
   lift and resting shadow every other card on the page already has. */
/* A CELL, not a card. The eight tiles sit inside one panel separated by
   hairlines (see the render below) instead of being eight bordered boxes — that
   was 24 competing edges for 8 numbers, which is why the strip read as plain.
   Hover tints the cell rather than lifting it, since it no longer floats.

   `progress` and `chip` are optional and used exactly once each: a bar under the
   shipment percentage (the one figure here with a natural visual form), and a
   red chip for the overdue count, which is the most actionable number on the row
   and was previously 9.5px grey, indistinguishable from "freight expense types". */
function SummaryTile({ label, value, note, tone, icon: Icon, toneKey = 'gray', progress, progressTone, chip, info }) {
  const t = TONES[toneKey] || TONES.gray;
  const tile = (
    <div className="bg-[var(--bg-card)] p-3 flex flex-col gap-2 min-w-0 hover:bg-[var(--bg-subtle)] transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className="w-6 h-6 rounded-control flex items-center justify-center shrink-0"
          style={{ background: t.bg, color: t.text }}
          aria-hidden
        >
          {Icon ? <Icon size={13} strokeWidth={2} /> : null}
        </span>
        <span className="text-caption truncate" title={info ? undefined : label}>{label}</span>
        {info && <Info size={11} strokeWidth={2} className="shrink-0 text-[var(--ink-muted)]" aria-hidden />}
      </div>
      {/* Native `title` ONLY when this tile has no info tooltip. A tile with `info` is
          wrapped in <Tltip> below, and a browser title inside it fires as well — two
          tooltips, one styled and one the OS default, which is the double popup on
          Company Expenses. Same guard the label above already uses. */}
      <span
        className="numeric leading-none truncate"
        style={{ fontSize: 'var(--fs-stat)', color: tone || 'var(--ink)' }}
        title={!info && typeof value === 'string' ? value : undefined}
      >
        {value}
      </span>
      {progress != null && <ProgressBar value={progress} tone={progressTone} />}
      {(note || chip) && (
        <div className="flex items-center gap-1.5 min-w-0">
          {chip && (
            <span
              className="rounded-full px-1.5 font-semibold shrink-0"
              style={{ fontSize: 'var(--fs-caption)', background: TONES.red.bg, color: TONES.red.text }}
            >
              {chip}
            </span>
          )}
          {note && (
            <span className="text-[var(--ink-muted)] leading-tight truncate" style={{ fontSize: 'var(--fs-caption)' }} title={info ? undefined : note}>
              {note}
            </span>
          )}
        </div>
      )}
    </div>
  );
  /* Every figure on this page now carries the definition it is computed from — the
     labels alone were ambiguous ("Expenses" reads as all expenses when it means
     contract expenses, "Profit" reads as net when it is before overheads). */
  return info ? <Tltip direction="top" tltpText={info}>{tile}</Tltip> : tile;
}

function StatKpiCard({
  title,
  value,
  chartData,
  accent = 'var(--brand)',
  icon,
  goodWhenUp = true,
  info,
}) {
  const series = useMemo(
    () => (Array.isArray(chartData) ? chartData : Object.values(chartData || {})).map(Number),
    [chartData]
  );
  const trend = useMemo(() => computeTrend(series), [series]);
  const good = trend ? trend.up === goodWhenUp : true;
  const deltaColor = good ? 'var(--ok-text)' : 'var(--bad-text)';
  const deltaBg = good ? 'var(--ok-bg)' : 'var(--bad-bg)';

  return (
    <m.div
      className="relative h-full min-h-[140px] rounded-2xl bg-[var(--bg-card)] border border-[var(--line)] shadow-card flex flex-col overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="p-3 flex flex-col h-full">
        {/* Icon tile + title */}
        <div className="flex items-center gap-2">
          {icon && (
            <span
              className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${accent} 10%, transparent)`, color: accent, width: 30, height: 30 }}
            >
              {icon}
            </span>
          )}
          <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">
            {title}
          </span>
          {info && (
            <Tltip direction="top" tltpText={info}>
              <span className="shrink-0 cursor-help text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors">
                <Info size={12} strokeWidth={2} />
              </span>
            </Tltip>
          )}
        </div>

        {/* Hero number */}
        <div
          className="mt-2 font-semibold text-[var(--port-gore)] leading-none"
          style={{ fontSize: 'var(--fs-stat)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}
        >
          {value}
        </div>

        {/* Trend delta */}
        <div className="mt-1.5 flex items-center gap-1.5" style={{ minHeight: 16 }}>
          {trend && (
            <>
              <span
                className="inline-flex items-center gap-0.5 rounded-lg px-1.5 py-0.5 font-semibold"
                style={{ background: deltaBg, color: deltaColor, fontSize: 'var(--fs-table)' }}
              >
                {trend.up ? '▲' : '▼'} {Math.abs(trend.pct).toFixed(1)}%
              </span>
              <span className="text-[var(--regent-gray)]" style={{ fontSize: 'var(--fs-caption)' }}>vs prev mo</span>
            </>
          )}
        </div>

        {/* Sparkline */}
        <div className="mt-auto h-7 -mx-1">
          <Line
            data={{
              labels: series.slice(0, 12).map((_, i) => i),
              datasets: [{
                data: series.slice(0, 12),
                borderColor: solidColor(accent),
                backgroundColor: `color-mix(in srgb, ${solidColor(accent)} 12%, transparent)`,
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                fill: true,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
                tooltip: { enabled: false }
              },
              scales: {
                x: { display: false },
                y: { display: false }
              }
            }}
          />
        </div>
      </div>
    </m.div>
  );
}

// Outstanding receivables split by shipment finalization. "Finalized" = the
// final invoice has been issued (shipData.fnlzing === '4568'); "Provisional" =
// balances still before the final invoice. Lets the team see, at a glance, how
// much of what's owed is locked-in vs still subject to final-invoice changes.
function ReceivablesSplitCard({ byCur = {} }) {
  // Currency-aware compact formatter — never sums across currencies.
  const fmtCurKM = (cur, n) => {
    const s = cur === 'us' ? '$' : cur === 'eu' ? '€' : '';
    const num = Number(n) || 0;
    const a = Math.abs(num);
    if (a >= 1e6) return `${s}${(num / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}${(num / 1e3).toFixed(2)}K`;
    return `${s}${num.toFixed(2)}`;
  };

  const curs = Object.keys(byCur).filter(c => {
    const d = byCur[c];
    return (d.finalized + d.provisional) > 0.005 || (d.finalizedCount + d.provisionalCount) > 0;
  });
  const finCount = curs.reduce((s, c) => s + byCur[c].finalizedCount, 0);
  const provCount = curs.reduce((s, c) => s + byCur[c].provisionalCount, 0);
  const totalCount = finCount + provCount;
  // Proportion bar is by invoice COUNT (currency-agnostic), so amounts in different
  // currencies are never added together.
  const pctFinal = totalCount > 0 ? (finCount / totalCount) * 100 : 0;

  const totalsLine = curs.length
    ? curs.map(c => fmtCurKM(c, byCur[c].finalized + byCur[c].provisional))
    : ['$0.00'];
  const amountsFor = (key) => {
    const list = curs.filter(c => byCur[c][key] > 0.005).map(c => fmtCurKM(c, byCur[c][key]));
    return list.length ? list : ['$0.00'];
  };

  return (
    <m.div
      className="relative rounded-2xl bg-[var(--bg-card)] border border-[var(--line)] shadow-card overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'color-mix(in srgb, var(--brand) 10%, transparent)', color: 'var(--brand)', width: 30, height: 30 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 7h18v10H3z" stroke="currentColor" strokeWidth="2" /><path d="M3 11h18" stroke="currentColor" strokeWidth="2" /></svg>
            </span>
            <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Outstanding Receivables</span>
          </div>
          <div className="text-right flex-shrink-0">
            {totalsLine.map((t, i) => (
              <div key={i} className="font-semibold text-[var(--port-gore)] leading-tight" style={{ fontSize: 'var(--fs-substat)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{t}</div>
            ))}
          </div>
        </div>

        {/* Proportion bar by invoice count. Finalized vs provisional is a STAGE — an
            invoice before or after its final version — not good vs caution, and the tan
            track under a green fill was the harshest pairing on the page. One hue, two
            steps: filled = finalized, track = the rest still to come. */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ok-bg)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pctFinal}%`, backgroundColor: 'var(--ok-text)' }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--ok-bg)', boxShadow: 'inset 0 0 0 1px var(--ok-border)' }}>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: 'var(--ok-text)' }} />
              <span className="responsiveTextTable font-semibold tracking-wide" style={{ color: 'var(--ok-text)' }}>FINALIZED</span>
            </div>
            <div className="mt-1 leading-tight" style={{ color: 'var(--ok-text)' }}>
              {amountsFor('finalized').map((a, i) => (
                <div key={i} className="font-semibold" style={{ fontSize: 'var(--fs-substat)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{a}</div>
              ))}
            </div>
            <div className="responsiveTextTableTitle text-[var(--regent-gray)] mt-1">{finCount} invoice{finCount === 1 ? '' : 's'} · after final invoice</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ backgroundColor: 'var(--bg-subtle)', boxShadow: 'inset 0 0 0 1px var(--line-strong)' }}>
            <div className="flex items-center gap-1.5">
              <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: 'var(--ink-muted)' }} />
              <span className="responsiveTextTable font-semibold tracking-wide" style={{ color: 'var(--ink-secondary)' }}>PROVISIONAL</span>
            </div>
            <div className="mt-1 leading-tight" style={{ color: 'var(--ink-secondary)' }}>
              {amountsFor('provisional').map((a, i) => (
                <div key={i} className="font-semibold" style={{ fontSize: 'var(--fs-substat)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{a}</div>
              ))}
            </div>
            <div className="responsiveTextTableTitle text-[var(--regent-gray)] mt-1">{provCount} invoice{provCount === 1 ? '' : 's'} · before final invoice</div>
          </div>
        </div>
      </div>
    </m.div>
  );
}

// Share of a total, as a string. Anything that would round to 0% but isn't zero
// says "<0.1%" — a row that exists should never read as nothing.
const fmtPct = (p) => {
  if (!Number.isFinite(p) || p <= 0) return '0%';
  if (p < 0.1) return '<0.1%';
  return `${p.toFixed(p < 10 ? 1 : 0)}%`;
};

/* The rows behind one "Expenses by Type" tile — which suppliers the spend went to, on
   which PO, for how much. The tile used to be a dead end: it told you Commission was
   $315.67K and gave you nowhere to go with that.
   Grouped by supplier rather than listed flat, because "which companies" is the question
   being asked; each group opens to its individual PO lines. Rows come from the same pass
   that built the tile's total, so the figures cannot disagree. */
function ExpenseDrillModal({ label, rows = [], settings, isOpen, setIsOpen }) {
  const supplierName = (id) => settings?.Supplier?.Supplier?.find(s => s.id === id)?.nname || 'Unknown supplier';
  const groups = useMemo(() => {
    const by = {};
    rows.forEach(r => {
      const name = supplierName(r.supplier);
      (by[name] ||= { name, total: 0, lines: [] });
      by[name].total += Number(r.usd) || 0;
      by[name].lines.push(r);
    });
    return Object.values(by)
      .map(g => ({ ...g, lines: g.lines.sort((a, b) => (b.usd || 0) - (a.usd || 0)) }))
      .sort((a, b) => b.total - a.total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, settings]);
  const total = groups.reduce((a, g) => a + g.total, 0);
  const curSym = (c) => (c === 'us' ? '$' : c === 'eu' ? '€' : c === 'gb' ? '£' : '');

  return (
    <Modal isOpen={isOpen} setIsOpen={setIsOpen} size="lg"
      title={label || 'Expenses'}
      subtitle={`${rows.length} expense${rows.length === 1 ? '' : 's'} across ${groups.length} supplier${groups.length === 1 ? '' : 's'} · ${fmtAutoKM(total)}`}>
      <div className="p-4 flex flex-col gap-3">
        {groups.length === 0
          ? <div className="responsiveText text-[var(--regent-gray)] py-6 text-center">No expenses of this type in the period</div>
          : groups.map(g => (
            <div key={g.name} className="rounded-2xl border border-[var(--line)] overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-3 py-2 bg-[var(--bg-subtle)]">
                <span className="flex items-center gap-1.5 min-w-0">
                  <Avatar name={g.name} size={18} />
                  <span className="responsiveTextTable font-semibold text-[var(--ink)] truncate">{g.name}</span>
                  <span className="responsiveTextTableTitle text-[var(--regent-gray)] flex-shrink-0">
                    · {g.lines.length} line{g.lines.length === 1 ? '' : 's'}
                  </span>
                </span>
                <span className="responsiveTextTable numeric font-semibold text-[var(--ink)] flex-shrink-0">{fmtAutoKM(g.total)}</span>
              </div>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="responsiveTextTableTitle text-left text-[var(--regent-gray)] font-medium px-3 py-1">PO</th>
                    <th className="responsiveTextTableTitle text-left text-[var(--regent-gray)] font-medium px-3 py-1">Date</th>
                    <th className="responsiveTextTableTitle text-right text-[var(--regent-gray)] font-medium px-3 py-1">As entered</th>
                    <th className="responsiveTextTableTitle text-right text-[var(--regent-gray)] font-medium px-3 py-1">USD</th>
                  </tr>
                </thead>
                <tbody>
                  {g.lines.map((r, i) => (
                    <tr key={i}>
                      <td className="responsiveTextTable px-3 py-1 text-[var(--ink-secondary)]">{r.order || '—'}</td>
                      <td className="responsiveTextTable px-3 py-1 text-[var(--ink-secondary)]">{r.date || '—'}</td>
                      {/* "As entered" is shown beside the USD figure so a EUR expense is
                          visibly a EUR expense — the page converts everything to USD and
                          that conversion is exactly where the FX warning above bites. */}
                      <td className="responsiveTextTable numeric px-3 py-1 text-right text-[var(--regent-gray)]">
                        {curSym(r.cur)}{new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(r.amount || 0)}
                      </td>
                      <td className="responsiveTextTable numeric px-3 py-1 text-right text-[var(--ink)]">{fmtAutoKM(r.usd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
    </Modal>
  );
}

/* A labelled band of the dashboard, stating the window its cards actually cover.
   This page shows THREE different windows at once — contracts DATED in the period,
   invoices DATED in the period, and open balances AS OF TODAY — and until this went in,
   nothing on screen said which was which. That is what made a correct page read as a
   broken one: receivables not moving when you change the date picker looks like a bug
   right up until the card admits it has no period of its own. */
function BandHeader({ title, subtitle, period, muted = false, open, onToggle }) {
  const collapsible = typeof onToggle === 'function';
  const Title = collapsible ? 'button' : 'div';
  return (
    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
      <Title
        {...(collapsible ? { type: 'button', onClick: onToggle, 'aria-expanded': open } : {})}
        className={`min-w-0 text-left ${collapsible ? 'cursor-pointer group' : ''}`}
      >
        <h3 className="text-title text-[var(--ink)] flex items-center gap-1.5">
          {collapsible && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0 transition-transform"
              style={{ transform: open ? undefined : 'rotate(-90deg)' }} aria-hidden="true">
              <path d="M6 9l6 6 6-6" stroke="var(--ink-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {title}
        </h3>
        {subtitle && <p className="responsiveTextTable text-[var(--regent-gray)] mt-0.5">{subtitle}</p>}
      </Title>
      <span
        className="responsiveTextTableTitle rounded-lg px-2 py-1 flex-shrink-0 border font-medium"
        style={{
          background: muted ? 'var(--bg-subtle)' : 'var(--brand-soft)',
          borderColor: muted ? 'var(--line-strong)' : 'var(--brand-border)',
          color: muted ? 'var(--ink-secondary)' : 'var(--brand-strong)',
        }}
      >
        {period}
      </span>
    </div>
  );
}

/* 12-month trend for one ranking tile. Inline SVG — no library, no canvas; there are up
   to 17 of these on screen and each is 12 points.
   The series is trimmed to the last month with data ACROSS the card, not per tile, so
   every sparkline in a card shares one x-domain and their shapes are comparable. Without
   that trim each line would dive to zero at December of a year still in progress — a
   cliff that is an artefact of the calendar, not of the trade. */
function Sparkline({ series = [], accent = 'var(--brand)', w = 46, h = 15 }) {
  const vals = (series || []).map(v => Number(v) || 0);
  const max = Math.max(...vals, 0);
  if (vals.length < 2 || !(max > 0)) return null;
  const step = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - 1.5 - (v / max) * (h - 3)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    // aria-hidden: the figure and the share beside it already state the value in text.
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true" className="flex-shrink-0 overflow-visible">
      <path d={d} fill="none" stroke="var(--ink-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
      {/* Latest month in the accent — the de-emphasised line carries the shape, one
          dot says where "now" is. */}
      <circle cx={lx} cy={ly} r="2" fill={accent} />
    </svg>
  );
}

// One breakdown/ranking entry as a card tile.
/* These entries used to be bar ROWS: a grey track, a fill scaled to value/max,
   and the share printed inside the fill. Zak asked for cards instead
   (2026-08-17), and the cards are right — but that swap dropped the bar's
   LENGTH, which was the only thing separating a 74% supplier from a 0.3% one at
   a glance. Forty-eight tiles of identical weight is what made the section read
   flat. The length is back as the tile's own background: a wash filling to
   value/max behind the text, so the tile IS the bar and the card layout stays.

   Scaled to the LEADER, not to the total — the standard ranked-bar convention.
   Against the total, one dominant entry (Shalex at 74%) leaves every other tile
   an indistinguishable sliver, which is the flatness this is meant to fix. The
   printed percentage still states the share of the whole, so nothing is lost.

   Two lines, not four. The first pass gave each tile a rank badge and an "of
   total" caption above the chip, and 40 tiles of that ran ~92px each — the card
   was taller than the bars it replaced, which defeats the point. Both went:
   the badge restated the reading order, and the caption labelled a percentage
   that cannot mean anything else. What is left is name / figure / share. */
function RankTile({ label, value, share, fill = 0, accent = 'var(--brand)', avatar = false, hero = false, delay = 0, series, onPick, picked = false, clamp = false }) {
  const pct = Math.max(0, Math.min(1, Number(fill) || 0)) * 100;
  /* Clickable tiles are real buttons, not divs with a handler — they are reached by Tab
     and fired by Enter/Space for free, which a div would have to reimplement badly.
     aria-label rather than title: the label span inside already owns the hover tooltip
     (it carries the full text when a name is truncated), and a second tooltip on the
     wrapper only fights it. */
  const Tag = onPick ? m.button : m.div;
  return (
    <Tag
      {...(onPick ? { type: 'button', onClick: onPick, 'aria-label': `Filter the dashboard by ${label}`, 'aria-pressed': picked } : {})}
      className={`relative overflow-hidden rounded-2xl border bg-[var(--bg-subtle)] px-2.5 py-2 flex flex-col gap-1 min-w-0 transition-colors ${hero ? 'col-span-2 xl:col-span-3' : ''} ${onPick ? 'text-left cursor-pointer hover:border-[var(--brand)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-soft)]' : 'hover:border-[var(--line-strong)]'} ${picked ? 'border-[var(--brand)]' : 'border-[var(--line)]'}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay, ease: 'easeOut' }}
    >
      {/* The meter. A wash at ~14% of the accent — a tint, never a saturated
          block, so ink on top keeps its contrast in both themes. Square at the
          baseline (the tile's own radius clips it), 4px rounded data-end.
          aria-hidden: the share beside it already states the value in text. */}
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 pointer-events-none"
        style={{
          width: `${pct}%`,
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          borderRadius: '0 4px 4px 0',
        }}
      />
      <div className="relative flex items-center gap-1.5 min-w-0">
        {/* Avatar — shared component, so these chips match the supplier / client
            chips in every table and follow the theme. Rows that aren't a party
            (expense types, materials) get the accent as a dot instead. */}
        {avatar
          ? <Avatar name={label} size={hero ? 22 : 18} />
          : <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: accent }} />}
        {/* Material descriptions are free-text spec strings ("62.47Ni 9.95Cr 9.04Co
            5.91W 10.03Fe 1.61Mo .08Cu…") that a single truncated line cut to
            uselessness. Two lines, with the row height reserved either way so a card
            of short names and long ones still has an even grid. */}
        <span
          className={`responsiveTextTable font-medium text-[var(--regent-gray)] ${clamp ? 'line-clamp-2 leading-tight' : 'truncate'}`}
          style={clamp ? { minHeight: 'calc(2 * 1.25em)' } : undefined}
          title={label}
        >{label}</span>
      </div>

      <div className="relative flex items-baseline justify-between gap-1.5 min-w-0">
        <span
          className={`${hero ? 'responsiveTextPage' : 'responsiveTextTitle'} numeric text-[var(--port-gore)] leading-none truncate`}
          title={value}
        >{value}</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <Sparkline series={series} accent={accent} w={hero ? 72 : 46} h={hero ? 18 : 15} />
          {/* Was a solid brand pill with white text. Forty-eight of those made the
              least important number on the card the loudest thing on the screen,
              and it put text in the data colour — which the mark beside it now
              carries instead. Quiet muted ink; the meter does the shouting. */}
          <span className="responsiveTextTableTitle numeric text-[var(--regent-gray)]">{share}</span>
        </span>
      </div>
    </Tag>
  );
}

/* Top N plus one "others" tile. A ranked list's tail is real information — the 68
   materials outside the top 8 are 48% of the tonnage — but it belongs as one row,
   not as a scrollbar the reader has to discover. Returns the visible slice and the
   folded remainder so both cards below fold identically. */
const TAIL_AFTER = 8;
function foldRows(rows, expanded) {
  if (rows.length <= TAIL_AFTER + 1) return { shown: rows, hidden: [], tail: 0 };
  const shown = expanded ? rows : rows.slice(0, TAIL_AFTER);
  const hidden = expanded ? [] : rows.slice(TAIL_AFTER);
  return { shown, hidden, tail: hidden.reduce((a, r) => a + (Number(r.value) || 0), 0) };
}

// The show-more / show-less control under a folded ranking list.
function FoldToggle({ expanded, onToggle, count, amount }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="col-span-2 xl:col-span-3 rounded-2xl border border-dashed border-[var(--line-strong)] bg-transparent px-2.5 py-1.5 flex items-center justify-center gap-1.5 transition-colors hover:bg-[var(--bg-subtle)]"
    >
      <span className="responsiveTextTable font-medium text-[var(--regent-gray)]">
        {expanded ? 'Show less' : `${count} more · ${amount}`}
      </span>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: expanded ? 'rotate(180deg)' : undefined }}>
        <path d="M6 9l6 6 6-6" stroke="var(--regent-gray)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// Two tiles at page-narrow, three once the card has room. Three is the widest
// that keeps a $37.02M figure on one line inside a half-width card.
const TILE_GRID = 'grid grid-cols-2 xl:grid-cols-3 gap-1.5';

// Ranking cards (Contracts / Consignees) — one tile per party.
function RankingListInner({ labels = [], data = [], title, subtitle, totalValue, series = {}, onPick, picked }) {
  /* Every tile used to take its own step off brandRamp(labels.length) — a shade
     per RANK. Two things were wrong with that. The ramp was fitted to the row
     COUNT, so applying a filter repainted every surviving tile and a reader who
     had learned "Shalex is the dark one" was misled. And rank is already carried
     by reading order, so the hue duplicated it rather than adding anything.
     One accent for the whole card now; magnitude rides the meter behind each
     tile, which is a length and can be compared. */
  const [expanded, setExpanded] = useState(false);
  /* Denominator for the printed share: the card's own total when it has one, so a
     folded list still states each share of the WHOLE rather than of the visible
     slice. The meter is scaled to the leader instead — see RankTile. */
  const sum = data.reduce((a, v) => a + (Number(v) || 0), 0);
  const denom = Number(totalValue) > 0 ? Number(totalValue) : sum;
  const rows = labels.map((label, idx) => ({ label, value: Number(data[idx]) || 0 }));
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  const { shown, hidden, tail } = foldRows(rows, expanded);
  /* One shared x-domain for every sparkline in the card: cut at the last month any
     entity traded. Per-tile trimming would give each line its own time axis and make
     two shapes side by side mean different things. */
  const lastMonth = Object.values(series).reduce((last, arr) => {
    for (let i = 11; i > last; i--) if ((arr?.[i] || 0) !== 0) return i;
    return last;
  }, 0);
  const trend = (label) => (series[label] || []).slice(0, lastMonth + 1);

  return (
    <CardShell>
      <div className="p-4">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          right={
            <div className="text-right flex-shrink-0">
              <div className="responsiveTextTable text-[var(--regent-gray)]">Total Value</div>
              <span className="responsiveTextPage font-semibold text-[var(--chathams-blue)]">{fmtAutoKM(totalValue)}</span>
            </div>
          }
        />

        {rows.length === 0
          ? <div className="responsiveText text-[var(--regent-gray)] py-3 text-center">No data for this period</div>
          : (
            <div className={TILE_GRID}>
              {shown.map((r, idx) => (
                <RankTile
                  key={`${r.label}-${idx}`}
                  label={r.label}
                  value={fmtAutoKM(r.value)}
                  share={fmtPct(denom > 0 ? (r.value / denom) * 100 : 0)}
                  fill={max > 0 ? r.value / max : 0}
                  /* Rank 1 spans the row. A ranking card that draws #1 and #12
                     identically wastes its most valuable slot — and when the
                     leader is 74% of the total, it IS the card's story. */
                  hero={idx === 0 && !expanded}
                  avatar
                  series={trend(r.label)}
                  onPick={onPick ? () => onPick(r.label) : undefined}
                  picked={picked === r.label}
                  delay={idx * 0.03}
                />
              ))}
              {hidden.length > 0 && (
                <FoldToggle expanded={false} onToggle={() => setExpanded(true)}
                  count={hidden.length} amount={fmtAutoKM(tail)} />
              )}
              {expanded && rows.length > TAIL_AFTER + 1 && (
                <FoldToggle expanded onToggle={() => setExpanded(false)} />
              )}
            </div>
          )}
      </div>
    </CardShell>
  );
}
const RankingList = RankingListInner;

// Per-MT unit economics — compact strip rendered right under the headline KPI
// cards, in their visual language: tinted icon chip (color-mix, like
// StatKpiCard) + dark hero number, so the two rows read as one family.
function PerMtStrip({ totalMT, avgExpensePerMT, avgProfitPerMT, avgFreightPerMT }) {
  /* Only the NEGATIVE case gets a colour. CLAUDE.md: "Signed amounts colour negatives
     only; a positive is the normal case in a ledger." A green profit figure spends the
     reader's attention confirming that the ordinary thing happened. */
  const negative = avgProfitPerMT < 0;
  const profitAccent = negative ? 'var(--danger-text)' : 'var(--ok-figure)';

  const metrics = [
    {
      // Tonnage purchased is a quantity, not a verdict — it was green for no reason.
      accent: 'var(--brand)',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M4 7.5l8 4.5 8-4.5M12 12v9" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
      ),
      value: `${new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(totalMT)} MT`,
      label: 'Total MT Purchased',
      sub: 'for selected period',
    },
    /* "Avg Cost / MT" was here. It is the same figure as the Average Rate tile
       in the Business Summary above, on the same screen — so it went the way of
       the three duplicated KPI cards. avgCostPerMT is still computed once, up in
       the page body; it is no longer passed down here. */
    {
      accent: 'var(--primary-bright)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="14" rx="2" stroke="var(--brand)" strokeWidth="2" fill="var(--brand-soft)" />
          <path d="M16 7V5a2 2 0 0 0-4 0v2" stroke="var(--brand)" strokeWidth="2" />
          <circle cx="12" cy="14" r="2" fill="var(--brand)" />
        </svg>
      ),
      value: fmtAutoKM(avgExpensePerMT),
      label: 'Avg Expense / MT',
      sub: 'expenses per MT',
      valueColor: 'var(--brand)',
    },
    {
      accent: 'var(--violet-text)',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <rect x="1" y="6" width="13" height="10" rx="1.5" stroke="var(--brand)" strokeWidth="2" fill="color-mix(in srgb, var(--brand) 10%, transparent)" />
          <path d="M14 9h4l3 3v4h-7V9z" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" fill="color-mix(in srgb, var(--brand) 10%, transparent)" />
          <circle cx="6" cy="18" r="1.6" fill="var(--brand)" /><circle cx="17.5" cy="18" r="1.6" fill="var(--brand)" />
        </svg>
      ),
      value: fmtAutoKM(avgFreightPerMT),
      label: 'Avg Freight / MT',
      sub: 'freight cost per MT',
      valueColor: 'var(--brand)',
    },
    {
      accent: profitAccent,
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke={profitAccent} strokeWidth="2" fill={negative ? 'var(--bad-bg)' : 'var(--ok-bg)'} />
          <path d={negative ? 'M8 12l3-3 5 5' : 'M8 12l3 3 5-5'} stroke={profitAccent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      value: fmtAutoKM(avgProfitPerMT),
      label: 'Avg Profit / MT',
      sub: 'net profit per MT',
    },
  ];

  return (
    <CardShell className="mb-5">
      <div className="p-4">
        <SectionHeader title="Per-MT Metrics" subtitle="Unit economics for the selected period" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {metrics.map((metric, i) => (
            <m.div
              key={i}
              className="p-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-subtle)]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              whileHover={{ y: -2, boxShadow: 'var(--shadow-sm)' }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
                  style={{ background: `color-mix(in srgb, ${metric.accent} 10%, transparent)`, color: metric.accent, width: 30, height: 30 }}
                >
                  {metric.icon}
                </span>
                <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">{metric.label}</span>
              </div>
              {/* was a bespoke clamp() topping out at 23px — now the shared KPI
                  rung, so these read at the same size as every other figure. */}
              <div className="mt-2.5 font-semibold leading-none" style={{ color: metric.valueColor, fontSize: 'var(--fs-stat)', fontFamily: 'var(--font-jakarta), sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                {metric.value}
              </div>
              <div className="mt-1.5 text-[var(--regent-gray)] leading-tight" style={{ fontSize: 'var(--fs-caption)' }}>{metric.sub}</div>
            </m.div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}

// Pill-styled filter control built on the app's Radix Select (themed dropdown, small
// styled text, check indicators) — not a native <select>, so the menu matches the rest
// of the app. Lifts to the --endeavour accent when a value is set. ('all' is the sentinel
// for "no filter" since Radix Select can't use an empty-string value.)
function FilterSelect({ label, icon, value, onChange, options }) {
  const active = !!value;
  /* A list with nothing to choose between — one value that every contract in the period
     shares, or none at all — cannot change the page, so it is offered as a disabled chip
     showing what that single value IS. Never disabled while a selection is live: the list
     is built ignoring its own pick, so an active filter can legitimately be alone in it,
     and disabling then would strand the user with no way to clear it. */
  const inert = !active && options.length < 2;
  // Type-to-filter for long lists (client request: every list gets a search box).
  const [q, setQ] = useState('');
  const shown = q
    ? options.filter(o => String(o.label).toLowerCase().includes(q.toLowerCase()))
    : options;
  return (
    <Select value={value || 'all'} onValueChange={(v) => { onChange(v === 'all' ? '' : v); setQ(''); }}
      onOpenChange={(open) => { if (!open) setQ(''); }} disabled={inert}>
      <SelectTrigger
        disabled={inert}
        title={inert
          ? (options.length === 1
            ? `Every contract in view is ${options[0].label} — nothing to filter`
            : `No ${label.toLowerCase()} recorded on the contracts in view`)
          : undefined}
        className="group h-8 w-auto min-w-[122px] max-w-[210px] gap-1.5 rounded-lg pl-2.5 pr-1.5 shadow-sm focus:ring-0 focus:ring-offset-0 disabled:cursor-default"
        style={{
          fontSize: 'var(--fs-body)',
          background: active ? 'var(--brand-soft)' : 'var(--bg-subtle)',
          borderColor: active ? 'var(--endeavour)' : 'var(--line-strong)',
          boxShadow: active ? 'var(--shadow-md)' : undefined,
          opacity: inert ? 0.55 : undefined,
        }}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <span className="flex shrink-0" style={{ color: active ? 'var(--endeavour)' : 'var(--rock-blue)' }}>{icon}</span>
          <span className="font-medium shrink-0" style={{ fontSize: 'var(--fs-body)', color: 'var(--regent-gray)' }}>{label}</span>
          {/* An inert single-value filter states the value rather than "All" — "Currency
              USD" tells you something, "Currency All" over one greyed choice tells you
              nothing about why it is greyed. */}
          {inert
            ? <span className="font-semibold truncate" style={{ fontSize: 'var(--fs-body)', color: 'var(--chathams-blue)' }}>
              {options.length === 1 ? options[0].label : '—'}
            </span>
            : <SelectValue className="font-semibold truncate"
              style={{ fontSize: 'var(--fs-body)', color: active ? 'var(--endeavour)' : 'var(--chathams-blue)' }} />}
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-2xl border border-[var(--bg-subtle)] shadow-md max-h-72 min-w-[var(--radix-select-trigger-width)]">
        {options.length > 7 && (
          <div className="sticky top-0 z-10 bg-[var(--bg-card)] p-1.5 border-b border-[var(--line)]">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              placeholder="Search…"
              className="w-full h-7 px-2 rounded-lg border border-[var(--line-strong)] bg-[var(--bg-subtle)] focus:outline-none focus:border-[var(--endeavour)]"
              style={{ fontSize: 'var(--fs-body)', color: 'var(--chathams-blue)' }}
            />
          </div>
        )}
        <SelectItem value="all" className="rounded-lg text-[var(--chathams-blue)]" style={{ fontSize: 'var(--fs-body)' }}>All</SelectItem>
        {shown.map((o) => (
          <SelectItem key={o.value} value={o.value} className="rounded-lg text-[var(--chathams-blue)]" style={{ fontSize: 'var(--fs-body)' }}>
            {o.label}
          </SelectItem>
        ))}
        {q && shown.length === 0 && (
          <div className="px-3 py-2" style={{ fontSize: 'var(--fs-body)', color: 'var(--regent-gray)' }}>No matches</div>
        )}
      </SelectContent>
    </Select>
  );
}

// Purchased vs Shipped vs Pending tonnage, with a shipped-progress bar.
function TonnageCard({ purchased = 0, shipped = 0, pending = 0, unsoldValue = 0 }) {
  const pctShipped = purchased > 0 ? Math.min(100, (shipped / purchased) * 100) : 0;
  const fmtMT = (n) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0)} MT`;
  /* Purchased / Shipped / Pending is one quantity at three stages of the SAME journey —
     a sequential relationship, not an oppositional one. It used to be painted
     violet / green / brown, which said shipped tonnage is good and pending tonnage is a
     caution. Pending tonnage is just material you bought and have not shipped yet: the
     ordinary state of a live trade, and the thing the business exists to hold.
     One hue at three intensities instead, so the eye reads progress rather than verdict. */
  const pills = [
    { label: 'PURCHASED', value: purchased, bg: 'var(--brand-soft)', ring: 'var(--brand-border)', dot: 'var(--brand-strong)', color: 'var(--brand-strong)' },
    { label: 'SHIPPED', value: shipped, bg: 'var(--ok-bg)', ring: 'var(--ok-border)', dot: 'var(--ok-text)', color: 'var(--ok-text)' },
    { label: 'PENDING', value: pending, bg: 'var(--bg-subtle)', ring: 'var(--line-strong)', dot: 'var(--ink-muted)', color: 'var(--ink-secondary)' },
  ];
  return (
    <m.div
      className="relative rounded-2xl bg-[var(--bg-card)] border border-[var(--line)] shadow-card overflow-hidden"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center rounded-lg flex-shrink-0"
              style={{ background: 'color-mix(in srgb, var(--brand) 10%, transparent)', color: 'var(--brand)', width: 30, height: 30 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M3 7l9-4 9 4-9 4-9-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M3 7v10l9 4 9-4V7" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
            </span>
            <span className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Tonnage — Purchased vs Shipped</span>
          </div>
          <span className="responsiveTextTable font-medium" style={{ color: 'var(--ok-text)' }}>{pctShipped.toFixed(0)}% shipped</span>
        </div>

        {/* Shipped proportion bar. A meter's unfilled track is a lighter step of the SAME
            ramp as its fill — the state then reads across the whole bar. It was a green
            fill on a brand track, two unrelated hues meeting in the middle. */}
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ok-bg)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${pctShipped}%`, backgroundColor: 'var(--ok-text)' }} />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {pills.map((p) => (
            <div key={p.label} className="rounded-lg p-2.5" style={{ backgroundColor: p.bg, boxShadow: `inset 0 0 0 1px ${p.ring}` }}>
              <div className="flex items-center gap-1.5">
                <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: p.dot }} />
                <span className="responsiveTextTable font-semibold tracking-wide" style={{ color: p.color }}>{p.label}</span>
              </div>
              <div className="font-semibold mt-1 leading-none" style={{ color: p.color, fontSize: 'var(--fs-substat)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{fmtMT(p.value)}</div>
            </div>
          ))}
        </div>

        {/* What the PENDING pill above is worth. This was a whole separate "Unsold Stock"
            card taking a third of a row to restate the same tonnage and add one figure —
            the value. As a footer line it says the same thing where the number it depends
            on is already on screen. Neutral, not caution: parked capital is a state, not a
            warning, and it used to be the dashboard's largest warm block. */}
        {unsoldValue > 0 && (
          <div className="flex items-baseline justify-between gap-2 rounded-lg p-2.5"
            style={{ backgroundColor: 'var(--neutral-bg)', boxShadow: 'inset 0 0 0 1px var(--neutral-border)' }}>
            <span className="responsiveTextTableTitle text-[var(--regent-gray)]">Pending stock value · capital tied up, excluded from profit</span>
            <span className="font-semibold leading-none flex-shrink-0" style={{ color: 'var(--neutral-text)', fontSize: 'var(--fs-substat)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>{fmtAutoKM(unsoldValue)}</span>
          </div>
        )}
      </div>
    </m.div>
  );
}

// Annual total of P1 "Misc Invoices" — standalone sales not tied to a contract.
function MiscInvoicesCard({ byCur = {}, byCat = {}, count = 0 }) {
  const fmtCur = (cur, v) => `${cur === 'us' ? '$' : cur === 'eu' ? '€' : ''}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;
  const entries = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);

  const CAT_META = [
    { id: 'shipments', label: 'Shipments', bg: 'var(--brand-soft)', ring: 'var(--brand-border)', dot: 'var(--brand)', color: 'var(--brand-strong)' },
    { id: 'personal', label: 'Personal', bg: 'color-mix(in srgb, var(--brand) 10%, transparent)', ring: 'color-mix(in srgb, var(--brand) 20%, transparent)', dot: 'var(--brand)', color: 'var(--brand)' },
    { id: 'random', label: 'Random', bg: 'color-mix(in srgb, var(--pink-text) 10%, transparent)', ring: 'color-mix(in srgb, var(--pink-text) 22%, transparent)', dot: 'var(--pink-text)', color: 'var(--pink-text)' },
    { id: 'uncategorized', label: 'Uncategorized', bg: 'var(--neutral-bg)', ring: 'var(--neutral-border)', dot: 'var(--ink-muted)', color: 'var(--ink-secondary)' },
  ];
  const catRows = CAT_META
    .map(c => ({ ...c, byCur: byCat[c.id]?.byCur || {}, count: byCat[c.id]?.count || 0 }))
    .filter(c => c.count > 0)
    .map(c => ({ ...c, sharePct: count > 0 ? (c.count / count) * 100 : 0 }));

  // Average ticket size only makes sense when every misc invoice this period
  // shares one currency — mixing $/€ into a single average would be meaningless.
  const single = entries.length === 1 ? entries[0] : null;
  const avgPerInvoice = single && count > 0 ? single[1] / count : null;

  return (
    <m.div
      className="relative rounded-2xl bg-[var(--bg-card)] border border-[var(--line)] shadow-card overflow-hidden h-full flex flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={{ y: -3, boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'color-mix(in srgb, var(--pink-text) 10%, transparent)', color: 'var(--pink-text)', width: 30, height: 30 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24"><path d="M7 3h10l3 4v14H4V7l3-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M8 11h8M8 15h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </span>
            <div className="min-w-0">
              <div className="responsiveTextTable font-medium text-[var(--regent-gray)] leading-tight">Misc Invoices · not linked to contracts</div>
              <div className="text-[var(--regent-gray)] leading-tight" style={{ fontSize: 'var(--fs-table)' }}>{count} invoice{count === 1 ? '' : 's'} in period</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {entries.length === 0
              ? <span className="responsiveTextTable text-[var(--regent-gray)]">None in this period</span>
              : entries.map(([cur, v]) => (
                <span key={cur} className="rounded-lg px-3 py-1 font-semibold"
                  style={{ background: 'color-mix(in srgb, var(--pink-text) 10%, transparent)', boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--pink-text) 20%, transparent)', color: 'var(--pink-text)', fontSize: 'var(--fs-title)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                  {fmtCur(cur, v)}
                </span>
              ))}
          </div>
        </div>

        {catRows.length > 0 ? (
          <>
            {/* Category mix — share of invoice count per category */}
            <div className="w-full h-2 rounded-full overflow-hidden flex" style={{ backgroundColor: 'var(--neutral-bg)' }}>
              {catRows.map(c => (
                <div key={c.id} style={{ width: `${c.sharePct}%`, backgroundColor: c.dot }} title={`${c.label} · ${c.sharePct.toFixed(0)}%`} />
              ))}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {catRows.map(c => {
                const ents = Object.entries(c.byCur).filter(([, v]) => Math.abs(v) > 0.005);
                return (
                  <div key={c.id} className="rounded-lg p-2.5" style={{ backgroundColor: c.bg, boxShadow: `inset 0 0 0 1px ${c.ring}` }}>
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full shrink-0" style={{ width: 8, height: 8, backgroundColor: c.dot }} />
                      <span className="responsiveTextTable font-semibold tracking-wide truncate" style={{ color: c.color }}>{c.label.toUpperCase()}</span>
                    </div>
                    <div className="font-semibold mt-1 leading-none truncate" style={{ color: c.color, fontSize: 'var(--fs-page)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                      {ents.length === 0 ? '—' : ents.map(([cur, v]) => fmtCur(cur, v)).join(' / ')}
                    </div>
                    <div className="leading-none mt-1" style={{ fontSize: 'var(--fs-caption)', color: 'var(--regent-gray)' }}>{c.count} inv · {c.sharePct.toFixed(0)}%</div>
                  </div>
                );
              })}
            </div>

            {avgPerInvoice != null && (
              <div className="flex items-center justify-between border-t border-[var(--line)] pt-2 mt-auto">
                <span className="responsiveTextTable text-[var(--regent-gray)]">Avg / invoice</span>
                <span className="responsiveTextTable font-semibold" style={{ color: 'var(--port-gore)' }}>{fmtCur(single[0], avgPerInvoice)}</span>
              </div>
            )}
          </>
        ) : (
          <span className="responsiveTextTable text-[var(--regent-gray)]">None in this period</span>
        )}
      </div>
    </m.div>
  );
}


// Receivables aging — outstanding split by invoice age (0–30 / 31–60 / 61–90 / 90+),
// per currency, colored green→red as it ages. Shows how overdue money is at a glance.
function AgingCard({ buckets = [] }) {
  /* Invoice age is genuinely a severity scale, so this card keeps a meaning-carrying
     ramp — but as ONE hue running light → dark, which is what a sequential scale wants,
     rather than the old green → brown → brown → red.
     Two things were wrong before. 31–60 and 61–90 both used --warn-text, so a four-step
     ramp only ever had three steps. And the amber step cannot be rescued by hue: it is
     already at 34° (globals.css moved it there precisely because desaturated yellow is
     khaki), so at the lightness the client's 2026-08-08 muting caps it to, it reads brown
     and will keep reading brown. Dropping it is the only fix left.
     0–30 is not overdue at all, so it takes neutral ink rather than green — a healthy
     bucket is the ordinary case and does not need to be congratulated. */
  const colors = [
    'var(--ok-text)',
    'color-mix(in srgb, var(--danger-text) 45%, var(--bg-card))',
    'var(--danger-text)',
    'var(--danger-strong)',
  ];
  const fmtCurKM = (cur, n) => {
    const s = cur === 'us' ? '$' : cur === 'eu' ? '€' : '';
    const v = Number(n) || 0, a = Math.abs(v);
    if (a >= 1e6) return `${s}${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `${s}${(v / 1e3).toFixed(1)}K`;
    return `${s}${v.toFixed(0)}`;
  };
  const bTot = (b) => Object.values(b.byCur || {}).reduce((s, v) => s + v, 0);
  const max = Math.max(...buckets.map(bTot), 1);
  const anyData = buckets.some(b => b.count > 0);
  return (
    <CardShell>
      <div className="p-4">
        <SectionHeader title="Receivables Aging" subtitle="Outstanding by invoice age (days) — older = more overdue" />
        {!anyData
          ? <div className="responsiveText text-[var(--regent-gray)] py-3 text-center">No outstanding receivables</div>
          : buckets.map((b, i) => {
            const curs = Object.keys(b.byCur || {}).filter(c => b.byCur[c] > 0.005);
            const tot = bTot(b);
            return (
              <div key={b.label} className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 w-24 flex-shrink-0">
                  <span className="rounded-full" style={{ width: 8, height: 8, background: colors[i] }} />
                  <span className="responsiveTextTable text-[var(--port-gore)] font-medium">{b.label} d</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="w-full bg-[var(--line)] rounded-full overflow-hidden" style={{ height: 16 }}>
                    <div className="h-full rounded-full" style={{ width: `${max > 0 ? (tot / max) * 100 : 0}%`, minWidth: tot > 0 ? 4 : 0, background: colors[i], borderRadius: '0 9999px 9999px 0' }} />
                  </div>
                </div>
                <div className="w-28 text-right flex-shrink-0">
                  {curs.length
                    ? curs.map(c => <div key={c} className="responsiveTextTable font-medium text-[var(--port-gore)] leading-tight">{fmtCurKM(c, b.byCur[c])}</div>)
                    : <span className="responsiveTextTable text-[var(--regent-gray)]">—</span>}
                  <div className="responsiveTextTableTitle text-[var(--regent-gray)]">{b.count} inv</div>
                </div>
              </div>
            );
          })}
      </div>
    </CardShell>
  );
}

// Breakdown card (expenses by type, materials by tonnage, etc.) — one tile per
// entry, same tile as the ranking cards above.
/* `accent` is kept in the signature so existing call sites stay valid, but the
   tiles come from the themed ramp: the brand stepped deep → soft down the list,
   instead of every entry sharing one fixed accent. */
function BreakdownCard({ title, subtitle, entries = [], total, fmtVal, accent = 'var(--brand)', onPick, picked, clamp = false }) {
  const [expanded, setExpanded] = useState(false);
  /* Share is measured against the card's own total, not the visible entries — so a
     folded list's shares add up to less than 100%, and that gap IS the tail. The
     fold toggle now states the tail outright instead of leaving it to be inferred. */
  const sum = entries.reduce((a, [, v]) => a + (Number(v) || 0), 0);
  const denom = Number(total) > 0 ? Number(total) : sum;
  const rows = entries.map(([label, value]) => ({ label, value: Number(value) || 0 }));
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  const { shown, hidden, tail } = foldRows(rows, expanded);

  return (
    <CardShell>
      <div className="p-4">
        <SectionHeader
          title={title}
          subtitle={subtitle}
          right={total != null ? <div className="text-right flex-shrink-0"><div className="responsiveTextTable text-[var(--regent-gray)]">Total</div><span className="responsiveTextPage font-semibold text-[var(--chathams-blue)]">{fmtVal(total)}</span></div> : null}
        />
        {rows.length === 0
          ? <div className="responsiveText text-[var(--regent-gray)] py-3 text-center">No data for this period</div>
          : (
            <div className={TILE_GRID}>
              {shown.map((r, idx) => (
                <RankTile
                  key={r.label}
                  label={r.label}
                  value={fmtVal(r.value)}
                  share={fmtPct(denom > 0 ? (r.value / denom) * 100 : 0)}
                  fill={max > 0 ? r.value / max : 0}
                  accent={accent}
                  hero={idx === 0 && !expanded}
                  clamp={clamp}
                  onPick={onPick ? () => onPick(r.label) : undefined}
                  picked={picked === r.label}
                  delay={idx * 0.03}
                />
              ))}
              {hidden.length > 0 && (
                <FoldToggle expanded={false} onToggle={() => setExpanded(true)}
                  count={hidden.length} amount={fmtVal(tail)} />
              )}
              {expanded && rows.length > TAIL_AFTER + 1 && (
                <FoldToggle expanded onToggle={() => setExpanded(false)} />
              )}
            </div>
          )}
      </div>
    </CardShell>
  );
}

const Dash = () => {

  const { settings, compData, dateSelect, setLoading, loading, ln } = useContext(SettingsContext);
  // One standard company EUR→USD rate (Settings → General). 0 = not set → per-contract rate.
  const companyRate = parseFloat(compData?.eurUsdRate) || 0;
  // Default payment term in days (Settings → General) — used to flag overdue invoices.
  const termDays = parseInt(compData?.defaultTermDays, 10) > 0 ? parseInt(compData.defaultTermDays, 10) : 30;
  const { uidCollection, user } = UserAuth();
  // Bare call on purpose: nothing here reads `theme`, but subscribing makes the
  // page re-render on a theme/mode switch, which rebuilds every chart config
  // through cssVar() with the new token values.
  useTheme();
  const settingsLoaded = Object.keys(settings).length > 0;
  const clientCount = settings.Client?.Client?.length || 0;
  const supplierCount = settings.Supplier?.Supplier?.length || 0;

  // Raw loaded data — every aggregate below is derived (memoized) from these, so the
  // Supplier / Client / Material filters recompute instantly without re-fetching Firestore.
  const [rawContracts, setRawContracts] = useState([]);     // contracts enriched with invoicesData
  const [rawRecvInvoices, setRawRecvInvoices] = useState([]);
  const [rawMiscInvoices, setRawMiscInvoices] = useState([]); // P1 misc invoices, not linked to contracts
  const [rawCompanyExpenses, setRawCompanyExpenses] = useState([]); // company-level overheads

  const [fSupplier, setFSupplier] = useState('');
  const [fClient, setFClient] = useState('');
  const [fMaterial, setFMaterial] = useState('');
  const [fCurrency, setFCurrency] = useState('');
  const [fOrigin, setFOrigin] = useState('');
  const [fDelTerm, setFDelTerm] = useState('');
  // Which 'Expenses by Type' tile has its breakdown open (label, or null).
  const [expDrill, setExpDrill] = useState(null);

  /* Collapsed bands, remembered per browser — someone who never reads "Other" should stop
     scrolling past it. Read in an effect rather than a useState initialiser so the server
     and the first client render agree (localStorage does not exist during SSR, and
     disagreeing would be a hydration mismatch). Defaults to everything OPEN: a first load
     must never hide a figure from someone who does not know the band is there.
     try/catch because a private window throws on access rather than returning null. */
  const [collapsed, setCollapsed] = useState({});
  useEffect(() => {
    try {
      const raw = localStorage.getItem('ims-dash-bands');
      if (raw) setCollapsed(JSON.parse(raw) || {});
    } catch { /* storage unavailable — every band stays open, which is the safe default */ }
  }, []);
  const toggleBand = (key) => setCollapsed(prev => {
    const next = { ...prev, [key]: !prev[key] };
    try { localStorage.setItem('ims-dash-bands', JSON.stringify(next)); } catch { /* ignore */ }
    return next;
  });

  useEffect(() => {

    const Load = async () => {

      const year = dateSelect?.start?.substring(0, 4) || new Date().getFullYear();
      setLoading(true);

      // All three root downloads are independent — start them together. Only the
      // invoice INDEX depends on contracts; the receivables window and misc
      // invoices were needlessly queued behind it (same fix as cashflow).
      const contractsPromise = loadData(uidCollection, 'contracts', {
        start: dateSelect?.start || `${year}-01-01`,
        end: dateSelect?.end || `${year}-12-31`,
      });
      // Outstanding receivables are a running total — load a multi-year window (last 4
      // years) so the card reflects TRUE outstanding, not just invoices dated this period.
      const curYr = new Date().getFullYear();
      const invsForRecvPromise = loadData(uidCollection, 'invoices', {
        start: `${curYr - 3}-01-01`,
        end: `${curYr}-12-31`,
      });
      // P1 "Misc Invoices" — standalone sales not linked to any contract.
      const miscPromise = loadCompanyExpenses(uidCollection, 'specialInvoices', {
        start: dateSelect?.start || `${year}-01-01`,
        end: dateSelect?.end || `${year}-12-31`,
      });
      /* Company-level overheads. This page never loaded them, so every expense figure
         on it was cost-of-trade only — /companyexpenses showed spend the dashboard's
         "Expenses" did not include. Same collection and date window that page uses. */
      const coExpPromise = loadCompanyExpenses(uidCollection, 'companyExpenses', {
        start: dateSelect?.start || `${year}-01-01`,
        end: dateSelect?.end || `${year}-12-31`,
      });

      const dtContracts = await contractsPromise;
      // Batch ALL contracts' invoice lookups into one pass instead of one query per
      // contract (the old N+1): load the union once, then slice per contract in memory.
      const invIndex = await buildInvoiceIndex(uidCollection, dtContracts);
      let dtConTmp = dtContracts.map(x => ({ ...x, invoicesData: contractInvoicesFromIndex(x, invIndex) }));
      setRawContracts(dtConTmp);

      setRawRecvInvoices(await invsForRecvPromise);

      const misc = await miscPromise;
      setRawMiscInvoices(Array.isArray(misc) ? misc.filter(Boolean) : []);

      const coExp = await coExpPromise;
      setRawCompanyExpenses(Array.isArray(coExp) ? coExp.filter(Boolean) : []);

      setLoading(false);
    };

    if (!uidCollection || !settingsLoaded) return;
    Load();

  }, [dateSelect, settingsLoaded, clientCount, supplierCount, uidCollection]);

  const currentYear = dateSelect?.start?.substring(0, 4) || new Date().getFullYear();

  // Resolve a client display name from either an id (draft invoices) or an object
  // (finalized invoices store { nname }). Used by both filter options and matching.
  const resolveClientName = (client) => {
    if (client && typeof client === 'object') return client.nname || '';
    return settings.Client?.Client?.find(c => c.id === client)?.nname || '';
  };

  /* One predicate per facet, so "does this contract match filter X" is written once and
     reused by both the filtered set and the option lists below. */
  const facetMatch = {
    supplier: (c, v) => c.supplier === v,
    material: (c, v) => (c.productsData || []).some(p => (p.description || '') === v),
    client: (c, v) => (c.invoicesData || []).some(group => group.some(inv => resolveClientName(inv.client) === v)),
    cur: (c, v) => c.cur === v,
    origin: (c, v) => c.origin === v,
    delTerm: (c, v) => c.delTerm === v,
  };
  const activeFacets = { supplier: fSupplier, material: fMaterial, client: fClient, cur: fCurrency, origin: fOrigin, delTerm: fDelTerm };

  /* Contracts passing every active filter EXCEPT the named one. That exception is what
     makes the dropdowns cascade: the Material list is built from contracts already
     narrowed by supplier/client/origin/…, so it offers only materials that supplier
     actually traded — but it still ignores the material currently picked, so you can
     switch to a different one instead of having to clear the filter first.
     Before this, all six lists came from the unfiltered period: 192 materials stayed on
     offer after picking a supplier who traded three of them, and every one of the other
     189 emptied the whole dashboard. */
  const facetPool = (except) => rawContracts.filter(c =>
    Object.entries(activeFacets).every(([k, v]) => !v || k === except || facetMatch[k](c, v)));

  // Apply the active Supplier / Material / Client / Currency / Origin / Terms filters.
  const filteredContracts = useMemo(() => facetPool(null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawContracts, fSupplier, fMaterial, fClient, fCurrency, fOrigin, fDelTerm, settings]);

  // Filter option lists, built from what's actually loaded so the dropdowns never
  // show entities that aren't in the current period — or outside the other filters.
  const supplierOptions = useMemo(() => {
    const ids = [...new Set(facetPool('supplier').map(c => c.supplier).filter(Boolean))];
    return ids
      .map(id => ({ id, name: settings.Supplier?.Supplier?.find(s => s.id === id)?.nname || '' }))
      .filter(o => o.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContracts, fMaterial, fClient, fCurrency, fOrigin, fDelTerm, settings]);

  const materialOptions = useMemo(() => {
    const set = new Set();
    facetPool('material').forEach(c => (c.productsData || []).forEach(p => { if (p.description) set.add(p.description); }));
    return [...set].sort((a, b) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContracts, fSupplier, fClient, fCurrency, fOrigin, fDelTerm, settings]);

  const clientOptions = useMemo(() => {
    const pool = facetPool('client');
    const set = new Set();
    pool.forEach(c => (c.invoicesData || []).forEach(group => group.forEach(inv => {
      const n = resolveClientName(inv.client); if (n) set.add(n);
    })));
    /* Also harvest from the period's raw invoices — the contract→invoice join can come
       back empty (unlinked/legacy refs), which left this dropdown showing only "All".
       Only when no contract-side filter is active, though: once one is, that harvest would
       put back the very clients the supplier/material filter just excluded. Same rule and
       the same allowed-PO test invoiceRevAgg uses, so the list matches the card. */
    const contractSideActive = !!(fSupplier || fMaterial || fCurrency || fOrigin || fDelTerm);
    const allowedPO = contractSideActive ? new Set(pool.map(c => c.id)) : null;
    const start = dateSelect?.start, end = dateSelect?.end;
    (rawRecvInvoices || []).forEach(inv => {
      const d = !inv?.final ? inv?.dateRange?.startDate : inv?.date;
      if (typeof d !== 'string' || (start && d < start) || (end && d > end)) return;
      if (allowedPO && !allowedPO.has(inv.poSupplier?.id)) return;
      const n = resolveClientName(inv.client); if (n) set.add(n);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContracts, rawRecvInvoices, dateSelect, fSupplier, fMaterial, fCurrency, fOrigin, fDelTerm, settings]);

  /* Currency / Origin / Delivery Terms all sit on the contract as a settings id, so one
     pass builds all three: collect the ids actually present in the period and resolve each
     to its label, dropping any that no longer resolve. */
  const { currencyOptions, originOptions, delTermOptions } = useMemo(() => {
    const build = (field, group, labelKey, except) => {
      const ids = [...new Set(facetPool(except).map(c => c[field]).filter(Boolean))];
      return ids
        .map(id => ({ value: id, label: settings?.[group]?.[group]?.find(o => o.id === id)?.[labelKey] || '' }))
        .filter(o => o.label)
        .sort((a, b) => a.label.localeCompare(b.label));
    };
    return {
      currencyOptions: build('cur', 'Currency', 'cur', 'cur'),
      originOptions: build('origin', 'Origin', 'origin', 'origin'),
      delTermOptions: build('delTerm', 'Delivery Terms', 'delTerm', 'delTerm'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawContracts, fSupplier, fMaterial, fClient, fCurrency, fOrigin, fDelTerm, settings]);

  /* Drop a selection the cascade has just invalidated. Picking Supplier A after Material B
     that A never traded would otherwise leave B selected but absent from its own list, and
     the page stuck on an empty result with no visible cause. Each list is built ignoring
     its own selection, so a value only disappears when it is genuinely incompatible with
     the others — which makes this safe to run on every change and unable to loop. */
  useEffect(() => {
    if (fSupplier && !supplierOptions.some(o => o.id === fSupplier)) setFSupplier('');
    if (fMaterial && !materialOptions.includes(fMaterial)) setFMaterial('');
    if (fClient && !clientOptions.includes(fClient)) setFClient('');
    if (fCurrency && !currencyOptions.some(o => o.value === fCurrency)) setFCurrency('');
    if (fOrigin && !originOptions.some(o => o.value === fOrigin)) setFOrigin('');
    if (fDelTerm && !delTermOptions.some(o => o.value === fDelTerm)) setFDelTerm('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierOptions, materialOptions, clientOptions, currencyOptions, originOptions, delTermOptions]);

  const filtersActive = !!(fSupplier || fClient || fMaterial || fCurrency || fOrigin || fDelTerm);
  const clearFilters = () => {
    setFSupplier(''); setFClient(''); setFMaterial('');
    setFCurrency(''); setFOrigin(''); setFDelTerm('');
  };

  // Aggregates — recomputed only when the filtered set (or settings) changes.
  const conAgg = useMemo(() => calContracts(filteredContracts, settings, companyRate), [filteredContracts, settings, companyRate]);
  const invAgg = useMemo(() => setMonthsInvoices(filteredContracts, settings, companyRate), [filteredContracts, settings, companyRate]);

  const dataContracts = conAgg.accumulatedPmnt;
  const dataExpenses = conAgg.accumulatedExp;
  const dataPieSupps = conAgg.pieArrSupps;
  const dataInvoices = invAgg.accumulatedPmnt;
  /* invAgg.pieArrClnts is no longer read: the Consignees card moved to the invoice-dated
     basis (invoiceRevAgg.byClient). invAgg is still needed for accumulatedPmnt, which is
     the deal-basis revenue the Capital Breakdown donut and the P&L decompose. */

  // ── Sales Revenue, invoice-dated ──────────────────────────────────────────
  // Standard period revenue = every sales invoice DATED in the selected range,
  // whatever year its PO was bought — the basis the Invoices Review uses. The
  // contract-centric aggregation above (kept for the deal-basis P&L: Net Profit,
  // COGS, hero chart) misses period sales of earlier-bought material, which was
  // the reported dashboard-vs-Invoices-Review revenue gap. Reuses the already-
  // loaded 4-year invoice window; same supersede rule as funcs.js Total().
  const invoiceRevAgg = useMemo(() => {
    const byMonth = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0]));
    /* Per-client split of THIS total, accumulated in the same pass. The Consignees card
       used to read invAgg.pieArrClnts, which is the contract-dated basis: every invoice
       ever raised against a contract PURCHASED in the period, whatever the invoice's own
       date. That is a different quantity from the Sales Revenue KPI right above it, and
       the two disagreed by eight figures on one screen. Splitting the KPI's own total
       means the card can no longer drift from the headline it sits under. */
    const byClient = {};
    const byClientMonth = {}; // client -> 12 buckets, for the ranking tile sparklines
    let total = 0;
    let missingInvRate = 0;
    const start = dateSelect?.start, end = dateSelect?.end;
    if (!Array.isArray(rawRecvInvoices) || !settings?.Currency?.Currency || !start || !end) {
      return { byMonth, total, byClient, byClientMonth };
    }
    // Supplier/Material filters only resolve through a loaded contract; Client matches
    // the invoice directly (same behaviour as the Receivables card).
    const allowedPO = (fSupplier || fMaterial || fCurrency || fOrigin || fDelTerm) ? new Set(filteredContracts.map(c => c.id)) : null;
    const groups = {};
    rawRecvInvoices.forEach(inv => {
      const d = !inv?.final ? inv?.dateRange?.startDate : inv?.date;
      if (typeof d !== 'string' || d < start || d > end) return;
      if (inv.invoice != null) (groups[String(inv.invoice)] ||= []).push(inv);
    });
    Object.values(groups).forEach(g => g.forEach(inv => {
      if (inv.canceled || inv.draft === true) return;
      const isOriginal = ['1111', 'Invoice'].includes(inv.invType);
      if (!(g.length === 1 || !isOriginal)) return; // original superseded by its Credit/Final note
      // fClient holds a client NAME (that's what the filter options store) — match by
      // resolved name for both draft (id) and finalized ({nname}) invoice shapes.
      const clientName = resolveClientName(inv.client) || 'Unassigned';
      if (fClient && clientName !== fClient) return;
      if (allowedPO && !allowedPO.has(inv.poSupplier?.id)) return;
      const amt = parseFloat(inv.totalAmount);
      if (isNaN(amt)) return;
      const curId = !inv.final ? inv.cur : settings.Currency.Currency.find(x => x.cur === inv.cur?.cur)?.id;
      const rate = parseFloat(inv.euroToUSD);
      const mult = companyRate > 0 ? companyRate : (rate > 0 ? rate : 1);
      if (curId !== 'us' && !(companyRate > 0) && !(rate > 0)) missingInvRate++;
      const usd = curId === 'us' ? amt : amt * mult;
      const d = !inv.final ? inv.dateRange.startDate : inv.date;
      const m = Number(String(d).substring(5, 7));
      if (m >= 1 && m <= 12) {
        byMonth[m] += usd;
        total += usd;
        byClient[clientName] = (byClient[clientName] || 0) + usd;
        (byClientMonth[clientName] ||= Array(12).fill(0))[m - 1] += usd;
      }
    }));
    return { byMonth, total, missingInvRate, byClient, byClientMonth };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRecvInvoices, settings, companyRate, dateSelect, fClient, fSupplier, fMaterial, fCurrency, fOrigin, fDelTerm, filteredContracts]);

  const totalMT = conAgg.totalMT || 0;
  const shippedMT = Math.min(conAgg.shippedMT || 0, totalMT); // never exceed purchased
  const pendingMT = Math.max(0, totalMT - shippedMT);
  const freightTotal = conAgg.freightTotal || 0;
  const missingRate = conAgg.missingRate || 0; // EUR contracts missing an FX rate (counted 1:1)
  const cogs = conAgg.cogs || 0;               // cost of SOLD material only
  const unsoldValue = conAgg.unsoldValue || 0; // purchase value of unsold stock (NOT a loss)
  const cogsByMonth = conAgg.cogsByMonth || {};
  const expByType = conAgg.expByType || {};
  const expDetails = conAgg.expDetails || {};
  const materialSold = conAgg.materialSold || {};
  // Storage + warehouse spend (the storage-cost buckets), for the dashboard tile.
  /* Substring, not exact — the same way the freight and commission tiles match. The
     shipped expense types include storageStuffing and freightStorageStuffing
     (components/const.js); an exact [storage, warehouse] match dropped both silently. */
  const storageSpend = Object.entries(expByType).reduce((s, [lbl, v]) => {
    const l = String(lbl).toLowerCase();
    return (l.includes('storage') || l.includes('warehouse')) ? s + v : s;
  }, 0);
  /* conAgg.storageByMonth is no longer read here — it existed only to feed the
     "Storage Spend" sparkline, which the Warehouse summary tile replaced. Left
     in place in funcs.js: it is a cheap accumulator and other callers may want
     the series back. */
  /* Commission spend, for the summary tile the client asked for. Read out of the
     SAME expByType bucket the "Expenses by Type" card already renders — matched
     on the expense-type label, exactly as storageSpend above matches storage /
     warehouse. No new arithmetic: if this tile and that card ever disagree, they
     are reading different data, not computing it differently.
     substring match because the configured label is free text ("commission",
     "Broker's Commission", "commission fee" all occur in components/const.js and
     in customer data). */
  const commissionSpend = Object.entries(expByType).reduce((s, [lbl, v]) =>
    String(lbl).toLowerCase().includes('commission') ? s + v : s, 0);

  // SOLD-BASIS monthly profit = revenue (sold) − cost-of-sold − expenses. Unsold material
  // is stock, not a cost, so it never drags profit negative the way the old "all purchases"
  // method did.
  const dataPL = useMemo(() => {
    const pl = Object.keys(dataInvoices).reduce((acc, key) => {
      acc[key] = (dataInvoices[key] || 0) - (cogsByMonth[key] || 0) - (dataExpenses[key] || 0);
      return acc;
    }, {});
    return Object.values(pl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataInvoices, conAgg, dataExpenses]);

  // Outstanding receivables split by shipment finalization (shipData.fnlzing === '4568'
  // = Yes). Same issued/unpaid rule as the alerts bar + Cashflow. Responds to the Client
  // filter (suppliers/materials don't map cleanly onto a sales invoice).
  const receivables = useMemo(() => {
    // Canonical receivables (utils/finance.js) — deduped (an invoice + its Credit/Final
    // note count ONCE, payments combined), balance = total − payments (same rule the
    // Cashflow page uses), per-currency, draft/canceled excluded, finalized/provisional split.
    const list = fClient
      ? rawRecvInvoices.filter(inv => resolveClientName(inv.client) === fClient)
      : rawRecvInvoices;
    return financeReceivables(list, { asOf: new Date(), termDays });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRecvInvoices, fClient, settings, termDays]);

  // Receivables aging buckets (0–30 / 31–60 / 61–90 / 90+), same source as receivables.
  const aging = useMemo(() => {
    const list = fClient
      ? rawRecvInvoices.filter(inv => resolveClientName(inv.client) === fClient)
      : rawRecvInvoices;
    return agingBuckets(list, { asOf: new Date() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawRecvInvoices, fClient, settings]);

  // P1 misc invoices total by currency (annual summary — independent of the contract filters),
  // plus a breakdown by the manual category tag (Personal / Random / Shipments / Uncategorized).
  const miscInvoices = useMemo(() => {
    const byCur = {};
    const byCat = { personal: { byCur: {}, count: 0 }, random: { byCur: {}, count: 0 }, shipments: { byCur: {}, count: 0 }, uncategorized: { byCur: {}, count: 0 } };
    rawMiscInvoices.forEach(r => {
      const cur = r.cur || 'us';
      const amt = parseFloat(r.total) || 0;
      byCur[cur] = (byCur[cur] || 0) + amt;
      const cat = ['personal', 'random', 'shipments'].includes(r.category) ? r.category : 'uncategorized';
      byCat[cat].byCur[cur] = (byCat[cat].byCur[cur] || 0) + amt;
      byCat[cat].count += 1;
    });
    return { byCur, byCat, count: rawMiscInvoices.length };
  }, [rawMiscInvoices]);

  const totalPL = useMemo(() => dataPL.reduce((a, v) => a + (Number(v) || 0), 0), [dataPL]);
  const totalInvoices = useMemo(() => sumObj(dataInvoices), [dataInvoices]);
  const totalContracts = useMemo(() => sumObj(dataContracts), [dataContracts]);
  const totalExpenses = useMemo(() => sumObj(dataExpenses), [dataExpenses]);

  /* Overheads, converted to USD on the same rule as everything else on this page.
     Deliberately kept SEPARATE from totalExpenses rather than folded in: contract
     expenses are attributable to a trade and drive the per-MT metrics, overheads are
     not, and merging them would silently change what those existing figures mean. */
  const companyExpAgg = useMemo(() => {
    const byMonth = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0]));
    let total = 0;
    let missingCoRate = 0;
    (rawCompanyExpenses || []).forEach(r => {
      const amt = parseFloat(r?.amount);
      if (!Number.isFinite(amt)) return;
      const rate = parseFloat(r?.euroToUSD);
      const mult = companyRate > 0 ? companyRate : (rate > 0 ? rate : 1);
      const usd = r?.cur === 'us' ? amt : amt * mult;
      if (r?.cur !== 'us' && !(companyRate > 0) && !(rate > 0)) missingCoRate++;
      total += usd;
      const m = Number(String(r?.date || '').substring(5, 7));
      if (m >= 1 && m <= 12) byMonth[m] += usd;
    });
    return { total, byMonth, missingCoRate, count: (rawCompanyExpenses || []).length };
  }, [rawCompanyExpenses, companyRate]);

  /* totalPL is revenue − cost of sold − contract expenses, i.e. BEFORE overheads.
     The donut used to label that figure "Net Profit", which it is not. */
  const netProfit = useMemo(() => totalPL - companyExpAgg.total, [totalPL, companyExpAgg]);

  /* Labels for the band headers. Spelled out ("01 Jan – 31 Dec 2026") rather than echoing
     the picker's "01.01.26 ~ 31.12.26", because the point of the chip is to be readable
     without first decoding it. */
  const fmtDay = (s) => {
    if (typeof s !== 'string' || s.length < 10) return '';
    const d = new Date(`${s}T00:00:00`);
    return isNaN(d) ? '' : new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  };
  const periodLabel = dateSelect?.start && dateSelect?.end
    ? `${fmtDay(dateSelect.start)} – ${fmtDay(dateSelect.end)}`
    : `${currentYear}`;
  const todayLabel = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date());

  /* ── Business-summary tiles ────────────────────────────────────────────────
     Both of these RESHAPE numbers that already exist for display; neither
     computes a new one.

     Unpaid Invoices reads utils/finance receivables() — the same call the
     Outstanding Receivables card and the alerts bar use, so the tile cannot
     disagree with them. Amounts are kept PER CURRENCY and never summed: USD and
     EUR receivables are different money, and adding them is the one thing this
     tile must not do. */
  const unpaidSummary = useMemo(() => {
    const byCur = receivables?.byCur || {};
    const sym = (c) => (c === 'us' ? '$' : c === 'eu' ? '€' : '');
    const compact = (c, n) => {
      const v = Number(n) || 0, a = Math.abs(v);
      if (a >= 1e6) return `${sym(c)}${(v / 1e6).toFixed(1)}M`;
      if (a >= 1e3) return `${sym(c)}${(v / 1e3).toFixed(1)}K`;
      return `${sym(c)}${v.toFixed(0)}`;
    };
    const curs = Object.keys(byCur).filter(c => (byCur[c].due + byCur[c].balance) > 0.005);
    const amounts = curs.length ? curs.map(c => compact(c, byCur[c].due + byCur[c].balance)) : ['$0'];
    const count = curs.reduce((s, c) => s + byCur[c].dueCount + byCur[c].balanceCount, 0);
    const overdueCount = curs.reduce((s, c) => s + byCur[c].dueCount, 0);
    const note = overdueCount > 0
      ? `${count} open · ${overdueCount} overdue`
      : `${count} open invoice${count === 1 ? '' : 's'}`;
    return { amounts, note, count, overdueCount };
  }, [receivables]);

  /* Shipment Status = the shipped/purchased tonnage split already shown by the
     Tonnage card, expressed as one percentage. shippedMT is clamped to totalMT
     further up, so the percentage cannot exceed 100. */
  const shipmentSummary = useMemo(() => {
    const pct = totalMT > 0 ? Math.round((shippedMT / totalMT) * 100) : 0;
    const mt = (n) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n || 0);
    return { pct, note: totalMT > 0 ? `shipped · ${mt(pendingMT)} MT pending` : 'no tonnage in period' };
  }, [shippedMT, pendingMT, totalMT]);

  const avgCostPerMT = useMemo(() => totalMT > 0 ? totalContracts / totalMT : 0, [totalContracts, totalMT]);
  const avgExpensePerMT = useMemo(() => totalMT > 0 ? totalExpenses / totalMT : 0, [totalExpenses, totalMT]);
  // Profit per ton is per ton SOLD (profit only exists on sold material).
  const avgProfitPerMT = useMemo(() => shippedMT > 0 ? totalPL / shippedMT : 0, [totalPL, shippedMT]);
  const avgFreightPerMT = useMemo(() => totalMT > 0 ? freightTotal / totalMT : 0, [freightTotal, totalMT]);

  // ── Hero trend series (Revenue area + Costs & Profit lines) ──────────────
  const revLabels = useMemo(
    () => Object.keys(dataInvoices).map((k) => MONTHS[Number(k) - 1] || k),
    [dataInvoices]
  );
  const revenueSeries = useMemo(() => Object.values(dataInvoices).map(Number), [dataInvoices]);
  // Costs line = cost of SOLD material + expenses (sold basis), per month.
  const costsSeries = useMemo(
    () => Object.keys(dataInvoices).map((k) => (Number(cogsByMonth[k]) || 0) + (Number(dataExpenses[k]) || 0)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conAgg, dataExpenses, dataInvoices]
  );
  const profitSeries = useMemo(() => dataPL.map(Number), [dataPL]);

  // Canvas cannot resolve CSS variables, so charts read their colours through
  // cssVar()/cssVarRgba() (utils/chartTheme.js): each resolves the live computed
  // token and falls back to a literal. That follows every colour preset AND dark
  // mode, which a hardcoded light/dark pair cannot do.

  const heroData = {
    labels: revLabels,
    datasets: [
      {
        label: 'Revenue',
        data: revenueSeries,
        borderColor: cssVar('--primary-bright', '#2563eb'),
        backgroundColor: (ctx) => {
          const { chart } = ctx;
          const { ctx: c, chartArea } = chart;
          if (!chartArea) return cssVarRgba('--primary-bright-rgb', 0.10, 'rgba(37,99,235, 0.10)');
          const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
          g.addColorStop(0, cssVarRgba('--primary-bright-rgb', 0.28, 'rgba(37,99,235, 0.28)'));
          g.addColorStop(1, cssVarRgba('--primary-bright-rgb', 0.00, 'rgba(37,99,235, 0.00)'));
          return g;
        },
        borderWidth: 2.5,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: 'origin',
      },
      {
        label: 'Costs',
        data: costsSeries,
        borderColor: CHART_ACCENT.costs,
        backgroundColor: 'transparent',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
      },
      {
        label: 'Profit',
        data: profitSeries,
        // Canvas can't parse CSS var() strings — it silently fell back to black
        // (and a blank tooltip swatch). Resolve the variable to a real color.
        borderColor: cssVar('--on-brand', '#ffffff'),
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderDash: [5, 4],
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: false,
      },
    ],
  };

  const heroOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        align: 'end',
        labels: {
          usePointStyle: true, pointStyle: 'circle', boxWidth: 6, padding: 16, font: { size: 11 }, color: cssVar('--port-gore', '#28264f'),
          // Chart.js has no icon-to-text gap option — run the default generator and
          // pad the label text so the marker doesn't sit flush against the word.
          generateLabels: (chart) => {
            const items = chart.constructor.defaults.plugins.legend.labels.generateLabels(chart);
            items.forEach((it) => { it.text = `  ${it.text}`; });
            return items;
          },
        },
      },
      tooltip: {
        // Canvas can't parse 'rgba(var(--x),a)' — the black unreadable tooltip.
        backgroundColor: cssVarRgba('--surface-card-rgb', 0.97, 'rgba(255,255,255,0.97)'),
        titleColor: cssVar('--port-gore', '#28264f'),
        bodyColor: cssVar('--port-gore', '#28264f'),
        borderColor: cssVar('--selago', '#e6eef8'),
        borderWidth: 1,
        cornerRadius: 10,
        padding: 12,
        usePointStyle: true,
        callbacks: {
          label: (ctx) => {
            // Rounding all three lines independently made the tooltip read e.g.
            // "12.24 − 10.24 = 1.99". Profit is exactly revenue − costs in the
            // data, so display it as the difference of the ROUNDED revenue and
            // costs — the tooltip is then always internally consistent.
            if (ctx.dataset.label === 'Profit') {
              const rev = Number(ctx.chart.data.datasets[0]?.data?.[ctx.dataIndex]);
              const cost = Number(ctx.chart.data.datasets[1]?.data?.[ctx.dataIndex]);
              if (Number.isFinite(rev) && Number.isFinite(cost)) {
                // Match fmtAutoKM's display precision: 2 decimals of the M/K unit
                // both figures are shown in (they share a scale on this chart).
                const unit = Math.max(Math.abs(rev), Math.abs(cost)) >= 1_000_000 ? 1_000_000
                  : Math.max(Math.abs(rev), Math.abs(cost)) >= 1_000 ? 1_000 : 1;
                const r2 = (v) => Math.round((v / unit) * 100) / 100;
                return ` Profit: ${fmtAutoKM((r2(rev) - r2(cost)) * unit)}`;
              }
            }
            return ` ${ctx.dataset.label}: ${fmtAutoKM(ctx.parsed.y)}`;
          },
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 }, color: cssVar('--regent-gray', '#838ca7') }, border: { display: false } },
      y: { grid: { color: cssVar('--selago', '#eef3f9') }, ticks: { callback: (v) => fmtAutoKM(v, 1), font: { size: 10 }, color: 'var(--regent-gray)' }, border: { display: false } },
    },
  };

  /* ── Revenue breakdown donut ──
     Revenue = cost of sold + contract expenses + company overheads + net profit. The
     overhead slice is new: without it the arcs did not sum to revenue and the profit
     slice was labelled "Net" while still being gross of overheads. */
  const profitForArc = Math.max(Number(netProfit) || 0, 0);
  /* The first three slices are all COST. They used to be three unrelated hues
     (lifted brand, plum, ochre), which made the donut read as four peer
     categories rather than "what it cost" against "what's left". They are now
     three steps of the brand ramp, so the violet mass IS the cost and the green
     arc is the profit. That also retires the last decorative use of --warn-text
     on this page: Company Expenses is a category, not a caution state.
     Side effect worth noting — the legend below used --brand for slice 1 while
     the canvas drew --primary-bright, so the dot never matched its wedge. Both
     now read from this one array. */
  const costRamp = brandRamp(3);
  const donutData = {
    labels: ['Cost of Goods Sold', 'Contract Expenses', 'Company Expenses', 'Net Profit'],
    datasets: [{
      data: [cogs, totalExpenses, companyExpAgg.total, profitForArc],
      // Canvas cannot parse var() — every colour here must be resolved first.
      // brandRamp already returns resolved hex, so only --ok-figure needs cssVar.
      backgroundColor: [...costRamp, cssVar('--ok-figure', '#37815F')],
      borderColor: cssVar('--on-brand', '#ffffff'),
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  // True while the cursor is over a donut slice (its tooltip is showing).
  const [donutHover, setDonutHover] = useState(false);

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '72%',
    // The center "Revenue $X" label is a DOM overlay ABOVE the canvas, and the
    // chart tooltip is drawn ON the canvas — hovering a slice made the two
    // overlap into unreadable soup. Hide the center label while hovering.
    onHover: (e, els) => setDonutHover(els.length > 0),
    plugins: {
      legend: { display: false },
      tooltip: {
        // Canvas can't parse 'rgba(var(--x),a)' — the black unreadable tooltip.
        backgroundColor: cssVarRgba('--surface-card-rgb', 0.97, 'rgba(255,255,255,0.97)'),
        titleColor: cssVar('--port-gore', '#28264f'),
        bodyColor: cssVar('--port-gore', '#28264f'),
        borderColor: cssVar('--selago', '#e6eef8'),
        borderWidth: 1,
        cornerRadius: 10,
        padding: 10,
        callbacks: { label: (ctx) => ` ${ctx.label}: ${fmtAutoKM(ctx.parsed)}` },
      },
    },
  };

  const donutLegend = [
    { label: 'Cost of Goods Sold', value: cogs, color: costRamp[0] },
    { label: 'Contract Expenses', value: totalExpenses, color: costRamp[1] },
    { label: 'Company Expenses', value: companyExpAgg.total, color: costRamp[2] },
    { label: 'Net Profit', value: netProfit, color: 'var(--ok-figure)' },
  ];

  // Ranking data sources
  const hbSupps = HorizontalBar(dataPieSupps || {});
  /* Consignees ranks invoiceRevAgg.byClient, not invAgg.pieArrClnts — see the comment on
     byClient. Sorted here rather than in the aggregator because this is the only reader. */
  const clientRank = useMemo(() => {
    const rows = Object.entries(invoiceRevAgg.byClient || {})
      .filter(([, v]) => Math.abs(v) > 0.5)
      .sort((a, b) => b[1] - a[1]);
    return { labels: rows.map(r => r[0]), data: rows.map(r => r[1]) };
  }, [invoiceRevAgg]);

  if (Object.keys(settings).length === 0) return <div className="mx-auto w-full max-w-full px-2 md:px-4 pb-4 mt-[72px]"><CardsSkeleton /></div>;

  return (
    <LazyMotion features={domAnimation}>
      <div className="w-full">
        <div className="mx-auto w-full max-w-full px-1 md:px-2 pb-6 mt-[72px] min-h-screen">
          <Toast />
          <VideoLoader loading={loading} fullScreen={true} />

          {/* Market ticker */}
          <m.div className="mb-4" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <MarketsTicker />
          </m.div>

          {/* AI alerts */}
          <m.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <AIAlertsBar />
          </m.div>

          {/* Header */}
          <m.div className="mb-5 flex flex-wrap items-center justify-between gap-3"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
            <div>
              <h1 className="text-greeting">
                {(() => {
                  const h = new Date().getHours();
                  const greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
                  const name = user?.displayName || user?.email?.split('@')[0] || '';
                  return name ? `${greet}, ${name.charAt(0).toUpperCase() + name.slice(1)}` : getTtl('Dashboard', ln);
                })()}
              </h1>
              <p className="responsiveText text-[var(--ink-muted)] mt-0.5">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })} · Financial overview {currentYear}
                {filtersActive && <span className="text-[var(--brand)] font-medium"> · filtered</span>}
              </p>
            </div>
            <div className="relative flex items-center gap-1">
              <DateRangePicker />
              <TooltipComp txt="Select Dates Range" />
            </div>
          </m.div>

          {/* FILTER BAR — Supplier / Client / Material (date range lives in the header) */}
          <m.div className="mb-5" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <div className="flex flex-wrap items-center gap-2 bg-[var(--bg-card)] border border-[var(--line)] rounded-2xl px-3 py-2.5 shadow-card">
              <span className="inline-flex items-center gap-1.5 pr-2 mr-0.5 border-r border-[var(--line)]">
                <span className="inline-flex items-center justify-center rounded-lg" style={{ background: 'var(--endeavour)', color: 'var(--on-brand)', width: 22, height: 22 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M3 5h18M6 12h12M10 19h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                </span>
                <span className="font-semibold" style={{ fontSize: 'var(--fs-body)', color: 'var(--chathams-blue)' }}>Filters</span>
                {filtersActive && (
                  <span className="inline-flex items-center justify-center rounded-full text-[var(--on-brand)] font-semibold"
                    style={{ background: 'var(--endeavour)', minWidth: 15, height: 15, fontSize: 'var(--fs-caption)', padding: '0 4px' }}>
                    {[fSupplier, fClient, fMaterial, fCurrency, fOrigin, fDelTerm].filter(Boolean).length}
                  </span>
                )}
              </span>

              <FilterSelect label="Supplier" value={fSupplier} onChange={setFSupplier}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M3 21V9l6-3v4l6-3v4l6-2v12H3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M8 21v-4h4v4" stroke="currentColor" strokeWidth="1.8" /></svg>}
                options={supplierOptions.map(o => ({ value: o.id, label: o.name }))} />
              <FilterSelect label="Client" value={fClient} onChange={setFClient}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" /><path d="M5 20c0-3.3 3.1-5 7-5s7 1.7 7 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                options={clientOptions.map(o => ({ value: o, label: o }))} />
              <FilterSelect label="Material" value={fMaterial} onChange={setFMaterial}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>}
                options={materialOptions.map(o => ({ value: o, label: o }))} />
              <FilterSelect label="Currency" value={fCurrency} onChange={setFCurrency}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" /><path d="M15 9.5c-.6-1-1.7-1.5-3-1.5-1.7 0-3 .9-3 2s1.3 2 3 2 3 .9 3 2-1.3 2-3 2c-1.3 0-2.4-.5-3-1.5M12 6v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                options={currencyOptions} />
              <FilterSelect label="Origin" value={fOrigin} onChange={setFOrigin}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" /></svg>}
                options={originOptions} />
              <FilterSelect label="Terms" value={fDelTerm} onChange={setFDelTerm}
                icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /><path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>}
                options={delTermOptions} />

              {filtersActive && (
                <button onClick={clearFilters} className="ml-auto whiteButton">
                  <BtnIcon action="clear" />
                  Clear all
                </button>
              )}
            </div>
          </m.div>

          {/* FX data-gap warning — a missing rate is counted at 1:1, not silently zeroed */}
          {(missingRate > 0 || companyExpAgg.missingCoRate > 0 || invoiceRevAgg.missingInvRate > 0) && (
            <div className="mb-4 flex items-center gap-2 rounded-2xl px-3 py-2" style={{ background: 'var(--warn-bg)', border: '1px solid var(--warn-border)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flex-shrink-0" style={{ color: 'var(--warn-text)' }}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M12 9v4m0 4h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
              <span className="responsiveTextTable" style={{ color: 'var(--warn-text)' }}>
                {[
                  missingRate > 0 && `${missingRate} EUR contract${missingRate === 1 ? '' : 's'}`,
                  companyExpAgg.missingCoRate > 0 && `${companyExpAgg.missingCoRate} EUR company expense${companyExpAgg.missingCoRate === 1 ? '' : 's'}`,
                  invoiceRevAgg.missingInvRate > 0 && `${invoiceRevAgg.missingInvRate} EUR sales invoice${invoiceRevAgg.missingInvRate === 1 ? '' : 's'}`,
                ].filter(Boolean).join(' and ')} missing an FX rate — counted at 1:1, so USD totals may be understated. Set the company EUR→USD rate in Settings, or a rate on each record, for accurate figures.
              </span>
            </div>
          )}

          {/* ── BUSINESS SUMMARY ──────────────────────────────────────────────
              The eight figures the client asked to see at a glance. Placed above
              the charts on purpose: this is the block they said they actually
              read. Every value is an aggregate that already existed on this page
              — nothing here is newly derived.

              Three cards were REMOVED from the KPI row below when this went in,
              because a card now carries the same information and a sparkline
              repeating it is just noise: Net Profit (Sold) -> Profit, Other
              Expenses -> Expenses, Storage Spend -> Warehouse & Storage. */}
          <BandHeader
            title="Purchasing & costs"
            subtitle="Contracts bought in this period, what they cost, and what came of them"
            period={`Contracts dated ${periodLabel}`}
            open={!collapsed.purchasing}
            onToggle={() => toggleBand('purchasing')}
          />
          {!collapsed.purchasing && (<>
          <div className="mb-4">
            {/* 8-across only from 2xl (1536). At 1440 with the sidebar open the
                content column is ~1200px, so eight tiles is ~145px each — enough
                for "$1.24K" and nothing else. Four across gives two comfortable
                rows at the width most people actually use. */}
            <div className="rounded-card border border-[var(--line)] shadow-card overflow-hidden" style={{ background: 'var(--line)' }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px">
              {/* AVERAGE RATE = average purchase cost per MT.
                  There is no metric called "Average Rate" in the app, and the
                  phrase could mean four different numbers, so this is a decision
                  rather than a lookup — recorded here so the next reader doesn't
                  have to guess. It resolves to avgCostPerMT (contract value ÷
                  tonnage purchased), which is the only candidate the dashboard
                  ALREADY computes; the alternatives (sale rate per MT, the
                  EUR→USD company rate, the storage rate per MT-month) would each
                  have needed a new derivation or a different page's logic.
                  The Per-MT strip below used to render this same figure as
                  "Avg Cost / MT"; that tile was removed when this went in, for
                  the same reason the three duplicated KPI cards were. */}
              <SummaryTile
                label="Average Rate"
                info="Total contract purchase value divided by tonnage purchased, for the selected period. This is a purchase cost per MT, not a sale price."
                icon={Gauge}
                toneKey="blue"
                value={fmtAutoKM(avgCostPerMT)}
                note="purchase cost per MT"
              />
              <SummaryTile
                label="Contract Expenses"
                info="Expenses recorded against the contracts in this period — freight, storage, commission and every other type — converted to USD. Company overheads are counted separately."
                icon={Receipt}
                toneKey="gray"
                value={fmtAutoKM(totalExpenses)}
                note="freight, storage, commission…"
              />
              {/* Overheads, from the companyExpenses collection the /companyexpenses
                  page reads. Separate tile, not merged into the one above: the two
                  answer different questions and only one of them is cost of trade. */}
              <SummaryTile
                label="Company Expenses"
                info="Overheads from the Company Expenses page for this period, converted to USD. They belong to no single contract, so they are excluded from the per-MT figures."
                icon={Building2}
                toneKey="gray"
                value={fmtAutoKM(companyExpAgg.total)}
                note={`${companyExpAgg.count} recorded, period`}
              />
              <SummaryTile
                label="Cost of Goods Sold"
                info="Purchase cost of the material actually sold, apportioned per contract by the share of its tonnage that shipped. Unsold material is inventory, not a cost."
                icon={Receipt}
                toneKey="gray"
                value={fmtAutoKM(cogs)}
                note="cost of material sold"
              />
              <SummaryTile
                label="Gross Profit"
                info="Deal basis: takes the contracts BOUGHT in this period, and from everything invoiced against them subtracts the cost of the material actually sold and the contract expenses. Unsold stock is inventory rather than a cost, so it is excluded. Before company overheads. This is a narrower revenue base than the Sales Revenue tile, which counts every invoice DATED in the period including sales of material bought earlier — the two answer different questions and will not reconcile."
                icon={TrendingUp}
                value={fmtAutoKM(totalPL)}
                note="deal basis, before overheads"
                toneKey={totalPL < 0 ? 'red' : 'green'}
                tone={totalPL < 0 ? 'var(--danger-text)' : 'var(--ok-figure)'}
              />
              <SummaryTile
                label="Net Profit"
                info="Gross profit minus company expenses."
                icon={TrendingUp}
                value={fmtAutoKM(netProfit)}
                note="after company expenses"
                toneKey={netProfit < 0 ? 'red' : 'green'}
                tone={netProfit < 0 ? 'var(--danger-text)' : 'var(--ok-figure)'}
              />
              </div>
            </div>
          </div>

          {/* PER-MT STRIP — unit economics. The KPI row that used to sit above it is gone: its
              three cards were Cost of Goods Sold (now a Business Summary tile), MT Purchased
              and Avg Profit / MT — and the last two were ALREADY in this strip, rendered a
              second time a few hundred pixels higher up. */}
          <PerMtStrip
            totalMT={totalMT}
            avgExpensePerMT={avgExpensePerMT}
            avgProfitPerMT={avgProfitPerMT}
            avgFreightPerMT={avgFreightPerMT}
          />

          {/* TONNAGE breakdown + UNSOLD STOCK. The receivables card used to be the third
              column here, which put an all-time open balance in the same row as two
              period-scoped tonnage cards. It has moved to the Position band with the
              aging card it belongs to. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <TonnageCard purchased={totalMT} shipped={shippedMT} pending={pendingMT} unsoldValue={unsoldValue} />
            <BreakdownCard
              title="Most-Sold Material"
              subtitle="By tonnage sold this period"
              entries={Object.entries(materialSold).filter(([, v]) => v > 0.01).sort((a, b) => b[1] - a[1])}
              total={shippedMT}
              fmtVal={(v) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v || 0)} MT`}
              accent="var(--brand)"
              clamp
              onPick={(name) => setFMaterial(fMaterial === name ? '' : name)}
              picked={fMaterial}
            />
          </div>

          {/* MAIN ROW — hero trend + capital breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <CardShell className="lg:col-span-2">
              <div className="p-4">
                <SectionHeader
                  title="Revenue, Costs & Profit"
                  subtitle="Sold basis — sales vs cost of material actually sold (unsold stock excluded) · selected period"
                />
                {/* 320 -> 220. The three series here (revenue, costs, profit) each
                    have a figure of their own in the Business Summary / KPI row
                    now, so this chart's job narrowed from "read the numbers off
                    it" to "see the shape" — which 220px does. */}
                <div style={{ height: 220 }}>
                  <Line data={heroData} options={heroOptions} />
                </div>
              </div>
            </CardShell>

            <CardShell>
              <div className="p-4">
                {/* "Deal basis" is stated because this ring decomposes a DIFFERENT revenue
                    figure from the Sales Revenue KPI above: contracts bought in the period
                    and everything invoiced against them, rather than invoices dated in the
                    period. The two are legitimately different cuts, but unlabelled they
                    read as one of them being wrong. */}
                <SectionHeader title="Capital Breakdown" subtitle="Deal basis — how the value of contracts bought this period was allocated" />
                {/* 200 -> 150: the legend underneath already lists every slice with
                    its value, so the ring is the redundant half of this card. */}
                <div className="relative" style={{ height: 150 }}>
                  <Doughnut data={donutData} options={donutOptions} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    style={{ opacity: donutHover ? 0 : 1, transition: 'opacity 120ms ease' }}>
                    <span className="responsiveTextTable text-[var(--regent-gray)]">Deal revenue</span>
                    <span className="font-semibold text-[var(--port-gore)]" style={{ fontSize: 'var(--fs-substat)', fontFamily: 'var(--font-jakarta), Manrope, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtAutoKM(totalInvoices)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex flex-col gap-2">
                  {donutLegend.map((d) => (
                    <div key={d.label} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="responsiveTextTable text-[var(--port-gore)] truncate">{d.label}</span>
                      </div>
                      <span className="responsiveTextTable font-semibold flex-shrink-0" style={{ color: d.color }}>{fmtAutoKM(d.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardShell>
          </div>

          {/* SUPPLIER RANKING + EXPENSES BY TYPE. The ranking was paired with Consignees,
              which looked tidy and read as one comparison — but the two count different
              things over different windows (purchase value of contracts bought here, sales
              invoiced there), so Consignees went to the Sales band. It then spent a stint
              at full width, which cost ~350px of scroll and bought nothing; Expenses by
              Type keeps it company instead. Neither passes a .slice() — BreakdownCard and
              RankingList fold their own tails. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <RankingList
              title="Contracts — $"
              subtitle="Contribution breakdown by contract values"
              labels={hbSupps.obj.labels || []}
              data={hbSupps.obj.datasets?.[0]?.data || []}
              totalValue={totalContracts}
              series={conAgg.suppSeries || {}}
              /* The card ranks by NAME; the filter holds a supplier id. Resolve here and
                 only offer the click when it resolves — "Unknown supplier" is a bucket of
                 ids that are not in settings, so there is nothing to filter to. */
              onPick={(name) => {
                const id = settings.Supplier?.Supplier?.find(s => s.nname === name)?.id;
                if (id) setFSupplier(fSupplier === id ? '' : id);
              }}
              picked={settings.Supplier?.Supplier?.find(s => s.id === fSupplier)?.nname}
            />
            <BreakdownCard
              title="Expenses by Type"
              subtitle="Freight, warehouse, commission, …"
              entries={Object.entries(expByType).filter(([, v]) => Math.abs(v) > 0.5).sort((a, b) => b[1] - a[1])}
              total={totalExpenses}
              fmtVal={(v) => fmtAutoKM(v)}
              accent="var(--pink-text)"
              onPick={(label) => setExpDrill(label)}
            />
          </div>
          </>)}

          {/* ══ BAND 2 — SALES ═══════════════════════════════════════════════════
              The only two figures on the page counted by INVOICE date. They are
              deliberately together and deliberately not next to the deal-basis
              profit block: these two reconcile with the Invoices Review, and the
              purchasing band above does not. */}
          <BandHeader
            title="Sales"
            subtitle="What was invoiced to clients in this period, whenever the material was bought"
            period={`Invoices dated ${periodLabel}`}
            open={!collapsed.sales}
            onToggle={() => toggleBand('sales')}
          />
          {!collapsed.sales && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
            <StatKpiCard
              title="Sales Revenue"
              info="Sales invoices dated in this period, converted to USD. An invoice superseded by a credit or final note counts once; drafts and cancelled invoices are excluded. This counts sales of material bought in earlier periods too, so it will NOT reconcile with the deal-basis profit figures above."
              value={fmtAutoKM(invoiceRevAgg.total)}
              chartData={invoiceRevAgg.byMonth}
              accent="var(--ok-figure)"
              icon={<svg width="16" height="16" fill="none" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="4" stroke="currentColor" strokeWidth="2" /><path d="M8 10h8M8 14h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>}
            />
            <div className="lg:col-span-2">
              <RankingList
                title="Consignees — $"
                subtitle="Sales revenue by client — invoices dated in the period"
                labels={clientRank.labels}
                data={clientRank.data}
                totalValue={invoiceRevAgg.total}
                series={invoiceRevAgg.byClientMonth || {}}
                // fClient already holds a client NAME, so this one needs no resolving.
                onPick={(name) => setFClient(fClient === name ? '' : name)}
                picked={fClient}
              />
            </div>
          </div>
          )}

          {/* ══ BAND 3 — POSITION ════════════════════════════════════════════════
              Nothing here answers to the date picker, and that is correct: an open
              balance is open regardless of which window you are looking at. The
              chip is muted rather than brand-tinted so the two period bands above
              stay visually paired and this one reads as a different kind of thing. */}
          <BandHeader
            title="Position"
            subtitle="Money still owed to you — a running total, not a period figure"
            period={`Open balances as of ${todayLabel}`}
            muted
            open={!collapsed.position}
            onToggle={() => toggleBand('position')}
          />
          {!collapsed.position && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
            <ReceivablesSplitCard byCur={receivables.byCur} />
            <AgingCard buckets={aging} />
          </div>
          )}

          {/* ══ BAND 4 — OTHER ═══════════════════════════════════════════════════ */}
          <BandHeader
            title="Other"
            subtitle="Standalone sales not linked to any contract"
            period={`Dated ${periodLabel}`}
            muted
            open={!collapsed.other}
            onToggle={() => toggleBand('other')}
          />
          {!collapsed.other && (
          <div className="grid grid-cols-1 gap-5 mb-5">
            <MiscInvoicesCard byCur={miscInvoices.byCur} byCat={miscInvoices.byCat} count={miscInvoices.count} />
          </div>
          )}

        </div>
      </div>

      <ExpenseDrillModal
        label={expDrill}
        rows={expDrill ? (expDetails[expDrill] || []) : []}
        settings={settings}
        isOpen={!!expDrill}
        setIsOpen={(v) => { if (!v) setExpDrill(null); }}
      />
    </LazyMotion>
  );
}

export default Dash;
