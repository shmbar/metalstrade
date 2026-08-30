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

                // A group of ONE counts whatever it is: a lone Credit/Final note means the
                // original was issued in a PREVIOUS period, so skipping it (the old
                // `singleton must be an Invoice` rule) silently dropped every deal that
                // finalized this year from revenue — the dashboard-vs-Invoices-Review gap.
                accumuLastInv += (innerArray.length === 1 ||
                    !['1111', 'Invoice'].includes(obj.invType)) ?
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


            // Same singleton rule as Total(): a lone Credit/Final note (original issued in
            // a previous period) still counts toward its client.
            accumuLastInv += (data.length === 1 ||
                !['1111', 'Invoice'].includes(obj.invType)) ?
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
/* An invoice line names its material by descriptionId — the id of a row in productsData,
   carried on the invoice itself and, for older invoices, only on the parent contract. The
   line's own `description` field exists in the draft shape but is empty on every saved
   line, and descriptionText holds heat-level detail ("24.4Ni 11.95Cr 0.48Mo Solids
   Scrap"), one distinct string per lot — grouping on that shatters the ranking into
   hundreds of one-offs. So: id first, both places, then the text, and only then give up.
   Resolving through productsData also keeps this card speaking the same vocabulary as the
   Material filter, which is built from the same field. */
const invLineMaterial = (line, invoice, contract) => {
    const byId = (arr) => (arr || []).find(y => y.id === line.descriptionId)?.description
    return String(
        byId(invoice?.productsData) || byId(contract?.productsData) || line.descriptionText || ''
    ).trim() || 'Unspecified'
}

/* byMaterial, when passed, is filled with material -> MT off the SAME lines this function
   totals. That is the whole point of threading it through here rather than computing it
   separately: "Most-Sold Material" then reconciles to shipped MT by construction, and
   there is no second rule about which invoices count that could drift away from this one. */
