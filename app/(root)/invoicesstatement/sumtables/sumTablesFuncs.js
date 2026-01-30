import { sortArr } from "../../../../utils/utils"
import { NumericFormat } from "react-number-format";
import dateFormat from "dateformat";

const sumUpSuppliers = (dt, z, field, cur) => { //dt, z, 'invAmount', 'us'

    return dt.filter(s => (s.supplier === z && s.cur === cur)).reduce((total, obj) => {
        let amnt = ((obj.type === 'exp' && obj.invData.paid !== '111') ||
            (obj.type === 'con' && (obj.pmntAmount === 0 || obj.pmntAmount === ''))) ? obj[field] : 0

        return total + amnt * 1
    }, 0)
}

const sumUpClients = (dt, z, field, cur) => {

    return dt.filter(s => s.client === z).reduce((total, obj) => {
        let amnt = (obj.type === 'con' && Math.abs(obj.totalInvoices - obj.totalPmnts) > 0.1 && obj.curInvoice === cur) ?
            obj[field] : 0

        return total + amnt * 1
    }, 0)
}




const sumUpClientsBlnc = (dt, z, cur) => {

    return dt.filter(s => s.client === z).reduce((total, obj) => {
        let amnt = obj.type === 'con' && obj.curInvoice === cur ? obj.inDebt : 0

        return total + amnt * 1
    }, 0)
}

//*8**?///////////////////////////////////////////////////

export const sumSuppliers = (dt) => {

    const suppliers = [...new Set(dt.map(x => x.supplier))]

    let newArrUSD = suppliers.map(z => {

        let tmp1 = dt.filter(s => (s.supplier === z && s.cur === 'us')).length ?
            sumUpSuppliers(dt, z, 'invAmount', 'us') : null

        let tmp2 = sumUpSuppliers(dt, z, 'pmntAmount', 'us')

        return {
            supplier: z,
            invAmount: tmp1 * 1,
            cur: 'usd',
            pmntAmount: tmp2 * 1,
            blnc: tmp1 - tmp2,
            data: dt.filter(k => k.supplier === z)
        }
    })


    newArrUSD = newArrUSD.filter(z => z.blnc != 0)

    let newArrEU = suppliers.map(z => {

        let tmp1 = dt.filter(s => (s.supplier === z && s.cur === 'eu')).length ?
            sumUpSuppliers(dt, z, 'invAmount', 'eu') : null
        let tmp2 = sumUpSuppliers(dt, z, 'pmntAmount', 'eu')

        return {
            supplier: z,
            invAmount: tmp1 * 1,
            cur: 'eur',
            pmntAmount: tmp2 * 1,
            blnc: tmp1 - tmp2
        }
    })

    newArrEU = newArrEU.filter(z => z.blnc != 0)

    return sortArr([...newArrUSD, ...newArrEU], 'supplier')

}

export const sumClients = (dt) => {

    const clients = [...new Set(dt.map(x => x.client).filter(z => z !== ''))]
    let newArrUSD = clients.map(z => {

        let tmp1 = sumUpClients(dt, z, 'totalInvoices', 'us')
        let tmp2 = sumUpClients(dt, z, 'totalPmnts', 'us')
        let tmp3 = tmp1 - tmp2//sumUpClientsBlnc(dt, z, 'us')

        return {
            client: z,
            totalInvoices: tmp1,
            cur: 'usd',
            totalPmnts: tmp2,
            inDebt: tmp3,
            invoices: dt.filter(k => k.client === z)

        }
    }).filter(z => Math.abs(z.inDebt) >= 0.1)

    let newArrEU = clients.map(z => {

        let tmp1 = sumUpClients(dt, z, 'totalInvoices', 'eu')
        let tmp2 = sumUpClients(dt, z, 'totalPmnts', 'eu')
        let tmp3 = tmp1 - tmp2//umUpClientsBlnc(dt, z, 'eu')

        return {
            client: z,
            totalInvoices: tmp1,
            cur: 'eur',
            totalPmnts: tmp2,
            inDebt: tmp3
        }
    }).filter(z => Math.abs(z.inDebt) >= 0.1)

    newArrEU = newArrEU.filter(z => z.totalInvoices !== 0 || z.inDebt !== 0)
    return sortArr([...newArrUSD, ...newArrEU], 'client').filter(a => a.client !== '')
}


