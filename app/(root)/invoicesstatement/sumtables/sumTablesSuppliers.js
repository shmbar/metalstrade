import React from 'react'
import CustomtableTotals from './newTableTotals';
import { getTtl } from '@utils/languages';

const sumTables = ({ dtSumSupplers, loading, settings, ln, dataTable, rmrk }) => {

    let showAmount = (x) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: x.row.original.cur,
            minimumFractionDigits: x.getValue() === 0 ? 0 : 2
        }).format(x.getValue())
    }

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'supplier', header: getTtl('Supplier', ln) },
        { accessorKey: 'invAmount', header: getTtl('Invoices amount', ln), cell: (props) => <div>{showAmount(props)}</div> },
        { accessorKey: 'pmntAmount', header: getTtl('Prepayment', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmount(props)}</div> },
        { accessorKey: 'blnc', header: getTtl('Balance', ln), cell: (props) => <div>{props.getValue() === '' ? '' : showAmount(props)}</div> },

    ];

    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''


    const getFormatted = (arr) => {  //convert id's to values
        let newArr = []
        const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

        arr.forEach(row => {
            let formattedRow = {
                ...row,
                supplier: gQ(row.supplier, 'Supplier', 'nname'),
            }

            newArr.push(formattedRow)
        })

        return newArr
    }

    return (

        <div className='w-full'>
            <div className='mt-5'>
                <CustomtableTotals data={loading ? [] : getFormatted(dtSumSupplers)} columns={propDefaults}
                    ln={ln} ttl='SummarySuppliers' settings={settings} dataTable={dataTable} rmrk={rmrk}
                />
            </div>
        </div>
    )
}

export default sumTables