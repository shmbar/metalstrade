'use client';
import { useContext, useEffect, useState, useRef, useCallback } from 'react';
import { SettingsContext } from "../contexts/useSettingsContext";
import { UserAuth } from "../contexts/useAuthContext";
import { loadData } from '../utils/utils';
import { X, Send, Loader2, Trash2 } from 'lucide-react';
import { BsRobot, BsPerson } from "react-icons/bs";
import dateFormat from "dateformat";

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

    // Store loaded data
    const [contractsData, setContractsData] = useState([]);
    const [invoicesData, setInvoicesData] = useState([]);
    const [expensesData, setExpensesData] = useState([]);

    // Load data when chat opens
    useEffect(() => {
        const loadAllData = async () => {
            if (!uidCollection || !dateSelect || !chatOpen) return;
            if (contractsData.length > 0) return; // Already loaded

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

        if (chatOpen) {
            loadAllData();
        }
    }, [uidCollection, dateSelect, chatOpen]);

    // Initialize welcome message when chat opens
    useEffect(() => {
        if (chatOpen && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: `Hi! I'm your IMS Assistant. How can I help you today?`,
                time: dateFormat(new Date(), 'h:MM TT')
            }]);
        }
    }, [chatOpen]);

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    // Focus input when chat opens
    useEffect(() => {
        if (chatOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [chatOpen]);

    // Close chat when sidebar/menu opens on mobile
    useEffect(() => {
        const handler = (e) => {
            try {
                const isOpen = e?.detail?.isOpen;
                if (isOpen && typeof window !== 'undefined' && window.innerWidth < 768) {
                    setChatOpen(false);
                }
            } catch (err) {
                // ignore
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('ims:menuToggle', handler);
        }

        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('ims:menuToggle', handler);
            }
        };
    }, []);

    // Listen for global open-chat event so other UI can trigger the chat
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const handler = () => setChatOpen(true);
        window.addEventListener('ims:openChat', handler);
        return () => window.removeEventListener('ims:openChat', handler);
    }, []);

    // Toggle a body class so other components (like datepicker) can hide when chat is open
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const cls = 'ims-chat-open';
        if (chatOpen) {
            document.body.classList.add(cls);
        } else {
            document.body.classList.remove(cls);
        }

        return () => {
            document.body.classList.remove(cls);
        };
    }, [chatOpen]);

    // Additionally, forcibly hide any datepicker popovers appended to body when chat opens,
    // and restore them when chat closes.
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

        // Aggressive hide: hide any node that contains a date-range pattern.
        // Instead of removing immediately, mark and hide so we can restore later.
        const removeDatepickerLikeNodes = () => {
            try {
                const dateRegex = /\d{1,2}-[A-Za-z]{3}-\d{2}\s*~\s*\d{1,2}-[A-Za-z]{3}-\d{2}/;
                const all = Array.from(document.querySelectorAll('body *'));
                all.forEach(el => {
                    if (!el || !el.textContent) return;
                    if (dateRegex.test(el.textContent)) {
                        // Prefer to hide an ancestor popover container if found
                        let target = el.closest('[role="dialog"], [data-testid="dropdown"], .react-tailwindcss-datepicker__dropdown, .react-tailwindcss-datepicker-dropdown');
                        // fallback: find nearest positioned ancestor (absolute/fixed)
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

                        // If still not found, use the element itself
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
                            // if hide fails, as a last resort remove the element
                            try { target.remove(); } catch (e) { }
                        }
                    }
                });
            } catch (err) {
                // ignore
            }
        };

        const restorePopovers = () => {
            // restore elements we previously hid (either by selector or by date content)
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

            // also restore known selectors (kept for backward compatibility)
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
            // slight delay to allow picker to open/close naturally
            setTimeout(() => restorePopovers(), 50);
        }

        // Also observe DOM mutations to hide newly created popovers while chat is open
        let observer;
        if (chatOpen) {
            observer = new MutationObserver(() => hidePopovers());
            observer.observe(document.body, { childList: true, subtree: true });
            // Also remove nodes that may be inserted without expected selectors
            const obs2 = new MutationObserver(() => removeDatepickerLikeNodes());
            obs2.observe(document.body, { childList: true, subtree: true });
        }

        return () => {
            if (observer) observer.disconnect();
            if (typeof obs2 !== 'undefined' && obs2) obs2.disconnect();
            restorePopovers();
        };
    }, [chatOpen]);

    // Prepare data context for API
    const getCurrentDataContext = useCallback(() => {
        const formatContract = (con) => ({
            id: con.id,
            order: con.order,
            supplier: con.supplier,
            date: con.date,
            origin: con.origin,
            currency: con.cur,
            status: con.conStatus,
            products: con.productsData?.length || 0,
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
            dueDate: inv.delDate?.endDate,
            canceled: inv.canceled
        });

        const formatExpense = (exp) => ({
            id: exp.id,
            vendor: exp.vendor,
            date: exp.date,
            amount: exp.amount,
            currency: exp.cur,
            type: exp.expType,
            status: exp.paidUnpaid
        });

        return {
            contracts: contractsData.map(formatContract),
            invoices: invoicesData.map(formatInvoice),
            expenses: expensesData.map(formatExpense),
            summary: {
                totalContracts: contractsData.length,
                totalInvoices: invoicesData.length,
                totalExpenses: expensesData.length,
                pendingInvoices: invoicesData.filter(inv => inv.invoiceStatus !== 'Paid' && !inv.canceled).length
            }
        };
    }, [contractsData, invoicesData, expensesData]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isLoading) return;

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: newMessage,
            time: dateFormat(new Date(), 'h:MM TT')
        };

        setMessages(prev => [...prev, userMsg]);
        setNewMessage('');
        setIsLoading(true);

        try {
            const apiMessages = [...messages, userMsg]
                .filter(m => m.id !== 'welcome')
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

            if (!response.ok) {
                throw new Error(data.error || 'Failed to get response');
            }

            setMessages(prev => [...prev, {
                id: `assistant-${Date.now()}`,
                role: 'assistant',
                content: data.message,
                time: dateFormat(new Date(), 'h:MM TT')
            }]);
        } catch (err) {
            console.error('Chat error:', err);
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: `Sorry, I encountered an error. Please try again.`,
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
        setMessages([{
            id: 'welcome',
            role: 'assistant',
            content: `Hi! I'm your IMS Assistant. How can I help you today?`,
            time: dateFormat(new Date(), 'h:MM TT')
        }]);
    };

    // Format message content for better display
    const formatMessageContent = (content) => {
        if (!content) return '';
        let formatted = content;
        // Convert **bold** to styled spans
        formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // Convert bullet points to styled bullets
        formatted = formatted.replace(/^[•\-]\s*/gm, '<span class="text-blue-600 mr-1">•</span>');
        // Convert numbered lists
        formatted = formatted.replace(/^(\d+)\.\s+/gm, '<span class="text-blue-600 font-medium mr-1">$1.</span>');
        // Convert line breaks
        formatted = formatted.replace(/\n/g, '<br/>');
        return formatted;
    };

    // Don't render if settings not loaded
    if (Object.keys(settings || {}).length === 0) return null;

    return (
        <>
            {/* Chat Window */}
            {chatOpen && (
                <div style={{ zIndex: 99999 }} className="fixed bottom-4 right-4 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300">
                    {/* Header */}
                    <div className="px-3 py-2.5 border-b border-[var(--selago)] flex items-center justify-between bg-white">
                        <div className="flex items-center gap-2">
                            <div className="w-1 h-5 bg-[var(--endeavour)] rounded-full" />
                            <span className="text-sm font-semibold text-[var(--port-gore)]">Assistant</span>
                        </div>
                        <div className="flex items-center gap-2">
                            {!dataLoading && (
                                <div className="flex items-center gap-1.5">
                                    <span className="px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-[10px] font-medium">
                                        {contractsData.length} Contracts
                                    </span>
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-[10px] font-medium">
                                        {invoicesData.length} Invoices
                                    </span>
                                </div>
                            )}
                            <button
                                onClick={handleClearChat}
                                className="p-1 hover:text-[var(--endeavour)] text-gray-400 transition-colors"
                                title="Reset chat"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => setChatOpen(false)}
                                className="p-1 hover:text-[var(--endeavour)] text-gray-400 transition-colors"
                                title="Close chat"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ backgroundColor: '#ffffff' }}>
                        {messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-7 h-7 rounded-full bg-[var(--endeavour)]/10 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                        <BsRobot className="w-3.5 h-3.5 text-[var(--endeavour)]" />
                                    </div>
                                )}
                                <div
                                    className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
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
                                    <span className="text-[10px] mt-1 block text-right text-gray-400">
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

                        {/* Loading */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--endeavour)] to-[var(--chathams-blue)] flex items-center justify-center mr-2">
                                    <BsRobot className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div className="bg-white text-gray-700 shadow-sm border border-gray-100 rounded-2xl rounded-bl-md px-3 py-2">
                                    <div className="flex items-center gap-1.5">
                                        <div className="flex gap-1">
                                            <span className="w-1.5 h-1.5 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                            <span className="w-1.5 h-1.5 bg-[var(--endeavour)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input + Quick Actions */}
                    <div className="p-3 border-t border-[var(--selago)]" style={{ backgroundColor: '#ffffff' }}>
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
                                className="flex-1 outline-none text-sm text-[var(--port-gore)] placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ backgroundColor: 'transparent' }}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!newMessage.trim() || isLoading || dataLoading}
                                className="p-1.5 bg-[var(--endeavour)] text-white rounded-lg hover:bg-[var(--chathams-blue)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Send className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        {/* Quick action chips */}
                        {messages.length <= 1 && !isLoading && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                                {['Show overdue invoices', 'List contracts', 'How to create invoice?'].map((action) => (
                                    <button
                                        key={action}
                                        onClick={() => {
                                            setNewMessage(action);
                                            setTimeout(() => handleSendMessage(), 100);
                                        }}
                                        className="px-2.5 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:border-[var(--endeavour)] hover:text-[var(--endeavour)] transition-colors"
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
