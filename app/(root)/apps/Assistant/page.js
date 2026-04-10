'use client';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
import Toast from '../../../../components/toast.js';
import { loadData } from '../../../../utils/utils';
import { IoSend, IoRefresh } from "react-icons/io5";
import { BsRobot, BsPerson, BsFileText, BsQuestionCircle, BsBoxSeam } from "react-icons/bs";
import { FiTrendingUp } from "react-icons/fi";
import { HiOutlineDocumentText, HiOutlineCurrencyDollar } from "react-icons/hi";
import { MdRestartAlt } from "react-icons/md";
import { GrAttachment } from "react-icons/gr";
import dateFormat from "dateformat";

const quickActions = [
    { icon: <HiOutlineDocumentText className="w-3.5 h-3.5" />, text: "Show overdue invoices" },
    { icon: <BsFileText className="w-3.5 h-3.5" />, text: "List recent contracts" },
    { icon: <HiOutlineCurrencyDollar className="w-3.5 h-3.5" />, text: "Show expense summary" },
    { icon: <BsQuestionCircle className="w-3.5 h-3.5" />, text: "How do I create an invoice?" },
    { icon: <BsBoxSeam className="w-3.5 h-3.5" />, text: "How do I add a new supplier?" },
    { icon: <FiTrendingUp className="w-3.5 h-3.5" />, text: "Show pending invoices" },
];

