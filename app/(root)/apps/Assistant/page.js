'use client';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
import Toast from '../../../../components/toast.js';
import { loadData, loadMargins, loadAllStockData } from '../../../../utils/utils';
import { IoSend, IoRefresh } from "react-icons/io5";
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

    const userName = user?.displayName || userTitle || 'User';

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

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
                const invoiceStatus = inv.final && inv.canceled ? 'Canceled'
                    : inv.final ? 'Final' : 'Draft';
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
                    date: inv.date,
                    invoiceStatus,
                    paymentStatus,
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

        try {
            const apiMessages = [...messages, userMsg]
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                        const { text, error } = JSON.parse(payload);
                        if (error) throw new Error(error);
                        if (text) {
                            setMessages(prev => prev.map(m =>
                                m.id === msgId ? { ...m, content: m.content + text } : m
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
        <div className="w-full min-h-screen flex flex-col bg-white">
            <div
                className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 flex-1 flex flex-col"
                style={{ marginTop: 'clamp(56px, 7vh, 80px)', minHeight: 'calc(100vh - clamp(56px, 7vh, 80px))' }}
            >
                {Object.keys(settings).length === 0 ? <Spinner /> :
                    <>
                        <Toast />
                        <div className="border border-[#b8ddf8] rounded-xl shadow-sm bg-white mt-4 flex flex-col flex-1 overflow-hidden">

                            {/* Top Bar */}
                            <div className="px-4 py-2.5 border-b border-[#b8ddf8] flex items-center justify-between bg-[#dbeeff]">
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-5 bg-[var(--endeavour)] rounded-full" />
                                    <span className="responsiveTextTitle font-semibold text-[var(--port-gore)]">Assistant</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {dataLoading ? (
                                        <span className="responsiveTextTable text-[var(--regent-gray)]">Loading data...</span>
                                    ) : (
                                        <>
                                            <span className="px-3 py-1 rounded-full responsiveTextTable font-medium" style={{ backgroundColor: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                                                {contractsData.length} Contracts
                                            </span>
                                            <span className="px-3 py-1 rounded-full responsiveTextTable font-medium" style={{ backgroundColor: '#dbeeff', color: 'var(--chathams-blue)', border: '1px solid #b8ddf8' }}>
                                                {invoicesData.length} Invoices
                                            </span>
                                            <span className="px-3 py-1 rounded-full responsiveTextTable font-medium" style={{ backgroundColor: '#ede9fe', color: '#5b21b6', border: '1px solid #c4b5fd' }}>
                                                {expensesData.length} Expenses
                                            </span>
                                            <span className="px-3 py-1 rounded-full responsiveTextTable font-medium" style={{ backgroundColor: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d' }}>
                                                {stocksData.length} Stocks
                                            </span>
                                        </>
                                    )}
                                    <button
                                        onClick={() => loadAllData(true)}
                                        disabled={dataLoading}
                                        className="p-1.5 rounded-full transition-colors hover:bg-[#b8ddf8]/50 disabled:opacity-40"
                                        title="Refresh data"
                                    >
                                        <FiRefreshCw className={`w-3.5 h-3.5 text-[var(--endeavour)] ${dataLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={handleClearChat}
                                        className="flex items-center gap-1.5 px-3 py-1 rounded-full font-medium transition-colors"
                                        style={{ backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5', fontSize: '0.62rem' }}
                                        title="Reset conversation"
                                    >
                                        <MdRestartAlt className="w-4 h-4" />
                                        Reset
                                    </button>
                                </div>
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto bg-white" style={{ minHeight: 0 }}>
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
                                                    style={message.role === 'user' ? { backgroundColor: '#dbeeff', color: 'var(--port-gore)' } : {}}
                                                >
                                                    <div
                                                        className="break-words"
                                                        dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                                                    />
                                                    {message.isStreaming && (
                                                        <span className="inline-block w-1.5 h-4 bg-[var(--endeavour)] ml-0.5 animate-pulse rounded-sm" />
                                                    )}
                                                    <div className="responsiveTextTable mt-1.5 text-right text-[var(--regent-gray)]">
                                                        {message.time}
                                                    </div>
                                                </div>
                                                {message.role === 'user' && (
                                                    <div className="w-8 h-8 rounded-full bg-[var(--port-gore)]/10 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
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
                            <div className="p-4 border-t border-[var(--selago)]" style={{ backgroundColor: '#ffffff' }}>
                                <div className="responsiveText flex items-center gap-2 border-2 border-[var(--endeavour)]/30 rounded-full px-4 py-2.5 focus-within:border-[var(--endeavour)] transition-colors" style={{ backgroundColor: '#dbeeff' }}>
                                    <GrAttachment className="w-4 h-4 text-[var(--regent-gray)] flex-shrink-0" />
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        placeholder="Ask me anything"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        disabled={isLoading || dataLoading}
                                        className="flex-1 outline-none text-[var(--port-gore)] placeholder-[#6b8fb5] disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}
                                    />
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!newMessage.trim() || isLoading || dataLoading}
                                        className="p-2 bg-[var(--endeavour)] text-white rounded-full hover:bg-[var(--chathams-blue)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                        {isLoading
                                            ? <IoRefresh className="w-4 h-4 animate-spin" />
                                            : <IoSend className="w-4 h-4" />
                                        }
                                    </button>
                                </div>
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {quickActions.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSendMessage(action.text)}
                                            disabled={isLoading || dataLoading}
                                            className="flex items-center gap-1 px-2.5 py-1 bg-white border border-[#b8ddf8] rounded-full text-[var(--port-gore)] hover:border-[var(--endeavour)] hover:text-[var(--endeavour)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                            style={{ fontSize: '0.68rem' }}
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
