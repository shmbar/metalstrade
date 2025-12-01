import React, { useContext } from 'react'
import Customtable from './(root)/materialtables/newTable';
import { SettingsContext } from "@contexts/useSettingsContext";

const Table = ({table}) => {
const { settings} = useContext(SettingsContext);

let propDefaults = Object.keys(settings).length === 0 ? [] : [
        { accessorKey: 'material', header: 'Material', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'kgs', header: 'Kgs', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'ni', header: 'Ni', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'cr', header: 'Cr', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'cu', header: 'Cu', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'mo', header: 'Mo', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'w', header: 'W', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'co', header: 'Co', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'nb', header: 'Nb', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'fe', header: 'Fe', cell: (props) => <p>{props.getValue()}</p> },
        { accessorKey: 'ti', header: 'Ti', cell: (props) => <p>{props.getValue()}</p> },
    ];
console.log(table)
  return (
    <div className='py-3 max-w-4xl'>
    
        <Customtable data={table} columns={propDefaults}
                            //excellReport={EXD(contractsData, settings, getTtl('Contracts', ln), ln)} 
                            />
    </div>
  )
}

export default Table;