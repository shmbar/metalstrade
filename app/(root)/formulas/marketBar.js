'use client';
import { RefreshCw } from 'lucide-react';
import LoadingButton from '../../../components/LoadingButton';
import { labelCls } from './tabs/parts';

/* The five market figures every tab prices against, plus Save.
   Lifted out of page.js so it can be rendered on its own and measured — and
   because 90 lines of near-identical input markup inside a five-level-deep JSX
   tree is where the six-equal-columns problem went unnoticed in the first place.

   Content-sized, not six equal shares of the window. As a `lg:grid-cols-6` this
   bar gave "$1.70" and "1.17" a ~270px box each on a wide monitor and read as
   five near-empty fields (Zak, 2026-08-25). Each width below is what that
   figure and its label actually need; Save keeps the right edge. */

const field =
    'w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] responsiveTextTitle font-medium tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors';

const MarketBar = ({
    value,
    handleChange,
    focusedField,
    setFocusedField,
    addComma,
    refreshMetal,
    metalLoading,
    fx,
    fxLoading,
    refreshRate,
    onSave,
}) => {
    const g = value.general ?? {};
    const money = (name) =>
        focusedField === name ? g[name] || '' : addComma(g[name] || '0');

    return (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card p-4 mb-3">
            <div className="flex flex-wrap items-end gap-3">
                <div className="w-36">
                    <p className={`${labelCls} mb-1.5`}>Ni LME ($/MT)</p>
                    <div className="relative">
                        <input
                            type="text"
                            className={`${field} pl-2.5 pr-8`}
                            name="nilme"
                            value={money('nilme')}
                            onChange={(e) => handleChange(e, 'general')}
                            onFocus={() => setFocusedField('nilme')}
                            onBlur={() => setFocusedField(null)}
                        />
                        <button
                            onClick={refreshMetal}
                            title="Refresh live price"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-subtle)] transition-colors"
                        >
                            <RefreshCw className={`w-3 h-3 ${metalLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                <div className="w-28">
                    <p className={`${labelCls} mb-1.5`}>Mo Oxide ($/lb)</p>
                    <input
                        type="text"
                        className={`${field} px-2.5`}
                        name="MoOxideLb"
                        value={money('MoOxideLb')}
                        onChange={(e) => handleChange(e, 'general')}
                        onFocus={() => setFocusedField('MoOxideLb')}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>

                <div className="w-28">
                    <p className={`${labelCls} mb-1.5`}>Charge Cr ($/lb)</p>
                    <input
                        type="text"
                        className={`${field} px-2.5`}
                        name="chargeCrLb"
                        value={money('chargeCrLb')}
                        onChange={(e) => handleChange(e, 'general')}
                        onFocus={() => setFocusedField('chargeCrLb')}
                        onBlur={() => setFocusedField(null)}
                    />
                </div>

                <div className="w-28">
                    <p className={`${labelCls} mb-1.5`}>1 MT (lb)</p>
                    {/* The ' Lb' suffix used to be concatenated into the VALUE of this
                        editable input, so typing wrote "2204.62 Lb" straight back into
                        state. The unit lives in the label now. */}
                    <input
                        type="text"
                        className={`${field} px-2.5`}
                        name="mt"
                        value={g.mt ?? ''}
                        onChange={(e) => handleChange(e, 'general')}
                    />
                </div>

                {/* Live from the currency API, same affordance as Ni LME. The
                    title says which source and publication day the figure came
                    from, so "is this real?" is answerable without the console —
                    it read a fabricated 1.000 for months while nothing on screen
                    admitted the fetch had failed. */}
                <div className="w-28">
                    <p className={`${labelCls} mb-1.5`}>EUR / USD</p>
                    <div className="relative">
                        <input
                            type="text"
                            className={`${field} pl-2.5 pr-8`}
                            name="euroRate"
                            title={
                                fx
                                    ? `${fx.source} — rate published ${fx.date}${fx.stale ? ' (cached, live lookup failed)' : ''}`
                                    : 'Currency API unavailable — showing the last saved rate'
                            }
                            value={focusedField === 'euroRate' ? (g.euroRate ?? '') : Number(g.euroRate || 0).toFixed(3)}
                            onChange={(e) => handleChange(e, 'general')}
                            onFocus={() => setFocusedField('euroRate')}
                            onBlur={() => setFocusedField(null)}
                        />
                        <button
                            onClick={refreshRate}
                            title="Refresh live rate"
                            className={`absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded hover:bg-[var(--bg-subtle)] transition-colors ${fx ? 'text-[var(--ink-muted)] hover:text-[var(--brand)]' : 'text-[var(--danger-text)] hover:text-[var(--danger-strong)]'}`}
                        >
                            <RefreshCw className={`w-3 h-3 ${fxLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Sits next to EUR/USD, not pinned to the card's right edge
                    (Zak, 2026-08-26). Once the fields were sized to content, an
                    `ml-auto` Save left ~900px of empty bar between the last
                    figure and the button on a wide monitor. */}
                <LoadingButton onClick={onSave}>Save</LoadingButton>
            </div>
        </div>
    );
};

export default MarketBar;
