import React from 'react'
import CustomtableTotals from './tableTotals';
import { getTtl } from '@utils/languages';
import { sortArr } from '@utils/utils';

const sumTable = ({ sumData, loading, settings, ln, dataTable }) => {

    let showAmount = (x) => {
        return Number(x.getValue()) ? new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: x.row.original.cur,
            minimumFractionDigits: 2
        }).format(x.getValue())
            : x.getValue()
    }

    let showWeight = (x) => {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 3
        }).format(x.getValue())
    }

    let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'stock', header: getTtl('Stock', ln) },
        { accessorKey: 'qTypeTable', header: getTtl('WeightType', ln), cell: (props) => <div>{props.getValue()}</div> },
        { accessorKey: 'qnty', header: getTtl('Quantity', ln), cell: (props) => <p>{showWeight(props)}</p> },
        { accessorKey: 'total', header: getTtl('Total', ln), cell: (props) => <p>{showAmount(props)}</p> },

    ];

    const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''


    const getFormatted = (arr) => {  //convert id's to values
        let newArr = []
        const gQ = (z, y, x) => settings[y][y].find(q => q.id === z)?.[x] || ''

        arr.forEach(row => {
            let formattedRow = {
                ...row,
                stock: gQ(row.stock, 'Stocks', 'nname'),
                qTypeTable: gQ(row.qTypeTable, 'Quantity', 'qTypeTable'),
                cur: gQ(row.cur, 'Currency', 'cur'),
            }

            newArr.push(formattedRow)
        })

        return newArr
    }

    return (

        <div>
            <div className='mt-5'>
                <CustomtableTotals data={loading ? [] : sortArr(getFormatted(sumData), 'stock')} columns={propDefaults}
                    ln={ln} ttl='SummaryStocks' dataTable={dataTable} settings={settings}
                />
            </div>
        </div>
    )
}

export default sumTable