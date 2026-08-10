import { NumericFormat } from "react-number-format";
import React from 'react'
import { ArrowDownToLine, Ship, Scale, TrendingUp, PackageCheck } from 'lucide-react';
import { TONES } from '../../../components/statusUtils';

const FirstPart = ({ incoming, outStandingShip, purchase, totalMargin, shipped }) => {
    const cards = [
        {
            label: "Incoming",
            icon: ArrowDownToLine,
            tone: TONES.blue,
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
        {
            label: "Outstanding shipment",
            icon: Ship,
            tone: TONES.amber,
            value: <NumericFormat
                value={outStandingShip}
                displayType="text"
                thousandSeparator
                allowNegative
                prefix={'$'}
                decimalScale={0}
                fixedDecimalScale={false}
            />,
        },
        {
            label: "Quantity (MT)",
            icon: Scale,
            tone: TONES.gray,
            value: <NumericFormat
                value={purchase}
                displayType="text"
                thousandSeparator
                allowNegative
                decimalScale={0}
                fixedDecimalScale={false}
            />,
        },
        {
            label: "Profits",
            icon: TrendingUp,
            tone: TONES.green,
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
        {
            label: "Shipped",
            icon: PackageCheck,
            tone: TONES.gray,
            value: <NumericFormat
                value={shipped}
                displayType="text"
                thousandSeparator
                allowNegative
                decimalScale={0}
                fixedDecimalScale={false}
            />,
        },
    ];

    return (
        <div className="w-full mb-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 w-full">
                {cards.map((card, idx) => {
                    const Icon = card.icon;
                    return (
                        <div
                            key={idx}
                            className="min-w-0 flex items-center gap-3 bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card p-4 transition-shadow hover:shadow-raised"
                        >
                            <div
                                className="w-8 h-8 rounded-control flex items-center justify-center flex-shrink-0"
                                style={{ background: card.tone.bg, color: card.tone.text }}
                            >
                                <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                                <div className="responsiveText uppercase tracking-[0.04em] font-medium text-[var(--ink-muted)] truncate">
                                    {card.label}
                                </div>
                                <div className="font-display font-bold text-[var(--ink)] tabular-nums truncate"
                                    style={{ fontSize: 'var(--fs-page)' }}>
                                    {card.value}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default FirstPart