const AssistantChat = () => {
    const { settings, dateSelect } = useContext(SettingsContext);
    const { uidCollection, user, userTitle } = UserAuth();

    // Get user display name: displayName from Firebase, fallback to userTitle
    const userName = user?.displayName || userTitle || 'User';

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [contractsData, setContractsData] = useState([]);
    const [invoicesData, setInvoicesData] = useState([]);
    const [expensesData, setExpensesData] = useState([]);

    useEffect(() => {
        const loadAllData = async () => {
            if (!uidCollection || !dateSelect) return;
            setDataLoading(true);
            try {
                const [contracts, invoices, expenses] = await Promise.all([
                    loadData(uidCollection, 'contracts', dateSelect),
                    loadData(uidCollection, 'invoices', dateSelect),
                    loadData(uidCollection, 'expenses', dateSelect)
                ]);
                setContractsData(contracts || []);
                setInvoicesData(invoices || []);
                setExpensesData(expenses || []);
            } catch (err) {
                console.error('Error loading data:', err);
            } finally {
                setDataLoading(false);
            }
        };
        loadAllData();
    }, [uidCollection, dateSelect]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const getCurrentDataContext = useCallback(() => {
        const formatContract = (con) => ({
            id: con.id, order: con.order, supplier: con.supplier, date: con.date,
            origin: con.origin, deliveryTerms: con.delTerm, pol: con.pol, pod: con.pod,
            currency: con.cur, status: con.conStatus,
            products: con.productsData?.length || 0,
            invoicesLinked: con.invoices?.length || 0,
            dateRange: con.dateRange
        });
        const formatInvoice = (inv) => ({
            id: inv.id, invoice: inv.invoice, client: inv.client, date: inv.date,
            status: inv.invoiceStatus, totalAmount: inv.totalAmount, currency: inv.cur,
            origin: inv.origin, deliveryTerms: inv.delTerm, dueDate: inv.delDate?.endDate,
            canceled: inv.canceled, final: inv.final, payments: inv.payments?.length || 0
        });
        const formatExpense = (exp) => ({
            id: exp.id, vendor: exp.vendor, date: exp.date, amount: exp.amount,
            currency: exp.cur, type: exp.expType, status: exp.paidUnpaid,
            salesInvoice: exp.salesInv, purchaseOrder: exp.purchaseOrder
        });
        return {
            contracts: contractsData.map(formatContract),
            invoices: invoicesData.map(formatInvoice),
            expenses: expensesData.map(formatExpense),
            summary: {
                totalContracts: contractsData.length,
                totalInvoices: invoicesData.length,
                totalExpenses: expensesData.length,
                pendingInvoices: invoicesData.filter(inv => inv.invoiceStatus !== 'Paid' && !inv.canceled).length,
                paidInvoices: invoicesData.filter(inv => inv.invoiceStatus === 'Paid').length
            }
        };
    }, [contractsData, invoicesData, expensesData]);

    const handleSendMessage = async (messageText = null) => {
        const textToSend = messageText || newMessage.trim();
        if (!textToSend || isLoading) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: textToSend,
            time: dateFormat(new Date(), 'h:MM TT')
        };

        setMessages(prev => [...prev, userMsg]);
        setNewMessage('');
        setIsLoading(true);
        setError(null);

        try {
            const apiMessages = [...messages, userMsg]
                .map(m => ({ role: m.role, content: m.content }));

            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    currentData: getCurrentDataContext()
                }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to get response');

            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message,
                time: dateFormat(new Date(), 'h:MM TT')
            }]);
        } catch (err) {
            console.error('Chat error:', err);
            setError(err.message);
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: `I apologize, but I encountered an error: ${err.message}. Please try again.`,
                time: dateFormat(new Date(), 'h:MM TT'),
                isError: true
            }]);
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
        setMessages([]);
        setError(null);
    };

    const formatMessageContent = (content) => {
        if (!content) return '';
        let formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        formatted = formatted.replace(/^• /gm, '<span class="text-[var(--endeavour)]">•</span> ');
        formatted = formatted.replace(/^(\d+)\. /gm, '<span class="text-[var(--endeavour)] font-medium">$1.</span> ');
        formatted = formatted.replace(/\n/g, '<br/>');
        return formatted;
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
                                {/* Left - Assistant title */}
                                <div className="flex items-center gap-2">
                                    <div className="w-1 h-5 bg-[var(--endeavour)] rounded-full" />
                                    <span className="responsiveText font-semibold text-[var(--port-gore)]">Assistant</span>
                                </div>
                                {/* Right - badges + reset */}
                                <div className="flex items-center gap-3">
                                    {dataLoading ? (
                                        <span className="responsiveTextTable text-[var(--regent-gray)]">Loading...</span>
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
                                        </>
                                    )}
                                    <button
                                        onClick={handleClearChat}
                                        className="flex items-center gap-1.5 px-3 py-1.5 responsiveTextTable text-[var(--chathams-blue)] hover:text-[var(--endeavour)] border border-[#b8ddf8] hover:border-[var(--endeavour)] rounded-lg transition-colors bg-white"
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
                                    /* Empty state - greeting */
                                    <div className="flex flex-col items-center justify-center py-16 px-4" style={{ minHeight: '400px' }}>
                                        <div className="mb-6">
                                            <video
                                                src="/logo/asistan-3d.mp4"
                                                autoPlay
                                                loop
                                                muted
                                                playsInline
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
                                    /* Messages */
                                    <div className="p-4 flex flex-col gap-4">
                                        {messages.map((message) => (
                                            <div
                                                key={message.id}
                                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                            >
                                                {/* Robot avatar - left */}
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
                                                    <div className="responsiveTextTable mt-1.5 text-right text-[var(--regent-gray)]">
                                                        {message.time}
                                                    </div>
                                                </div>

                                                {/* User avatar - right */}
                                                {message.role === 'user' && (
                                                    <div className="w-8 h-8 rounded-full bg-[var(--port-gore)]/10 flex items-center justify-center ml-2 flex-shrink-0 mt-1">
                                                        <BsPerson className="w-4 h-4 text-[var(--port-gore)]" />
                                                    </div>
                                                )}
                                            </div>
                                        ))}

                                        {/* Typing indicator */}
                                        {isLoading && (
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
                                {/* Input bar */}
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
                                        className="flex-1 outline-none text-[var(--port-gore)] placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                        style={{ backgroundColor: 'transparent', fontSize: 'inherit' }}
                                    />
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!newMessage.trim() || isLoading || dataLoading}
                                        className="p-1.5 bg-[var(--endeavour)] text-white rounded-lg hover:bg-[var(--chathams-blue)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                                    >
                                        {isLoading
                                            ? <IoRefresh className="w-4 h-4 animate-spin" />
                                            : <IoSend className="w-4 h-4" />
                                        }
                                    </button>
                                </div>

                                {/* Quick action chips */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {quickActions.map((action, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleSendMessage(action.text)}
                                            disabled={isLoading || dataLoading}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e5e7eb] rounded-full responsiveTextTable text-[var(--regent-gray)] hover:border-[var(--endeavour)] hover:text-[var(--endeavour)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
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
