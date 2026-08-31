'use client';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
import Toast from '../../../../components/toast.js';
import { loadData, loadMarginsRange, loadAllStockData, loadCompanyExpenses, resolveDueDate, resolveInvoiceDate, groupInvoicesByNumber, computeStockNetSummary } from '../../../../utils/utils';
import { authedFetch, trimHistory, chatStorageKey } from '../../../../utils/aiClient';
import { IoSend } from "react-icons/io5";
import { BsRobot, BsPerson } from "react-icons/bs";
import { FiTrendingUp, FiRefreshCw } from "react-icons/fi";
import { HiOutlineDocumentText, HiOutlineCurrencyDollar } from "react-icons/hi";
import { BsFileText, BsQuestionCircle, BsBoxSeam } from "react-icons/bs";
import { MdRestartAlt } from "react-icons/md";
import { GrAttachment } from "react-icons/gr";
import dateFormat from "dateformat";

const quickActions = [
    { icon: <HiOutlineDocumentText className="w-3.5 h-3.5" />, text: "Show overdue invoices" },
    { icon: <BsFileText className="w-3.5 h-3.5" />, text: "Which client owes the most?" },
    { icon: <HiOutlineCurrencyDollar className="w-3.5 h-3.5" />, text: "Show unpaid expenses" },
    { icon: <FiTrendingUp className="w-3.5 h-3.5" />, text: "What is my profit this month?" },
    { icon: <BsBoxSeam className="w-3.5 h-3.5" />, text: "Contract status breakdown" },
    { icon: <BsQuestionCircle className="w-3.5 h-3.5" />, text: "How do I create an invoice?" },
];

