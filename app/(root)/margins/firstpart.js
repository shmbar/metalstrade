import { NumericFormat } from "react-number-format";
import React from 'react'

const FirstPart = ({ incoming, outStandingShip, purchase, totalMargin, shipped }) => {
    const cards = [
        {
            label: "Incoming:",
            value: <NumericFormat
                value={incoming}
                displayType="text"
                thousandSeparator
                allowNegative
                prefix={'$'}
                decimalScale={2}
                fixedDecimalScale
                style={{ fontWeight: '500', color: 'var(--chathams-blue)' }}
            />,
            bg: 'var(--surface-header)', border: 'var(--border-divider)', color: 'var(--chathams-blue)'
        },
        {
            label: "Outstanding shipment:",
            value: <NumericFormat
                value={outStandingShip}
                displayType="text"
                thousandSeparator
                allowNegative
                prefix={'$'}
                decimalScale={0}
                fixedDecimalScale={false}
                style={{ fontWeight: '500', color: 'var(--warn-strong)' }}
            />,
            bg: 'var(--warn-bg)', border: 'var(--warn-border)', color: 'var(--warn-strong)'
        },
        {
            label: "Quantity (MT):",
            value: <NumericFormat
                value={purchase}
                displayType="text"
                thousandSeparator
                allowNegative
                decimalScale={0}
                fixedDecimalScale={false}
                style={{ fontWeight: '500', color: 'var(--violet-text)' }}
            />,
            bg: 'var(--violet-bg)', border: 'var(--violet-border)', color: 'var(--violet-text)'
        },
        {
            label: "Profits:",
            value: <NumericFormat
                value={totalMargin}
                displayType="text"
                thousandSeparator
                allowNegative
                prefix={'$'}
                decimalScale={0}
                fixedDecimalScale={false}
                style={{ fontWeight: '500', color: 'var(--ok-strong)' }}
            />,
            bg: 'var(--ok-bg)', border: 'var(--ok-border)', color: 'var(--ok-strong)'
        },
        {
            label: "Shipped:",
            value: <NumericFormat
                value={shipped}
                displayType="text"
                thousandSeparator
                allowNegative
                decimalScale={0}
                fixedDecimalScale={false}
                style={{ fontWeight: '500', color: 'var(--pink-text)' }}
            />,
            bg: 'var(--pink-bg)', border: 'var(--pink-bg)', color: 'var(--pink-text)'
        },
    ];

    return (
        <div className="w-full mb-3">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                .stats-cards, .stats-cards * {
                    font-family: var(--font-poppins), 'Poppins', sans-serif;
                    transition-property: color, background-color, border-color, box-shadow, transform !important;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                .stats-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px rgba(var(--shadow-rgb), 0.15);
                }
            `}</style>

            <div className="w-full flex justify-center">
                {/* No max-width cap: the KPI strip must track the full page width like
                    the tables below it (it stopped at 1280px on wide screens). */}
                <div className="w-full rounded-2xl border border-[var(--border-divider)] shadow-xl p-3 sm:p-4">
                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-5 gap-4 stats-cards w-full">
                        {cards.map((card, idx) => (
                            <div
                                key={idx}
                                className="stats-card min-w-0 flex flex-col items-center justify-center rounded-full shadow-lg backdrop-blur-sm py-1 px-2"
                                style={{
                                    backgroundColor: card.bg,
                                    border: `1px solid ${card.border}`,
                                    boxShadow: '0 8px 25px rgba(var(--shadow-rgb), 0.1), 0 0 1px rgba(var(--surface-card-rgb), 0.2) inset',
                                }}
                            >
                                <span className="font-medium text-center responsiveTextInput px-1" style={{ color: card.color }}>
                                    {card.label}
                                </span>
                                <div className="font-medium text-center responsiveTextInput" style={{ color: card.color }}>
                                    {card.value}
                                </div>

                            </div>
                        ))}
                    </div>

                    {/* Mobile Layout */}
                    <div className="block md:hidden stats-cards">
                        <div className="grid grid-cols-2 gap-2">
                            {cards.map((card, idx) => (
                                <div
                                    key={idx}
                                    className="stats-card flex flex-col items-center justify-center rounded-full py-1 px-1 shadow-lg"
                                    style={{ backgroundColor: card.bg, border: `1px solid ${card.border}`, boxShadow: '0 8px 25px rgba(var(--shadow-rgb), 0.1)' }}
                                >
                                    <span className="font-medium text-center responsiveTextInput px-1" style={{ color: card.color }}>
                                        {card.label}
                                    </span>
                                    <div className="font-medium text-center responsiveTextInput" style={{ color: card.color }}>
                                        {card.value}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirstPart