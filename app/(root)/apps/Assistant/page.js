'use client';
import { Fragment, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
import Toast from '../../../../components/toast.js';
import { loadData, loadMarginsRange, loadAllStockData, loadCompanyExpenses, resolveInvoiceDate, groupInvoicesByNumber, computeStockNetSummary } from '../../../../utils/utils';
import { effectiveDueDate } from '../../../../utils/finance';
import { authedFetch, trimHistory, chatStorageKey } from '../../../../utils/aiClient';
import { BtnIcon } from '../../../../components/buttonIcons';
import dateFormat from "dateformat";

/* What the Assistant can be asked, grouped the way the business thinks about it.
   They open the empty page as cards; once a conversation is going, each answer
   offers its own follow-ups instead (see FOLLOW_UPS in app/api/assistant). */
const SUGGESTIONS = [
    { category: 'Receivables', text: 'Show overdue invoices' },
    { category: 'Receivables', text: 'Which client owes the most?' },
    { category: 'Costs', text: 'Show unpaid expenses' },
    { category: 'Performance', text: 'What is my profit this month?' },
    { category: 'Contracts', text: 'Contract status breakdown' },
    { category: 'Help', text: 'How do I create an invoice?' },
];

/* A ranking under an answer ("which client owes the most?"), drawn as bars so the
   gap between first and second is visible at a glance. The top row is the answer,
   so it alone gets the full brand colour; the rest are context. Brand, not status
   colours — nothing here is good or bad. */
const RankingBlock = ({ ranking }) => {
    const max = Math.max(...ranking.rows.map((r) => Number(r.value) || 0), 0);
    return (
        <div className="border-t border-[var(--line)] pt-3 flex flex-col gap-2">
            <span className="text-micro font-semibold uppercase tracking-wide text-[var(--ink-muted)]">{ranking.title}</span>
            <div className="grid grid-cols-[minmax(72px,140px)_1fr_auto] gap-x-3 gap-y-1.5 items-center responsiveTextTable">
                {ranking.rows.map((r, i) => {
                    const pct = max > 0 ? Math.max(2, Math.round(((Number(r.value) || 0) / max) * 100)) : 0;
                    const top = i === 0;
                    return (
                        <Fragment key={`${r.label}-${i}`}>
                            <span className={`truncate ${top ? 'font-semibold text-[var(--ink)]' : 'text-[var(--ink-secondary)]'}`} title={r.label}>{r.label}</span>
                            <span className="block h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
                                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: top ? 'var(--brand)' : 'var(--brand-border)' }} />
                            </span>
                            <span className={`numeric text-right whitespace-nowrap ${top ? 'text-[var(--ink)]' : 'text-[var(--ink-secondary)]'}`}>{r.display}</span>
                        </Fragment>
                    );
                })}
            </div>
        </div>
    );
};
// The final stream event can carry sources, a ranking and follow-up questions.
const hasStructure = (p) => (Array.isArray(p.sources) && p.sources.length > 0)
    || (p.ranking && Array.isArray(p.ranking.rows) && p.ranking.rows.length > 0)
    || (Array.isArray(p.followUps) && p.followUps.length > 0);
const structureOf = (p) => ({
    ...(Array.isArray(p.sources) && p.sources.length ? { sources: p.sources } : {}),
    ...(p.ranking?.rows?.length ? { ranking: p.ranking } : {}),
    ...(Array.isArray(p.followUps) && p.followUps.length ? { followUps: p.followUps } : {}),
});

