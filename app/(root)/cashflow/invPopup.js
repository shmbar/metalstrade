'use client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { NumericFormat } from 'react-number-format';
import dateFormat from 'dateformat';

export default function InvPopup({ inv, onClose }) {
    if (!inv) return null;

    const isClient = inv._type === 'client';
    const cur = inv.cur === 'us' ? '$' : '€';

    const paid = isClient
        ? (inv.payments || []).reduce((s, p) => s + (p.pmnt * 1 || 0), 0)
        : (inv.pmnt * 1 || 0);

    const total = isClient ? (inv.totalAmount * 1 || 0) : (inv.invValue * 1 || 0);
    const balance = isClient ? (inv.debtBlnc * 1 || total - paid) : (total - paid);

    const fmt = (v) => (
        <NumericFormat
            value={v}
            displayType="text"
            thousandSeparator
            allowNegative
            prefix={cur}
            decimalScale={2}
            fixedDecimalScale
        />
    );

    const Row = ({ label, value }) => (
        <div className="flex items-center justify-between py-1.5" style={{ borderBottom: '1px solid #eef4fb' }}>
            <span className="responsiveTextTable font-medium" style={{ color: 'var(--regent-gray)' }}>{label}</span>
            <span className="responsiveTextTable font-semibold" style={{ color: 'var(--chathams-blue)' }}>{value}</span>
        </div>
    );

    return (
        <Dialog open={!!inv} onOpenChange={onClose}>
            <DialogContent
                className="p-0 overflow-hidden"
                style={{
                    maxWidth: '360px',
                    borderRadius: '20px',
                    border: '1px solid #d8e8f5',
                    boxShadow: '0 20px 60px rgba(3,102,174,0.15)',
                    fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
                }}
            >
                {/* Header */}
                <DialogHeader
                    className="px-5 py-3"
                    style={{ background: '#dbeeff', borderBottom: '1px solid #b8ddf8' }}
                >
                    <DialogTitle className="responsiveText font-semibold" style={{ color: 'var(--chathams-blue)' }}>
                        Invoice&nbsp;
                        <span style={{ color: 'var(--endeavour)' }}>{inv.invoice || '—'}</span>
                    </DialogTitle>
                    <p className="responsiveTextTable mt-0.5" style={{ color: 'var(--regent-gray)' }}>
                        {isClient ? 'Client Invoice' : 'Supplier Invoice'}
                    </p>
                </DialogHeader>

                {/* Body */}
                <div className="px-5 py-3" style={{ background: '#f8fbff' }}>
                    <Row label="Contract #" value={isClient ? (inv.poSupplier?.order || '—') : (inv.order || '—')} />
                    {inv.clientName && <Row label="Client" value={inv.clientName} />}
                    {inv.supplierName && <Row label="Supplier" value={inv.supplierName} />}
                    <Row label="Currency" value={inv.cur === 'us' ? 'USD ($)' : 'EUR (€)'} />
                    {inv.orderData?.date && (
                        <Row label="Contract Date" value={dateFormat(inv.orderData.date, 'dd.mm.yy')} />
                    )}
                    {inv.poSupplier?.date && isClient && (
                        <Row label="Invoice Date" value={dateFormat(inv.poSupplier.date, 'dd.mm.yy')} />
                    )}
                    {inv.shipData?.etd?.startDate && (
                        <Row label="ETD" value={dateFormat(inv.shipData.etd.startDate, 'dd.mm.yy')} />
                    )}
                    {inv.shipData?.eta?.startDate && (
                        <Row label="ETA" value={dateFormat(inv.shipData.eta.startDate, 'dd.mm.yy')} />
                    )}
                    <Row label="Invoice Amount" value={fmt(total)} />
                    <Row label="Paid" value={fmt(paid)} />
                    <Row
                        label="Balance"
                        value={
                            <span style={{ color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                                {fmt(balance)}
                            </span>
                        }
                    />
                    {!isClient && inv.cur !== 'us' && inv.euroToUSD && (
                        <Row label="EUR → USD Rate" value={inv.euroToUSD} />
                    )}

                    {/* Supplier single payment */}
                    {!isClient && inv.pmnt * 1 > 0 && (
                        <div className="mt-3">
                            <p className="responsiveTextTable uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#9fb8d4' }}>
                                Payment
                            </p>
                            <div className="flex justify-between items-center px-2 py-1 rounded-lg" style={{ background: '#eef6ff', border: '1px solid #d8e8f5' }}>
                                <span className="responsiveTextTable" style={{ color: 'var(--regent-gray)' }}>Amount Paid</span>
                                <span className="responsiveTextTable font-semibold" style={{ color: 'var(--chathams-blue)' }}>{fmt(inv.pmnt)}</span>
                            </div>
                        </div>
                    )}

                    {/* Client payment history */}
                    {isClient && inv.payments?.length > 0 && (
                        <div className="mt-3">
                            <p className="responsiveTextTable uppercase tracking-wider font-semibold mb-1.5" style={{ color: '#9fb8d4' }}>
                                Payment History
                            </p>
                            <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                                {inv.payments.map((p, i) => (
                                    <div key={i} className="flex justify-between items-center px-2 py-1 rounded-lg" style={{ background: '#eef6ff', border: '1px solid #d8e8f5' }}>
                                        <span className="responsiveTextTable" style={{ color: 'var(--regent-gray)' }}>
                                            {p.date ? dateFormat(p.date, 'dd.mm.yy') : `#${i + 1}`}
                                        </span>
                                        <span className="responsiveTextTable font-semibold" style={{ color: 'var(--chathams-blue)' }}>
                                            {fmt(p.pmnt)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
