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
                style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--chathams-blue)' }}
            />,
            bg: '#dbeeff', border: '#b8ddf8', color: 'var(--chathams-blue)'
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
                style={{ fontSize: '0.75rem', fontWeight: '700', color: '#92400e' }}
            />,
            bg: '#fef9c3', border: '#fde68a', color: '#92400e'
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
                style={{ fontSize: '0.75rem', fontWeight: '700', color: '#7c3aed' }}
            />,
            bg: '#ede9fe', border: '#ddd6fe', color: '#7c3aed'
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
                style={{ fontSize: '0.75rem', fontWeight: '700', color: '#166534' }}
            />,
            bg: '#dcfce7', border: '#bbf7d0', color: '#166534'
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
                style={{ fontSize: '0.75rem', fontWeight: '700', color: '#be185d' }}
            />,
            bg: '#fce7f3', border: '#fbcfe8', color: '#be185d'
        },
    ];

    return (
        <div className="w-full mb-3">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
                .stats-cards, .stats-cards * {
                    font-family: var(--font-poppins), 'Poppins', sans-serif;
                    transition-property: color, background-color, border-color, box-shadow, transform !important;
                    transition-duration: 150ms !important;
                    transition-timing-function: ease-in-out !important;
                }

                .stats-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 12px 28px rgba(0, 0, 0, 0.15);
                }
            `}</style>

            <div className="w-full flex justify-center">
                <div className="w-full max-w-7xl rounded-2xl border border-[#b8ddf8] shadow-xl p-3 sm:p-4">
                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-5 gap-4 stats-cards w-full">
                        {cards.map((card, idx) => (
                            <div
                                key={idx}
                                className="stats-card min-w-0 flex flex-col items-center justify-center rounded-full shadow-lg backdrop-blur-sm py-1 px-2"
                                style={{
                                    backgroundColor: card.bg,
                                    border: `1px solid ${card.border}`,
                                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1), 0 0 1px rgba(255, 255, 255, 0.2) inset',
                                }}
                            >
                                <span className="responsiveTextTable font-medium text-center px-1" style={{ color: card.color }}>
                                    {card.label}
                                </span>
                                <div className="responsiveTextTable font-medium text-center" style={{ color: card.color }}>
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
                                    style={{ backgroundColor: card.bg, border: `1px solid ${card.border}`, boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}
                                >
                                    <span className="responsiveTextTable font-medium text-center px-1" style={{ color: card.color }}>
                                        {card.label}
                                    </span>
                                    <div className="responsiveTextTable font-medium text-center" style={{ color: card.color }}>
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