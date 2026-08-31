'use client';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsContext } from "../contexts/useSettingsContext";
import { UserAuth } from "../contexts/useAuthContext";
import { loadData, loadMarginsRange, loadAllStockData, loadCompanyExpenses, resolveInvoiceDate, groupInvoicesByNumber, computeStockNetSummary } from '../utils/utils';
import { effectiveDueDate } from '../utils/finance';
import { authedFetch, trimHistory, chatStorageKey } from '../utils/aiClient';
import { X, Send, Loader2, Trash2, RefreshCw, ExternalLink, Receipt, FileText, Wallet, Bot, User } from 'lucide-react';
import { TONES } from './statusUtils';
import dateFormat from "dateformat";

// Map citation source type → icon for the chip row under each AI answer.
const SOURCE_ICONS = { invoice: Receipt, contract: FileText, expense: Wallet };

// Storage keys are built per workspace by chatStorageKey — see utils/aiClient.

const NAV_PAGES = [
    { route: '/margins', keywords: ['margin', 'profit'] },
    { route: '/invoices', keywords: ['invoice'] },
    { route: '/contracts', keywords: ['contract'] },
    { route: '/expenses', keywords: ['expense'] },
    { route: '/stocks', keywords: ['stock', 'inventory'] },
    { route: '/dashboard', keywords: ['dashboard'] },
    { route: '/cashflow', keywords: ['cash flow', 'cashflow'] },
];

const FOLLOW_UPS = {
    invoice: ['Show overdue invoices', 'Which client owes the most?'],
    contract: ['Contract status breakdown', 'List recent contracts'],
    expense: ['Show unpaid expenses', 'Expense total summary'],
    profit: ['Show revenue summary', 'Which client owes the most?'],
    stock: ['Show revenue summary', 'Show pending invoices'],
    default: ['Show overdue invoices', 'Which client owes the most?'],
};

function getFollowUps(content) {
    const lower = (content || '').toLowerCase();
    if (lower.includes('invoice')) return FOLLOW_UPS.invoice;
    if (lower.includes('contract')) return FOLLOW_UPS.contract;
    if (lower.includes('expense')) return FOLLOW_UPS.expense;
    if (lower.includes('margin') || lower.includes('profit')) return FOLLOW_UPS.profit;
    if (lower.includes('stock') || lower.includes('inventory')) return FOLLOW_UPS.stock;
    return FOLLOW_UPS.default;
}

function getNavButtons(content) {
    const lower = (content || '').toLowerCase();
    return NAV_PAGES.filter(p =>
        lower.includes(p.route) || p.keywords.some(k => lower.includes(k))
    ).slice(0, 2);
}

