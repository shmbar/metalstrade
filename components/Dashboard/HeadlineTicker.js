'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function HeadlineTicker({
  title,
  subtitle,
  leftIcon: LeftIcon,
  rightSlot = null,
  items = [],
  speed = 60,
  pauseOnHover: _pauseOnHover,
  className = '',
  rightToLeft = true,
  gap = 28,
  variant = 'fx',
}) {
  const wrapRef  = useRef(null);
  const trackRef = useRef(null);

  const [duration,   setDuration]   = useState(18);
  const [repeat,     setRepeat]     = useState(2);
  const [isHovered,  setIsHovered]  = useState(false);
  const [thumbPct,   setThumbPct]   = useState(0);   // 0‥1

  const baseOffsetRef = useRef(0);   // current manual translateX (px, ≤ 0)
  const halfTrackRef  = useRef(0);   // half the track scrollWidth (= one loop length)

  const hasHeader = Boolean(title || subtitle || LeftIcon || rightSlot);

  // ── theme ──────────────────────────────────────────────────────────────────
  const theme = useMemo(() => {
    const t = {
      shell:         'border border-[#b8ddf8] bg-[#dbeeff] shadow-sm',
      headerIconWrap:'bg-[var(--endeavour)] text-white',
      titleText:     'text-[var(--chathams-blue)]',
      subText:       'text-[var(--endeavour)] text-xs',
      tickerDot:     'bg-[#b8ddf8]',
      itemLabel:     'text-slate-600 text-xs',
      itemValue:     'text-slate-900 text-sm font-bold',
      itemSub:       'text-slate-500 text-xs',
      itemPill:      'bg-white border border-[#b8ddf8] rounded-full shadow-sm',
      itemIcon:      'text-[var(--endeavour)]/70',
      hover:         'hover:shadow-md hover:border-[#b8ddf8]',
      mask:          'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
    };
    return t;
  }, [variant]);

  // ── repeated items ─────────────────────────────────────────────────────────
  const repeatedItems = useMemo(() => {
    if (!items?.length) return [];
    const out = [];
    for (let i = 0; i < repeat; i++) out.push(...items);
    return out;
  }, [items, repeat]);

  // ── duration calc ──────────────────────────────────────────────────────────
  useEffect(() => {
    const calc = () => {
      if (!wrapRef.current || !trackRef.current) return;
      const wrapW  = wrapRef.current.getBoundingClientRect().width;
      const trackW = trackRef.current.getBoundingClientRect().width;
      if (trackW < wrapW * 2 && items.length > 0 && repeat < 10) {
        setRepeat(r => Math.min(10, r + 1));
        return;
      }
      halfTrackRef.current = trackW / 2;
      const travel = Math.max(trackW / 2, wrapW);
      setDuration(Math.max(10, travel / speed));
    };
    calc();
    const t = setTimeout(calc, 60);
    window.addEventListener('resize', calc);
    return () => { clearTimeout(t); window.removeEventListener('resize', calc); };
  }, [items, speed, repeat]);

  // ── thumb helper ───────────────────────────────────────────────────────────
  const updateThumb = useCallback(() => {
    const half = halfTrackRef.current;
    if (half) setThumbPct(Math.abs(baseOffsetRef.current) / half);
  }, []);

  // ── hover enter: freeze animation, capture current position ───────────────
  const handleMouseEnter = useCallback(() => {
    if (!trackRef.current) return;
    const style  = window.getComputedStyle(trackRef.current);
    const matrix = new DOMMatrix(style.transform);
    baseOffsetRef.current  = matrix.m41;                        // current translateX
    halfTrackRef.current   = trackRef.current.scrollWidth / 2; // refresh

    // Remove the animation class immediately so inline transform wins
    trackRef.current.classList.remove('animate-ticker');
    trackRef.current.style.transform = `translateX(${baseOffsetRef.current}px)`;

    setIsHovered(true);
    updateThumb();
  }, [updateThumb]);

  // ── hover leave: restore animation from where we left off ─────────────────
  const handleMouseLeave = useCallback(() => {
    if (trackRef.current) {
      // Resume CSS animation from the same visual position via negative delay
      const half     = halfTrackRef.current;
      const elapsed  = half ? (Math.abs(baseOffsetRef.current) / half) * duration : 0;
      trackRef.current.style.animationDelay = `-${elapsed}s`;
      trackRef.current.style.transform      = '';
      // Force a reflow so the browser registers the new animationDelay
      // before the animation class is re-added — prevents the "stuck" bug
      void trackRef.current.offsetWidth;
      trackRef.current.classList.add('animate-ticker');
    }
    setIsHovered(false);
  }, [duration]);

  // ── arrow scroll ───────────────────────────────────────────────────────────
  const scroll = useCallback((dir) => {
    // dir +1 → scroll left (earlier items), dir -1 → scroll right (later items)
    baseOffsetRef.current = Math.max(
      -halfTrackRef.current,
      Math.min(0, baseOffsetRef.current + dir * 220)
    );
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${baseOffsetRef.current}px)`;
    }
    updateThumb();
  }, [updateThumb]);

  // ── scrollbar click ────────────────────────────────────────────────────────
  const handleScrollbarClick = useCallback((e) => {
    if (!halfTrackRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    baseOffsetRef.current = -pct * halfTrackRef.current;
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(${baseOffsetRef.current}px)`;
    }
    setThumbPct(pct);
  }, []);

  if (!items?.length) return null;

  // ── thumb dimensions (only used when hovered) ──────────────────────────────
  let thumbWidthPct = 20;
  let thumbLeftPct  = 0;
  if (isHovered && wrapRef.current && halfTrackRef.current) {
    const wrapW = wrapRef.current.getBoundingClientRect().width;
    thumbWidthPct = Math.max(8, Math.min(60, (wrapW / (halfTrackRef.current * 2)) * 100));
    thumbLeftPct  = thumbPct * (100 - thumbWidthPct);
  }

  const arrowBtn = (onClick, label, side) => (
    <button
      onMouseDown={e => e.preventDefault()}
      onClick={onClick}
      style={{
        position: 'absolute',
        top: '50%', [side]: 6,
        transform: 'translateY(-50%)',
        zIndex: 10,
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid #b8ddf8',
        borderRadius: '50%',
        width: 22, height: 22,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        fontSize: 9,
        color: 'var(--endeavour)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      ref={wrapRef}
      className={[
        'w-full overflow-hidden rounded-2xl',
        theme.shell,
        theme.hover,
        'transition-all duration-200',
        className,
      ].join(' ')}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      {hasHeader && (
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div className="flex items-center gap-3 min-w-0">
            {LeftIcon ? (
              <div className="w-8 h-8 rounded-xl bg-[var(--selago)] flex items-center justify-center">
                <LeftIcon className="w-4 h-4 text-[var(--endeavour)]" />
              </div>
            ) : null}
            <div className="min-w-0">
              {title    ? <div className={['text-sm font-bold leading-tight truncate', theme.titleText].join(' ')}>{title}</div>    : null}
              {subtitle ? <div className={['text-xs leading-tight truncate',           theme.subText].join(' ')}>{subtitle}</div> : null}
            </div>
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      )}

      {/* ── TICKER + ARROWS ─────────────────────────────────────────────────── */}
      <div className="relative">
        {isHovered && arrowBtn(() => scroll(+1), '◀', 'left')}

        <div
          className={hasHeader ? 'pt-1 pb-3' : 'py-3'}
          style={{
            maskImage:       isHovered ? 'none' : theme.mask,
            WebkitMaskImage: isHovered ? 'none' : theme.mask,
          }}
        >
          <div
            ref={trackRef}
            className={[
              'flex items-center w-max px-4 animate-ticker',
            ].join(' ')}
            style={{
              ['--ticker-duration']: `${duration}s`,
              columnGap: `${gap}px`,
            }}
          >
            {repeatedItems.map((it, idx) => {
              const Icon = it.icon;
              return (
                <div
                  key={`${it.key}-${idx}`}
                  className={['flex items-center whitespace-nowrap rounded-full px-2 py-0.5', theme.itemPill].join(' ')}
                >
                  {Icon ? <Icon className={['w-3.5 h-3.5 mr-2', theme.itemIcon].join(' ')} /> : null}
                  <div className="flex items-center">
                    <span className={['text-xs font-semibold', theme.itemLabel].join(' ')}>{it.label}</span>
                    <span className="mx-6 w-px h-4 bg-slate-200" />
                    <span className={['text-xs font-bold', theme.itemValue].join(' ')}>{it.value}</span>
                    {it.change != null && (
                      <span style={{
                        fontSize: '10px', fontWeight: 600, marginLeft: 5,
                        color: it.change >= 0 ? '#16a34a' : '#dc2626',
                      }}>
                        {it.change >= 0 ? '+' : ''}{it.change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        {it.change_pct != null ? ` (${it.change_pct >= 0 ? '+' : ''}${it.change_pct.toFixed(2)}%)` : ''}
                      </span>
                    )}
                    {it.subValue ? <span className={['text-xs ml-1', theme.itemSub].join(' ')}>{it.subValue}</span> : null}
                  </div>
                  {it.subValue ? <span className={['w-1.5 h-1.5 rounded-full ml-1', theme.tickerDot].join(' ')} /> : null}
                </div>
              );
            })}
          </div>
        </div>

        {isHovered && arrowBtn(() => scroll(-1), '▶', 'right')}
      </div>

      {/* ── MINI SCROLLBAR ──────────────────────────────────────────────────── */}
      {isHovered && (
        <div
          onClick={handleScrollbarClick}
          style={{
            height: 4, background: '#d8e8f5',
            margin: '0 16px 8px', borderRadius: 2,
            cursor: 'pointer', position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute', height: '100%',
              width: `${thumbWidthPct}%`,
              left:  `${thumbLeftPct}%`,
              background: 'var(--endeavour)',
              borderRadius: 2,
              transition: 'left 0.08s ease',
              pointerEvents: 'none',
            }}
          />
        </div>
      )}

      <style jsx>{`
        .animate-ticker {
          animation: ticker var(--ticker-duration) linear infinite;
          will-change: transform;
        }
        @keyframes ticker {
          from { transform: translateX(${rightToLeft ? '0'    : '-50%'}); }
          to   { transform: translateX(${rightToLeft ? '-50%' : '0'   }); }
        }
      `}</style>
    </div>
  );
}