const AssistantChat = () => {
    const { settings, dateSelect, compData } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const router = useRouter();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [syncedAt, setSyncedAt] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);

    // The conversation survives leaving the page, the way the floating chat's
    // already does — this one was thrown away on every navigation, which on the
    // page you go to *in order to* have a conversation is the wrong way round.
    // Keyed per workspace so switching IMS <-> GIS does not surface the other
    // company's thread.
    const storageKey = chatStorageKey('assistant', uidCollection);

    useEffect(() => {
        if (!uidCollection) return;
        try {
            const saved = localStorage.getItem(storageKey);
            const parsed = saved ? JSON.parse(saved) : null;
            setMessages(Array.isArray(parsed) ? parsed : []);
        } catch { setMessages([]); }
    }, [storageKey, uidCollection]);

    useEffect(() => {
        if (!uidCollection || !messages.length) return;
        try { localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50))); }
        catch { /* private mode / quota — the thread just won't survive a reload */ }
    }, [messages, storageKey, uidCollection]);

    // Leaving mid-answer should stop the request, not leave it streaming into a
    // component that no longer exists.
    useEffect(() => () => abortRef.current?.abort(), []);

    const [contractsData, setContractsData] = useState([]);
    const [invoicesData, setInvoicesData] = useState([]);
    const [expensesData, setExpensesData] = useState([]);
    const [stocksData, setStocksData] = useState([]);
    const [marginsData, setMarginsData] = useState([]);

    const loadAllData = useCallback(async (force = false) => {
        if (!uidCollection || !dateSelect) return;
        if (!force && contractsData.length > 0) return;
        setDataLoading(true);
        try {
            // Load BOTH supplier expenses AND companyExpenses — Cashflow aggregates
            // both, so the assistant must too or it'll miss overdue payables that
            // live in the companyExpenses collection.
            const [contracts, invoices, expenses, companyExpenses, stocks, margins] = await Promise.all([
                loadData(uidCollection, 'contracts', dateSelect),
                loadData(uidCollection, 'invoices', dateSelect),
                loadData(uidCollection, 'expenses', dateSelect),
                loadCompanyExpenses(uidCollection, 'companyExpenses', dateSelect).catch(() => []),
                loadAllStockData(uidCollection).catch(() => []),
                loadMarginsRange(uidCollection, dateSelect).catch(() => []),
            ]);
            const taggedSupplier = (expenses || []).map(e => ({ ...e, kind: 'Supplier' }));
            const taggedCompany = (companyExpenses || []).map(e => ({ ...e, kind: 'Company' }));
            setContractsData(contracts || []);
            setInvoicesData(invoices || []);
            setExpensesData([...taggedSupplier, ...taggedCompany]);
            setStocksData(stocks || []);
            setMarginsData(margins || []);
            setSyncedAt(new Date());
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setDataLoading(false);
        }
    }, [uidCollection, dateSelect, contractsData.length]);

    useEffect(() => { loadAllData(); }, [uidCollection, dateSelect]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    const getCurrentDataContext = useCallback(() => {
        const clientList = settings?.Client?.Client || [];
        const supplierList = settings?.Supplier?.Supplier || [];
        const currencyList = settings?.Currency?.Currency || [];
        const expPmntList = settings?.ExpPmnt?.ExpPmnt || [];
        const expTypeList = settings?.Expenses?.Expenses || [];
        const resolveExpType = (id) => expTypeList.find(e => e.id === id)?.expType || id || 'Unknown';

        const resolveClient = (f) =>
            f?.nname ? f.nname : clientList.find(c => c.id === f)?.nname || f || 'Unknown';
        // Full company name for fuzzy text search ("Prime Metals" should match even if nname is just "Prime")
        const resolveClientFull = (f) => {
            if (f?.client) return f.client;
            const obj = clientList.find(c => c.id === f);
            return obj?.client || obj?.nname || (typeof f === 'string' ? f : '') || '';
        };
        const resolveSupplier = (f) =>
            f?.nname ? f.nname : supplierList.find(s => s.id === f)?.nname || f || 'Unknown';
        const resolveCurrency = (f) =>
            f?.cur ? f.cur : currencyList.find(c => c.id === f)?.cur || f || '';

        // Default payment term (Settings → General), the SAME resolution the floating
        // chat, the dashboard and the alerts bar use. This page used to pass the bare
        // delDate instead, and delDate is filled on 2 of 532 outstanding invoices — so
        // "show overdue invoices" answered with an empty DUE section and dumped every
        // unpaid invoice into "BALANCE — not yet due", which is a different question.
        const termDays = parseInt(compData?.defaultTermDays, 10) > 0 ? parseInt(compData.defaultTermDays, 10) : 30;

        return {
            contracts: contractsData.map(con => ({
                id: con.id,
                order: con.order,
                supplier: resolveSupplier(con.supplier),
                date: con.date,
                currency: resolveCurrency(con.cur),
                status: con.conStatus || (con.completed ? 'Completed' : 'Open'),
                products: (con.productsData || []).filter(p => !p.import).length,
                // import-flagged products are breakdown/merge helpers — counting them
                // would double the contract value.
                totalValue: (con.productsData || []).filter(p => !p.import).reduce((sum, p) => {
                    const price = parseFloat(p.unitPrc) || 0;
                    return sum + price * (parseFloat(p.qnty) || 0);
                }, 0),
                shipmentEtd: con.shipmentEtd || null,
                shipmentEta: con.shipmentEta || null,
                shipmentStatus: con.shipmentStatus || null,
            })),
            // Group by invoice number so credit notes / final settlements don't
            // double-count when summing balances per client / per currency.
            invoices: groupInvoicesByNumber(invoicesData).map(inv => {
                // Project model: `draft` is a manual checkbox flagging not-yet-real invoices.
                // The formal `final` flag is rarely set (its finalize action is disabled),
                // so an "issued" invoice = NOT a draft and NOT canceled — matching how the
                // Cashflow page computes outstanding client debt.
                const isDraft = inv.draft === true;
                const isCanceled = !!inv.canceled;
                const isIssued = !isDraft && !isCanceled;
                const invoiceStatus = isCanceled ? 'Canceled' : isDraft ? 'Draft' : 'Issued';
                const totalAmt = parseFloat(inv.totalAmount) || 0;
                const totalPaid = (inv.payments || []).reduce((s, p) => s + (parseFloat(p.pmnt) || 0), 0);
                const balanceDue = inv.debtBlnc != null
                    ? parseFloat(inv.debtBlnc)
                    : totalAmt - totalPaid;
                const paymentStatus = balanceDue <= 0 ? 'Paid'
                    : totalPaid > 0 ? 'Partially Paid' : 'Unpaid';
                return {
                    id: inv.id,
                    invoice: inv.invoice,
                    client: resolveClient(inv.client),
                    clientFull: resolveClientFull(inv.client),
                    date: resolveInvoiceDate(inv),
                    invoiceStatus,
                    paymentStatus,
                    totalAmount: totalAmt,
                    amountPaid: totalPaid,
                    balanceDue: balanceDue > 0 ? balanceDue : 0,
                    currency: resolveCurrency(inv.cur),
                    dueDate: effectiveDueDate(inv, termDays),
                    canceled: isCanceled,
                    isFinal: isIssued,
                    etd: inv.shipData?.etd?.startDate || null,
                    eta: inv.shipData?.eta?.startDate || null,
                    reminders: inv.reminders || [],
                };
            }),
            expenses: expensesData.map(exp => {
                // Project's TRUE convention: exp.paid === '111' means paid; everything
                // else (undefined, '222', custom statuses) means unpaid.
                const isPaid = exp.paid === '111';
                const paidLabel = expPmntList.find(p => p.id === exp.paid)?.paid
                    || (exp.paid === '111' ? 'Paid' : exp.paid === '222' ? 'Unpaid' : exp.paid || 'Unknown');
                return {
                    id: exp.id,
                    kind: exp.kind || 'Supplier',  // Supplier (regular) | Company (overhead)
                    vendor: resolveSupplier(exp.supplier) || exp.vendor || (exp.kind === 'Company' ? 'Company expense' : 'Unknown'),
                    date: exp.date,
                    amount: parseFloat(exp.amount) || 0,
                    currency: resolveCurrency(exp.cur),
                    type: resolveExpType(exp.expType) || exp.type || '—',
                    paid: paidLabel,
                    isPaid,
                };
            }),
            // NET in-stock rows (received − sold, final-settlement corrections, and
            // original-vs-final dedup) with resolved MT/unit labels — the same numbers
            // the Stocks page shows. Raw lot rows made the AI count sold material as
            // still in stock and guess at units.
            stocks: computeStockNetSummary(stocksData, settings),
            margins: marginsData.map(m => ({
                month: m.month,
                totalMargin: parseFloat(m.totalMargin) || 0,
                incoming: parseFloat(m.incoming) || 0,
                itemCount: m.items?.length || 0,
                items: (m.items || []).map(item => ({
                    description: item.description || '',
                    supplier: item.supplier || '',
                    client: item.client || '',
                    purchase: parseFloat(item.purchase) || 0,
                    totalMargin: parseFloat(item.totalMargin) || 0,
                    shipped: parseFloat(item.shipped) || 0,
                    openShip: parseFloat(item.openShip) || 0,
                })),
            })),
            marginAlertThreshold: settings?.MarginAlert?.threshold != null
                ? parseFloat(settings.MarginAlert.threshold)
                : 5,
        };
        // defaultTermDays decides which invoices count as overdue, so a change to it in
        // Settings → General has to rebuild this payload, not wait for a reload.
    }, [contractsData, invoicesData, expensesData, stocksData, marginsData, settings, compData?.defaultTermDays]);

    const handleSendMessage = async (messageText = null) => {
        const textToSend = messageText || newMessage.trim();
        if (!textToSend || isLoading) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: textToSend,
            time: dateFormat(new Date(), 'h:MM TT'),
        };

        setMessages(prev => [...prev, userMsg]);
        setNewMessage('');
        setIsLoading(true);

        const msgId = `assistant-${Date.now()}`;

        // One controller per request: Stop cancels it, and so does leaving the page.
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            // Trimmed, not the whole thread — see MAX_CHAT_HISTORY.
            const apiMessages = trimHistory([...messages, userMsg]);

            const response = await authedFetch('/api/assistant', {
                method: 'POST',
                signal: controller.signal,
                body: JSON.stringify({
                    messages: apiMessages,
                    currentData: getCurrentDataContext(),
                    currentPage: typeof window !== 'undefined' ? window.location.pathname : '/apps/Assistant',
                    dateRange: dateSelect,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to get response');
            }

            // Add empty assistant message to stream into
            setMessages(prev => [...prev, {
                id: msgId,
                role: 'assistant',
                content: '',
                time: dateFormat(new Date(), 'h:MM TT'),
                isStreaming: true,
            }]);

            // Read SSE stream
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') break;
                    try {
                        const parsed = JSON.parse(payload);
                        const { text, error } = parsed;
                        if (error) throw new Error(error);
                        if (text) {
                            setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, content: m.content + text } : m
                            ));
                        }
                        // The server emits a final {sources:[...]} event before [DONE]:
                        // the actual records each figure came from. The floating chat has
                        // shown these all along; this page was dropping them, so the
                        // fuller surface was the one you could not check.
                        if (hasStructure(parsed)) {
                            setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, ...structureOf(parsed) } : m
                            ));
                        }
                    } catch (e) {
                        if (e.message !== 'Unexpected end of JSON input') throw e;
                    }
                }
            }

            // Flush any remaining buffered SSE chunk
            if (buffer.trim()) {
                const line = buffer.trim();
                if (line.startsWith('data: ')) {
                    const payload = line.slice(6).trim();
                    if (payload !== '[DONE]') {
                        try {
                            const parsed = JSON.parse(payload);
                            const { text, error } = parsed;
                            if (error) throw new Error(error);
                            if (text) setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, content: m.content + text } : m
                            ));
                            // sources usually arrive in this last chunk
                            if (hasStructure(parsed)) {
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, ...structureOf(parsed) } : m
                                ));
                            }
                        } catch (e) { /* ignore malformed trailing chunk */ }
                    }
                }
            }

            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, isStreaming: false } : m
            ));

        } catch (err) {
            // Stopping on purpose is not an error. Keep whatever had streamed in so
            // far and mark it finished, rather than replacing a half-useful answer
            // with a red "I encountered an error: aborted".
            if (err?.name === 'AbortError') {
                setMessages(prev => prev
                    .map(m => (m.id === msgId ? { ...m, isStreaming: false } : m))
                    .filter(m => !(m.id === msgId && !m.content)));
            } else {
                console.error('Chat error:', err);
                setMessages(prev => {
                    const filtered = prev.filter(m => m.id !== msgId);
                    return [...filtered, {
                        id: `error-${Date.now()}`,
                        role: 'assistant',
                        content: `I encountered an error: ${err.message}. Please try again.`,
                        time: dateFormat(new Date(), 'h:MM TT'),
                        isError: true,
                    }];
                });
            }
        } finally {
            abortRef.current = null;
            setIsLoading(false);
            inputRef.current?.focus();
        }
    };

    const stopStreaming = useCallback(() => abortRef.current?.abort(), []);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleClearChat = () => setMessages([]);

    const formatMessageContent = (content) => {
        if (!content) return '';
        // Escape FIRST. This string is set as HTML, and it is built from live data —
        // client names, supplier names, comments — so a name containing markup would
        // otherwise run in the page. Only the formatting added below becomes HTML.
        const escaped = content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        let f = escaped.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        f = f.replace(/^• /gm, '<span class="text-[var(--endeavour)]">•</span> ');
        f = f.replace(/^(\d+)\. /gm, '<span class="text-[var(--endeavour)] font-medium">$1.</span> ');
        f = f.replace(/\n/g, '<br/>');
        return f;
    };

    const hasMessages = messages.length > 0;
    const lastAssistantId = [...messages].reverse().find((m) => m.role === 'assistant')?.id;
    const busy = isLoading || dataLoading;
    const count = (n) => Number(n || 0).toLocaleString('en-US');

    return (
        <div className="w-full flex flex-col bg-[var(--bg-page)]">
            <div
                // A fixed height, not a minimum: with min-height a long thread (or six
                // stacked cards on a phone) grew the page and pushed the input off screen.
                // dvh so a phone's browser bar is not counted as room. On a phone the
                // layout's pt-14 already clears the top bar, so no second offset there.
                className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 flex flex-col h-[calc(100dvh_-_3.5rem)] md:h-[calc(100dvh_-_var(--chat-top))] md:mt-[var(--chat-top)]"
                style={{ '--chat-top': 'clamp(56px, 7vh, 80px)' }}
            >
                {Object.keys(settings).length === 0 ? <Spinner /> :
                    <>
                        <Toast />
                        <div className="border border-[var(--line)] rounded-2xl shadow-card bg-[var(--bg-card)] mt-4 flex flex-col flex-1 overflow-hidden">

                            {/* Header. The record counts moved to the empty state, where they
                                explain what is being searched; up here, four status-coloured
                                pills read as four alerts. Clearing a chat is not destructive,
                                so it is a neutral button — and only there when there is a chat. */}
                            <div className="px-4 h-12 border-b border-[var(--line)] flex items-center gap-3 shrink-0">
                                <span className="w-1 h-5 rounded-full bg-[var(--brand)] shrink-0" />
                                <span className="responsiveTextTitle font-semibold text-[var(--ink)]">Assistant</span>
                                <div className="ml-auto flex items-center gap-2 min-w-0">
                                    <span className="hidden sm:inline responsiveTextTable text-[var(--ink-muted)] truncate">
                                        {dataLoading ? 'Loading your data…' : `Answers from your live data${syncedAt ? ` · synced ${dateFormat(syncedAt, 'h:MM TT')}` : ''}`}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => loadAllData(true)}
                                        disabled={dataLoading}
                                        title="Reload data"
                                        aria-label="Reload data"
                                        className="p-1.5 rounded-lg text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg-subtle)] transition-colors disabled:opacity-40 shrink-0"
                                    >
                                        <BtnIcon action="refresh" spin={dataLoading} />
                                    </button>
                                    {hasMessages && (
                                        <button type="button" onClick={handleClearChat} className="whiteButton shrink-0">
                                            Clear chat
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
                                {!hasMessages ? (
                                    /* Empty state: what this is, what it can see, and six ways in. */
                                    <div className="min-h-full flex flex-col items-center justify-center gap-4 sm:gap-6 px-3 sm:px-4 py-5 sm:py-10">
                                        <div className="flex flex-col items-center gap-2 text-center">
                                            <span className="w-11 h-11 rounded-2xl bg-[var(--brand-soft)] text-[var(--brand)] grid place-items-center">
                                                <BtnIcon action="ai" />
                                            </span>
                                            <h1 className="text-display text-[var(--ink)]">Ask about your trading data</h1>
                                            <p className="responsiveTextInput text-[var(--ink-muted)]">
                                                {dataLoading
                                                    ? 'Loading your contracts, invoices, expenses and stock…'
                                                    : `Searching ${count(contractsData.length)} contracts · ${count(invoicesData.length)} invoices · ${count(expensesData.length)} expenses · ${count(stocksData.length)} stock records`}
                                            </p>
                                        </div>
                                        <div className="w-full max-w-[760px] grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-2.5">
                                            {SUGGESTIONS.map((sug) => (
                                                <button
                                                    key={sug.text}
                                                    type="button"
                                                    onClick={() => handleSendMessage(sug.text)}
                                                    disabled={busy}
                                                    className="text-left rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] px-3 sm:px-4 py-2.5 sm:py-3 flex flex-col gap-1.5 shadow-card hover:border-[var(--brand)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <span className="text-micro font-semibold uppercase tracking-wide text-[var(--ink-muted)]">{sug.category}</span>
                                                    <span className="responsiveText font-semibold text-[var(--ink)]">{sug.text}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* One reading column. Full-width answers ran ~1,300px a line. */
                                    <div className="mx-auto w-full max-w-[760px] px-3 py-5 flex flex-col gap-4">
                                        {messages.map((message) => message.role === 'user' ? (
                                            <div key={message.id} className="flex justify-end">
                                                <div
                                                    className="max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 responsiveText bg-[var(--brand-soft)] text-[var(--ink)] break-words"
                                                    title={message.time}
                                                >
                                                    {message.content}
                                                </div>
                                            </div>
                                        ) : (
                                            <div key={message.id} className="flex flex-col items-start gap-2">
                                                <div
                                                    className={`w-full max-w-[640px] rounded-2xl rounded-tl-md border px-4 py-3.5 flex flex-col gap-3 ${message.isError
                                                        ? 'border-[var(--bad-border)] bg-[var(--bad-bg)] text-[var(--bad-text)]'
                                                        : 'border-[var(--line)] bg-[var(--bg-card)] text-[var(--ink)]'}`}
                                                    title={message.time}
                                                >
                                                    <div className="responsiveText leading-relaxed break-words">
                                                        <span dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }} />
                                                        {message.isStreaming && (
                                                            <span className="inline-block w-1.5 h-4 bg-[var(--brand)] ml-0.5 align-text-bottom animate-pulse rounded-sm" />
                                                        )}
                                                    </div>

                                                    {!message.isStreaming && message.ranking?.rows?.length > 1 && (
                                                        <RankingBlock ranking={message.ranking} />
                                                    )}

                                                    {/* The records behind the figures — click through to check them. */}
                                                    {Array.isArray(message.sources) && message.sources.length > 0 && (
                                                        <div className="border-t border-[var(--line)] pt-3 flex flex-wrap items-center gap-1.5">
                                                            <span className="responsiveTextTable text-[var(--ink-muted)] mr-0.5">
                                                                Based on {message.sources.length} record{message.sources.length === 1 ? '' : 's'}
                                                            </span>
                                                            {message.sources.slice(0, 8).map((src) => (
                                                                <button
                                                                    key={`${src.type}:${src.id}`}
                                                                    type="button"
                                                                    onClick={() => router.push(`${src.route}?focus=${encodeURIComponent(src.id)}`)}
                                                                    title={`Open ${src.label} in ${String(src.route || '').replace('/', '')}`}
                                                                    className="inline-flex items-center px-2 py-0.5 rounded-lg border border-[var(--line-strong)] bg-[var(--bg-card)] responsiveTextTable font-semibold text-[var(--brand-strong)] hover:border-[var(--brand)] transition-colors"
                                                                >
                                                                    <span className="truncate max-w-[160px]">{src.label}</span>
                                                                </button>
                                                            ))}
                                                            {message.sources.length > 8 && (
                                                                <span className="responsiveTextTable text-[var(--ink-muted)]">+{message.sources.length - 8} more</span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Next questions, only under the latest answer. */}
                                                {message.id === lastAssistantId && !message.isStreaming && Array.isArray(message.followUps) && message.followUps.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 pl-1">
                                                        {message.followUps.map((q) => (
                                                            <button
                                                                key={q}
                                                                type="button"
                                                                onClick={() => handleSendMessage(q)}
                                                                disabled={busy}
                                                                className="px-3 py-1.5 rounded-lg border border-[var(--brand-border)] bg-[var(--bg-card)] responsiveTextTable font-semibold text-[var(--brand-strong)] hover:border-[var(--brand)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                {q}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Thinking — only until the first token arrives. */}
                                        {isLoading && !messages.find((m) => m.isStreaming) && (
                                            <div className="flex justify-start">
                                                <div className="rounded-2xl rounded-tl-md border border-[var(--line)] bg-[var(--bg-card)] px-4 py-3" aria-label="Thinking">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>

                            {/* Input. The paperclip is gone: it was never wired to anything. */}
                            <div className="px-3 pt-3 pb-4 border-t border-[var(--line)] bg-[var(--bg-card)] shrink-0">
                                <div className="mx-auto w-full max-w-[760px] flex items-center gap-2 rounded-2xl border border-[var(--line-strong)] bg-[var(--bg-card)] pl-4 pr-1.5 py-1.5 focus-within:border-[var(--brand)] focus-within:ring-[3px] focus-within:ring-[var(--brand-soft)] transition-colors">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Ask about your contracts, invoices, stock or cashflow…"
                                        aria-label="Ask the assistant"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={busy}
                                        className="flex-1 min-w-0 h-8 bg-transparent responsiveText text-[var(--ink)] focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    {/* While an answer streams, Send becomes Stop. */}
                                    {isLoading ? (
                                        <button
                                            type="button"
                                            onClick={stopStreaming}
                                            aria-label="Stop generating"
                                            title="Stop generating"
                                            className="w-8 h-8 grid place-items-center rounded-lg border border-[var(--line-strong)] bg-[var(--bg-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink)] hover:border-[var(--brand)] transition-colors shrink-0"
                                        >
                                            <span className="block w-2.5 h-2.5 rounded-sm bg-current" />
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => handleSendMessage()}
                                            disabled={!newMessage.trim() || busy}
                                            aria-label="Send"
                                            title="Send"
                                            className="w-8 h-8 grid place-items-center rounded-lg bg-[var(--brand)] text-[var(--on-brand)] hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                                        >
                                            <BtnIcon action="send" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                }
            </div>
        </div>
    );
};

export default AssistantChat;
