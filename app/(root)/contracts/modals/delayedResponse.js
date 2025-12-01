import CheckBox from '@components/checkbox'
import { SettingsContext } from '@contexts/useSettingsContext'
import { X } from 'lucide-react'
import React, { useContext } from 'react'
import dateFormat from "dateformat";
import { UserAuth } from '@contexts/useAuthContext';
import { updateDocumentContract } from '@utils/utils';


const DlayedResponse = ({ alertArr, setAlertArr }) => {
    const { settings, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();


    const setAlert = async (obj) => {
        await updateDocumentContract(uidCollection, 'contracts', 'alert', obj, !obj.alert)
        let arr = alertArr.map(z => z.id === obj.id ? { ...obj, alert: !obj.alert } : z)
        setAlertArr(arr)
        setToast({ show: true, text: 'Alert successfully removed!', clr: 'success' })
    }

    return (
        <div className='p-4'>
            <div className=" overflow-x-auto">
                <div className="border rounded-lg overflow-hidden">
                    <table id='my-table' className=" table-fixed min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 ">
                            <tr>
                                <th scope="col" className=" w-0/12 py-1 px-4 text-left text-sm font-medium text-gray-500">Supplier</th>
                                <th scope="col" className="w-0/12 pr-1 py-1 text-left text-sm font-medium text-gray-500"  >
                                    Contract</th>
                                <th scope="col" className="w-0/12 pr-1 py-1 text-left text-sm font-medium text-gray-500"  >
                                    Date</th>
                                <th scope="col" className="w-20 pr-1 py-1 text-left text-sm font-medium text-gray-500 flex "  >
                                    Days from Date</th>
                                <th scope="col" className="w-20 pr-1 py-1 text-left text-sm font-medium text-gray-500"  >
                                    Keep Alerting</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {alertArr.map((obj, i) => {
                                return (
                                    <tr key={i}>
                                        <td className="py-2 pl-4">
                                            <div className="flex items-center h-5 text-sm">
                                                {settings.Supplier.Supplier.find(z => z.id === obj.supplier).nname}

                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 text-sm text-gray-800">
                                                {obj.order}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 text-sm text-gray-800">
                                                {dateFormat(obj.dateRange?.endDate, 'dd-mmm-yy')}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 text-sm text-gray-800">
                                                {(() => {
                                                    const date2 = new Date(obj.dateRange?.endDate);
                                                    const today = new Date();
                                                    const timeDiff = today - date2;
                                                    const daysPassed = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

                                                    return ` ${daysPassed}`;
                                                })()}
                                            </div>
                                        </td>
                                        <td className="px-1 py-2">
                                            <div className="flex items-center h-5 text-sm text-gray-800">
                                                <CheckBox checked={obj.alert} size='h-5 w-5' onChange={() => { setAlert(obj) }} />
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