const sumInvProductsMT = (invoicesData, byMaterial = null, contract = null) => {
    let mt = 0;
    (invoicesData || []).forEach(innerArray => {
        if (!Array.isArray(innerArray)) return;
        innerArray.forEach(obj => {
            if (!obj || obj.canceled) return;
            const isInvoice = ['1111', 'Invoice'].includes(obj.invType);
            // Singleton groups count regardless of type (lone Final/Credit note = deal
            // finalized this period) — keeps shipped MT aligned with the revenue rule.
            const counts = innerArray.length === 1 || !isInvoice;
            if (!counts) return;
            (obj.productsDataInvoice || []).forEach(p => {
                if (p && p.qnty !== 's' && p.qnty !== '' && !isNaN(parseFloat(p.qnty))) {
                    const q = parseFloat(p.qnty);
                    mt += q;
                    if (byMaterial) {
                        const d = invLineMaterial(p, obj, contract);
                        byMaterial[d] = (byMaterial[d] || 0) + q;
                    }
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
export const setMonthsInvoices = (data, settings, companyRate = 0) => {

    let accumulatedPmnt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedActualPmnt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedTop5Cus = {}
    // Revenue booked against contracts ticked as shared IMS/GIS deals — half of it belongs
    // to the partner. Collected here because this is the only place per-contract revenue exists.
    let gisRevenue = 0


    data.forEach(obj => {

        // One standard company EUR→USD rate when set; otherwise the contract's own rate,
        // else 1:1 (NaN-safe). Keeps combined USD totals on a single rate.
        const contractRate = parseFloat(obj.euroToUSD)
        const mult = companyRate > 0 ? companyRate : (contractRate > 0 ? contractRate : 1)
        let totalInvoices = Total(obj.invoicesData, 'totalAmount', mult, settings);
        let month = !obj.final ? dateFormat(obj.dateRange.startDate, 'm') * 1 : dateFormat(obj.date, 'm') * 1
        accumulatedPmnt[month] += parseFloat(totalInvoices);
        if (obj.gis) gisRevenue += parseFloat(totalInvoices) || 0;

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
    return { accumulatedPmnt, pieArrClnts, gisRevenue /*, accumulatedActualPmnt */}
}

/* Month an expense belongs to. Contract expenses carry their own required date, but
   this used to bucket them by the CONTRACT start month — a December cost on a January
   contract landed in January and skewed the monthly profit line. Trust the expense date
   only when it falls in the contract year, so a stray date cannot move spend out of the
   loaded period; the annual total is identical either way. */
const expenseMonth = (obj, contract, fallback) => {
    const d = obj?.date || obj?.dateRange?.startDate
    if (typeof d !== 'string' || d.length < 7) return fallback
    const yr = String(contract?.dateRange?.startDate || '').substring(0, 4)
    if (yr && d.substring(0, 4) !== yr) return fallback
    const m = Number(d.substring(5, 7))
    return m >= 1 && m <= 12 ? m : fallback
}

/* How far a contract's line values may exceed its PO value before it is flagged.
   Set at 3x deliberately, not tighter. poInvoices is a LIST — a contract invoiced in
   instalments legitimately shows lines worth more than the PO value recorded so far, so a
   half-invoiced contract sits near 2x through no fault of its data. At 1.5x this check
   flagged eight contracts, six of them in the 1.8–2.5x band that partial invoicing fully
   explains; a banner that cries wolf is a banner nobody reads.
   At 3x it flags two, and both are unarguable: 060526-TIM at 13.5x and 220526 at 7.4x
   would each have to be ~90% un-invoiced with their tonnage already fully entered. */
const VALUE_TOLERANCE = 3

export const calContracts = (data, settings, companyRate = 0, expenseRows = null) => {
    const dataIssues = []   // contracts whose own records contradict each other
    /* A contract ticked 'Shared IMS / GIS deal' keeps HALF its profit here — the partner
       takes the other half, exactly as the Margins sheet has always done. Tonnage is NOT
       halved: the full quantity moves through IMS either way (Zak, 2026-08-31). So the
       cost and expense sides of those deals are tracked separately and the partner's share
       is subtracted from profit as one explicit figure, rather than by quietly scaling
       revenue and cost — which would have halved Average Rate per MT along with them. */
    let gisCogs = 0, gisExpenses = 0

    /* Canonical expense rows, bucketed by the contract they belong to. `unlinkedExpenses`
       are rows dated in the period whose contract is not in the loaded set — real spend
       the /expenses page counts, so they are added to the totals after the contract loop
       rather than dropped. The caller decides whether to pass them at all: with a
       supplier/material filter active it hands over only the rows for contracts that
       survived the filter, the same rule the Consignees card and the client filter use. */
    let expByContract = null, unlinkedExpenses = null
    if (Array.isArray(expenseRows)) {
        expByContract = {}; unlinkedExpenses = []
        const ids = new Set(data.map(c => c.id))
        expenseRows.forEach(r => {
            const cid = r?.poSupplier?.id
            if (cid && ids.has(cid)) (expByContract[cid] ||= []).push(r)
            else unlinkedExpenses.push(r)
        })
    }

    let accumulatedPmnt = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedExp = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let cogsByMonth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let storageByMonth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].reduce((o, key) => ({ ...o, [key]: 0 }), {})
    let accumulatedTop5Sup = data.map(x => x.supplier).reduce((o, key) => ({ ...o, [key]: 0 }), {})
    /* supplier id -> 12 monthly buckets, for the sparkline on each ranking tile. Same
       contractPurchase and same month the annual total already uses, so a tile's trend
       and its figure can never tell different stories. */
    const suppByMonth = {}
    let totalMT = 0
    let shippedMT = 0
    let freightTotal = 0
    let missingRate = 0  // EUR contracts with no usable euroToUSD — counted at 1:1, surfaced to the UI
    let cogs = 0          // cost of SOLD material only (sold-basis P&L)
    let unsoldValue = 0   // purchase value of unsold material — stock, NOT a cost/loss
    const expByType = {}  // expense label -> total (freight, warehouse, commission, …)
    /* expense label -> the individual rows behind that total, so the card can open a
       breakdown instead of being a dead end. Collected in the SAME loop and from the same
       `amt`, so the popup's figures add up to the tile's by construction — a second pass
       over the data could drift from it the moment either rule changed. */
    const expDetails = {}
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
        // One standard company EUR→USD rate when set; otherwise the contract's own rate,
        // else 1:1 (NaN-safe — a missing rate must never poison the totals). When no
        // company rate is set AND a EUR contract has no rate, flag it so the gap is visible.
        const contractRate = parseFloat(x.euroToUSD)
        const mult = companyRate > 0 ? companyRate : (contractRate > 0 ? contractRate : 1)
        if (x.cur !== 'us' && !(companyRate > 0) && !(contractRate > 0)) missingRate++
        const mltTmp = x.cur === 'us' ? 1 : mult
        const month = dateFormat(x.dateRange.startDate, 'm') * 1
        //contracts — total purchase value (this is NOT the profit cost; see cogs below)
        const contractPurchase = ContractsValue(x, 'pmnt', mltTmp)
        accumulatedPmnt[month] += contractPurchase
        //top 5 suppliers
        accumulatedTop5Sup[x.supplier] += contractPurchase
        ;(suppByMonth[x.supplier] ||= Array(12).fill(0))[month - 1] += contractPurchase

        // total MT purchased — convert each contract's quantity to MT by its unit
        // (qTypeTable: KGS ÷ 1000, LB ÷ 2000), matching the Inventory tab's setNum.
        const qUnit = settings?.Quantity?.Quantity?.find(q => q.id === x.qTypeTable)?.qTypeTable
        const mtFactor = qUnit === 'KGS' ? 0.001 : qUnit === 'LB' ? 0.0005 : 1
        let contractTotalMT = 0
        if (Array.isArray(x.productsData)) {
            x.productsData.forEach(p => { contractTotalMT += (parseFloat(p.qnty) || 0) * mtFactor })
        }

        /* A contract cannot have bought more material than its own money paid for. Where the
           entered quantities multiply out to far more than the PO is worth, the quantities
           are the thing that is wrong, and the tonnage is capped at what the money supports:
               tonnage = PO value / weighted-average unit price
           060526-TIM entered 2,576.8 MT at $4,050/MT — $10.4M of material — against ten
           payments totalling $774,683. Thirteen of its twenty-three rows have the contract
           TOTAL (191) pasted into them. The cap puts it back at 191 MT, which is what its
           payments say and what the pasted figure meant.
           Only applied past VALUE_TOLERANCE, so an ordinary part-invoiced contract is never
           touched — and never upward, so a contract that is genuinely under-invoiced keeps
           the tonnage it entered. The correction is reported in dataIssues either way, so
           the source record still gets fixed rather than quietly papered over. */
        const enteredMT = contractTotalMT
        let impliedMT = null
        if (contractTotalMT > 0) {
            let lineVal = 0, pricedMT = 0
            ;(x.productsData || []).forEach(p => {
                const q = parseFloat(p.qnty), pr = parseFloat(p.unitPrc)
                if (!isNaN(q) && !isNaN(pr)) { lineVal += q * pr; pricedMT += q * mtFactor }
            })
            const poVal = (x.poInvoices || []).reduce((s, z) => {
                const v = parseFloat(z?.pmnt); return isNaN(v) ? s : s + v
            }, 0)
            const avgPrice = pricedMT > 0 ? lineVal / pricedMT : 0
            if (poVal > 0 && avgPrice > 0 && lineVal > poVal * VALUE_TOLERANCE) {
                impliedMT = poVal / avgPrice
                if (impliedMT < contractTotalMT) contractTotalMT = impliedMT
            }
        }
        totalMT += contractTotalMT

        /* ── Data-quality cross-check ─────────────────────────────────────────────
           A contract's own money audits its tonnage. Every product line carries a unit
           price, so the lines should multiply out to roughly what the PO is worth. When
           they don't, the QUANTITIES are wrong — which is how contract 060526-TIM sat on
           this dashboard claiming 2,577 MT at $4,050/MT ($10.4M of material) while its
           ten payments totalled $774,683 (191 MT). It was 47% of the headline tonnage and
           nothing on screen said a word.
           Both figures are in the contract's own currency, so no FX enters the comparison.
           Only OVER-statement is flagged: a line priced as free text ("See below*")
           contributes tonnage but no value, which can only pull lineValue down — so
           under-shooting is not evidence of anything and must not raise a flag. */
        let lineValue = 0
        ;(x.productsData || []).forEach(p => {
            const q = parseFloat(p.qnty), pr = parseFloat(p.unitPrc)
            if (!isNaN(q) && !isNaN(pr)) lineValue += q * pr
        })
        const poValue = (x.poInvoices || []).reduce((s, z) => {
            const v = parseFloat(z?.pmnt); return isNaN(v) ? s : s + v
        }, 0)
        const issue = { id: x.id, order: x.order || '', supplier: x.supplier, date: x.dateRange?.startDate || '', mt: contractTotalMT }
        if (poValue > 0 && lineValue > poValue * VALUE_TOLERANCE) {
            dataIssues.push({ ...issue, kind: 'value', lineValue, poValue, ratio: lineValue / poValue, correctedTo: contractTotalMT, enteredMT })
        }
        /* A "tonnage recorded but no PO value" check lived here briefly. It matched 13 of
           70 contracts, because a contract the supplier has not invoiced yet is a normal
           early state, not a data error. It was the only signal available for the four KGS
           "-TIM" contracts, but surfacing those is not worth burying two real errors in
           eleven false ones. */

        // shipped MT — invoice quantities are already recorded in MT (same basis the
        // Inventory tab subtracts against the MT purchase qty), so no unit conversion here.
        const contractShipped = sumInvProductsMT(x.invoicesData, materialSold, x)
        shippedMT += contractShipped

        // SOLD-BASIS economics: only the cost of the SOLD portion is a cost; the rest is
        // unsold stock (capital tied up, not a loss). Weighted-average cost of goods sold.
        const soldFrac = contractTotalMT > 0 ? Math.min(1, contractShipped / contractTotalMT) : 0
        cogs += contractPurchase * soldFrac
        if (x.gis) gisCogs += contractPurchase * soldFrac
        unsoldValue += contractPurchase * (1 - soldFrac)
        cogsByMonth[month] += contractPurchase * soldFrac

        /* most-sold material is filled by sumInvProductsMT above, off the actual invoice
           lines. It used to be estimated here instead: every PURCHASED product line of the
           contract scaled by one contract-level soldFrac. That spread a sale across
           materials that never shipped — buy 100 MT of A and 100 MT of B, ship only A, and
           the card reported 50 MT of each. The invoice lines carry description and qnty
           (contractDetails.js builds productsDataInvoice from productsData), so the real
           split was always available; nothing needed estimating. */

        /* Expenses — total, by month, and by type.
           Source is the CANONICAL `expenses` collection (the one /expenses reads), indexed
           by poSupplier.id, NOT the `expenses` array embedded on the contract document.
           That embedded array is a partial, stale mirror: at the time this changed it held
           40 rows against the collection's 73, understating contract expenses by $191,094
           — 30% — and it carried 2 rows with no canonical record at all. It also has six
           fields where the real record has fifteen, so nothing here could see a supplier,
           a sales invoice or a paid flag. Falling back to x.expenses when no index is
           supplied keeps older callers working. */
        const own = expByContract ? (expByContract[x.id] || []) : (x.expenses || [])
        ;(own).forEach(obj => {
            if (obj && !isNaN(parseFloat(obj.amount))) {
                const m2 = obj.cur === 'us' ? 1 : mult
                const amt = parseFloat(obj.amount) * m2
                const expMonth = expenseMonth(obj, x, month)
                accumulatedExp[expMonth] += amt
                if (freightIds.has(obj.expType)) freightTotal += amt
                const lbl = expLabel(obj.expType)
                expByType[lbl] = (expByType[lbl] || 0) + amt
                if (x.gis) gisExpenses += amt
                ;(expDetails[lbl] ||= []).push({
                    supplier: x.supplier,                       // id — resolved to a name at render
                    order: x.order || '',                       // PO number
                    usd: amt,                                   // converted, matches the tile
                    amount: parseFloat(obj.amount),             // as entered
                    cur: obj.cur || 'us',
                    date: obj.date || obj.dateRange?.startDate || '',
                })
                const lblLower = String(lbl).toLowerCase()
                if (lblLower.includes('storage') || lblLower.includes('warehouse')) storageByMonth[expMonth] += amt
            }
        })
    })


    /* Expenses dated in the period whose contract is not in the loaded set. Counted at the
       company FX rate (or 1:1) rather than a contract's own rate, because there is no
       contract to borrow one from — the FX banner already reports what that costs.
       Bucketed by the expense's OWN date, which is the only date it has. */
    ;(unlinkedExpenses || []).forEach(obj => {
        const amt = parseFloat(obj?.amount)
        if (isNaN(amt)) return
        const m2 = obj.cur === 'us' ? 1 : (companyRate > 0 ? companyRate : 1)
        const val = amt * m2
        const d = obj.date || obj.dateRange?.startDate || ''
        const m = Number(String(d).substring(5, 7))
        const expMonth = m >= 1 && m <= 12 ? m : 1
        accumulatedExp[expMonth] += val
        if (freightIds.has(obj.expType)) freightTotal += val
        const lbl = expLabel(obj.expType)
        expByType[lbl] = (expByType[lbl] || 0) + val
        ;(expDetails[lbl] ||= []).push({
            supplier: obj.supplier || '', order: '', usd: val,
            amount: amt, cur: obj.cur || 'us', date: d,
        })
        const l = String(lbl).toLowerCase()
        if (l.includes('storage') || l.includes('warehouse')) storageByMonth[expMonth] += val
    })

    /* Re-key id -> display name. ADD, never assign: two supplier ids that resolve to the
       same nname (duplicate entries in settings) used to overwrite each other, and every
       id missing from settings collapsed onto a single `undefined` key that overwrote
       itself once per supplier. Both silently deleted contract value from this card while
       the header total — which comes from accumulatedPmnt — still counted it, so the
       tiles quietly stopped summing to the total. Unknown ids now say so instead. */
    let arrTmp = Object.keys(accumulatedTop5Sup).reduce((acc, key) => {
        const newKey = settings.Supplier.Supplier.find(x => x.id === key)?.['nname'] || 'Unknown supplier'
        acc[newKey] = (acc[newKey] || 0) + accumulatedTop5Sup[key];
        return acc;
    }, {});

    /* Duplicate PO numbers. Two documents sharing an order number are counted twice by
       everything on this page — contract 090426 existed twice with the same two product
       lines and different payment totals, quietly adding 143 MT and ~$560K. dedupeByDocId
       in utils.js cannot see this: the documents have different ids, so as far as
       Firestore is concerned they are two contracts. Only the PO number gives it away. */
    const byOrder = {}
    data.forEach(x => {
        const key = String(x.order || '').trim()
        if (key) (byOrder[key] ||= []).push(x)
    })
    Object.entries(byOrder).forEach(([order, list]) => {
        if (list.length < 2) return
        dataIssues.push({
            kind: 'duplicate', order, id: list[0].id, supplier: list[0].supplier,
            date: list[0].dateRange?.startDate || '', copies: list.length,
            mt: list.slice(1).reduce((s, c) => {
                const u = settings?.Quantity?.Quantity?.find(q => q.id === c.qTypeTable)?.qTypeTable
                const f = u === 'KGS' ? 0.001 : u === 'LB' ? 0.0005 : 1
                return s + (c.productsData || []).reduce((t, p) => t + (parseFloat(p.qnty) || 0) * f, 0)
            }, 0),
        })
    })

    let pieArrSupps = setPieArrs(arrTmp)

    /* The monthly series re-keyed the same way, and ADDED on collision for the same
       reason arrTmp is: two ids sharing an nname are one row on the card, so they have
       to be one line on its sparkline too. */
    const suppSeries = {}
    Object.entries(suppByMonth).forEach(([id, months]) => {
        const name = settings.Supplier.Supplier.find(s => s.id === id)?.['nname'] || 'Unknown supplier'
        const dst = (suppSeries[name] ||= Array(12).fill(0))
        months.forEach((v, i) => { dst[i] += v })
    })

    return { accumulatedPmnt, accumulatedExp, pieArrSupps, suppSeries, totalMT, shippedMT, freightTotal, missingRate, cogs, unsoldValue, cogsByMonth, expByType, expDetails, materialSold, storageByMonth, dataIssues, gisCogs, gisExpenses };
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
