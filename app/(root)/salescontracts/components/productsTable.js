'use client'
import { v4 as uuidv4 } from 'uuid';
import { NumericFormat } from 'react-number-format';
import { CirclePlus, Trash } from 'lucide-react';
import Tltip from '@components/tlTip';

// Lightweight product-line editor for a client sales contract: description, weight (qnty),
// unit price and a computed line total. Deliberately simpler than the supplier-contract
// ProductsTable (no PO-invoices / warehouse / FX overlays) — a sales contract only records
// the agreed materials, weights, prices and total.
const SalesProductsTable = ({ value, setValue }) => {

    const curSymbol = value.cur === 'us' ? '$' : value.cur === 'eu' ? '€' : '';
    const rows = value.productsData || [];

    const addItem = () => {
        setValue({ ...value, productsData: [...rows, { id: uuidv4(), description: '', qnty: '', unitPrc: '' }] });
    };

    const delItem = (id) => {
        setValue({ ...value, productsData: rows.filter((x) => x.id !== id) });
    };

    const handleField = (id, key, val) => {
        setValue({ ...value, productsData: rows.map((x) => (x.id === id ? { ...x, [key]: val } : x)) });
    };

    const lineTotal = (r) => (parseFloat(r.qnty) || 0) * (parseFloat(r.unitPrc) || 0);
    const grandTotal = rows.reduce((s, r) => s + lineTotal(r), 0);

    return (
        <div className="w-full">
            <div className="border border-[#b8ddf8] rounded-lg overflow-x-auto">
                <table className="table-fixed min-w-[640px] w-full divide-y divide-[#b8ddf8]">
                    <thead style={{ background: '#dbeeff' }}>
                        <tr className="responsiveTextTable font-medium text-[var(--chathams-blue)] text-left">
                            <th className="w-8 px-1 py-1.5">#</th>
                            <th className="w-6/12 px-1 py-1.5">Description</th>
                            <th className="w-2/12 px-1 py-1.5">Quantity</th>
                            <th className="w-2/12 px-1 py-1.5">Unit Price</th>
                            <th className="w-2/12 px-1 py-1.5 text-right">Total</th>
                            <th className="w-8 px-1 py-1.5"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[#b8ddf8]">
                        {rows.map((r, i) => (
                            <tr key={r.id} className="responsiveTextTable text-[var(--port-gore)]">
                                <td className="px-1 py-1 text-center">{i + 1}</td>
                                <td className="px-1 py-1">
                                    <input
                                        className="input w-full h-7 rounded-md indent-1.5"
                                        style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                        value={r.description}
                                        maxLength={120}
                                        onChange={(e) => handleField(r.id, 'description', e.target.value)}
                                    />
                                </td>
                                <td className="px-1 py-1">
                                    <input
                                        className="input w-full h-7 rounded-md indent-1.5"
                                        style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                        value={r.qnty}
                                        inputMode="decimal"
                                        onChange={(e) => handleField(r.id, 'qnty', e.target.value)}
                                    />
                                </td>
                                <td className="px-1 py-1">
                                    <input
                                        className="input w-full h-7 rounded-md indent-1.5"
                                        style={{ fontSize: 'inherit', fontFamily: 'inherit' }}
                                        value={r.unitPrc}
                                        inputMode="decimal"
                                        onChange={(e) => handleField(r.id, 'unitPrc', e.target.value)}
                                    />
                                </td>
                                <td className="px-1 py-1 text-right whitespace-nowrap">
                                    <NumericFormat value={lineTotal(r)} displayType="text" thousandSeparator
                                        prefix={curSymbol} decimalScale={2} fixedDecimalScale />
                                </td>
                                <td className="px-1 py-1 text-center">
                                    <Tltip direction='left' tltpText='Remove line'>
                                        <button type="button" onClick={() => delItem(r.id)}
                                            className="text-[var(--regent-gray)] hover:text-red-500 transition-colors">
                                            <Trash className='size-3.5' />
                                        </button>
                                    </Tltip>
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-2 py-4 text-center responsiveTextTable text-[var(--regent-gray)]">
                                    No materials yet — add a line or import from a contract.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="responsiveTextTable font-semibold text-[var(--chathams-blue)]" style={{ background: '#dbeeff' }}>
                            <td className="px-1 py-1.5" colSpan={4}>Total</td>
                            <td className="px-1 py-1.5 text-right whitespace-nowrap">
                                <NumericFormat value={grandTotal} displayType="text" thousandSeparator
                                    prefix={curSymbol} decimalScale={2} fixedDecimalScale />
                            </td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div className="mt-3">
                <Tltip direction='top' tltpText='Add a material line'>
                    <button className="blackButton py-1" onClick={addItem}>
                        <CirclePlus className='size-4' /> Add
                    </button>
                </Tltip>
            </div>
        </div>
    );
};

export default SalesProductsTable;
