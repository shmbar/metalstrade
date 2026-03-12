'use client';
import { useContext, useState, useRef, useEffect, useCallback } from 'react';
import { SettingsContext } from "../contexts/useSettingsContext";
import { UserAuth } from "../contexts/useAuthContext";
import { ContractsContext } from "../contexts/useContractsContext";
import { InvoiceContext } from "../contexts/useInvoiceContext";
import { ExpensesContext } from "../contexts/useExpensesContext";
import { getTtl } from '../utils/languages';
import { useRouter } from 'next/navigation';
import { BiSearch } from 'react-icons/bi';
import { HiOutlineDocumentText, HiOutlineCurrencyDollar, HiOutlineCalculator } from 'react-icons/hi';
import { BsFileText } from 'react-icons/bs';
import { IoClose } from 'react-icons/io5';
import dateFormat from 'dateformat';

const GlobalSearch = () => {
    const { settings, ln } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();
    const { contractsData } = useContext(ContractsContext);
    const { invoicesData } = useContext(InvoiceContext);
    const { expensesData } = useContext(ExpensesContext);
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [results, setResults] = useState({ contracts: [], invoices: [], expenses: [], accounting: [] });

    const searchRef = useRef(null);
    const inputRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to get display value from settings
    const getSettingDisplay = useCallback((settingType, id, field) => {
        if (!settings || !settings[settingType]) return '';
        const found = settings[settingType]?.[settingType]?.find(x => x.id === id);
        return found?.[field] || '';
    }, [settings]);

    // Search logic - uses context data directly (no loading needed)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setResults({ contracts: [], invoices: [], expenses: [], accounting: [] });
            return;
        }

        const query = searchQuery.toLowerCase();

        const filteredContracts = (contractsData || []).filter(c => {
            // Search by display values (converted from IDs)
            const supplierName = getSettingDisplay('Supplier', c.supplier, 'nname');
            const originName = getSettingDisplay('Origin', c.origin, 'origin');
            const podName = getSettingDisplay('POD', c.pod, 'pod');
            const polName = getSettingDisplay('POL', c.pol, 'pol');
            const delTermName = getSettingDisplay('Delivery Terms', c.delTerm, 'delTerm');
            const packingName = getSettingDisplay('Packing', c.packing, 'packing');
            const contTypeName = getSettingDisplay('Container Type', c.contType, 'contType');
            const sizeName = getSettingDisplay('Size', c.size, 'size');
            const deltimeName = getSettingDisplay('Delivery Time', c.deltime, 'deltime');
            const shpTypeName = getSettingDisplay('Shipment', c.shpType, 'shpType');
            const curName = getSettingDisplay('Currency', c.cur, 'cur');
            const originSupplierName = getSettingDisplay('Supplier', c.originSupplier, 'nname');

            return String(c.order || '').toLowerCase().includes(query) ||
                supplierName.toLowerCase().includes(query) ||
                originName.toLowerCase().includes(query) ||
                podName.toLowerCase().includes(query) ||
                polName.toLowerCase().includes(query) ||
                String(c.date || '').toLowerCase().includes(query) ||
                delTermName.toLowerCase().includes(query) ||
                packingName.toLowerCase().includes(query) ||
                contTypeName.toLowerCase().includes(query) ||
                sizeName.toLowerCase().includes(query) ||
                deltimeName.toLowerCase().includes(query) ||
                shpTypeName.toLowerCase().includes(query) ||
                curName.toLowerCase().includes(query) ||
                originSupplierName.toLowerCase().includes(query);
        }).slice(0, 5);

        const filteredInvoices = (invoicesData || []).filter(i => {
            // For final invoices, client/cur are already objects
            const clientName = i.final ? (i.client?.nname || '') : getSettingDisplay('Client', i.client, 'nname');
            const originName = i.final ? (i.origin || '') : getSettingDisplay('Origin', i.origin, 'origin');
            const polName = i.final ? (i.pol || '') : getSettingDisplay('POL', i.pol, 'pol');
            const podName = i.final ? (i.pod || '') : getSettingDisplay('POD', i.pod, 'pod');
            const packingName = i.final ? (i.packing || '') : getSettingDisplay('Packing', i.packing, 'packing');
            const delTermName = i.final ? (i.delTerm || '') : getSettingDisplay('Delivery Terms', i.delTerm, 'delTerm');
            const shpTypeName = i.final ? (i.shpType || '') : getSettingDisplay('Shipment', i.shpType, 'shpType');
            const invTypeName = i.final ? (i.invType || '') : getSettingDisplay('InvTypes', i.invType, 'invType');
            const curName = i.final ? (i.cur?.cur || '') : getSettingDisplay('Currency', i.cur, 'cur');

            return String(i.invoice || '').toLowerCase().includes(query) ||
                clientName.toLowerCase().includes(query) ||
                originName.toLowerCase().includes(query) ||
                String(i.totalAmount || '').toLowerCase().includes(query) ||
                String(i.date || '').toLowerCase().includes(query) ||
                polName.toLowerCase().includes(query) ||
                podName.toLowerCase().includes(query) ||
                packingName.toLowerCase().includes(query) ||
                delTermName.toLowerCase().includes(query) ||
                shpTypeName.toLowerCase().includes(query) ||
                String(i.container || '').toLowerCase().includes(query) ||
                invTypeName.toLowerCase().includes(query) ||
                curName.toLowerCase().includes(query) ||
                String(i.poSupplier?.order || '').toLowerCase().includes(query);
        }).slice(0, 5);

        const filteredExpenses = (expensesData || []).filter(e => {
            const supplierName = getSettingDisplay('Supplier', e.supplier, 'nname');
            const expTypeName = getSettingDisplay('Expenses', e.expType, 'expType');
            const curName = getSettingDisplay('Currency', e.cur, 'cur');
            const paidName = getSettingDisplay('ExpPmnt', e.paid, 'paid');

            return supplierName.toLowerCase().includes(query) ||
                expTypeName.toLowerCase().includes(query) ||
                String(e.amount || '').toLowerCase().includes(query) ||
                String(e.salesInv || '').toLowerCase().includes(query) ||
                String(e.date || '').toLowerCase().includes(query) ||
                String(e.expense || '').toLowerCase().includes(query) ||
                String(e.poSupplier?.order || '').toLowerCase().includes(query) ||
                curName.toLowerCase().includes(query) ||
                paidName.toLowerCase().includes(query) ||
                String(e.paidUnpaid || '').toLowerCase().includes(query) ||
                String(e.comments || '').toLowerCase().includes(query);
        }).slice(0, 5);

        // Filter accounting entries (expenses linked to sales invoices)
        const filteredAccounting = (expensesData || []).filter(e => {
            if (!e.salesInv) return false; // Only expenses linked to invoices
            const supplierName = getSettingDisplay('Supplier', e.supplier, 'nname');
            const expTypeName = getSettingDisplay('Expenses', e.expType, 'expType');
            const curName = getSettingDisplay('Currency', e.cur, 'cur');

            return supplierName.toLowerCase().includes(query) ||
                expTypeName.toLowerCase().includes(query) ||
                String(e.amount || '').toLowerCase().includes(query) ||
                String(e.salesInv || '').toLowerCase().includes(query) ||
                String(e.expense || '').toLowerCase().includes(query) ||
                curName.toLowerCase().includes(query);
        }).slice(0, 5);

        setResults({
            contracts: filteredContracts,
            invoices: filteredInvoices,
            expenses: filteredExpenses,
            accounting: filteredAccounting
        });
    }, [searchQuery, contractsData, invoicesData, expensesData, getSettingDisplay]);

    const handleFocus = () => {
        setIsOpen(true);
    };

    const handleNavigate = (type, itemId) => {
        setIsOpen(false);
        setSearchQuery('');
        router.push(`/${type}?openId=${itemId}`);
    };

    const totalResults = results.contracts.length + results.invoices.length + results.expenses.length + results.accounting.length;

    // Get display value from settings
    const getSettingValue = (type, id, field) => {
        if (!settings || !settings[type]) return id;
        const found = settings[type]?.[type]?.find(x => x.id === id);
        return found?.[field] || id || '-';
    };

    // Don't render if uidCollection is not available
    if (!uidCollection) {
        return null;
    }

    return (
        <div className='relative flex-1 max-w-xl' ref={searchRef}>
            {/* Search Input */}
            <div className='relative w-full'>
                <BiSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg' />
                <input
                    ref={inputRef}
                    type='text'
                    placeholder={getTtl('Search', ln)}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={handleFocus}
                    className='w-full pl-10 pr-10 py-2.5 rounded-lg bg-white border border-gray-300 focus:border-[var(--rock-blue)] focus:outline-none text-sm text-gray-700 placeholder-gray-500 transition-all'
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className='absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
                    >
                        <IoClose className='text-lg' />
                    </button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {isOpen && (
                <div className='absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-[70vh] overflow-y-auto'>
                    {!searchQuery ? (
                        <div className='p-4 text-center text-gray-400 text-sm'>
                            {getTtl('Type to search contracts, invoices, expenses...', ln)}
                        </div>
                    ) : totalResults === 0 ? (
                        <div className='p-4 text-center text-gray-500 text-sm'>
                            {getTtl('No results found for', ln)} "{searchQuery}"
                        </div>
                    ) : (
                        <div>
                            {/* Contracts Section */}
                            {results.contracts.length > 0 && (
                                <div className='border-b border-gray-100'>
                                    <button
                                        onClick={() => { setIsOpen(false); setSearchQuery(''); router.push('/contracts'); }}
                                        className='w-full px-4 py-2 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <BsFileText className='text-green-600' />
                                            <span className='text-xs font-semibold text-gray-600 uppercase'>
                                                {getTtl('Contracts', ln)} ({results.contracts.length})
                                            </span>
                                        </div>
                                        <span className='text-xs text-gray-400'>View all →</span>
                                    </button>
                                    {results.contracts.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigate('contracts', item.id)}
                                            className='w-full px-4 py-3 hover:bg-blue-50 flex items-center justify-between text-left transition-colors'
                                        >
                                            <div>
                                                <p className='text-sm font-medium text-gray-800'>
                                                    <span className='text-green-600 font-semibold'>Contract</span> • PO# {item.order}
                                                </p>
                                                <p className='text-xs text-gray-500'>
                                                    {getSettingValue('Supplier', item.supplier, 'nname')} • {item.date ? dateFormat(item.date, 'dd.mm.yy') : '-'}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                item.conStatus === 'Completed' ? 'bg-green-100 text-green-700' :
                                                item.conStatus === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {item.conStatus || 'Open'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Invoices Section */}
                            {results.invoices.length > 0 && (
                                <div className='border-b border-gray-100'>
                                    <button
                                        onClick={() => { setIsOpen(false); setSearchQuery(''); router.push('/invoices'); }}
                                        className='w-full px-4 py-2 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <HiOutlineDocumentText className='text-blue-600' />
                                            <span className='text-xs font-semibold text-gray-600 uppercase'>
                                                {getTtl('Invoices', ln)} ({results.invoices.length})
                                            </span>
                                        </div>
                                        <span className='text-xs text-gray-400'>View all →</span>
                                    </button>
                                    {results.invoices.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigate('invoices', item.id)}
                                            className='w-full px-4 py-3 hover:bg-blue-50 flex items-center justify-between text-left transition-colors'
                                        >
                                            <div>
                                                <p className='text-sm font-medium text-gray-800'>
                                                    <span className='text-blue-600 font-semibold'>Invoice</span> • #{item.invoice}
                                                </p>
                                                <p className='text-xs text-gray-500'>
                                                    {item.client} • {item.totalAmount ? `${item.cur || ''} ${item.totalAmount}` : '-'}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                item.invoiceStatus === 'Paid' ? 'bg-green-100 text-green-700' :
                                                item.invoiceStatus === 'Draft' ? 'bg-yellow-100 text-yellow-700' :
                                                item.canceled ? 'bg-red-100 text-red-700' :
                                                'bg-gray-100 text-gray-600'
                                            }`}>
                                                {item.canceled ? 'Canceled' : item.invoiceStatus || 'Draft'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Expenses Section */}
                            {results.expenses.length > 0 && (
                                <div className='border-b border-gray-100'>
                                    <button
                                        onClick={() => { setIsOpen(false); setSearchQuery(''); router.push('/expenses'); }}
                                        className='w-full px-4 py-2 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <HiOutlineCurrencyDollar className='text-purple-600' />
                                            <span className='text-xs font-semibold text-gray-600 uppercase'>
                                                {getTtl('Expenses', ln)} ({results.expenses.length})
                                            </span>
                                        </div>
                                        <span className='text-xs text-gray-400'>View all →</span>
                                    </button>
                                    {results.expenses.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => handleNavigate('expenses', item.id)}
                                            className='w-full px-4 py-3 hover:bg-blue-50 flex items-center justify-between text-left transition-colors'
                                        >
                                            <div>
                                                <p className='text-sm font-medium text-gray-800'>
                                                    <span className='text-purple-600 font-semibold'>Expense</span> • {getSettingValue('Supplier', item.supplier, 'nname') || 'Expense'}
                                                </p>
                                                <p className='text-xs text-gray-500'>
                                                    {getSettingValue('Expenses', item.expType, 'expType') || '-'} • {item.amount ? `${getSettingValue('Currency', item.cur, 'cur') || ''} ${item.amount}` : '-'}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs ${
                                                item.paidUnpaid === 'Paid' ? 'bg-green-100 text-green-700' :
                                                'bg-orange-100 text-orange-700'
                                            }`}>
                                                {item.paidUnpaid || 'Unpaid'}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Accounting Section */}
                            {results.accounting.length > 0 && (
                                <div>
                                    <button
                                        onClick={() => { setIsOpen(false); setSearchQuery(''); router.push('/accounting'); }}
                                        className='w-full px-4 py-2 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors'
                                    >
                                        <div className='flex items-center gap-2'>
                                            <HiOutlineCalculator className='text-teal-600' />
                                            <span className='text-xs font-semibold text-gray-600 uppercase'>
                                                {getTtl('Accounting', ln)} ({results.accounting.length})
                                            </span>
                                        </div>
                                        <span className='text-xs text-gray-400'>View all →</span>
                                    </button>
                                    {results.accounting.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => { setIsOpen(false); setSearchQuery(''); router.push('/accounting'); }}
                                            className='w-full px-4 py-3 hover:bg-blue-50 flex items-center justify-between text-left transition-colors'
                                        >
                                            <div>
                                                <p className='text-sm font-medium text-gray-800'>
                                                    <span className='text-teal-600 font-semibold'>Accounting</span> • {getSettingValue('Expenses', item.expType, 'expType') || 'Expense'} {getSettingValue('Supplier', item.supplier, 'nname')} • {item.salesInv}
                                                </p>
                                                <p className='text-xs text-gray-500'>
                                                    {item.amount ? `${getSettingValue('Currency', item.cur, 'cur') || ''} ${item.amount}` : '-'}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
