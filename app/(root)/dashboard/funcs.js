import dateFormat from 'dateformat';


const Total = (data, name, mult, settings) => {
    let accumuLastInv = 0;


    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && !isNaN(obj[name])) {
                const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
                let mltTmp = currentCur === 'us' ? 1 : mult
                let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp

                accumuLastInv += (innerArray.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                    innerArray.length > 1 && !['1111', 'Invoice'].includes(obj.invType)) ?
                    num : 0;
            }
        });
    });

    return accumuLastInv;
}

const TotalClients = (data, name, mult, settings) => {
    let accumuLastInv = 0;
    let clnt;
    data.forEach(obj => {
        if (obj && !isNaN(obj[name])) {

            const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
            clnt = !obj.final ? settings.Client.Client.find(x => x.id === obj.client)['nname'] : obj.client.nname
            let mltTmp = currentCur === 'us' ? 1 : mult
            let num = obj.canceled ? 0 : obj[name] * 1 * mltTmp


            accumuLastInv += (data.length === 1 && ['1111', 'Invoice'].includes(obj.invType) ||
                data.length > 1 && !['1111', 'Invoice'].includes(obj.invType)) ?
                num : 0;

        }
    });

    return { accumuLastInv, clnt };
}
const setPieArrs = (arr) => {

    let arrTmp = arr

    for (const key in arrTmp) {
        if (arrTmp[key] === 0) {
            delete arrTmp[key];
        }
    }


    arrTmp = Object.entries(arrTmp).sort((a, b) => b[1] - a[1]);
    arrTmp = Object.fromEntries(arrTmp);
    /*
    
        let Arr = Object.fromEntries(arrTmp);
    
        if (arrTmp.length > 5) {
            const [firstArr1, secondArr1] = arrTmp.reduce(
                (result, [company, value], index) => {
                    if (index < 5) {
                        result[0][company] = value;
                    } else {
                        result[1][company] = value;
                    }
                    return result;
                },
                [{}, {}]
            );
            Arr = firstArr1;
            const sumSecondArr1 = Object.values(secondArr1).reduce((acc, currentValue) => acc + currentValue, 0);
            Arr['Others'] = sumSecondArr1
    
        }
            */
 
    return arrTmp;
}

const sortedData = (arr) => {
    return arr.map(z => ({
        ...z,
        d: z.final ? z.invType === 'Invoice' ? '1111' :
            z.invType === 'Credit Note' ? '2222' : '3333'
            : z.invType
    })).sort((a, b) => {
        const invTypeOrder = { '1111': 1, '2222': 2, '3333': 3 };
        const invTypeA = a.d || '';
        const invTypeB = b.d || '';
        return invTypeOrder[invTypeA] - invTypeOrder[invTypeB]
    })
}

const TotalInvoicePayments = (data, mult, settings) => {
    let accumulatedPmnt = 0;

    data.forEach(obj => {
        if (obj && Array.isArray(obj.payments)) {
            obj.payments.forEach(payment => {


                const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
                let mltTmp = currentCur === 'us' ? 1 : mult

                if (payment && !isNaN(parseFloat(payment.pmnt))) {
                    accumulatedPmnt += parseFloat(payment.pmnt * 1 * mltTmp);
                }
            });
        }
    });

    return accumulatedPmnt;
}

/*************************** */
export const setMonthsInvoices = (data, settings) => {

    let accumulatedPmnt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedActualPmnt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedTop5Cus = {}
 
 
    data.forEach(obj => {

        let mult = obj.euroToUSD
        let totalInvoices = Total(obj.invoicesData, 'totalAmount', mult, settings);
        let month = !obj.final ? dateFormat(obj.dateRange.startDate, 'm') * 1 : dateFormat(obj.date, 'm') * 1
        accumulatedPmnt[month] += parseFloat(totalInvoices);

        //top 5 customers

        if (Array.isArray(obj.invoicesData)) {
            obj.invoicesData.forEach(obj1 => {
                let srtX = sortedData(obj1)
                let totalAmount = TotalClients(srtX, 'totalAmount', mult, settings);
           //     let payments = TotalInvoicePayments(srtX, mult, settings);

                accumulatedTop5Cus[totalAmount.clnt] = isNaN(accumulatedTop5Cus[totalAmount.clnt]) ?
                    totalAmount.accumuLastInv * 1 : accumulatedTop5Cus[totalAmount.clnt] + totalAmount.accumuLastInv * 1

           //     accumulatedActualPmnt[month] += parseFloat(payments);
            })
        }

    })

    let pieArrClnts = setPieArrs(accumulatedTop5Cus)
    return { accumulatedPmnt, pieArrClnts /*, accumulatedActualPmnt */}
}

export const calContracts = (data, settings) => {

    let accumulatedPmnt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedExp = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedTop5Sup = data.map(x => x.supplier).reduce((o, key) => ({ ...o, [key]: 0 }), {})

    data.map((x, i) => {
        let mult = x.euroToUSD
        let mltTmp = x.cur === 'us' ? 1 : mult
        //contracts
        let tmp = ContractsValue(x, 'pmnt', mltTmp)
        accumulatedPmnt[dateFormat(x.dateRange.startDate, 'm') * 1] += tmp;
        //top 5 suppliers
        accumulatedTop5Sup[x.supplier] += tmp * 1

        //expenses
        x.expenses.forEach(obj => {
            if (obj) {
                let mltTmp = obj.cur === 'us' ? 1 : mult

                if (obj && !isNaN(parseFloat(obj.amount))) {
                    accumulatedExp[dateFormat(x.dateRange.startDate, 'm') * 1] += parseFloat(obj.amount * 1 * mltTmp);
                }
            };
        });
    })


    let arrTmp = Object.keys(accumulatedTop5Sup).reduce((acc, key) => {
        const newKey = settings.Supplier.Supplier.find(x => x.id === key)['nname']
        acc[newKey] = accumulatedTop5Sup[key];
        return acc;
    }, {});

    let pieArrSupps = setPieArrs(arrTmp)

    return { accumulatedPmnt, accumulatedExp, pieArrSupps };
}


const ContractsValue = (obj, name, mult) => {

    let accumulated = 0;

    obj.poInvoices.forEach(z => {
        if (z && !isNaN(parseFloat(z[name]))) {
            accumulated += parseFloat(z[name]) * mult;
        }

    });

    return accumulated;
}
////////////////////////////////////////////
export const frmNum = (value) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 1
    }).format(value)

}