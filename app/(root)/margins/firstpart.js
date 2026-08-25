import { NumericFormat } from "react-number-format";
import React from 'react'
import { ArrowDownToLine, Ship, Scale, TrendingUp, PackageCheck } from 'lucide-react';
import KpiStrip from '../../../components/KpiStrip';

// The margins summary is the same strip contracts/invoices/cashflow show, so it
// renders through the same component rather than a hand-built copy of the card —
// that copy is how it ended up a different height from the rest of the app. The
// figures stay <NumericFormat> nodes (KpiStrip renders a node as-is), because the
// MT/USD suffixes and per-card decimal scales here are not a single formatter.
const FirstPart = ({ incoming, outStandingShip, purchase, totalMargin, shipped }) => {
    const mt = (value, decimals = 0) => (
        <NumericFormat
            value={value}
            displayType="text"
            thousandSeparator
            allowNegative
            suffix={' MT'}
            decimalScale={decimals}
            fixedDecimalScale={false}
        />
    );
    const cards = [
        {
            label: "Incoming",
            icon: ArrowDownToLine,
            tone: 'blue',
            value: <NumericFormat
                value={incoming}
                displayType="text"
                thousandSeparator
                allowNegative
                prefix={'$'}
                decimalScale={2}
                fixedDecimalScale
            />,
        },
        { label: "Outstanding shipment", icon: Ship, tone: 'amber', value: mt(outStandingShip) },
        { label: "Quantity", icon: Scale, tone: 'gray', value: mt(purchase) },
        {
            label: "Profits",
            icon: TrendingUp,
            tone: 'green',
            value: <NumericFormat
                value={totalMargin}
                displayType="text"
                thousandSeparator
                allowNegative
                prefix={'$'}
                decimalScale={0}
                fixedDecimalScale={false}
            />,
        },
        { label: "Shipped", icon: PackageCheck, tone: 'gray', value: mt(shipped) },
    ];

    return <KpiStrip items={cards} cols={5} />;
};

export default FirstPart
