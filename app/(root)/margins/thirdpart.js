import { NumericFormat } from "react-number-format";

const ThirdPart = ({ data, remaining, outStandingShip, purchase, totalMargin, yr, title }) => {

    return (

        <div className="w-full p-2 mt-6">
            <h1 className="font-bold text-lg mb-2">{title}:</h1>
            <div className="w-full max-w-xl divide-y  rounded-xl">
                <div className='grid grid-cols-5 gap-2 p-1 '>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">Months</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">Purchased quantity (MT)</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">Profit</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">Outstanding shipment</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">Remaining</label>
                    </div>
                </div>
                {data.map((z, i) => {
                    return (
                        <div key={i}>
                            <div className='grid grid-cols-5 gap-2 p-1 '>
                                <div className='col-span-3 md:col-span-1 text-[0.8rem]  flex gap-4'>
                                    <label className="">{z.month + "-" + yr}</label>
                                </div>
                                <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                                    <label className="">{
                                        <NumericFormat
                                            value={z.purchase}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={true}
                                            decimalScale={!Number.isInteger(z.purchase) && '2'} //'3'
                                            fixedDecimalScale
                                            className='text-[0.8rem]'
                                        />
                                    }</label>
                                </div>
                                <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                                    <label className="">{
                                        <NumericFormat
                                            value={z.totalMargin}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={true}
                                            prefix={'$'}
                                            decimalScale='2'
                                            fixedDecimalScale
                                            className='text-[0.8rem]'
                                        />
                                    }</label>
                                </div>
                                <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                                    <label className="">{
                                        <NumericFormat
                                            value={z.openShip}
                                            displayType="text"
                                            thousandSeparator
                                            allowNegative={true}
                                            decimalScale={!Number.isInteger(z.openShip) && '2'}
                                            fixedDecimalScale
                                            className='text-[0.8rem]'
                                        />
                                    }</label>
                                </div>
                                <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                                    <label className="">{<NumericFormat
                                        value={z.remaining}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={'$'}
                                        decimalScale='2'
                                        fixedDecimalScale
                                        className='text-[0.8rem]'
                                    />
                                    }</label>
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div className='grid grid-cols-5 gap-2 p-1 '>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">Total</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">{
                            <NumericFormat
                                value={purchase}
                                displayType="text"
                                thousandSeparator
                                allowNegative={true}
                                decimalScale={!Number.isInteger(purchase) && '2'}
                                fixedDecimalScale
                                className='text-[0.8rem]'
                            />}</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">{
                            <NumericFormat
                                value={totalMargin}
                                displayType="text"
                                thousandSeparator
                                allowNegative={true}
                                prefix={'$'}
                                decimalScale='2'
                                fixedDecimalScale
                                className='text-[0.8rem]'
                            />
                        }</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">{
                            <NumericFormat
                                value={outStandingShip}
                                displayType="text"
                                thousandSeparator
                                allowNegative={true}
                                decimalScale='2'
                                fixedDecimalScale
                                className='text-[0.8rem]'
                            />
                        }</label>
                    </div>
                    <div className='col-span-5 md:col-span-1 text-[0.8rem]  flex gap-4'>
                        <label className="font-semibold">{
                            <NumericFormat
                                value={remaining}
                                displayType="text"
                                thousandSeparator
                                allowNegative={true}
                                prefix={'$'}
                                decimalScale='2'
                                fixedDecimalScale
                                className='text-[0.8rem]'
                            />
                        }</label>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default ThirdPart