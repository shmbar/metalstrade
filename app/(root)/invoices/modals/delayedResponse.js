import CheckBox from '../../../../components/checkbox'
import { SettingsContext } from '../../../../contexts/useSettingsContext'
import { X } from 'lucide-react'
import React, { useContext } from 'react'
import dateFormat from "dateformat";
import { UserAuth } from '../../../../contexts/useAuthContext';
import { updateDocumentContract } from '../../../../utils/utils';


const DlayedResponse = ({ alertArr, setAlertArr }) => {
    const { settings, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();


    const setAlert = async (obj) => {
        await updateDocumentContract(uidCollection, 'invoices', 'alert', obj, !obj.alert)
        let arr = alertArr.map(z => z.id === obj.id ? { ...obj, alert: !obj.alert } : z)
        setAlertArr(arr)
        setToast({ show: true, text: 'Alert successfully removed!', clr: 'success' })
    }

    return (
        <div className='p-4'>
            <div className=" overflow-x-auto">
                <div className="border rounded-2xl overflow-hidden">
                    <table id='my-table' className="table-fixed min-w-full divide-y divide-[#dbeeff] font-poppins">
                        <thead style={{ background: '#dbeeff' }}>
                            <tr>
                                <th scope="col" className="w-28 py-2 px-4 text-left responsiveTextTable font-medium" style={{ color: 'var(--chathams-blue)' }}>Customer</th>
                                <th scope="col" className="w-16 pr-1 py-2 text-left responsiveTextTable font-medium" style={{ color: 'var(--chathams-blue)' }}>Invoice</th>
                                <th scope="col" className="w-16 pr-1 py-2 text-left responsiveTextTable font-medium" style={{ color: 'var(--chathams-blue)' }}>ETA</th>
                                <th scope="col" className="w-12 pr-1 py-2 text-left responsiveTextTable font-medium" style={{ color: 'var(--chathams-blue)' }}>Δ ETA</th>
                                <th scope="col" className="w-16 pr-1 py-2 text-left responsiveTextTable font-medium" style={{ color: 'var(--chathams-blue)' }}>ETD</th>
                                <th scope="col" className="w-12 pr-1 py-2 text-left responsiveTextTable font-medium" style={{ color: 'var(--chathams-blue)' }}>Δ ETD</th>
                                <th scope="col" className="w-16 pr-1 py-2 text-left responsiveTextTable font-medium" style={{ color: 'var(--chathams-blue)' }}>Keep Alerting</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#dbeeff]">
                            {alertArr.map((obj, i) => {
                                return (
                                    <tr key={i}>
                                        <td className="py-2 pl-4">
                                            <div className="flex items-center h-5 responsiveTextTable font-normal" style={{ color: 'var(--regent-gray)' }}>
                                                {settings.Client.Client.find(z => z.id === obj.client).nname}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 responsiveTextTable font-normal" style={{ color: 'var(--regent-gray)' }}>
                                                {obj.invoice}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 responsiveTextTable font-normal" style={{ color: 'var(--regent-gray)' }}>
                                                {dateFormat(obj.shipData?.eta?.endDate, 'dd.mm.yy')}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 responsiveTextTable font-normal" style={{ color: 'var(--regent-gray)' }}>
                                                {(() => {
                                                    const date2 = new Date(obj.shipData?.eta?.endDate);
                                                    const today = new Date();
                                                    const timeDiff = today - date2;
                                                    const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                                                    return ` ${daysPassed}`;
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 responsiveTextTable font-normal" style={{ color: 'var(--regent-gray)' }}>
                                                {obj.shipData?.etd?.endDate ? dateFormat(obj.shipData?.etd?.endDate, 'dd.mm.yy') : '-'}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 responsiveTextTable font-normal" style={{ color: 'var(--regent-gray)' }}>
                                                {(() => {
                                                    const date2 = new Date(obj.shipData?.etd?.endDate);
                                                    const today = new Date();
                                                    const timeDiff = today - date2;
                                                    const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
                                                    return daysPassed ? `${daysPassed}` : '-';
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 responsiveTextTable font-normal">
                                                <CheckBox checked={obj.alert} size='h-4 w-4' onChange={() => { setAlert(obj) }} />
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

export default DlayedResponse;
