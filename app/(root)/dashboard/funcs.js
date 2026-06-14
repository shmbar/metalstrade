import dateFormat from 'dateformat';


const Total = (data, name, mult, settings) => {
    let accumuLastInv = 0;


    data.forEach(innerArray => {
        innerArray.forEach(obj => {
            if (obj && !isNaN(obj[name])) {
                const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']
                let mltTmp = currentCur === 'us' ? 1 : mult
                // Exclude drafts and canceled invoices — only issued invoices count as revenue
            // (matches the dashboard Receivables rule, which skips drafts).
            let num = (obj.canceled || obj.draft === true) ? 0 : obj[name] * 1 * mltTmp

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
            clnt = !obj.final ? settings.Client.Client.find(x => x.id === obj.client)?.['nname'] : obj.client.nname
            let mltTmp = currentCur === 'us' ? 1 : mult
            // Exclude drafts and canceled invoices — only issued invoices count as revenue
            // (matches the dashboard Receivables rule, which skips drafts).
            let num = (obj.canceled || obj.draft === true) ? 0 : obj[name] * 1 * mltTmp


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

// Shipped tonnage from a contract's invoices. Uses the same group-selection rule as
// Total() (a plain Invoice when it's the only one in its group, otherwise the Final/
// Credit note that supersedes it) so shipped MT lines up with invoiced value and never
// double-counts an Invoice + its Final note. Quantities are treated as MT, matching how
// the dashboard sums contract productsData.
const sumInvProductsMT = (invoicesData) => {
    let mt = 0;
    (invoicesData || []).forEach(innerArray => {
        if (!Array.isArray(innerArray)) return;
        innerArray.forEach(obj => {
            if (!obj || obj.canceled) return;
            const isInvoice = ['1111', 'Invoice'].includes(obj.invType);
            const counts = (innerArray.length === 1 && isInvoice) || (innerArray.length > 1 && !isInvoice);
            if (!counts) return;
            (obj.productsDataInvoice || []).forEach(p => {
                if (p && p.qnty !== 's' && p.qnty !== '' && !isNaN(parseFloat(p.qnty))) {
                    mt += parseFloat(p.qnty);
                }
            });
        });
    });
    return mt;
};

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

        // FX safety: never let a missing rate turn EUR revenue into NaN (see calContracts).
        const rate = parseFloat(obj.euroToUSD)
        const mult = rate > 0 ? rate : 1
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
    let cogsByMonth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedTop5Sup = data.map(x => x.supplier).reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let totalMT = 0
    let shippedMT = 0
    let freightTotal = 0
    let missingRate = 0  // EUR contracts with no usable euroToUSD — counted at 1:1, surfaced to the UI
    let cogs = 0          // cost of SOLD material only (sold-basis P&L)
    let unsoldValue = 0   // purchase value of unsold material — stock, NOT a cost/loss
    const expByType = {}  // expense label -> total (freight, warehouse, commission, …)
    const materialSold = {} // material description -> sold MT

    // Expense-type ids whose label looks like freight (freight, freightReloadCourier, …),
    // so we can isolate freight cost for the per-MT freight allocation metric.
    const freightIds = new Set(
        (settings.Expenses?.Expenses || [])
            .filter(e => String(e.expType || '').toLowerCase().includes('freight'))
            .map(e => e.id)
    )
    const expLabel = (id) => settings.Expenses?.Expenses?.find(e => e.id === id)?.expType || 'Unspecified'

    data.forEach((x) => {
        // FX safety: a blank/invalid euroToUSD on an EUR contract must NOT become NaN and
        // poison the whole total (NaN propagates through every sum). Fall back to 1:1 and
        // flag it so the data gap is visible rather than silently zeroing the figures.
        const rate = parseFloat(x.euroToUSD)
        const mult = rate > 0 ? rate : 1
        if (x.cur !== 'us' && !(rate > 0)) missingRate++
        const mltTmp = x.cur === 'us' ? 1 : mult
        const month = dateFormat(x.dateRange.startDate, 'm') * 1
        //contracts — total purchase value (this is NOT the profit cost; see cogs below)
        const contractPurchase = ContractsValue(x, 'pmnt', mltTmp)
        accumulatedPmnt[month] += contractPurchase
        //top 5 suppliers
        accumulatedTop5Sup[x.supplier] += contractPurchase

        // total MT purchased — convert each contract's quantity to MT by its unit
        // (qTypeTable: KGS ÷ 1000, LB ÷ 2000), matching the Inventory tab's setNum.
        const qUnit = settings?.Quantity?.Quantity?.find(q => q.id === x.qTypeTable)?.qTypeTable
        const mtFactor = qUnit === 'KGS' ? 0.001 : qUnit === 'LB' ? 0.0005 : 1
        let contractTotalMT = 0
        if (Array.isArray(x.productsData)) {
            x.productsData.forEach(p => { contractTotalMT += (parseFloat(p.qnty) || 0) * mtFactor })
        }
        totalMT += contractTotalMT
        // shipped MT — invoice quantities are already recorded in MT (same basis the
        // Inventory tab subtracts against the MT purchase qty), so no unit conversion here.
        const contractShipped = sumInvProductsMT(x.invoicesData)
        shippedMT += contractShipped

        // SOLD-BASIS economics: only the cost of the SOLD portion is a cost; the rest is
        // unsold stock (capital tied up, not a loss). Weighted-average cost of goods sold.
        const soldFrac = contractTotalMT > 0 ? Math.min(1, contractShipped / contractTotalMT) : 0
        cogs += contractPurchase * soldFrac
        unsoldValue += contractPurchase * (1 - soldFrac)
        cogsByMonth[month] += contractPurchase * soldFrac

        // most-sold material — attribute each contract's material tonnage by its sold fraction
        if (Array.isArray(x.productsData)) {
            x.productsData.forEach(p => {
                const d = String(p.description || '').trim()
                if (!d) return
                materialSold[d] = (materialSold[d] || 0) + (parseFloat(p.qnty) || 0) * mtFactor * soldFrac
            })
        }

        //expenses — total, by month, and by type
        x.expenses.forEach(obj => {
            if (obj && !isNaN(parseFloat(obj.amount))) {
                const m2 = obj.cur === 'us' ? 1 : mult
                const amt = parseFloat(obj.amount) * m2
                accumulatedExp[month] += amt
                if (freightIds.has(obj.expType)) freightTotal += amt
                const lbl = expLabel(obj.expType)
                expByType[lbl] = (expByType[lbl] || 0) + amt
            }
        })
    })


    let arrTmp = Object.keys(accumulatedTop5Sup).reduce((acc, key) => {
        const newKey = settings.Supplier.Supplier.find(x => x.id === key)?.['nname']
        acc[newKey] = accumulatedTop5Sup[key];
        return acc;
    }, {});

    let pieArrSupps = setPieArrs(arrTmp)

    return { accumulatedPmnt, accumulatedExp, pieArrSupps, totalMT, shippedMT, freightTotal, missingRate, cogs, unsoldValue, cogsByMonth, expByType, materialSold };
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
