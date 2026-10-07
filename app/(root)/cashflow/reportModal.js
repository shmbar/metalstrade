'use client';

/* Cashflow → Report: the current situation on one screen, from buildCashflowReport
   (report.js) — the same object the Excel export writes, so the dialog and the file
   never disagree, and both reconcile with the page.

   Reads top to bottom as the questions get asked: where do we stand (Left / Right /
   Balance and what makes them up — admins only, like the page), who owes us and for
   how long, whom we owe, what sits in the warehouses, and what is on hold. */

import Modal from '../../../components/modal';
import Avatar from '../../../components/Avatar';
import { BtnIcon } from '../../../components/buttonIcons';
import { amountToneClass } from '../../../components/statusUtils';
import { eurRateNote, moneyFull } from '@utils/currency';

const usd = (v) => moneyFull('us', v);
const pct = (v) => `${(v * 100).toFixed(1)}%`;
const mt = (v) => `${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} MT`;
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

const Card = ({ title, children, className = '' }) => (
    <section className={`border border-[var(--line)] rounded-2xl bg-[var(--bg-card)] p-3 min-w-0 ${className}`}>
        <h4 className="responsiveTextTitle font-semibold text-[var(--ink)] mb-2">{title}</h4>
        {children}
    </section>
);

// Label over figure, the KPI-strip reading order at a smaller size.
const Fact = ({ label, value, sub, strong = false }) => (
    <div className="min-w-0">
        <div className="responsiveTextTable text-[var(--ink-muted)] truncate">{label}</div>
        <div className={`${strong ? 'responsiveTextTitle' : 'responsiveText'} font-medium tabular-nums text-[var(--ink)] truncate`}>{value}</div>
        {sub ? <div className="responsiveTextTable text-[var(--ink-muted)] truncate">{sub}</div> : null}
    </div>
);

