export const ContractsValue = (obj, name, val, mult) => {

    let accumulatedPmnt = 0;

    obj.poInvoices.forEach(z => {

        let mltTmp = obj.cur === val.cur ? 1 :
            obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

        if (z && !isNaN(parseFloat(z[name]))) {
            accumulatedPmnt += parseFloat(z[name]) * mltTmp;
        }

    });

    return accumulatedPmnt;
}
/**************************************** */
export const SumAllPayments = (data, val) => {
    let accumulatedPmnt = 0;

    data.forEach(innerArray => {
        let mult = innerArray.euroToUSD
        innerArray.invoicesData.forEach(innerArray1 => {
            innerArray1.forEach(obj => {

                if (obj && Array.isArray(obj.payments)) {

                    obj.payments.forEach(payment => {
                        let mltTmp = obj.cur === val.cur ? 1 :
                            obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

                        if (payment && !isNaN(parseFloat(payment.pmnt))) {
                            accumulatedPmnt += parseFloat(payment.pmnt * 1 * mltTmp);
                        }
                    });
                }
            });
        });
    });

    return accumulatedPmnt;
}

/**************************************** */
export const SumAllExp = (data, val) => {
    let accumulatedPmnt = 0;

    data.forEach(innerArray => {
        let mult = innerArray.euroToUSD
        innerArray.expenses.forEach(obj => {
            let mltTmp = obj.cur === val.cur ? 1 :
                obj.cur === 'us' && val.cur === 'eu' ? 1 / mult : mult

            if (obj && !isNaN(parseFloat(obj.amount))) {
                accumulatedPmnt += parseFloat(obj.amount * 1 * mltTmp);
            }
        });
    });

    return accumulatedPmnt;
}
/**************************************** */
export const Numcur = (obj, name, val, mult, settings) => {

    const currentCur = !obj.final ? obj.cur : settings.Currency.Currency.find(x => x.cur === obj.cur.cur)['id']

    let mltTmp = currentCur === val.cur ? 1 :
        currentCur === 'us' && val.cur === 'eu' ? 1 / mult : mult

    let num = obj.canceled && name !== 'payments' ? 0 : obj[name] * 1 * mltTmp
    return num;
}