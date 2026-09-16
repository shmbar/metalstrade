import React, { useState } from 'react';
import { View, StyleProp, ViewStyle } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Text, Sheet, Avatar } from '@/components/ui';
import { Pressable } from '@/components/ui/Pressable';
import { useTheme } from '@/theme/ThemeProvider';
import { getShadow, palette } from '@/theme/tokens';
import { fmtAutoKM } from '@/lib/format';

/*
 * The dashboard's cards, as web draws them (app/(root)/dashboard/page.js): SummaryTile
 * panel, RankingList / BreakdownCard (TotalCell + RankTile + FoldToggle), TonnageCard,
 * the GIS Commission card, MiscInvoicesCard and DetailModal. Same labels, same order of
 * information, same fold rule; laid out for a phone, where web's own narrow breakpoint
 * already runs these grids two columns wide.
 *
 * Colours are web tokens: the light values come from palette (tokens.ts), the dark ones
 * from utils/themes.js DARK_* — ok-figure #74B896, teal-text #7BC0B8, pink-text #B9A3C6.
 * Soft fills are the token at low alpha over the card, as web's color-mix() washes are.
 */

const GAP = 6;

function useDash() {
  const { colors, scheme } = useTheme();
  const dark = scheme === 'dark';
  return {
    colors,
    scheme,
    okFigure: dark ? '#74B896' : palette.okFigure,
    teal: dark ? '#7BC0B8' : palette.tealText,
    pink: dark ? '#B9A3C6' : palette.pinkText,
    brandStrong: colors.info,
    brandSoft: colors.primary + (dark ? '29' : '1A'),
    brandBorder: colors.primary + (dark ? '59' : '40'),
  };
}

// web fmtPct
export const fmtPct = (p: number) => {
  if (!Number.isFinite(p) || p <= 0) return '0%';
  if (p < 0.1) return '<0.1%';
  return `${p.toFixed(p < 10 ? 1 : 0)}%`;
};

export const fmtMTWhole = (v: number) => `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(v || 0)} MT`;

/* web TAIL_AFTER / foldRows: the leader plus five, then one "N more" cell, so the collapsed
   grid never leaves a hole; a list only one past the cut shows whole. */
const TAIL_AFTER = 6;
function foldRows<T extends { value: number }>(rows: T[], expanded: boolean) {
  if (rows.length <= TAIL_AFTER + 1) return { shown: rows, hidden: [] as T[], tail: 0 };
  const shown = expanded ? rows : rows.slice(0, TAIL_AFTER);
  const hidden = expanded ? [] : rows.slice(TAIL_AFTER);
  return { shown, hidden, tail: hidden.reduce((a, r) => a + (Number(r.value) || 0), 0) };
}

