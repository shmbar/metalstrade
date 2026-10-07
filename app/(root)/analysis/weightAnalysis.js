/* The Weight Analysis report: what each line of a PO was invoiced at against what came back
   on its Final Note — Ni / Cr / Mo and weight, line by line, with the differences and an
   average row per PO.

   Restored 2026-10-07 from the last revision that had it (065057f, page.js:28-238). An edit
   in January 2026 replaced the whole pipeline with a "// ...data transformation logic
   here..." placeholder and handed getInvoices a contract where it takes [{ yr, arrInv }],
   so the page listed PO numbers and left every other column blank. Pure — no Firebase, no
   JSX — so the phone app's port (mobile/src/features/analysis/weightAnalysis.ts) is checked
   against it function for function in the parity suite. */

// What getInvoices takes for one contract: its invoice numbers, a batch per year.
export const invoiceBatches = (con) => {
    const refs = (con?.invoices || []).filter(x => x && typeof x.date === 'string');
    const yrs = [...new Set(refs.map(x => x.date.substring(0, 4)))];
    return yrs.map(yr => ({
        yr,
        arrInv: [...new Set(refs.filter(x => x.date.substring(0, 4) === yr).map(y => y.invoice))],
    }));
};

// Ni / Cr / Mo percentages read out of a line's description ("62.45Ni 13.03Cr Ingots").
// The invoice ('1111') fills the To columns, anything else the Back ones.
export const extractData = (x, type) => {
    const elements = {};
    const regex = /(\d+(\.\d+)?)(Ni|Cr|Mo)/g;
    let match;

    while ((match = regex.exec(String(x ?? ''))) !== null) {
        const [, value, , element] = match;
        if (type === '1111') {
            elements['To' + element] = parseFloat(value);
        } else {
            elements['Back' + element] = parseFloat(value);
        }
    }
    return elements;
};

// The lines of one invoice number: each invoice line paired with the Final Note line in the
// same position. An invoice with no Final Note yet has nothing to compare and gives no row.
export const mergeObj = (data) => {
    const merged = [];
    let i = 0; // the invoice's lines
    let j = 0; // the Final Note's

    const inv1111 = data.filter(item => item.invType === '1111');
    const inv3333 = data.filter(item => item.invType === '3333');

    while (i < inv1111.length && j < inv3333.length) {
        merged.push({
            ...inv1111[i],
            ...inv3333[j],
            invType: inv1111[i].invType + '/' + inv3333[j].invType,
            Toqnty: inv1111[i].qnty,
            Backqnty: inv3333[j].qnty,
            cert: inv1111[i].cert,
        });
        i++;
        j++;
    }

    return merged;
};

// Two decimals as text; a plain 0 for zero; '' for what is not a number.
const isNumber = (z) => typeof z === 'number';
export const calc = (z) => {
    return isNaN(z) ? '' :
        isNumber(z) && z !== 0 ? z.toFixed(2) :
            isNumber(z) && z === 0 ? 0 : '';
};

// An "Average" row under each PO that has more than one line: the assays averaged, the
// weights added up.
export const calcAverage = (arr) => {
    const groupedArray1 = arr.sort((a, b) => {
        return a.order - b.order;
    }).reduce((result, obj) => {
        const group = result.find((group) => group[0]?.order === obj.order);

        if (group) {
            group.push(obj);
        } else {
            result.push([obj]);
        }

        return result;
    }, []);

    const calculateAverage = (numbers) =>
        numbers.length ? calc(numbers.reduce((acc, num) => acc + num * 1, 0) / numbers.length) : 0;

    const calculateSum = (numbers) =>
        numbers.length ? calc(numbers.reduce((acc, num) => acc + num * 1, 0)) : 0;

    const given = (group, key) => group.map(x => x[key]).filter(item => item !== null && item !== undefined);

    const updatedArr = groupedArray1.map(group => {
        return group.length > 1 ? [...group, {
            cert: 'Average', order: group[0].order,
            ToNi: calculateAverage(given(group, 'ToNi')),
            ToCr: calculateAverage(given(group, 'ToCr')),
            ToMo: calculateAverage(given(group, 'ToMo')),
            BackNi: calculateAverage(given(group, 'BackNi')),
            BackCr: calculateAverage(given(group, 'BackCr')),
            BackMo: calculateAverage(given(group, 'BackMo')),
            Toqnty: calculateSum(given(group, 'Toqnty')),
            Backqnty: calculateSum(given(group, 'Backqnty')),
            date: group[0].date, invoice: '', supplier: group[0].supplier,
            diffCr: '', diffMo: '', diffNi: '', diffqnty: '',
        }] : group;
    });

    return updatedArr.flat();
};

/* The report's rows from the contracts, each carrying its invoice documents in
   `invoicesData`. `groupByInvoice` and `sortByDate` are utils.js groupedArrayInvoice and
   sortArr, passed in so this file stays free of Firebase. */
export const createData = (arr, { groupByInvoice, sortByDate }) => {
    const newArr = [];

    (arr || []).forEach(obj => {
        const order = obj.order;
        const date = obj.date;

        (obj.invoicesData || []).forEach(z => {
            let tempObj = { invoice: z.invoice, invType: z.invType, order, date };

            (z.productsDataInvoice || []).forEach(q => {
                const desc = q.descriptionText === ''
                    ? (obj.productsData || []).find(x => x.id === q.descriptionId)?.description
                    : q.descriptionText;

                tempObj = {
                    ...tempObj, ...extractData(desc, z.invType), descriptionText: desc,
                    qnty: q.qnty, cert: q.cert ?? '',
                };

                newArr.push(tempObj);
            });
        });
    });

    const newArr1 = [];
    groupByInvoice(newArr).forEach(z => {
        newArr1.push(mergeObj(z)); // each invoice line with its Final Note line
    });

    const flatArr = newArr1.flat().map(z => ({
        ...z,
        diffNi: calc(z.BackNi - z.ToNi),
        diffCr: calc(z.BackCr - z.ToCr),
        diffMo: calc(z.BackMo - z.ToMo),
        diffqnty: calc(z.Backqnty - z.Toqnty),
    }));

    return sortByDate(calcAverage(flatArr), 'date');
};