export const detailsToolTip = (row, data, settings, dataTable, rmrk) => {
    const containerStyle = {
        fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial",
        fontSize: '9px',
        background: '#d4eafc', // Single color background
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
        maxHeight: 'none',
        overflow: 'visible',
        padding: '0',
        minWidth: '400px',
    };
    const tableStyle = {
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        margin: 0,
    };
    const thStyle = {
        textAlign: 'center',
        padding: '3px 2px',
        color: '#183d79',
        fontWeight: 600,
        fontSize: '9px',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
        wordBreak: 'break-word',
        border: '1px solid #ccc',
        minWidth: '60px',
        maxWidth: '120px',
        background: 'linear-gradient(90deg, #d4eafc, #bce1fe)',
    };
    const tdStyle = {
        textAlign: 'center',
        padding: '3px 2px',
        color: '#1F2937',
        fontWeight: 400,
        wordBreak: 'break-word',
        fontSize: '9px',
        borderBottom: '1px solid #e0e0e0',
    };
    const tdAmountStyle = {
        ...tdStyle,
        color: '#183d79',
        fontWeight: 500,
    };

    if (rmrk === 'sup') {
        let filteredArr = dataTable?.filter(z => (z.supplier === row.original.supplier && (z.cur).toLowerCase() === row.original.cur))
            .filter(z => (z.type === 'exp' && z.invData.paid !== '111') ||
                (z.type === 'con' && (z.pmntAmount === 0 || z.pmntAmount === '')));

        return (
            <div style={containerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Supplier Inv</th>
                            <th style={thStyle}>Invoices amount</th>
                            <th style={thStyle}>Prepayment</th>
                            <th style={thStyle}>Balance</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredArr?.map((z, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9', transition: 'background 150ms ease-in-out' }}>
                                <td style={tdStyle}>
                                    {Array.isArray(z.supInvoices) ? z.supInvoices.map((item, index) => (
                                        <div key={index}>{item}</div>
                                    )) : z.supInvoices}
                                </td>
                                <td style={tdAmountStyle}>
                                    <NumericFormat
                                        value={z.invAmount}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'USD' ? '$' : '€'}
                                        decimalScale={2}
                                        fixedDecimalScale
                                        style={tdAmountStyle}
                                    />
                                </td>
                                <td style={tdAmountStyle}>
                                    <NumericFormat
                                        value={z.pmntAmount === '' ? 0 : z.pmntAmount}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'USD' ? '$' : '€'}
                                        decimalScale={z.pmntAmount === '' || z.pmntAmount === 0 ? 0 : 2}
                                        fixedDecimalScale
                                        style={tdAmountStyle}
                                    />
                                </td>
                                <td style={tdAmountStyle}>
                                    <NumericFormat
                                        value={z.blnc === '' ? z.invAmount : z.blnc}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'USD' ? '$' : '€'}
                                        decimalScale={2}
                                        fixedDecimalScale
                                        style={tdAmountStyle}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    } else {
        let filteredArr = dataTable?.filter(z => (z.client === row.original.client && (z.curInvoice).toLowerCase() === row.original.cur))
            .filter(x => Math.abs(x.inDebt) >= 0.1);

        return (
            <div style={containerStyle}>
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={thStyle}>Invoice</th>
                            <th style={thStyle}>Inv. amount</th>
                            <th style={thStyle}>Payment</th>
                            <th style={thStyle}>Debt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredArr?.map((z, i) => (
                            <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9', transition: 'background 150ms ease-in-out' }}>
                                <td style={tdStyle}>{z.InvNum}</td>
                                <td style={tdAmountStyle}>
                                    <NumericFormat
                                        value={z.totalInvoices}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'USD' ? '$' : '€'}
                                        decimalScale={2}
                                        fixedDecimalScale
                                        style={tdAmountStyle}
                                    />
                                </td>
                                <td style={tdAmountStyle}>
                                    <NumericFormat
                                        value={z.totalPmnts}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'USD' ? '$' : '€'}
                                        decimalScale={2}
                                        fixedDecimalScale
                                        style={tdAmountStyle}
                                    />
                                </td>
                                <td style={tdAmountStyle}>
                                    <NumericFormat
                                        value={z.inDebt}
                                        displayType="text"
                                        thousandSeparator
                                        allowNegative={true}
                                        prefix={z.cur === 'USD' ? '$' : '€'}
                                        decimalScale={2}
                                        fixedDecimalScale
                                        style={tdAmountStyle}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    }
};
