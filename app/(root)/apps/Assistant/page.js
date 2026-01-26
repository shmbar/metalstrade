'use client';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { SettingsContext } from "../../../../contexts/useSettingsContext";
import { UserAuth } from "../../../../contexts/useAuthContext";
import Spinner from '../../../../components/spinner';
import Toast from '../../../../components/toast.js';
import { getTtl } from '../../../../utils/languages';
import { loadData } from '../../../../utils/utils';
import { IoSend, IoSparkles, IoRefresh, IoTrash } from "react-icons/io5";
import { BsRobot, BsPerson, BsLightbulb, BsFileText, BsQuestionCircle, BsBoxSeam } from "react-icons/bs";
import { FiDatabase, FiTrendingUp } from "react-icons/fi";
import { HiOutlineDocumentText, HiOutlineCurrencyDollar } from "react-icons/hi";
import dateFormat from "dateformat";

// Quick action suggestions for users
const quickActions = [
    { icon: <HiOutlineDocumentText className="w-4 h-4" />, text: "Show overdue invoices", category: "data" },
    { icon: <BsFileText className="w-4 h-4" />, text: "List recent contracts", category: "data" },
    { icon: <HiOutlineCurrencyDollar className="w-4 h-4" />, text: "Show expense summary", category: "data" },
    { icon: <BsQuestionCircle className="w-4 h-4" />, text: "How do I create an invoice?", category: "help" },
    { icon: <BsBoxSeam className="w-4 h-4" />, text: "How do I add a new supplier?", category: "help" },
    { icon: <FiTrendingUp className="w-4 h-4" />, text: "Show pending invoices", category: "data" },
];

