import React from 'react'
import CustomtableTotals from './newTableTotals';
import { getTtl } from '@utils/languages';

const sumTables = ({dtSumClients, loading, settings, ln, dataTable, rmrk}) => {

    let showAmount = (x) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: x.row.original.cur,
            minimumFractionDigits: 2
        }).format(x.getValue())
    }

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'client', header: getTtl('Consignee', ln), },
        { accessorKey: 'totalInvoices', header: getTtl('Amount', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmount(props)}</div> },
        { accessorKey: 'totalPmnts', header: getTtl('Payment', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmount(props)}</div> },
        { accessorKey: 'inDebt', header: getTtl('Initial Debt', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmount(props)}</div> },
     
    ];

    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''


    const getFormatted = (arr) => {  //convert id's to values
     
        let newArr = []
        const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

        arr.forEach(row => {
            let formattedRow = {
                ...row,
                client: gQ(row.client, 'Client', 'nname'),
            }

            newArr.push(formattedRow)
        })

        return newArr
    }

    return (

        <div className='w-full'>
            <div className='mt-5'>
                <CustomtableTotals data={loading ? [] : getFormatted(dtSumClients)} columns={propDefaults}
                    ln={ln}  ttl='SummaryClients' dataTable={dataTable} rmrk={rmrk}
                />
            </div>
        </div>
    )
}

export default sumTables