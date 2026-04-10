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
                style={{ fontSize: '0.72rem', fontWeight: '600' }}
            />,
            bgGradient: 'linear-gradient(135deg, #0ea5e9, #0284c7)'
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
                style={{ fontSize: '0.72rem', fontWeight: '600' }}
            />,
            bgGradient: 'linear-gradient(135deg, #3abef8, #0ea5e9)'
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
                style={{ fontSize: '0.72rem', fontWeight: '600' }}
            />,
            bgGradient: 'linear-gradient(135deg, #77d1fc, #3abef8)'
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
                style={{ fontSize: '0.72rem', fontWeight: '600' }}
            />,
            bgGradient: 'linear-gradient(135deg, #6366f1, #4f46e5)'
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
                style={{ fontSize: '0.72rem', fontWeight: '600' }}
            />,
            bgGradient: 'linear-gradient(135deg, #828df8, #6366f1)'
        },
    ];

    return (
        <div className="w-full">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
                .stats-cards, .stats-cards * {
                    font-family: var(--font-poppins), 'Plus Jakarta Sans', sans-serif;
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
                <div className="w-full max-w-7xl">
                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-5 gap-4 stats-cards w-full">
                        {cards.map((card, idx) => (
                            <div
                                key={idx}
                                className="stats-card min-w-0 flex flex-col items-center justify-center rounded-full shadow-lg border border-white/20 backdrop-blur-sm bg-white py-1 px-2"
                                style={{
                                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1), 0 0 1px rgba(255, 255, 255, 0.2) inset',
                                }}
                            >
                                <span className="responsiveTextTable font-medium text-[var(--endeavour)] text-center px-1">
                                    {card.label}
                                </span>
                                <div className="responsiveTextTable font-medium text-[var(--endeavour)] text-center">
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
                                    className="stats-card flex flex-col items-center justify-center rounded-full bg-white py-1 px-1 shadow-lg border border-white/20"
                                    style={{ boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1)' }}
                                >
                                    <span className="responsiveTextTable font-medium text-[var(--endeavour)] text-center px-1">
                                        {card.label}
                                    </span>
                                    <div className="responsiveTextTable font-medium text-[var(--endeavour)] text-center">
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