// A share, drawn: a thin bar under a row, so the biggest items stand out at a glance.
const ShareBar = ({ share }) => (
    <div className="h-1 rounded-full bg-[var(--bg-subtle)] overflow-hidden mt-0.5">
        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${Math.max(0, Math.min(1, share)) * 100}%`, opacity: 0.55 }} />
    </div>
);

// Label · amount · share rows (Position, ageing).
const ShareList = ({ rows, total, totalLabel }) => (
    <div className="flex flex-col gap-1.5">
        {rows.map((r, i) => (
            <div key={i} className="min-w-0">
                <div className="flex items-baseline justify-between gap-2 responsiveText">
                    <span className="truncate text-[var(--ink-secondary)]">
                        {r.label}{r.count != null ? <span className="text-[var(--ink-muted)]"> · {r.count}</span> : null}
                    </span>
                    <span className="flex items-baseline gap-2 shrink-0">
                        <span className={`tabular-nums font-medium text-[var(--ink)] ${amountToneClass(r.amount)}`}>{usd(r.amount)}</span>
                        <span className="responsiveTextTable tabular-nums text-[var(--ink-muted)] w-12 text-right">{pct(r.share)}</span>
                    </span>
                </div>
                <ShareBar share={r.share} />
            </div>
        ))}
        {totalLabel ? (
            <div className="flex items-baseline justify-between gap-2 responsiveText border-t border-[var(--line-strong)] pt-1 mt-0.5">
                <span className="font-medium text-[var(--ink)]">{totalLabel}</span>
                <span className="tabular-nums font-medium text-[var(--ink)] mr-14">{usd(total)}</span>
            </div>
        ) : null}
    </div>
);

// Top parties: avatar chip + name, count, amount, share.
const TopTable = ({ rows, party, unit, amountLabel = 'Amount' }) => rows.length ? (
    <table className="cashflow-detail-table w-full table-auto mt-2">
        <thead>
            <tr>
                <th className="text-left">{party}</th>
                <th className="text-center">{unit}</th>
                <th className="text-right">{amountLabel}</th>
                <th className="text-right">Share</th>
            </tr>
        </thead>
        <tbody>
            {rows.map((t, i) => (
                <tr key={i}>
                    <td className="text-left">
                        <span className="flex items-center gap-1.5 min-w-0">
                            <Avatar name={t.name} size={18} />
                            <span className="truncate">{t.name}</span>
                        </span>
                    </td>
                    <td className="text-center tabular-nums">{t.count}</td>
                    <td className={`text-right tabular-nums ${amountToneClass(t.amount)}`}>{usd(t.amount)}</td>
                    <td className="text-right tabular-nums text-[var(--ink-muted)]">{pct(t.share)}</td>
                </tr>
            ))}
        </tbody>
    </table>
) : null;

const FactGrid = ({ children }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2">{children}</div>
);

export default function CashflowReportModal({ isOpen, setIsOpen, report, onDownload, downloading = false }) {
    if (!report) return null;
    const { position: pos, receivables: rc, payables: pb, stock: st, expenses: ex, holds } = report;
    const when = report.asOf instanceof Date ? report.asOf : new Date(report.asOf);
    const subtitle = [
        report.account,
        `as of ${when.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
        report.years?.length ? `years ${report.years.join(', ')}` : '',
    ].filter(Boolean).join(' · ');
    const glance = report.sections.filter(s => s.parties.length);
    const HOLDS_SHOWN = 10;

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title="Cashflow report" subtitle={subtitle} size="xl">
            <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[var(--bg-card)] border-b border-[var(--line)]">
                <span className="responsiveTextTable text-[var(--ink-muted)]">
                    Figures match the page. Invoices on hold (Pending) are left out of every total and listed at the end.
                    {report.fx?.hasEuro ? ` ${eurRateNote(report.fx)}.` : ''}
                </span>
                <button type="button" className="blackButton" onClick={onDownload} disabled={downloading}>
                    <BtnIcon action={downloading ? 'saving' : 'excel'} spin={downloading} />
                    {downloading ? 'Preparing…' : 'Download Excel'}
                </button>
            </div>

            <div className="p-4 flex flex-col gap-3">
                {pos && (
                    <Card title="Position">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                            <div className="rounded-lg bg-[var(--brand-soft)] px-3 py-2">
                                <Fact label="Total (Left)" value={usd(pos.leftTotal)} strong />
                            </div>
                            <div className="rounded-lg bg-[var(--brand)] px-3 py-2 text-[var(--on-brand)]">
                                <div className="responsiveTextTable opacity-80">Balance (Left − Right)</div>
                                <div className="responsiveTextTitle font-medium tabular-nums">{usd(pos.balance)}</div>
                            </div>
                            <div className="rounded-lg bg-[var(--brand-soft)] px-3 py-2">
                                <Fact label="Total (Right)" value={usd(pos.rightTotal)} strong />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div>
                                <div className="responsiveTextTable font-semibold text-[var(--ink-muted)] mb-1">Left — what we have or are owed</div>
                                <ShareList rows={pos.left} total={pos.leftTotal} totalLabel="Total (Left)" />
                            </div>
                            <div>
                                <div className="responsiveTextTable font-semibold text-[var(--ink-muted)] mb-1">Right — what we owe</div>
                                <ShareList rows={pos.right} total={pos.rightTotal} totalLabel="Total (Right)" />
                            </div>
                        </div>
                    </Card>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    <Card title="Receivables — clients">
                        <FactGrid>
                            <Fact label="Clients due" value={usd(rc.due)} sub={plural(rc.openCount, 'open invoice')} strong />
                            <Fact label="No payment yet" value={usd(rc.noPaymentYet)} />
                            <Fact label="Partly paid" value={usd(rc.partlyPaid)} />
                            <Fact label="Not finalized" value={usd(rc.notFinalAmount)} sub={plural(rc.notFinalCount, 'invoice')} />
                            <Fact label="On hold" value={usd(rc.pendingTotal)} sub={plural(rc.pendingCount, 'invoice')} />
                        </FactGrid>
                        <div className="responsiveTextTable font-semibold text-[var(--ink-muted)] mt-3 mb-1">Age, from invoice date</div>
                        <ShareList rows={[...rc.aging, ...(rc.undated.count ? [{ label: 'No invoice date', ...rc.undated, share: 0 }] : [])]} />
                        <TopTable rows={rc.top} party="Largest clients" unit="Invoices" amountLabel="Due" />
                    </Card>

                    <Card title="Payables — suppliers">
                        <FactGrid>
                            <Fact label="Suppliers due" value={usd(pb.due)} sub={plural(pb.openCount, 'open invoice')} strong />
                            <Fact label="No payment yet" value={usd(pb.noPaymentYet)} />
                            <Fact label="Partly paid" value={usd(pb.partlyPaid)} />
                            <Fact label="On hold" value={usd(pb.pendingTotal)} sub={plural(pb.pendingCount, 'invoice')} />
                        </FactGrid>
                        <TopTable rows={pb.top} party="Largest suppliers" unit="Invoices" amountLabel="Due (USD)" />
                    </Card>

                    <Card title="Stock">
                        <FactGrid>
                            <Fact label="Stock value" value={usd(st.total)} strong />
                            <Fact label="Paid" value={usd(st.paid)} sub={mt(st.paidQty)} />
                            <Fact label="UnPaid" value={usd(st.unpaid)} sub={mt(st.unpaidQty)} />
                            <Fact label="On hold" value={usd(st.pendingTotal)} sub={plural(st.pendingCount, 'line')} />
                            <Fact label="Unsold (bought, not sold)" value={usd(st.unsold)} sub={mt(st.unsoldQty)} />
                        </FactGrid>
                        <TopTable rows={st.top} party="Largest warehouses" unit="Lines" amountLabel="Value" />
                    </Card>

                    <Card title="Expenses and unsold stock">
                        <FactGrid>
                            <Fact label="Outstanding expenses" value={usd(ex.total)} sub={plural(ex.count, 'item')} strong />
                        </FactGrid>
                        <TopTable rows={ex.top} party="Largest vendors" unit="Items" amountLabel="Amount (USD)" />
                        <TopTable rows={st.unsoldTop} party="Unsold, by supplier" unit="Lines" amountLabel="Value" />
                    </Card>
                </div>

                <Card title="Sections at a glance">
                    <div className="overflow-x-auto">
                        <table className="cashflow-detail-table w-full table-auto">
                            <thead>
                                <tr>
                                    <th className="text-left">Section</th>
                                    <th className="text-center">Parties</th>
                                    <th className="text-center">Invoices / lines</th>
                                    <th className="text-right">Amount</th>
                                    <th className="text-right">On hold</th>
                                </tr>
                            </thead>
                            <tbody>
                                {glance.map(s => (
                                    <tr key={s.key}>
                                        <td className="text-left">{s.title}</td>
                                        <td className="text-center tabular-nums">{s.parties.length}</td>
                                        <td className="text-center tabular-nums">{s.rowCount}</td>
                                        <td className={`text-right tabular-nums ${amountToneClass(s.total)}`}>{usd(s.total)}</td>
                                        <td className="text-right tabular-nums text-[var(--ink-muted)]">
                                            {s.pendingCount ? `${usd(s.pendingTotal)} · ${s.pendingCount}` : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                <Card title={`On hold (Pending) — ${plural(holds.length, 'item')}`}>
                    {holds.length ? (
                        <div className="overflow-x-auto">
                            <table className="cashflow-detail-table w-full table-auto">
                                <thead>
                                    <tr>
                                        <th className="text-left">Party</th>
                                        <th className="text-left">Section</th>
                                        <th className="text-left">Reference</th>
                                        <th className="text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {holds.slice(0, HOLDS_SHOWN).map((h, i) => (
                                        <tr key={i}>
                                            <td className="text-left">
                                                <span className="flex items-center gap-1.5 min-w-0">
                                                    <Avatar name={h.party} size={18} />
                                                    <span className="truncate">{h.party}</span>
                                                </span>
                                            </td>
                                            <td className="text-left text-[var(--ink-secondary)]">{h.section}</td>
                                            <td className="text-left text-[var(--ink-secondary)]">{h.reference}</td>
                                            <td className={`text-right tabular-nums ${amountToneClass(h.amount)}`}>{moneyFull(h.cur, h.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {holds.length > HOLDS_SHOWN && (
                                <p className="responsiveTextTable text-[var(--ink-muted)] mt-1">
                                    …and {holds.length - HOLDS_SHOWN} more in the Excel file.
                                </p>
                            )}
                        </div>
                    ) : (
                        <p className="responsiveText text-[var(--ink-muted)]">Nothing is on hold.</p>
                    )}
                </Card>
            </div>
        </Modal>
    );
}