const AssistantChat = () => {
    const { settings, dateSelect } = useContext(SettingsContext);
    const { uidCollection, user, userTitle } = UserAuth();
    const router = useRouter();

    const userName = user?.displayName || userTitle || 'User';

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
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
                    dueDate: resolveDueDate(inv),
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
    }, [contractsData, invoicesData, expensesData, stocksData, marginsData, settings]);

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
                        if (Array.isArray(parsed.sources) && parsed.sources.length) {
                            setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, sources: parsed.sources } : m
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
                            if (Array.isArray(parsed.sources) && parsed.sources.length) {
                                setMessages(prev => prev.map(m =>
                                    m.id === msgId ? { ...m, sources: parsed.sources } : m
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
        let f = content.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        f = f.replace(/^• /gm, '<span class="text-[var(--endeavour)]">•</span> ');
        f = f.replace(/^(\d+)\. /gm, '<span class="text-[var(--endeavour)] font-medium">$1.</span> ');
        f = f.replace(/\n/g, '<br/>');
        return f;
    };

    const hasMessages = messages.length > 0;

    return (
        <div className="w-full min-h-screen flex flex-col bg-[var(--bg-card)]">
            <div
                className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 flex-1 flex flex-col"
                style={{ marginTop: 'clamp(56px, 7vh, 80px)', minHeight: 'calc(100vh - clamp(56px, 7vh, 80px))' }}
            >
                {Object.keys(settings).length === 0 ? <Spinner /> :
                    <>
                        <Toast />
                        <div className="border border-[var(--line)] rounded-2xl shadow-sm bg-[var(--bg-card)] mt-4 flex flex-col flex-1 overflow-hidden">

                            {/* Top Bar — flex-wrap + nowrap pills: on narrow screens the chip
                                row drops WHOLE onto its own line under the title instead of
                                breaking words mid-pill ("Contract / s") and colliding with it. */}
                            <div className="px-3 md:px-4 py-2.5 border-b border-[var(--line)] flex flex-wrap items-center justify-between gap-y-2 gap-x-3 bg-[var(--bg-subtle)]">
                                <div className="flex items-center gap-2 shrink-0">
                                    <div className="w-1 h-5 bg-[var(--endeavour)] rounded-full" />
                                    <span className="responsiveTextTitle font-medium text-[var(--port-gore)]">Assistant</span>
                                </div>
                                <div className="flex flex-wrap items-center justify-end gap-1.5 md:gap-2">
                                    {dataLoading ? (
                                        <span className="responsiveTextTable text-[var(--regent-gray)] whitespace-nowrap">Loading data...</span>
                                    ) : (
                                        <>
                                            <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-lg responsiveTextTable font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--ok-bg)', color: 'var(--ok-strong)', border: '1px solid var(--ok-border)' }}>
                                                {contractsData.length} Contracts
                                            </span>
                                            <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-lg responsiveTextTable font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--chathams-blue)', border: '1px solid var(--line)' }}>
                                                {invoicesData.length} Invoices
                                            </span>
                                            <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-lg responsiveTextTable font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--brand-soft)', color: 'var(--brand-strong)', border: '1px solid var(--brand-border)' }}>
                                                {expensesData.length} Expenses
                                            </span>
                                            <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-lg responsiveTextTable font-medium whitespace-nowrap" style={{ backgroundColor: 'var(--warn-bg)', color: 'var(--warn-text)', border: '1px solid var(--warn-border)' }}>
                                                {stocksData.length} Stocks
                                            </span>
                                        </>
                                    )}
                                    <button
                                        onClick={() => loadAllData(true)}
                                        disabled={dataLoading}
                                        className="p-1.5 rounded-lg transition-colors hover:bg-[var(--line)]/50 disabled:opacity-40 shrink-0"
                                        title="Refresh data"
                                    >
                                        <FiRefreshCw className={`w-3.5 h-3.5 text-[var(--endeavour)] ${dataLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={handleClearChat}
                                        className="flex items-center gap-1.5 px-2 py-0.5 md:px-3 md:py-1 rounded-lg font-medium transition-colors whitespace-nowrap shrink-0"
                                        style={{ backgroundColor: 'var(--bad-bg)', color: 'var(--bad-text)', border: '1px solid var(--bad-border)', fontSize: 'var(--fs-table)' }}
                                        title="Reset conversation"
                                    >
                                        <MdRestartAlt className="w-4 h-4" />
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto bg-[var(--bg-card)]" style={{ minHeight: 0 }}>
                                {!hasMessages ? (
                                    <div className="flex flex-col items-center justify-center py-16 px-4" style={{ minHeight: '400px' }}>
                                        <div className="mb-6">
                                            <video
                                                src="/logo/asistan-3d.mp4"
                                                autoPlay loop muted playsInline
                                                style={{ width: '140px', height: '140px', objectFit: 'contain' }}
                                            />
                                        </div>
                                        <h2 className="responsiveTextTitle font-normal text-[var(--regent-gray)] mb-1">
                                            Hi {userName},
                                        </h2>
                                        <p className="responsiveText text-[var(--regent-gray)]">
                                            How can I help you today?
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 flex flex-col gap-4">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {message.role === 'assistant' && (
                                                    <div className="w-8 h-8 rounded-full bg-[var(--endeavour)]/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                                        <BsRobot className="w-4 h-4 text-[var(--endeavour)]" />
                                                    </div>
                                                )}
                                                <div
                                                    className={`max-w-[75%] rounded-2xl px-4 py-3 responsiveText leading-relaxed ${
                                                        message.role === 'user'
                                                            ? 'rounded-br-sm'
                                                            : message.isError
                                                                ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                                                                : 'bg-[var(--selago)]/40 text-[var(--port-gore)] border border-[var(--selago)] rounded-bl-sm'
                                                    }`}
                                                    style={message.role === 'user' ? { backgroundColor: 'var(--bg-subtle)', color: 'var(--port-gore)' } : {}}
                                                >
                                                    <div
                                                        className="break-words"
                                                        dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                                                    />
                                                    {message.isStreaming && (
                                                        <span className="inline-block w-1.5 h-4 bg-[var(--endeavour)] ml-0.5 animate-pulse rounded-lg" />
                                                    )}

                                                    {/* The records behind the figures. An answer you cannot
                                                        check is one you have to take on trust, and these are
                                                        the rows the tool actually read — click through to the
                                                        invoice or contract itself. */}
                                                    {Array.isArray(message.sources) && message.sources.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-[var(--line)]">
                                                            <div className="responsiveTextTable mb-1 text-[var(--ink-muted)]">
                                                                Based on {message.sources.length} record{message.sources.length === 1 ? '' : 's'}
                                                            </div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {message.sources.slice(0, 12).map((src) => (
                                                                    <button
                                                                        key={`${src.type}:${src.id}`}
                                                                        onClick={() => router.push(`${src.route}?focus=${encodeURIComponent(src.id)}`)}
                                                                        title={`Open ${src.label} in ${String(src.route || '').replace('/', '')}`}
                                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--line)] hover:border-[var(--brand)] transition-colors"
                                                                        style={{ fontSize: 'var(--fs-table)', color: 'var(--brand-strong)' }}
                                                                    >
                                                                        <span className="truncate max-w-[140px]">{src.label}</span>
                                                                    </button>
                                                                ))}
                                                                {message.sources.length > 12 && (
                                                                    <span className="self-center responsiveTextTable text-[var(--ink-muted)]">
                                                                        +{message.sources.length - 12} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="responsiveTextTable mt-1.5 text-right text-[var(--regent-gray)]">
                                                        {message.time}
                                                    </div>
                                                </div>
                                                {message.role === 'user' && (
                                                    <div className="w-8 h-8 rounded-full bg-[var(--brand-deep)]/10 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
                                                        <BsPerson className="w-4 h-4 text-[var(--port-gore)]" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Typing dots — only before first streaming token arrives */}
                                        {isLoading && !messages.find(m => m.isStreaming) && (
                                            <div className="flex justify-start">
                                                <div className="w-8 h-8 rounded-full bg-[var(--endeavour)]/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                                    <BsRobot className="w-4 h-4 text-[var(--endeavour)]" />
                                                </div>
                                                <div className="bg-[var(--selago)]/40 border border-[var(--selago)] rounded-2xl rounded-bl-sm px-4 py-3">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-2 h-2 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                                        <span className="w-2 h-2 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                                        <span className="w-2 h-2 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                            </div>

                            {/* Input Area */}
                            <div className="p-4 border-t border-[var(--selago)]" style={{ backgroundColor: "var(--bg-card)" }}>
                                <div className="responsiveText flex items-center gap-2 border-2 border-[var(--endeavour)]/30 rounded-lg px-4 py-2.5 focus-within:border-[var(--endeavour)] transition-colors" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                                    <GrAttachment className="w-4 h-4 text-[var(--regent-gray)] flex-shrink-0" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Ask me anything"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={isLoading || dataLoading}
                                        /* focus-visible:outline-none — the WRAPPER already
                                           signals focus with focus-within:border, so the
                                           global input:focus-visible outline drew a second
                                           ring inside it and read as an internal border.
                                           Focus is still visible; it is just not drawn twice. */
                                        className="flex-1 outline-none focus-visible:outline-none text-[var(--port-gore)] placeholder-[var(--rock-blue)] disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}
                                    />
                                    {/* While an answer is streaming the send button has nothing
                                        to do — it is disabled anyway — so it becomes Stop. A long
                                        reply was previously unstoppable short of leaving the page. */}
                                    {isLoading ? (
                                        <button
                                            onClick={stopStreaming}
                                            aria-label="Stop generating"
                                            title="Stop generating"
                                            className="p-2 bg-[var(--bg-subtle)] text-[var(--ink-secondary)] rounded-lg border border-[var(--line-strong)] hover:text-[var(--ink)] hover:border-[var(--brand)] transition-colors"
                                        >
                                            <span className="block w-4 h-4 flex items-center justify-center">
                                                <span className="block w-2.5 h-2.5 rounded-[2px] bg-current" />
                                            </span>
                                        </button>
                                    ) : (
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!newMessage.trim() || isLoading || dataLoading}
                                        className="p-2 bg-[var(--endeavour)] text-[var(--on-brand)] rounded-lg hover:bg-[var(--brand-deep)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                        <IoSend className="w-4 h-4" />
                                    </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {quickActions.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSendMessage(action.text)}
                                            disabled={isLoading || dataLoading}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--line)] rounded-lg text-[var(--port-gore)] hover:border-[var(--endeavour)] hover:text-[var(--endeavour)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ fontSize: 'var(--fs-body)' }}
                                        >
                                            {action.icon}
                                            {action.text}
                                        </button>
                                    ))}
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