const AssistantChat = () => {
    const { settings, ln, dateSelect } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dataLoading, setDataLoading] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Store loaded data directly
    const [contractsData, setContractsData] = useState([]);
    const [invoicesData, setInvoicesData] = useState([]);
    const [expensesData, setExpensesData] = useState([]);

    // Load data from Firestore directly
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

    // Initialize with welcome message
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: getTtl(`Hello! I'm your IMS Assistant. I can help you with:

• **Data Lookups** - Show overdue invoices, contracts, expenses
• **Workflow Guidance** - Step-by-step help for creating invoices, contracts
• **System Navigation** - Find features and pages
• **FAQ Support** - Answer common questions

Try asking me something or use the quick actions below!`, ln),
                time: dateFormat(new Date(), 'h:MM TT')
            }]);
        }
    }, [ln]);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Prepare current data context for the API
    const getCurrentDataContext = useCallback(() => {
        // Format data for better AI understanding
        const formatContract = (con) => ({
            id: con.id,
            order: con.order,
            supplier: con.supplier,
            date: con.date,
            origin: con.origin,
            deliveryTerms: con.delTerm,
            pol: con.pol,
            pod: con.pod,
            currency: con.cur,
            status: con.conStatus,
            products: con.productsData?.length || 0,
            invoicesLinked: con.invoices?.length || 0,
            dateRange: con.dateRange
        });

        const formatInvoice = (inv) => ({
            id: inv.id,
            invoice: inv.invoice,
            client: inv.client,
            date: inv.date,
            status: inv.invoiceStatus,
            totalAmount: inv.totalAmount,
            currency: inv.cur,
            origin: inv.origin,
            deliveryTerms: inv.delTerm,
            dueDate: inv.delDate?.endDate,
            canceled: inv.canceled,
            final: inv.final,
            payments: inv.payments?.length || 0
        });

        const formatExpense = (exp) => ({
            id: exp.id,
            vendor: exp.vendor,
            date: exp.date,
            amount: exp.amount,
            currency: exp.cur,
            type: exp.expType,
            status: exp.paidUnpaid,
            salesInvoice: exp.salesInv,
            purchaseOrder: exp.purchaseOrder
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
            // Prepare messages for API (exclude welcome message, include conversation history)
            const apiMessages = [...messages, userMsg]
                .filter(m => m.id !== 'welcome')
                .map(m => ({
                    role: m.role,
                    content: m.content
                }));

            const response = await fetch('/api/assistant', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: apiMessages,
                    currentData: getCurrentDataContext()
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            const assistantMsg = {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message,
                time: dateFormat(new Date(), 'h:MM TT')
            };

            setMessages(prev => [...prev, assistantMsg]);
        } catch (err) {
            console.error('Chat error:', err);
            setError(err.message);
            const errorMsg = {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: `I apologize, but I encountered an error: ${err.message}. Please try again.`,
                time: dateFormat(new Date(), 'h:MM TT'),
                isError: true
            };
            setMessages(prev => [...prev, errorMsg]);
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

    const handleQuickAction = (actionText) => {
        handleSendMessage(actionText);
    };

    const handleClearChat = () => {
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: getTtl(`Hello! I'm your IMS Assistant. I can help you with:

• **Data Lookups** - Show overdue invoices, contracts, expenses
• **Workflow Guidance** - Step-by-step help for creating invoices, contracts
• **System Navigation** - Find features and pages
• **FAQ Support** - Answer common questions

Try asking me something or use the quick actions below!`, ln),
            time: dateFormat(new Date(), 'h:MM TT')
        }]);
        setError(null);
    };

    // Format message content with markdown-like styling
    const formatMessageContent = (content) => {
        if (!content) return '';
        // Convert **bold** to styled spans
        let formatted = content.replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>');
        // Convert bullet points
        formatted = formatted.replace(/^• /gm, '<span class="text-[var(--endeavour)]">•</span> ');
        // Convert numbered lists
        formatted = formatted.replace(/^(\d+)\. /gm, '<span class="text-[var(--endeavour)] font-medium">$1.</span> ');
        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br/>');
        return formatted;
    };

    return (
        <div
            className="w-full min-h-screen flex flex-col"
            style={{ background: "#f8fbff" }} // optional: matches your app bg
        >
            <div
                className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 flex-1 flex flex-col"
                style={{ marginTop: 'clamp(56px, 7vh, 80px)', minHeight: 'calc(100vh - clamp(56px, 7vh, 80px))' }}
            >
                {Object.keys(settings).length === 0 ? <Spinner /> :
                    <>
                        <Toast />
                        <div className="border border-[var(--selago)] rounded-xl shadow-lg bg-white mt-4 flex flex-col flex-1 overflow-hidden">
                            {/* Header */}
                            <div className="p-4 border-b border-[var(--selago)] bg-gradient-to-r from-[var(--endeavour)] via-[var(--chathams-blue)] to-[var(--endeavour)]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                            <IoSparkles className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-white">{getTtl('IMS Assistant', ln)}</h2>
                                            <p className="text-white/70 text-sm">{getTtl('AI-powered help for your inventory management', ln)}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClearChat}
                                        className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                                        title="Clear conversation"
                                    >
                                        <IoTrash className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Data Context Indicator */}
                            <div className="px-4 py-2 bg-[var(--selago)]/50 border-b border-[var(--selago)] flex items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <FiDatabase className="w-4 h-4 text-[var(--endeavour)]" />
                                    <span>{dataLoading ? getTtl('Loading...', ln) : getTtl('Connected:', ln)}</span>
                                </div>
                                {!dataLoading && (
                                    <>
                                        <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">
                                            {contractsData.length} {getTtl('Contracts', ln)}
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                                            {invoicesData.length} {getTtl('Invoices', ln)}
                                        </span>
                                        <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                            {expensesData.length} {getTtl('Expenses', ln)}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Chat Area */}
                            <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-[var(--selago)]/10 to-white">
                                {messages.map((message) => (
                                    <div
                                        key={message.id}
                                        className={`flex mb-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        {/* Avatar for assistant */}
                                        {message.role === 'assistant' && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--endeavour)] to-[var(--chathams-blue)] flex items-center justify-center mr-2 flex-shrink-0">
                                                <BsRobot className="w-4 h-4 text-white" />
                                            </div>
                                        )}

                                        <div
                                            className={`max-w-[75%] rounded-2xl px-4 py-3 ${message.role === 'user'
                                                ? 'bg-gradient-to-r from-[var(--endeavour)] to-[var(--chathams-blue)] text-white rounded-br-md'
                                                : message.isError
                                                    ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-md'
                                                    : 'bg-white text-[var(--port-gore)] shadow-md border border-[var(--selago)]/50 rounded-bl-md'
                                                }`}
                                        >
                                            <div
                                                className="break-words text-[15px] leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: formatMessageContent(message.content) }}
                                            />
                                            <div className={`flex items-center justify-end gap-1 mt-2 ${message.role === 'user' ? 'text-white/60' : 'text-gray-400'
                                                }`}>
                                                <span className="text-xs">{message.time}</span>
                                            </div>
                                        </div>

                                        {/* Avatar for user */}
                                        {message.role === 'user' && (
                                            <div className="w-8 h-8 rounded-full bg-[var(--port-gore)] flex items-center justify-center ml-2 flex-shrink-0">
                                                <BsPerson className="w-4 h-4 text-white" />
                                            </div>
                                        )}
                                    </div>
                                ))}

                                {/* Loading indicator */}
                                {isLoading && (
                                    <div className="flex justify-start mb-4">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--endeavour)] to-[var(--chathams-blue)] flex items-center justify-center mr-2">
                                            <BsRobot className="w-4 h-4 text-white" />
                                        </div>
                                        <div className="bg-white text-[var(--port-gore)] shadow-md border border-[var(--selago)]/50 rounded-2xl rounded-bl-md px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="flex gap-1">
                                                    <span className="w-2 h-2 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                                    <span className="w-2 h-2 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                                    <span className="w-2 h-2 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                                </div>
                                                <span className="text-sm text-gray-500">{getTtl('Thinking...', ln)}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div ref={messagesEndRef} />
                            </div>

                            {/* Quick Actions */}
                            {messages.length <= 2 && !isLoading && (
                                <div className="px-4 py-3 border-t border-[var(--selago)] bg-[var(--selago)]/20">
                                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                                        <BsLightbulb className="w-3 h-3" />
                                        {getTtl('Quick actions:', ln)}
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {quickActions.map((action, index) => (
                                            <button
                                                key={index}
                                                onClick={() => handleQuickAction(action.text)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[var(--selago)] rounded-full text-sm text-[var(--port-gore)] hover:border-[var(--endeavour)] hover:bg-[var(--endeavour)]/5 transition-colors"
                                            >
                                                {action.icon}
                                                {action.text}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Message Input */}
                            <div className="p-4 border-t border-[var(--selago)] bg-white">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            ref={inputRef}
                                            type="text"
                                            placeholder={getTtl('Ask me anything about IMS...', ln)}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            disabled={isLoading || dataLoading}
                                            className="w-full px-4 py-3 pr-12 border border-[var(--selago)] rounded-xl focus:outline-none focus:border-[var(--endeavour)] focus:ring-2 focus:ring-[var(--endeavour)]/20 bg-[var(--selago)]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSendMessage()}
                                        disabled={!newMessage.trim() || isLoading || dataLoading}
                                        className="p-3 bg-gradient-to-r from-[var(--endeavour)] to-[var(--chathams-blue)] text-white rounded-xl hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
                                    >
                                        {isLoading ? (
                                            <IoRefresh className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <IoSend className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">
                                    {getTtl('Powered by AI • Your data stays secure', ln)}
                                </p>
                            </div>
                        </div>
                    </>
                }
            </div>
        </div>
    );
};

export default AssistantChat;