const FloatingChat = () => {
    const router = useRouter();
    const { settings, compData, dateSelect } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    const [chatOpen, setChatOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [contractsData, setContractsData] = useState([]);
    const [invoicesData, setInvoicesData] = useState([]);
    const [expensesData, setExpensesData] = useState([]);
    const [stocksData, setStocksData] = useState([]);
    const [marginsData, setMarginsData] = useState([]);

    const abortRef = useRef(null);

    // Scoped to the workspace. It was one global key, so switching IMS <-> GIS
    // carried the previous company's conversation — and the figures it had quoted —
    // straight into the other one.
    const storageKey = chatStorageKey('floating', uidCollection);

    // Restore chat history from localStorage on mount (and on an account switch)
    useEffect(() => {
        if (!uidCollection) return;
        try {
            const saved = localStorage.getItem(storageKey);
            const parsed = saved ? JSON.parse(saved) : null;
            setMessages(Array.isArray(parsed) && parsed.length > 0 ? parsed : []);
        } catch { setMessages([]); }
    }, [storageKey, uidCollection]);

    // Persist chat history to localStorage whenever messages change
    useEffect(() => {
        if (!uidCollection || messages.length <= 1) return;
        try {
            localStorage.setItem(storageKey, JSON.stringify(messages.slice(-50)));
        } catch { /* private mode / quota — the thread just won't survive a reload */ }
    }, [messages, storageKey, uidCollection]);

    // Closing the tab or unmounting mid-answer should stop the request.
    useEffect(() => () => abortRef.current?.abort(), []);

    const loadAllData = useCallback(async (force = false) => {
        if (!uidCollection || !dateSelect) return;
        if (!force && contractsData.length > 0) return;

        setDataLoading(true);
        try {
            // Load BOTH regular supplier expenses AND companyExpenses — the Cashflow
            // page aggregates both, so the assistant must too or it'll miss
            // overdue payables that live in the companyExpenses collection.
            const [contracts, invoices, expenses, companyExpenses, stocks, margins] = await Promise.all([
                loadData(uidCollection, 'contracts', dateSelect),
                loadData(uidCollection, 'invoices', dateSelect),
                loadData(uidCollection, 'expenses', dateSelect),
                loadCompanyExpenses(uidCollection, 'companyExpenses', dateSelect).catch(() => []),
                loadAllStockData(uidCollection).catch(() => []),
                loadMarginsRange(uidCollection, dateSelect).catch(() => []),
            ]);

            // Tag each row with its kind so the assistant can tell suppliers apart
            // from company/overhead expenses when listing or summarising.
            const taggedSupplier = (expenses || []).map(e => ({ ...e, kind: 'Supplier' }));
            const taggedCompany = (companyExpenses || []).map(e => ({ ...e, kind: 'Company' }));

            setContractsData(contracts || []);
            setInvoicesData(invoices || []);
            setExpensesData([...taggedSupplier, ...taggedCompany]);
            setStocksData(stocks || []);
            setMarginsData(margins || []);
        } catch (err) {
            console.error('Error loading chat data:', err);
        } finally {
            setDataLoading(false);
        }
    }, [uidCollection, dateSelect, contractsData.length]);

    useEffect(() => {
        if (chatOpen) loadAllData();
    }, [chatOpen]);

    // Welcome message only if no saved history
    useEffect(() => {
        if (chatOpen && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Hi! I'm your IMS Assistant. I have access to your contracts, invoices, expenses, stocks, and margins. How can I help?`,
                time: dateFormat(new Date(), 'h:MM TT')
            }]);
        }
    }, [chatOpen, messages.length]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

    useEffect(() => {
        if (chatOpen && inputRef.current) setTimeout(() => inputRef.current?.focus(), 100);
    }, [chatOpen]);

    // Close chat when sidebar opens on mobile
    useEffect(() => {
        const handler = (e) => {
            try {
                const isOpen = e?.detail?.isOpen;
                if (isOpen && typeof window !== 'undefined' && window.innerWidth < 768) setChatOpen(false);
            } catch (err) { /* ignore */ }
        };
        if (typeof window !== 'undefined') window.addEventListener('ims:menuToggle', handler);
        return () => { if (typeof window !== 'undefined') window.removeEventListener('ims:menuToggle', handler); };
    }, []);

    // Listen for global open-chat event
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => setChatOpen(true);
        window.addEventListener('ims:openChat', handler);
        return () => window.removeEventListener('ims:openChat', handler);
    }, []);

    // Toggle body class for datepicker hiding
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const cls = 'ims-chat-open';
        if (chatOpen) document.body.classList.add(cls);
        else document.body.classList.remove(cls);
        return () => document.body.classList.remove(cls);
    }, [chatOpen]);

    // Hide datepicker popovers while chat is open
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const selectors = '[data-testid="dropdown"], .react-tailwindcss-datepicker__dropdown, .react-tailwindcss-datepicker-dropdown';

        const hidePopovers = () => {
            const els = Array.from(document.querySelectorAll(selectors));
            els.forEach(el => {
                if (el.dataset.imsOrigDisplay === undefined) {
                    el.dataset.imsOrigDisplay = el.style.display || '';
                    el.dataset.imsOrigVisibility = el.style.visibility || '';
                    el.dataset.imsOrigPointer = el.style.pointerEvents || '';
                    el.dataset.imsHiddenByChat = '1';
                }
                el.style.display = 'none';
                el.style.visibility = 'hidden';
                el.style.pointerEvents = 'none';
            });
        };

        const removeDatepickerLikeNodes = () => {
            try {
                const dateRegex = /\d{1,2}-[A-Za-z]{3}-\d{2}\s*~\s*\d{1,2}-[A-Za-z]{3}-\d{2}/;
                const all = Array.from(document.querySelectorAll('body *'));
                all.forEach(el => {
                    if (!el || !el.textContent) return;
                    if (dateRegex.test(el.textContent)) {
                        let target = el.closest('[role="dialog"], [data-testid="dropdown"], .react-tailwindcss-datepicker__dropdown, .react-tailwindcss-datepicker-dropdown');
                        if (!target) {
                            let ancestor = el;
                            for (let i = 0; i < 6 && ancestor; i++) {
                                const cs = window.getComputedStyle(ancestor);
                                if (cs && (cs.position === 'absolute' || cs.position === 'fixed' || cs.zIndex !== 'auto')) {
                                    target = ancestor;
                                    break;
                                }
                                ancestor = ancestor.parentElement;
                            }
                        }
                        if (!target) target = el;
                        try {
                            if (target.dataset && target.dataset.imsOrigDisplay === undefined) {
                                target.dataset.imsOrigDisplay = target.style.display || '';
                                target.dataset.imsOrigVisibility = target.style.visibility || '';
                                target.dataset.imsOrigPointer = target.style.pointerEvents || '';
                                target.dataset.imsHiddenByChat = '1';
                            }
                            target.style.display = 'none';
                            target.style.visibility = 'hidden';
                            target.style.pointerEvents = 'none';
                        } catch (err) {
                            try { target.remove(); } catch (e) { }
                        }
                    }
                });
            } catch (err) { /* ignore */ }
        };

        const restorePopovers = () => {
            const hidden = Array.from(document.querySelectorAll('[data-ims-hidden-by-chat], [data-ims-hidden-by-chat="1"]'));
            hidden.forEach(el => {
                if (el.dataset.imsOrigDisplay !== undefined) {
                    el.style.display = el.dataset.imsOrigDisplay;
                    el.style.visibility = el.dataset.imsOrigVisibility;
                    el.style.pointerEvents = el.dataset.imsOrigPointer;
                    delete el.dataset.imsOrigDisplay;
                    delete el.dataset.imsOrigVisibility;
                    delete el.dataset.imsOrigPointer;
                } else {
                    el.style.display = '';
                    el.style.visibility = '';
                    el.style.pointerEvents = '';
                }
                delete el.dataset.imsHiddenByChat;
            });
            const els = Array.from(document.querySelectorAll(selectors));
            els.forEach(el => {
                if (el.dataset.imsOrigDisplay !== undefined) {
                    el.style.display = el.dataset.imsOrigDisplay;
                    el.style.visibility = el.dataset.imsOrigVisibility;
                    el.style.pointerEvents = el.dataset.imsOrigPointer;
                    delete el.dataset.imsOrigDisplay;
                    delete el.dataset.imsOrigVisibility;
                    delete el.dataset.imsOrigPointer;
                } else {
                    el.style.display = '';
                    el.style.visibility = '';
                    el.style.pointerEvents = '';
                }
            });
        };

        if (chatOpen) {
            hidePopovers();
            removeDatepickerLikeNodes();
        } else {
            setTimeout(() => restorePopovers(), 50);
        }

        let observer;
        if (chatOpen) {
            observer = new MutationObserver(() => hidePopovers());
            observer.observe(document.body, { childList: true, subtree: true });
            const obs2 = new MutationObserver(() => removeDatepickerLikeNodes());
            obs2.observe(document.body, { childList: true, subtree: true });
        }

        return () => {
            if (observer) observer.disconnect();
            if (typeof obs2 !== 'undefined' && obs2) obs2.disconnect();
            restorePopovers();
        };
    }, [chatOpen]);

    const getCurrentDataContext = useCallback(() => {
        const clientList = settings?.Client?.Client || [];
        const supplierList = settings?.Supplier?.Supplier || [];
        const currencyList = settings?.Currency?.Currency || [];
        const expPmntList = settings?.ExpPmnt?.ExpPmnt || [];
        const expTypeList = settings?.Expenses?.Expenses || [];
        const resolveExpType = (id) => expTypeList.find(e => e.id === id)?.expType || id || 'Unknown';

        // Finalized invoices store client/cur as objects; drafts store IDs
        const resolveClient = (f) =>
            f?.nname ? f.nname : clientList.find(c => c.id === f)?.nname || f || 'Unknown';
        // Full company name (Settings → Clients "Name" field) used for fuzzy text search
        // so "show invoices to Prime Metals" matches even if the nickname is just "Prime".
        const resolveClientFull = (f) => {
            if (f?.client) return f.client;
            const obj = clientList.find(c => c.id === f);
            return obj?.client || obj?.nname || (typeof f === 'string' ? f : '') || '';
        };
        const resolveSupplier = (f) =>
            f?.nname ? f.nname : supplierList.find(s => s.id === f)?.nname || f || 'Unknown';
        const resolveCurrency = (f) =>
            f?.cur ? f.cur : currencyList.find(c => c.id === f)?.cur || f || '';

        // Default payment term (Settings → General) so the assistant flags overdue the
        // same way the dashboard/alerts do — an invoice with no due date is due termDays
        // after its date.
        const termDays = parseInt(compData?.defaultTermDays, 10) > 0 ? parseInt(compData.defaultTermDays, 10) : 30;

        return {
            contracts: contractsData.map(con => ({
                id: con.id,
                order: con.order,
                supplier: resolveSupplier(con.supplier),
                date: con.date,
                currency: resolveCurrency(con.cur),
                // conStatus stores an ID (options defined in contracts/modals/tabs/pnl.js) —
                // resolve it to its label so the assistant never shows raw codes like
                // "E34656" (= Unsold) as if they were statuses.
                status: ({ A1234: 'Shipped', B5678: 'Not Shipped', F7546: 'Partly Shipped', C6567: 'Finished', D8456: 'Closed', E34656: 'Unsold' })[con.conStatus]
                    || con.conStatus || (con.completed ? 'Completed' : 'Open'),
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
                // Project model: `draft` is a manual "not real yet" checkbox; the formal
                // `final` flag is rarely set. An "issued" invoice = NOT draft, NOT canceled —
                // same rule the Cashflow page uses for outstanding client debt.
                const isDraft = inv.draft === true;
                const isCanceled = !!inv.canceled;
                const isIssued = !isDraft && !isCanceled;
                const invoiceStatus = isCanceled ? 'Canceled' : isDraft ? 'Draft' : 'Issued';

                // Payment status from payments array + debtBlnc
                const totalAmt = parseFloat(inv.totalAmount) || 0;
                const totalPaid = (inv.payments || []).reduce((s, p) => s + (parseFloat(p.pmnt) || 0), 0);
                const balanceDue = inv.debtBlnc != null
                    ? parseFloat(inv.debtBlnc)
                    : totalAmt - totalPaid;
                const paymentStatus = balanceDue <= 0 ? 'Paid'
                    : totalPaid > 0 ? 'Partially Paid'
                    : 'Unpaid';

                return {
                    id: inv.id,
                    invoice: inv.invoice,
                    client: resolveClient(inv.client),
                    clientFull: resolveClientFull(inv.client),
                    date: resolveInvoiceDate(inv),
                    invoiceStatus,       // 'Issued' | 'Draft' | 'Canceled'
                    paymentStatus,       // 'Paid' | 'Partially Paid' | 'Unpaid'
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
                // else (including undefined / '222' / custom statuses) means unpaid.
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

    const handleSendMessage = async (overrideText) => {
        const text = overrideText || newMessage;
        if (!text.trim() || isLoading) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            time: dateFormat(new Date(), 'h:MM TT'),
        };

        setMessages(prev => [...prev, userMsg]);
        if (!overrideText) setNewMessage('');
        setIsLoading(true);

        const msgId = `assistant-${Date.now()}`;

        // One controller per request: closing the chat or leaving cancels it.
        const controller = new AbortController();
        abortRef.current = controller;

        try {
            // Trimmed, not the whole thread — see MAX_CHAT_HISTORY. The welcome
            // message is ours, not the user's, and was being paid for every turn.
            const apiMessages = trimHistory([...messages, userMsg].filter(m => m.id !== 'welcome'));

            const response = await authedFetch('/api/assistant', {
                method: 'POST',
                signal: controller.signal,
                body: JSON.stringify({
                    messages: apiMessages,
                    currentData: getCurrentDataContext(),
                    currentPage: typeof window !== 'undefined' ? window.location.pathname : '/',
                    dateRange: dateSelect,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to get response');
            }

            // Add empty assistant message to stream tokens into
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
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.text) {
                            setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, content: m.content + parsed.text } : m
                            ));
                        }
                        // The server emits a final {sources:[...]} event right before [DONE]
                        // containing the records the AI's answer was grounded in.
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
                            if (parsed.error) throw new Error(parsed.error);
                            if (parsed.text) setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, content: m.content + parsed.text } : m
                            ));
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
            // Stopping on purpose is not an error: keep what streamed in and mark it
            // done, rather than replacing a half-useful answer with a red banner.
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleClearChat = () => {
        const welcome = {
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm your IMS Assistant. I have access to your contracts, invoices, expenses, stocks, and margins. How can I help?`,
            time: dateFormat(new Date(), 'h:MM TT'),
        };
        setMessages([welcome]);
        try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
    };

    const handleRefreshData = () => {
        setContractsData([]);
        loadAllData(true);
    };

    const formatMessageContent = (content) => {
        if (!content) return '';
        let f = content;
        f = f.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        f = f.replace(/^[•\-]\s*/gm, '<span class="text-blue-600 mr-1">•</span>');
        f = f.replace(/^(\d+)\.\s+/gm, '<span class="text-blue-600 font-medium mr-1">$1.</span>');
        f = f.replace(/\n/g, '<br/>');
        return f;
    };

    // Last completed assistant message (for follow-ups and nav buttons)
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant' && !m.isStreaming && m.id !== 'welcome' && !m.isError);

    if (Object.keys(settings || {}).length === 0) return null;

    return (
        <>
            {chatOpen && (
                <div style={{ zIndex: 99999, boxShadow: 'var(--shadow-md)' }} className="fixed bottom-4 right-4 w-96 h-[540px] bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">

                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-[var(--line)] flex items-center justify-between bg-[var(--bg-card)]">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-[var(--brand)] rounded-full" />
                            <span className="responsiveText font-semibold text-[var(--ink)]">Assistant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {dataLoading ? (
                                <Loader2 className="w-3 h-3 text-[var(--brand)] animate-spin" />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className="px-2 py-0.5 rounded-lg font-medium" style={{ fontSize: 'var(--fs-table)', backgroundColor: TONES.green.bg, color: TONES.green.text, border: `1px solid ${TONES.green.border}` }}>
                                        {contractsData.length} Con
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg font-medium" style={{ fontSize: 'var(--fs-table)', backgroundColor: TONES.blue.bg, color: TONES.blue.text, border: `1px solid ${TONES.blue.border}` }}>
                                        {invoicesData.length} Inv
                                    </span>
                                    <span className="px-2 py-0.5 rounded-lg font-medium" style={{ fontSize: 'var(--fs-table)', backgroundColor: TONES.amber.bg, color: TONES.amber.text, border: `1px solid ${TONES.amber.border}` }}>
                                        {stocksData.length} Stk
                                    </span>
                                </div>
                            )}
                            <button onClick={handleRefreshData} disabled={dataLoading} className="p-1 rounded hover:bg-[var(--bg-subtle)] hover:text-[var(--brand)] text-[var(--ink-muted)] transition-colors disabled:opacity-40" title="Refresh data">
                                <RefreshCw className="w-3 h-3" />
                            </button>
                            <button onClick={handleClearChat} className="p-1 rounded hover:bg-[var(--bg-subtle)] hover:text-[var(--brand)] text-[var(--ink-muted)] transition-colors" title="Clear chat">
                                <Trash2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => setChatOpen(false)} className="p-1 rounded hover:bg-[var(--bg-subtle)] hover:text-[var(--brand)] text-[var(--ink-muted)] transition-colors" title="Close">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ backgroundColor: "var(--bg-card)" }}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                        <Bot className="w-3.5 h-3.5 text-[var(--brand)]" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 responsiveText ${
                                        msg.role === 'user'
                                            ? 'rounded-br-sm'
                                            : msg.isError
                                                ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                                                : 'bg-[var(--bg-subtle)] text-[var(--ink)] border border-[var(--line)] rounded-bl-sm'
                                    }`}
                                    style={msg.role === 'user' ? { backgroundColor: 'var(--brand-soft)', color: 'var(--ink)' } : {}}
                                >
                                    <div
                                        className="break-words leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                                    />
                                    {msg.isStreaming && (
                                        <span className="inline-block w-1.5 h-3.5 bg-[var(--brand)] ml-0.5 animate-pulse rounded" />
                                    )}
                                    {/* Citation chips — clicking opens the record in its page via ?focus= */}
                                    {Array.isArray(msg.sources) && msg.sources.length > 0 && (
                                        <div className="mt-2 pt-2 border-t border-[var(--line)] flex flex-wrap gap-1">
                                            <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }} className="font-semibold w-full mb-0.5">
                                                Sources ({msg.sources.length})
                                            </span>
                                            {msg.sources.slice(0, 12).map((src) => {
                                                const Icon = SOURCE_ICONS[src.type] || ExternalLink;
                                                return (
                                                    <button
                                                        key={`${src.type}:${src.id}`}
                                                        onClick={() => {
                                                            const params = new URLSearchParams();
                                                            params.set('focus', src.id);
                                                            router.push(`${src.route}?${params.toString()}`);
                                                            setChatOpen(false);
                                                        }}
                                                        title={`Open ${src.label} in ${src.route.replace('/', '')}`}
                                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-[var(--bg-card)] border border-[var(--line)] hover:border-[var(--brand)] hover:bg-[var(--brand-soft)] transition-colors"
                                                        style={{ fontSize: 'var(--fs-table)', color: 'var(--brand-strong)' }}
                                                    >
                                                        <Icon className="w-2.5 h-2.5" aria-hidden="true" />
                                                        <span className="truncate max-w-[120px]">{src.label}</span>
                                                    </button>
                                                );
                                            })}
                                            {msg.sources.length > 12 && (
                                                <span style={{ fontSize: 'var(--fs-caption)', color: 'var(--ink-muted)' }} className="self-center">
                                                    +{msg.sources.length - 12} more
                                                </span>
                                            )}
                                        </div>
                                    )}
                                    <span className="mt-1 block text-right text-[var(--ink-muted)]" style={{ fontSize: 'var(--fs-table)' }}>
                                        {msg.time}
                                    </span>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-lg bg-[var(--bg-sunken)] flex items-center justify-center ml-2 flex-shrink-0 mt-1">
                                        <User className="w-3.5 h-3.5 text-[var(--ink-secondary)]" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Typing dots — only while waiting for first streaming token */}
                        {isLoading && !messages.find(m => m.isStreaming) && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 rounded-lg bg-[var(--brand-soft)] flex items-center justify-center mr-2 flex-shrink-0">
                                    <Bot className="w-3.5 h-3.5 text-[var(--brand)]" />
                                </div>
                                <div className="bg-[var(--bg-card)] border border-[var(--line)] rounded-2xl rounded-bl-sm px-3 py-2.5">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-[var(--brand)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input + actions */}
                    <div className="p-3 border-t border-[var(--line)]" style={{ backgroundColor: "var(--bg-card)" }}>

                        {/* Nav buttons — shown after a data response mentions a page */}
                        {lastAssistantMsg && !isLoading && (() => {
                            const navBtns = getNavButtons(lastAssistantMsg.content);
                            return navBtns.length > 0 ? (
                                <div className="flex gap-1.5 mb-2">
                                    {navBtns.map(p => (
                                        <a
                                            key={p.route}
                                            href={p.route}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-[var(--brand)] text-[var(--on-brand)] rounded-lg hover:bg-[var(--brand-strong)] transition-colors"
                                            style={{ fontSize: 'var(--fs-table)' }}
                                        >
                                            <ExternalLink className="w-2.5 h-2.5" />
                                            Go to {p.route.replace('/', '')}
                                        </a>
                                    ))}
                                </div>
                            ) : null;
                        })()}

                        {/* Input bar */}
                        <div className="flex items-center gap-2 border-2 border-[var(--line-strong)] rounded-lg px-3 py-2 focus-within:border-[var(--brand)] transition-colors" style={{ backgroundColor: 'var(--bg-subtle)' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me anything"
                                disabled={isLoading || dataLoading}
                                /* focus-visible:outline-none — the WRAPPER already signals
                                   focus with focus-within:border, so the global
                                   input:focus-visible outline drew a second ring inside it
                                   and read as an internal border. Focus is still visible;
                                   it is just not drawn twice. */
                                className="flex-1 outline-none focus-visible:outline-none text-[var(--ink)] placeholder-[var(--ink-muted)] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontSize: 'var(--fs-body)', backgroundColor: 'transparent' }}
                            />
                            {/* While streaming, the send button is disabled anyway — so it
                                becomes Stop rather than a spinner that does nothing. */}
                            {isLoading ? (
                            <button
                                onClick={() => abortRef.current?.abort()}
                                aria-label="Stop generating"
                                title="Stop generating"
                                className="p-1.5 bg-[var(--bg-subtle)] text-[var(--ink-secondary)] rounded-lg border border-[var(--line-strong)] hover:text-[var(--ink)] hover:border-[var(--brand)] transition-colors"
                            >
                                <span className="w-3.5 h-3.5 flex items-center justify-center">
                                    <span className="block w-2 h-2 rounded-[2px] bg-current" />
                                </span>
                            </button>
                            ) : (
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!newMessage.trim() || isLoading || dataLoading}
                                className="p-1.5 bg-[var(--brand)] text-[var(--on-brand)] rounded-lg hover:bg-[var(--brand-strong)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                            )}
                        </div>

                        {/* Quick actions on first open */}
                        {messages.length <= 1 && !isLoading && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {['Show overdue invoices', 'Which client owes the most?', 'Contract status breakdown', 'Show unpaid expenses'].map(action => (
                                    <button
                                        key={action}
                                        onClick={() => handleSendMessage(action)}
                                        className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--line)] rounded-lg text-[var(--ink)] hover:bg-[var(--bg-subtle)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                                        style={{ fontSize: 'var(--fs-table)' }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Follow-up suggestions after each AI reply */}
                        {lastAssistantMsg && messages.length > 1 && !isLoading && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {getFollowUps(lastAssistantMsg.content).map(action => (
                                    <button
                                        key={action}
                                        onClick={() => handleSendMessage(action)}
                                        className="px-2.5 py-1 bg-[var(--bg-card)] border border-[var(--line)] rounded-lg text-[var(--ink)] hover:bg-[var(--bg-subtle)] hover:border-[var(--brand)] hover:text-[var(--brand)] transition-colors"
                                        style={{ fontSize: 'var(--fs-table)' }}
                                    >
                                        {action}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingChat;
