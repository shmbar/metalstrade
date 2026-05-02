'use client';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { SettingsContext } from "../contexts/useSettingsContext";
import { UserAuth } from "../contexts/useAuthContext";
import { loadData, loadMargins, loadAllStockData } from '../utils/utils';
import { X, Send, Loader2, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { BsRobot, BsPerson } from "react-icons/bs";
import dateFormat from "dateformat";

const STORAGE_KEY = 'ims-chat-messages';

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
    stock: ['Contract status breakdown', 'Show pending invoices'],
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
    const { settings, dateSelect } = useContext(SettingsContext);
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

    // Restore chat history from localStorage on mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
            }
        } catch (e) { /* ignore */ }
    }, []);

    // Persist chat history to localStorage whenever messages change
    useEffect(() => {
        if (messages.length > 1) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-50)));
            } catch (e) { /* ignore */ }
        }
    }, [messages]);

    const loadAllData = useCallback(async (force = false) => {
        if (!uidCollection || !dateSelect) return;
        if (!force && contractsData.length > 0) return;

        setDataLoading(true);
        try {
            const currentYear = new Date().getFullYear();
            const [contracts, invoices, expenses, stocks, margins] = await Promise.all([
                loadData(uidCollection, 'contracts', dateSelect),
                loadData(uidCollection, 'invoices', dateSelect),
                loadData(uidCollection, 'expenses', dateSelect),
                loadAllStockData(uidCollection).catch(() => []),
                loadMargins(uidCollection, currentYear).catch(() => []),
            ]);

            setContractsData(contracts || []);
            setInvoicesData(invoices || []);
            setExpensesData(expenses || []);
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
                products: con.productsData?.length || 0,
            })),
            invoices: invoicesData.map(inv => {
                // invoiceStatus is never stored — compute from flags
                const invoiceStatus = inv.final && inv.canceled ? 'Canceled'
                    : inv.final ? 'Final'
                    : 'Draft';

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
                    date: inv.date,
                    invoiceStatus,       // 'Draft' | 'Final' | 'Canceled'
                    paymentStatus,       // 'Paid' | 'Partially Paid' | 'Unpaid'
                    totalAmount: totalAmt,
                    amountPaid: totalPaid,
                    balanceDue: balanceDue > 0 ? balanceDue : 0,
                    currency: resolveCurrency(inv.cur),
                    dueDate: inv.delDate?.endDate,
                    canceled: !!inv.canceled,
                    isFinal: !!inv.final,
                };
            }),
            expenses: expensesData.map(exp => {
                // paid is stored as an ID from settings.ExpPmnt.ExpPmnt
                const paidLabel = expPmntList.find(p => p.id === exp.paid)?.paid
                    || (exp.paid === '111' ? 'Paid' : exp.paid === '222' ? 'Unpaid' : exp.paid || 'Unknown');
                return {
                    id: exp.id,
                    vendor: resolveSupplier(exp.supplier) || exp.vendor || 'Unknown',
                    date: exp.date,
                    amount: parseFloat(exp.amount) || 0,
                    currency: resolveCurrency(exp.cur),
                    type: resolveExpType(exp.expType),
                    paid: paidLabel,
                };
            }),
            stocks: stocksData.map(s => {
                const resolvedDesc =
                    s.type === 'in' && s.description
                        ? s.productsData?.find(y => y.id === s.description)?.description
                        : s.mtrlStatus === 'select' || s.isSelection
                            ? s.productsData?.find(y => y.id === s.descriptionId)?.description
                            : s.type === 'out' && s.moveType === 'out'
                                ? s.descriptionName
                                : s.descriptionText;
                return {
                    description: resolvedDesc || s.descriptionName || s.description || 'Unknown',
                    qnty: parseFloat(s.qnty) || 0,
                    unit: s.qTypeTable || '',
                    warehouse: s.stock || '',
                    date: s.date || '',
                };
            }),
            margins: marginsData.map(m => ({
                month: m.month,
                totalMargin: parseFloat(m.totalMargin) || 0,
                incoming: parseFloat(m.incoming) || 0,
                itemCount: m.items?.length || 0,
            })),
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

        try {
            const apiMessages = [...messages, userMsg]
                .filter(m => m.id !== 'welcome')
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                        const { text: chunk, error } = JSON.parse(payload);
                        if (error) throw new Error(error);
                        if (chunk) {
                            setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, content: m.content + chunk } : m
                            ));
                        }
                    } catch (e) {
                        if (e.message !== 'Unexpected end of JSON input') throw e;
                    }
                }
            }

            setMessages(prev => prev.map(m =>
                m.id === msgId ? { ...m, isStreaming: false } : m
            ));

        } catch (err) {
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
        } finally {
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
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
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
                <div style={{ zIndex: 99999 }} className="fixed bottom-4 right-4 w-96 h-[540px] bg-white rounded-2xl shadow-2xl border border-[#b8ddf8] flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">

                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-[#b8ddf8] flex items-center justify-between bg-[#dbeeff]">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-[var(--endeavour)] rounded-full" />
                            <span className="responsiveText font-semibold text-[var(--port-gore)]">Assistant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {dataLoading ? (
                                <Loader2 className="w-3 h-3 text-[var(--endeavour)] animate-spin" />
                            ) : (
                                <div className="flex items-center gap-1">
                                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ fontSize: '0.6rem', backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                                        {contractsData.length} Con
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ fontSize: '0.6rem', backgroundColor: '#dbeeff', color: 'var(--chathams-blue)', border: '1px solid #b8ddf8' }}>
                                        {invoicesData.length} Inv
                                    </span>
                                    <span className="px-2 py-0.5 rounded-full font-medium" style={{ fontSize: '0.6rem', backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                                        {stocksData.length} Stk
                                    </span>
                                </div>
                            )}
                            <button onClick={handleRefreshData} disabled={dataLoading} className="p-1 hover:text-[var(--endeavour)] text-[var(--regent-gray)] transition-colors disabled:opacity-40" title="Refresh data">
                                <RefreshCw className="w-3 h-3" />
                            </button>
                            <button onClick={handleClearChat} className="p-1 hover:text-[var(--endeavour)] text-[var(--regent-gray)] transition-colors" title="Clear chat">
                                <Trash2 className="w-3 h-3" />
                            </button>
                            <button onClick={() => setChatOpen(false)} className="p-1 hover:text-[var(--endeavour)] text-[var(--regent-gray)] transition-colors" title="Close">
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ backgroundColor: '#ffffff' }}>
                        {messages.map((msg) => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-full bg-[var(--endeavour)]/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                        <BsRobot className="w-3.5 h-3.5 text-[var(--endeavour)]" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 responsiveText ${
                                        msg.role === 'user'
                                            ? 'rounded-br-sm'
                                            : msg.isError
                                                ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                                                : 'bg-[var(--selago)]/40 text-[var(--port-gore)] border border-[var(--selago)] rounded-bl-sm'
                                    }`}
                                    style={msg.role === 'user' ? { backgroundColor: '#e8f5ff', color: 'var(--port-gore)' } : {}}
                                >
                                    <div
                                        className="break-words leading-relaxed"
                                        dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                                    />
                                    {msg.isStreaming && (
                                        <span className="inline-block w-1.5 h-3.5 bg-[var(--endeavour)] ml-0.5 animate-pulse rounded-sm" />
                                    )}
                                    <span className="mt-1 block text-right text-[var(--regent-gray)]" style={{ fontSize: '0.6rem' }}>
                                        {msg.time}
                                    </span>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-7 h-7 rounded-full bg-[var(--port-gore)]/10 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
                                        <BsPerson className="w-3.5 h-3.5 text-[var(--port-gore)]" />
                                    </div>
                                )}
                            </div>
                        ))}

                        {/* Typing dots — only while waiting for first streaming token */}
                        {isLoading && !messages.find(m => m.isStreaming) && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 rounded-full bg-[var(--endeavour)]/10 flex items-center justify-center mr-2 flex-shrink-0">
                                    <BsRobot className="w-3.5 h-3.5 text-[var(--endeavour)]" />
                                </div>
                                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-3 py-2.5">
                                    <div className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <span className="w-1.5 h-1.5 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <span className="w-1.5 h-1.5 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input + actions */}
                    <div className="p-3 border-t border-[#b8ddf8]" style={{ backgroundColor: '#ffffff' }}>

                        {/* Nav buttons — shown after a data response mentions a page */}
                        {lastAssistantMsg && !isLoading && (() => {
                            const navBtns = getNavButtons(lastAssistantMsg.content);
                            return navBtns.length > 0 ? (
                                <div className="flex gap-1.5 mb-2">
                                    {navBtns.map(p => (
                                        <a
                                            key={p.route}
                                            href={p.route}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-[var(--endeavour)] text-white rounded-full hover:bg-[var(--chathams-blue)] transition-colors"
                                            style={{ fontSize: '0.62rem' }}
                                        >
                                            <ExternalLink className="w-2.5 h-2.5" />
                                            Go to {p.route.replace('/', '')}
                                        </a>
                                    ))}
                                </div>
                            ) : null;
                        })()}

                        {/* Input bar */}
                        <div className="flex items-center gap-2 border-2 border-[var(--endeavour)]/30 rounded-full px-3 py-2 focus-within:border-[var(--endeavour)] transition-colors" style={{ backgroundColor: '#e8f5ff' }}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask me anything"
                                disabled={isLoading || dataLoading}
                                className="flex-1 outline-none text-[var(--port-gore)] placeholder-[#6b8fb5] disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ fontSize: '0.68rem', backgroundColor: 'transparent' }}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!newMessage.trim() || isLoading || dataLoading}
                                className="p-1.5 bg-[var(--endeavour)] text-white rounded-lg hover:bg-[var(--chathams-blue)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            </button>
                        </div>

                        {/* Quick actions on first open */}
                        {messages.length <= 1 && !isLoading && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {['Show overdue invoices', 'Which client owes the most?', 'Contract status breakdown', 'Show unpaid expenses'].map(action => (
                                    <button
                                        key={action}
                                        onClick={() => handleSendMessage(action)}
                                        className="px-2.5 py-1 bg-white border border-[#b8ddf8] rounded-full text-[var(--port-gore)] hover:border-[var(--endeavour)] hover:text-[var(--endeavour)] transition-colors"
                                        style={{ fontSize: '0.65rem' }}
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
                                        className="px-2.5 py-1 bg-white border border-[#b8ddf8] rounded-full text-[var(--port-gore)] hover:border-[var(--endeavour)] hover:text-[var(--endeavour)] transition-colors"
                                        style={{ fontSize: '0.65rem' }}
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