/** web CardShell + SectionHeader */
export function DashCard({
  title,
  subtitle,
  children,
  style,
}: {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, scheme } = useTheme();
  return (
    <View
      style={[
        { backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, ...getShadow(scheme, 'sm') },
        style,
      ]}
    >
      {title ? (
        <View style={{ marginBottom: 12 }}>
          <Text variant="h3">
            {title}
          </Text>
          {subtitle ? (
            <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}
      {children}
    </View>
  );
}

// ── Business summary panel (web SummaryTile ×8) ───────────────────────────────

export type TileTone = 'gray' | 'green' | 'red' | 'blue';
export interface SummaryTileSpec {
  label: string;
  value: string;
  note: string;
  icon: { set: 'ion' | 'mci'; name: string };
  tone: TileTone;
  /** figure colour — web tints only the profit tiles */
  valueColor?: string;
  onPress?: () => void;
}

function SummaryTile({ t }: { t: SummaryTileSpec }) {
  const { colors } = useDash();
  const tones: Record<TileTone, { bg: string; fg: string }> = {
    gray: { bg: colors.surfaceAlt, fg: colors.textFaint },
    green: { bg: colors.positive + '1F', fg: colors.positive },
    red: { bg: colors.negative + '1F', fg: colors.negative },
    blue: { bg: colors.primary + '1A', fg: colors.info },
  };
  const tone = tones[t.tone];
  const Icon = t.icon.set === 'mci' ? MaterialCommunityIcons : Ionicons;
  return (
    <Pressable
      onPress={t.onPress}
      disabled={!t.onPress}
      accessibilityRole="button"
      accessibilityLabel={`Show the detail behind ${t.label}`}
      style={{ flex: 1, minWidth: 0, backgroundColor: colors.card, padding: 12, gap: 8 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: tone.bg }}>
          <Icon name={t.icon.name as any} size={13} color={tone.fg} />
        </View>
        <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
          {t.label}
        </Text>
      </View>
      <Text variant="stat" numberOfLines={1} adjustsFontSizeToFit style={{ color: t.valueColor || colors.text }}>
        {t.value}
      </Text>
      <Text variant="caption" tone="faint" numberOfLines={1}>
        {t.note}
      </Text>
    </Pressable>
  );
}

/** Web's eight tiles in one bordered panel with hairline dividers, two across on a phone. */
export function SummaryPanel({ tiles }: { tiles: SummaryTileSpec[] }) {
  const { colors, scheme } = useTheme();
  const rows: SummaryTileSpec[][] = [];
  for (let i = 0; i < tiles.length; i += 2) rows.push(tiles.slice(i, i + 2));
  return (
    <View style={{ borderRadius: 16, ...getShadow(scheme, 'sm') }}>
      <View style={{ borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', backgroundColor: colors.border, gap: 1 }}>
        {rows.map((r, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 1 }}>
            {r.map((t) => (
              <SummaryTile key={t.label} t={t} />
            ))}
            {r.length === 1 ? <View style={{ flex: 1, backgroundColor: colors.card }} /> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Ranking / breakdown grid (web RankingList, BreakdownCard) ──────────────────

/** web Sparkline — 12-month trend, muted line, the latest month as a dot in the accent. */
function Sparkline({ series, accent, w, h }: { series?: number[]; accent: string; w: number; h: number }) {
  const { colors } = useTheme();
  const vals = (series || []).map((v) => Number(v) || 0);
  const max = Math.max(...vals, 0);
  if (vals.length < 2 || !(max > 0)) return null;
  const step = w / (vals.length - 1);
  const pts = vals.map((v, i) => [i * step, h - 1.5 - (v / max) * (h - 3)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path d={d} fill="none" stroke={colors.textFaint} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" opacity={0.7} />
      <Circle cx={lx} cy={ly} r={2} fill={accent} />
    </Svg>
  );
}

export interface RankRow {
  label: string;
  value: number;
}

export function RankingGrid({
  title,
  subtitle,
  rows,
  total,
  totalLabel,
  format = (v: number) => fmtAutoKM(v),
  series,
  accent,
  avatar = false,
  onTotal,
  onPick,
}: {
  title: string;
  subtitle: string;
  rows: RankRow[];
  total: number;
  totalLabel: string;
  format?: (v: number) => string;
  series?: Record<string, number[]>;
  accent?: string;
  avatar?: boolean;
  onTotal?: () => void;
  onPick?: (label: string) => void;
}) {
  const { colors, scheme, brandStrong, brandBorder } = useDash();
  const tint = accent || colors.primary;
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(0);
  const cell = width > 0 ? (width - GAP) / 2 : undefined;

  // Share is of the card's own total; the meter is scaled to the leader (web RankTile).
  const sum = rows.reduce((a, r) => a + (Number(r.value) || 0), 0);
  const denom = total > 0 ? total : sum;
  const max = rows.reduce((m, r) => Math.max(m, r.value), 0);
  const { shown, hidden, tail } = foldRows(rows, expanded);
  // One x-domain for every sparkline in the card: cut at the last month anyone traded.
  const lastMonth = Object.values(series || {}).reduce((last, arr) => {
    for (let i = 11; i > last; i--) if ((arr?.[i] || 0) !== 0) return i;
    return last;
  }, 0);

  const cellBase: ViewStyle = { width: (cell ?? '48.5%') as any, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 8, minHeight: 58 };

  return (
    <DashCard title={title} subtitle={subtitle}>
      {rows.length === 0 ? (
        <Text variant="body" tone="faint" style={{ textAlign: 'center', paddingVertical: 12 }}>
          No data for this period
        </Text>
      ) : (
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
          {/* TotalCell — the only white cell among grey tiles, in the brand colour. */}
          <Pressable
            onPress={onTotal}
            disabled={!onTotal}
            accessibilityRole="button"
            accessibilityLabel={`Show everything behind ${totalLabel}`}
            style={{ ...cellBase, gap: 6, backgroundColor: colors.card, borderWidth: 1, borderColor: brandBorder, ...getShadow(scheme, 'sm') }}
          >
            <Text variant="captionStrong" numberOfLines={1} style={{ color: brandStrong }}>
              {totalLabel}
            </Text>
            <Text variant="stat" numberOfLines={1} adjustsFontSizeToFit style={{ color: brandStrong }}>
              {format(total)}
            </Text>
          </Pressable>

          {shown.map((r, idx) => {
            const hero = idx === 0 && !expanded;
            const pct = Math.max(0, Math.min(1, max > 0 ? r.value / max : 0)) * 100;
            return (
              <Pressable
                key={`${r.label}-${idx}`}
                onPress={onPick ? () => onPick(r.label) : undefined}
                disabled={!onPick}
                accessibilityRole="button"
                accessibilityLabel={`Show the records behind ${r.label}`}
                style={{ ...cellBase, gap: 4, overflow: 'hidden', backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}
              >
                {/* The meter: a wash filling to value / leader behind the text. */}
                <View
                  pointerEvents="none"
                  style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${pct}%`, backgroundColor: tint + '24', borderTopRightRadius: 4, borderBottomRightRadius: 4 }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  {avatar ? (
                    <Avatar name={r.label} size={hero ? 22 : 18} />
                  ) : (
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: tint }} />
                  )}
                  <Text variant="captionMedium" numberOfLines={1} style={{ flex: 1, color: colors.textFaint }}>
                    {r.label}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                  <Text variant={hero ? 'stat' : 'figure'} numberOfLines={1} adjustsFontSizeToFit style={{ flexShrink: 1 }}>
                    {format(r.value)}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <Sparkline series={(series?.[r.label] || []).slice(0, lastMonth + 1)} accent={tint} w={hero ? 40 : 32} h={hero ? 16 : 14} />
                    <Text variant="caption" style={{ color: colors.textFaint, fontVariant: ['tabular-nums'] }}>
                      {fmtPct(denom > 0 ? (r.value / denom) * 100 : 0)}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}

          {(hidden.length > 0 || (expanded && rows.length > TAIL_AFTER + 1)) && (
            <Pressable
              onPress={() => setExpanded((e) => !e)}
              accessibilityRole="button"
              style={{ ...cellBase, alignItems: 'center', justifyContent: 'center', gap: 2, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.borderStrong }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text variant="captionMedium" style={{ color: colors.textFaint }}>
                  {expanded ? 'Show less' : `${hidden.length} more`}
                </Text>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.textFaint} />
              </View>
              {!expanded ? (
                <Text variant="caption" tone="faint" style={{ fontVariant: ['tabular-nums'] }}>
                  {format(tail)}
                </Text>
              ) : null}
            </Pressable>
          )}
        </View>
      )}
    </DashCard>
  );
}

// ── Tonnage (web TonnageCard) ──────────────────────────────────────────────────

export function TonnageCard({
  purchased,
  shipped,
  pending,
  unsoldValue,
  onPress,
  onPill,
}: {
  purchased: number;
  shipped: number;
  pending: number;
  unsoldValue: number;
  onPress?: () => void;
  onPill?: (k: 'purchased' | 'shipped' | 'pending') => void;
}) {
  const { colors, scheme, brandStrong, brandSoft, brandBorder } = useDash();
  const pct = purchased > 0 ? Math.min(100, (shipped / purchased) * 100) : 0;
  // One journey at three stages: brand, ok, neutral — progress, not verdict.
  const pills = [
    { k: 'purchased' as const, label: 'PURCHASED', value: purchased, bg: brandSoft, ring: brandBorder, color: brandStrong },
    { k: 'shipped' as const, label: 'SHIPPED', value: shipped, bg: colors.positive + '1F', ring: colors.positive + '40', color: colors.positive },
    { k: 'pending' as const, label: 'PENDING', value: pending, bg: colors.surfaceAlt, ring: colors.borderStrong, color: colors.textMuted },
  ];
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12, ...getShadow(scheme, 'sm') }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary + '1A' }}>
            <Ionicons name="cube-outline" size={16} color={colors.primary} />
          </View>
          <Text variant="captionMedium" numberOfLines={2} style={{ flex: 1, color: colors.textFaint }}>
            Tonnage — Purchased vs Shipped
          </Text>
        </View>
        <Text variant="captionMedium" style={{ color: colors.positive }}>
          {pct.toFixed(0)}% shipped
        </Text>
      </View>

      <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.positive + '1F' }}>
        <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: colors.positive }} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {pills.map((p) => (
          <Pressable
            key={p.k}
            onPress={onPill ? () => onPill(p.k) : undefined}
            disabled={!onPill}
            accessibilityRole="button"
            accessibilityLabel={`Show ${p.k} tonnage`}
            style={{ flex: 1, minWidth: 0, borderRadius: 10, padding: 10, backgroundColor: p.bg, borderWidth: 1, borderColor: p.ring }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: p.color }} />
              <Text variant="overline" numberOfLines={1} style={{ color: p.color }}>
                {p.label}
              </Text>
            </View>
            <Text variant="figure" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4, color: p.color }}>
              {fmtMTWhole(p.value)}
            </Text>
          </Pressable>
        ))}
      </View>

      {unsoldValue > 0 && (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, borderRadius: 10, padding: 10, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border }}>
          <Text variant="caption" tone="faint" style={{ flex: 1 }}>
            Pending stock value · capital tied up, excluded from profit
          </Text>
          <Text variant="figure" tone="muted">{fmtAutoKM(unsoldValue)}</Text>
        </View>
      )}
    </Pressable>
  );
}

// ── GIS Commission (web page.js, the teal card beside Tonnage) ─────────────────

export function GisCommissionCard({
  total,
  byEntity,
  count,
  onPress,
}: {
  total: number;
  byEntity: { name: string; value: number }[];
  count: number;
  onPress?: () => void;
}) {
  const { colors, teal } = useDash();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel="Show the GIS commission payments"
      style={{ borderRadius: 16, borderWidth: 1, borderColor: teal + '38', backgroundColor: colors.card, overflow: 'hidden' }}
    >
      <View style={{ padding: 16, backgroundColor: teal + '12' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: teal + '29' }}>
            <MaterialCommunityIcons name="percent-outline" size={15} color={teal} />
          </View>
          <Text variant="captionMedium" style={{ color: colors.textFaint }}>
            GIS Commission
          </Text>
        </View>
        <Text variant="statLg" style={{ marginTop: 8, color: teal }}>{fmtAutoKM(total)}</Text>
        <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
          excluded from Contract Expenses
        </Text>
        {byEntity.length > 0 && (
          <View style={{ marginTop: 12, paddingTop: 12, gap: 6, borderTopWidth: 1, borderTopColor: teal + '2E' }}>
            {byEntity.map((e) => (
              <View key={e.name} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, minWidth: 0 }}>
                  <Avatar name={e.name} size={16} />
                  <Text variant="caption" tone="muted" numberOfLines={1} style={{ flex: 1 }}>
                    {e.name}
                  </Text>
                </View>
                <Text variant="captionMedium" style={{ fontVariant: ['tabular-nums'] }}>{fmtAutoKM(e.value)}</Text>
              </View>
            ))}
          </View>
        )}
        <Text variant="caption" style={{ marginTop: 8, color: teal }}>
          {count} payment{count === 1 ? '' : 's'} — tap for detail
        </Text>
      </View>
    </Pressable>
  );
}

// ── Misc invoices (web MiscInvoicesCard) ───────────────────────────────────────

const fmtCurFull = (cur: string, v: number) =>
  `${cur === 'us' ? '$' : cur === 'eu' ? '€' : ''}${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0)}`;

export function MiscInvoicesCard({
  byCur,
  byCat,
  count,
  onPress,
  onCategory,
}: {
  byCur: Record<string, number>;
  byCat: Record<string, { byCur: Record<string, number>; count: number }>;
  count: number;
  onPress?: () => void;
  onCategory?: (id: string) => void;
}) {
  const { colors, scheme, pink, brandStrong, brandSoft, brandBorder } = useDash();
  const entries = Object.entries(byCur).filter(([, v]) => Math.abs(v) > 0.005);
  const meta = [
    { id: 'shipments', label: 'Shipments', bg: brandSoft, ring: brandBorder, dot: colors.primary, color: brandStrong },
    { id: 'personal', label: 'Personal', bg: colors.primary + '1A', ring: colors.primary + '33', dot: colors.primary, color: colors.primary },
    { id: 'random', label: 'Random', bg: pink + '1A', ring: pink + '38', dot: pink, color: pink },
    { id: 'uncategorized', label: 'Uncategorized', bg: colors.surfaceAlt, ring: colors.borderStrong, dot: colors.textFaint, color: colors.textMuted },
  ];
  const cats = meta
    .map((c) => ({ ...c, byCur: byCat[c.id]?.byCur || {}, count: byCat[c.id]?.count || 0 }))
    .filter((c) => c.count > 0)
    .map((c) => ({ ...c, share: count > 0 ? (c.count / count) * 100 : 0 }));
  const single = entries.length === 1 ? entries[0] : null;
  const avg = single && count > 0 ? single[1] / count : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, gap: 12, ...getShadow(scheme, 'sm') }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: pink + '1A' }}>
          <Ionicons name="document-text-outline" size={16} color={pink} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text variant="captionMedium" numberOfLines={1} style={{ color: colors.textFaint }}>
            Misc Invoices · not linked to contracts
          </Text>
          <Text variant="caption" tone="faint">
            {count} invoice{count === 1 ? '' : 's'} in period
          </Text>
        </View>
      </View>

      {entries.length === 0 ? (
        <Text variant="caption" tone="faint">None in this period</Text>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {entries.map(([cur, v]) => (
            <View key={cur} style={{ borderRadius: 10, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: pink + '1A', borderWidth: 1, borderColor: pink + '33' }}>
              <Text variant="figure" style={{ color: pink }}>{fmtCurFull(cur, v)}</Text>
            </View>
          ))}
        </View>
      )}

      {cats.length > 0 && (
        <>
          <View style={{ height: 8, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.surfaceAlt }}>
            {cats.map((c) => (
              <View key={c.id} style={{ width: `${c.share}%`, backgroundColor: c.dot }} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {cats.map((c) => {
              const ents = Object.entries(c.byCur).filter(([, v]) => Math.abs(v) > 0.005);
              return (
                <Pressable
                  key={c.id}
                  onPress={onCategory ? () => onCategory(c.id) : undefined}
                  disabled={!onCategory}
                  accessibilityRole="button"
                  accessibilityLabel={`Show the ${c.label} invoices`}
                  style={{ width: '48.5%', borderRadius: 10, padding: 10, backgroundColor: c.bg, borderWidth: 1, borderColor: c.ring }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                    <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.dot }} />
                    <Text variant="overline" numberOfLines={1} style={{ color: c.color }}>
                      {c.label}
                    </Text>
                  </View>
                  <Text variant="figure" numberOfLines={1} adjustsFontSizeToFit style={{ marginTop: 4, color: c.color }}>
                    {ents.length === 0 ? '—' : ents.map(([cur, v]) => fmtCurFull(cur, v)).join(' / ')}
                  </Text>
                  <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                    {c.count} inv · {c.share.toFixed(0)}%
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {avg != null && single && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8 }}>
              <Text variant="caption" tone="faint">Avg / invoice</Text>
              <Text variant="captionStrong">{fmtCurFull(single[0], avg)}</Text>
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}

// ── Detail (web DetailModal) ───────────────────────────────────────────────────

export interface DetailLine {
  label: string;
  value: string;
  note?: string;
  result?: boolean;
}

export interface DetailRow {
  key: string;
  title: string;
  /** second line — who / what */
  meta?: string;
  /** third line — when / status */
  sub?: string;
  value: string;
  /** under the figure — as entered, paid/balance */
  valueSub?: string;
  /** a figure that is a state rather than an amount ("Not invoiced yet") */
  valueMuted?: boolean;
  valueTone?: 'negative';
}

export interface DashDetail {
  title: string;
  subtitle?: string;
  /** a derived figure's arithmetic — inputs, operator, result */
  formula?: DetailLine[];
  rows?: DetailRow[];
  /** footer total, when the rows add up to one */
  total?: string;
}

export function DetailSheet({ detail, onClose }: { detail: DashDetail | null; onClose: () => void }) {
  const { colors, brandStrong, brandSoft } = useDash();
  return (
    <Sheet
      visible={!!detail}
      onClose={onClose}
      title={detail?.title}
      subtitle={detail?.subtitle}
      footer={
        detail?.total ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text variant="bodyStrong">Total</Text>
            <Text variant="bodyStrong" style={{ fontVariant: ['tabular-nums'] }}>{detail.total}</Text>
          </View>
        ) : undefined
      }
    >
      {detail?.formula?.length ? (
        <View style={{ borderRadius: 14, borderWidth: 1, borderColor: colors.border, overflow: 'hidden', marginBottom: detail.rows ? 14 : 0 }}>
          {detail.formula.map((f, i) => (
            <View
              key={`${f.label}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                paddingHorizontal: 12,
                paddingVertical: 10,
                backgroundColor: f.result ? brandSoft : 'transparent',
                borderTopWidth: i ? 1 : 0,
                borderTopColor: colors.border,
              }}
            >
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text variant={f.result ? 'captionStrong' : 'caption'} style={{ color: f.result ? colors.text : colors.textMuted }}>
                  {f.label}
                </Text>
                {f.note ? (
                  <Text variant="caption" tone="faint" style={{ marginTop: 2 }}>
                    {f.note}
                  </Text>
                ) : null}
              </View>
              <Text variant={f.result ? 'h3' : 'bodyMedium'} style={{ color: f.result ? brandStrong : colors.text }}>
                {f.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {detail?.rows ? (
        detail.rows.length === 0 ? (
          <Text variant="body" tone="faint" style={{ textAlign: 'center', paddingVertical: 16 }}>
            No records for this period
          </Text>
        ) : (
          detail.rows.map((r, i) => (
            <View
              key={r.key}
              style={{ flexDirection: 'row', gap: 12, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}
            >
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text variant="bodyMedium" numberOfLines={1}>{r.title}</Text>
                {r.meta ? <Text variant="caption" tone="muted" numberOfLines={2}>{r.meta}</Text> : null}
                {r.sub ? <Text variant="caption" tone="faint" numberOfLines={2}>{r.sub}</Text> : null}
              </View>
              <View style={{ alignItems: 'flex-end', maxWidth: '45%' }}>
                <Text
                  variant={r.valueMuted ? 'body' : 'bodyMedium'}
                  numberOfLines={1}
                  style={{ color: r.valueMuted ? colors.textFaint : r.valueTone === 'negative' ? colors.negative : colors.text }}
                >
                  {r.value}
                </Text>
                {r.valueSub ? (
                  <Text variant="caption" tone="faint" numberOfLines={2} style={{ textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                    {r.valueSub}
                  </Text>
                ) : null}
              </View>
            </View>
          ))
        )
      ) : null}
    </Sheet>
  );
}
