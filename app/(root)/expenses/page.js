'use client';
import { useContext, useEffect } from 'react';
import Customtable from '../contracts/table';
import MyDetailsModal from './modals/dataModal.js'
import { SettingsContext } from "@contexts/useSettingsContext";
import MonthSelect from '@components/monthSelect';
import Toast from '@components/toast.js'
import { ExpensesContext } from "@contexts/useExpensesContext";

import { loadData } from '@utils/utils'
import SignOut from '@components/signOut';
import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import Spin from '@components/spinTable';
import {EXD} from './excel'

const Expenses = () => {


	const { settings, lastAction, dateSelect, setDateYr, loading, setLoading } = useContext(SettingsContext);
	const { expensesData, valueExp, setValueExp, setIsOpen, isOpen, setExpensesData } = useContext(ExpensesContext);
	const { uidCollection } = UserAuth();

	useEffect(() => {

		const Load = async () => {
			setLoading(true)
			let dt = await loadData(uidCollection, 'expenses', dateSelect);
			setExpensesData(dt)
			setLoading(false)
		}

		Load();

	}, [dateSelect])

	let propDefaults = Object.keys(settings).length === 0 ? [] : [
		{ field: 'lstSaved', header: 'Last Saved', showcol: false },
		{ field: 'supplier', header: 'Vendor', showcol: true, arr: settings.Supplier.Supplier },
		{ field: 'date', header: 'Date', showcol: false },
		{ field: 'salesInv', header: 'Sales Invoice #', showcol: true },
		{ field: 'poSupplierOrder', header: 'Purchase PO Supplier', showcol: true },
		{ field: 'cur', header: 'Currency', showcol: false, arr: settings.Currency.Currency },
		{ field: 'amount', header: 'Amount', showcol: true },
		{ field: 'expense', header: 'Expense Invoice #', showcol: true },
		{ field: 'expType', header: 'Expense Type', showcol: true, arr: settings.Expenses.Expenses },
		{ field: 'paid', header: 'Paid / Unpaid', showcol: false, arr: settings.ExpPmnt.ExpPmnt },
		{ field: 'comments', header: 'Comments', showcol: false },
	];



	const SelectRow = (row) => {
		setValueExp(row);
		setDateYr(row.date.startDate.substring(0, 4));
		setIsOpen(true);
	};

	return (
		<div className="lg:container mx-auto px-2 md:px-8 xl:px-10 ">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<SignOut />
					<Toast />
					{loading && <Spin />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">Expenses</div>
							<MonthSelect />
						</div>

						<Customtable
							data={expensesData.map(x => ({ ...x, poSupplierOrder: x.poSupplier.order }))}
							propDefaults={propDefaults} SelectRow={SelectRow}
							lastAction={lastAction} name='Expenses' 
							excellReport={EXD(expensesData.map(x => ({ ...x, poSupplierOrder: x.poSupplier.order })),
							 settings, 'Expenses')}/>
					</div>

					{valueExp && <MyDetailsModal isOpen={isOpen} setIsOpen={setIsOpen}
						title={'Existing Expense'} />}
				</>}
		</div>
	);
};

export default Expenses;

