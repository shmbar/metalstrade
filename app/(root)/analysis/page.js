'use client'

import { useContext, useEffect, useState } from 'react';
import Customtable from './newTable';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import Toast from '../../../components/toast.js'
import Spinner from '../../../components/spinner';
import { UserAuth } from "../../../contexts/useAuthContext"
import { loadDataWeightAnalysis, getInvoices, groupedArrayInvoice, sortArr } from '../../../utils/utils'
import Spin from '../../../components/spinTable';
import VideoLoader from '../../../components/videoLoader';
import CBox from '../../../components/combobox.js'
import { EXD } from './excel'
import { getTtl } from '../../../utils/languages';
import DateRangePicker from '../../../components/dateRangePicker';

const CB = (settings, setSelectedStock, selectedStock) => (
  <CBox
    data={settings.Supplier.Supplier}
    setValue={setSelectedStock}
    value={selectedStock}
    name='supplier'
    classes='input border-slate-300 shadow-sm items-center flex'
    classes2='text-lg'
    dis={false}
  />
);

const Analyss = () => {
  const { settings, setLoading, loading, ln, dateSelect } = useContext(SettingsContext);
  const { uidCollection } = UserAuth();
  const [selectedSup, setSelectedSup] = useState({ supplier: '' });
  const [dataTable, setDataTable] = useState([]);
  const [conData, setConData] = useState([]);

  useEffect(() => {
    const loadtStocks = async () => {
      setLoading(true);
      let dt = await loadDataWeightAnalysis(uidCollection, 'contracts', dateSelect, 'supplier', selectedSup.supplier);
      setConData(dt);
      setLoading(false);
    };
    (dateSelect.start && dateSelect.end && selectedSup.supplier !== '') && loadtStocks();
  }, [selectedSup, dateSelect]);

  useEffect(() => {
    const loadInv = async () => {
      let dt = [...conData];
      dt = await Promise.all(
        dt.map(async (x) => {
          const Invoices = await getInvoices(uidCollection, 'invoices', x);
          return { ...x, invoicesData: Invoices };
        })
      );
      // ...data transformation logic here...
      setDataTable(dt);
      setLoading(false);
    };
    conData.length > 0 && loadInv();
    if (conData.length === 0) setDataTable([]);
  }, [conData]);

  let propDefaults = Object.keys(settings).length === 0 ? [] : [
    { accessorKey: 'order', header: getTtl('PO', ln) + '#' },
    { accessorKey: 'cert', header: 'Cert', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'ToNi', header: 'Ni', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'ToCr', header: 'Cr', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'ToMo', header: 'Mo', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'Toqnty', header: 'Weight MT', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'invoice', header: 'IMS ref', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'BackNi', header: 'Ni', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'BackCr', header: 'Cr', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'BackMo', header: 'Mo', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'Backqnty', header: 'Weight MT', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffNi', header: 'Diff Ni', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffCr', header: 'Diff Cr', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffMo', header: 'Diff Mo', cell: (props) => <p>{props.getValue()} </p> },
    { accessorKey: 'diffqnty', header: 'Diff Weight', cell: (props) => <p>{props.getValue()} </p> },
  ];

  return (
    <div className="w-full" style={{ background: "#f8fbff" }}>
      <div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
        {Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
          <>
            <Toast />
            <VideoLoader loading={loading} fullScreen={true} />
            {/* Main Card */}
            <div className="rounded-2xl p-3 sm:p-5 mt-8 border border-gray-200 shadow-xl w-full backdrop-blur-[2px] bg-white">
              {/* Header Section */}
              <div className='flex items-center justify-between flex-wrap gap-2 pb-2'>
                <h1 className="text-[14px] text-[#11497c] font-poppins responsiveTextTitle border-l-4 border-[#11497c] pl-2" style={{ fontSize: '14px' }}>
                  {getTtl('Weight Analysis', ln)}
                </h1>
              
              </div>
              {/* Table Component */}
              <Customtable
                data={loading ? [] : dataTable}
                columns={propDefaults}
                SelectRow={() => { }}
                cb={CB(settings, setSelectedSup, selectedSup)}
                type='analysis'
                excellReport={EXD(dataTable, settings, getTtl('Weight Analysis', ln), ln)}
                ln={ln}
              />
            </div>
          </>
        }
      </div>
    </div>
  );
}

export default Analyss;
