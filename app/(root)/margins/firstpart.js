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
                style={{ fontSize: 'clamp(11px, 1.0vw, 13px)', fontWeight: '700' }}
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
                style={{ fontSize: 'clamp(11px, 1.0vw, 13px)', fontWeight: '700' }}
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
                style={{ fontSize: 'clamp(11px, 1.0vw, 13px)', fontWeight: '700' }}
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
                style={{ fontSize: 'clamp(11px, 1.0vw, 13px)', fontWeight: '700' }}
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
                style={{ fontSize: 'clamp(11px, 1.0vw, 13px)', fontWeight: '700' }}
            />,
            bgGradient: 'linear-gradient(135deg, #828df8, #6366f1)'
        },
    ];

    return (
        <div className="w-full p-1 ">
            {/* Import Poppins font and apply consistent styling exactly like newTable */}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600&display=swap');
                
                .stats-cards, .stats-cards * {
                    font-family: 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
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
                    <div className="hidden md:flex flex-row gap-8 justify-center stats-cards">
                        {cards.map((card, idx) => (
                            <div
                                key={idx}
                                className="stats-card flex flex-col items-center justify-center rounded-full shadow-lg border border-white/20 backdrop-blur-sm bg-white"
                                style={{
                                    width: 'clamp(70px, 18vw, 150px)',
                                    height: 'clamp(20px, 6vh, 60px)',
                                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.1), 0 0 1px rgba(255, 255, 255, 0.2) inset',
                                }}
                            >
                                <div 
                                    className="text-[#005b9f] font-bold text-center"
                                    style={{
                                        fontSize: 'clamp(11px, 1.0vw, 13px)',
                                        fontWeight: '700'                                    }}
                                >
                                    {card.value}
                                </div>
                                <span 
                                    className="text-[#005b9f] font-bold mb-1 text-center px-2"
                                    style={{
                                        fontSize: '10px',
                                        fontWeight: '700',
                                        letterSpacing: '0.02em'
                                    }}
                                >
                                    {card.label}
                                </span>
                                
                            </div>
                        ))}
                    </div>

                    {/* Mobile Layout */}
                    <div className="block md:hidden stats-cards">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {cards.map((card, idx) => (
                                <div
                                    key={idx}
                                    className="stats-card rounded-2xl overflow-hidden shadow-lg transition-colors duration-200"
                                    style={{
                                        backgroundColor: '#FFFFFF',
                                        border: '1px solid #E5E7EB',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.06)'
                                    }}
                                >
                                    {/* Mobile Card Header */}
                                    <div 
                                        className="px-3 py-2 flex items-center justify-center"
                                        style={{ 
                                            background: card.bgGradient,
                                        }}
                                    >
                                        <span 
                                            className="font-normal text-white text-center"
                                            style={{ 
                                                fontSize: 'clamp(8px, 0.7vw, 9px)',
                                                textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
                                                letterSpacing: '0.02em',
                                                fontWeight: '700'
                                            }}
                                        >
                                            {card.label}
                                        </span>
                                    </div>

                                    {/* Mobile Card Content */}
                                    <div className="p-3 flex items-center justify-center">
                                        <div 
                                            className="font-normal break-words text-center" 
                                            style={{ 
                                                color: '#1F2937',
                                                fontSize: 'clamp(10px, 0.9vw, 12px)',
                                                fontWeight: '700'
                                            }}
                                        >
                                            {React.cloneElement(card.value, {
                                                style: {
                                                    fontSize: 'clamp(10px, 0.9vw, 12px)',
                                                    fontWeight: '700'
                                                }
                                            })}
                                        </div>
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