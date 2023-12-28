'use client';
import { useState, useEffect, useContext } from 'react';
import LinesPerPage from '@components/table/LinesPerPage.js';
import Paginator from '@components/table/Paginator.js';
import Header from '@components/table/header.js';
import { getD } from '@utils/utils.js';
import dateFormat from "dateformat";
import { SettingsContext } from "@contexts/useSettingsContext";

import '../contracts/style.css';

const Customtable = ({ data, datattl, propDefaults, SelectRow, lastAction, name, cb, valCur, filteredData,
	setFilteredData, setCurFilterData, setValCur, excellReport }) => {

	const drpSelection = [5, 10, 20];
	const [linesPerPage, setLinesPerPage] = useState(drpSelection[0]); // to present the dropdown with the number of pages to show
	const [paginationPage, setPaginationPage] = useState(1); //to show the specific section of table per selection
	const [numPages, setNumPages] = useState(); //how many sections will be - based on the linesPerPage
	const [dataToPresent, setDataToPresent] = useState(data.slice(0, drpSelection[0])); //to present partial data of all data on the page
	//const fields = Object.keys(data[0]); //write array of fields
	const [cols, setCols] = useState(propDefaults);
	const [searchValue, setSearchValue] = useState('');
	const { setLastAction } = useContext(SettingsContext);


	useEffect(() => {
		const numLines = data.length;

		const numPagesTmp =
			(numLines / linesPerPage) % 1 != 0
				? Math.ceil(numLines / linesPerPage)
				: numLines / linesPerPage;

		setNumPages(numPagesTmp == 0 ? 1 : numPagesTmp);

		if (lastAction === '+') {
			const start = linesPerPage * (numPagesTmp - 1);
			const end = linesPerPage * numPagesTmp;

			setDataToPresent(data.slice(start, end));
			setPaginationPage(numPagesTmp == 0 ? 1 : numPagesTmp)

		} else if (lastAction === 'months') {
			setPaginationPage(1);
			setDataToPresent(data.slice(0, linesPerPage));

		} else if (lastAction === '=') {
			const start = linesPerPage * (paginationPage - 1);
			const end = linesPerPage * paginationPage;

			searchValue === '' && setDataToPresent(data.slice(start, end));
		} else if (lastAction === '-') {
			if (paginationPage <= numPagesTmp) {
				const start = linesPerPage * (paginationPage - 1);
				const end = linesPerPage * paginationPage;

				setDataToPresent(data.slice(start, end));
			} else {
				const start = linesPerPage * (numPagesTmp - 1);
				const end = linesPerPage * numPagesTmp;

				setDataToPresent(data.slice(start, end));
				setPaginationPage(numPagesTmp)
			}
		}

		if (searchValue === '') { //data is not filtered
			//		setFilteredData(data);
			setSearchValue('')

		} else {
			let tmp = data.filter((x) => filteredData.map(x => x.id).includes(x.id));
			setDataToPresent(tmp.slice(0, linesPerPage))
			setFilteredData(tmp)
		}
		setLastAction('=')
	}, [linesPerPage, data]);

	useEffect(() => {
		const numLines = filteredData.length;

		const numPagesTmp =
			(numLines / linesPerPage) % 1 != 0
				? Math.ceil(numLines / linesPerPage)
				: numLines / linesPerPage;

		setNumPages(numPagesTmp == 0 ? 1 : numPagesTmp);

	}, [filteredData]);


	useEffect(() => {

		const numLines = filteredData.length;

		const numPagesTmp =
			(numLines / linesPerPage) % 1 != 0
				? Math.ceil(numLines / linesPerPage)
				: numLines / linesPerPage;


		if (paginationPage <= numPagesTmp) {

			const start = linesPerPage * (paginationPage - 1);
			const end = linesPerPage * paginationPage;

			setDataToPresent(filteredData.slice(start, end));
			filteredData.length === 0 && setPaginationPage(1)
		} else {
			const start = linesPerPage * (numPagesTmp - 1);
			const end = linesPerPage * numPagesTmp;

			setDataToPresent(filteredData.slice(start, end));
			filteredData.length === 0 ? setPaginationPage(1) : setPaginationPage(numPagesTmp)
		}
	}, [filteredData]);


	const setNumOfLinesToshow = (x) => {
		setPaginationPage(1);

		setLinesPerPage(x);
		setDataToPresent(filteredData.slice(0, x));
	};

	const setPage = (y) => {
		const start = linesPerPage * (y - 1);
		const end = linesPerPage * y;

		setDataToPresent(filteredData.slice(start, end));
		setPaginationPage(y);
	};

	const seLeftFirst = () => {
		setPaginationPage(1);
		setDataToPresent(filteredData.slice(0, linesPerPage));

	}

	const reduceLeft = () => {
		const newPage = paginationPage - 1 < 1 ? 1 : paginationPage - 1
		setPaginationPage(newPage);

		const start = linesPerPage * (newPage - 1);
		const end = linesPerPage * newPage;

		setDataToPresent(filteredData.slice(start, end));

	}

	const increaseRight = () => {
		const newPage = paginationPage + 1 > numPages ? numPages : paginationPage + 1
		setPaginationPage(newPage)

		const start = linesPerPage * (newPage - 1);
		const end = linesPerPage * newPage;

		setDataToPresent(filteredData.slice(start, end));
	}

	const setRightLast = () => {
		setPaginationPage(numPages)
		const start = linesPerPage * (numPages - 1);
		const end = linesPerPage * numPages;

		setDataToPresent(filteredData.slice(start, end));
	}

	const dspl = (a) => {
		const tmp = cols.find(x => x.field === a);
		return tmp?.showcol
	}

	const getprefixInv = (x) => {
		return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
			(x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
	}

	const showDetail = (obj, x) => {

		const tmp = cols.find(y => y.field === x);

		return x === 'client' ? obj.final ? obj.client.client : getD(tmp.arr, obj, x) :
			(x === 'date' && obj['date'].startDate !== null && !obj.final) ?
				dateFormat(obj[x].startDate, 'dd-mmm-yy') :
				(x === 'date' && obj['date'].startDate === null && !obj.final) ?
					'' :
					(x === 'conValue' || x === 'totalInvoices' || x === 'totalPrepayment1' || x === 'deviation'
						|| x === 'inDebt' || x === 'payments' || x === 'debtaftr' || x === 'debtBlnc' || x === 'expenses1'
						|| x === 'profit' || x === 'totalAmount') ? new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: getD(cols.find(y => y.field === x)['arr'], valCur, 'cur'),
							minimumFractionDigits: 2
						}).format(obj[x]) :
						x === 'supplier' ? getD(tmp.arr, obj, x) :
							obj[x]
	}


	const styledDiv = (obj, key) => {

		return (
			(key === 'invoiceStatus' && !obj.final) ? 'text-slate-700 p-1.5 rounded-xl bg-slate-200 px-2 justify-center flex font-medium' :
				(key === 'invoiceStatus' && obj.final && !obj.canceled) ? 'text-green-700 p-1.5 rounded-xl bg-slate-200 px-2 justify-center flex font-medium' :
					(key === 'invoiceStatus' && obj.final && obj.canceled) ? 'text-red-700 p-1.5 rounded-xl bg-slate-200 px-2 justify-center flex font-medium' :
						'py-1.5'
		)
	}

	const onSearchChange = (event) => {

		setSearchValue(event.target.value);
		const searchTerm = event.target.value;

		let tmpArr = cols.map(z => z.field)
		const newObj = data.map((obj) => {
			const tmp = {};

			for (let key of Object.keys(obj)) {
				if (tmpArr.includes(key) || key === 'id') {
					tmp[key] = showDetail(obj, key)
				}
			}
			return tmp;
		});


		const results = newObj.filter(obj =>
			Object.values(obj).some((value) => {
				if (typeof value === 'string' || typeof value === 'number') {
					const stringValue = String(value).toLowerCase();
					return stringValue.includes(searchTerm.toLowerCase());
				}
				return false;
			})
		);


		let tmp = data.filter((x) => results.map(x => x.id).includes(x.id));

		tmp = setCurFilterData(tmp)
		setFilteredData(tmp)

	}; //search

	const resetTable = () => {
		setFilteredData(data)
		setValCur({ cur: 'us' })
		setSearchValue('')
		setDataToPresent(data.slice(0, drpSelection[0]))
		setPaginationPage(1)
		setLinesPerPage(drpSelection[0])
	}

	return (
		<div className="flex flex-col relative border rounded-lg ">
			<div  >
				<div></div>
				<Header cols={cols} data={filteredData} name={name}
					onChange={onSearchChange} searchValue={searchValue} resetTable={resetTable}
					setCols={setCols} cb={cb} valCur={valCur}  excellReport={excellReport}/>
				<div className="overflow-x-auto ">
					<table className="w-full ">
						<thead className="bg-gray-50 divide-y divide-gray-200 ">
							{datattl.map((obj, i) => (
								<tr key={i} className='cursor-pointer bg-slate-600 '>
									{cols.map(x => x.field).map(key => (
										dspl(key) && <th key={key} data-label={key} className='table_cell py-1.5' >
											{key === 'order' ? <div className='text-white'>
												TOTAL:
											</div> :

												<div className={`${styledDiv(obj, key)} text-white font-medium`}>
													{showDetail(obj, key)}
												</div>}
										</th>
									))
									}
								</tr>
							))}
							<tr className='border-b '>
								{cols.filter((col) => col.showcol === true).map(x => x.header)
									.map((y, k) => (
										<th
											scope="col"
											key={k}
											className="border-b divide-y divide-gray-200 px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase"
										>
											{y}
										</th>

									))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 ">
							{dataToPresent.map((obj, i) => (
								<tr key={i} onDoubleClick={() => SelectRow(obj)} className='cursor-pointer'>
									{cols.map(x => (
										dspl(x.field) && <td key={x.field} data-label={x.header} className='table_cell py-1.5 items-center' >
											<div className={`${styledDiv(obj, x.field)}`}>
												{showDetail(obj, x.field)}
											</div>
										</td>
									))
									}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div className="flex p-2 border-t flex-wrap">
					<div className="hidden lg:flex text-gray-600 text-sm w-48 xl:w-96 p-2 ">
						{`Showing ${linesPerPage * (paginationPage - 1) + (filteredData.length > 0 ? 1 : 0)}-${linesPerPage * paginationPage > filteredData.length ?
							filteredData.length : linesPerPage * paginationPage} 
						of ${filteredData.length}`}
					</div>
					<div className='w-full justify-center flex  sm:w-auto items-center'>
						<Paginator
							paginationPage={paginationPage}
							numPages={numPages}
							setPage={setPage}
							seLeftFirst={seLeftFirst}
							reduceLeft={reduceLeft}
							increaseRight={increaseRight}
							setRightLast={setRightLast}
						/>
					</div>
					<div className="pl-4 pt-0.5">
						<LinesPerPage
							linesPerPage={linesPerPage}
							setNumOfLinesToshow={setNumOfLinesToshow}
							drpSelection={drpSelection}
						/>
					</div>
				</div>
			</div>
		</div>
	);
};

export default Customtable;