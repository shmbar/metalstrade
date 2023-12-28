'use client';
import { useState, useEffect, useContext } from 'react';
import LinesPerPage from '@components/table/LinesPerPage.js';
import Paginator from '@components/table/Paginator.js';
import Header from '@components/table/header.js';
import { getD } from '@utils/utils.js';
import dateFormat from "dateformat";
import { SettingsContext } from "@contexts/useSettingsContext";

function flattenObject(obj) {
	const result = {};

	function recurse(current, property) {
		if (Object(current) !== current) {
			result[property] = current;
		} else if (Array.isArray(current)) {
			for (let i = 0; i < current.length; i++) {
				recurse(current[i], `${property}[${i}]`);
			}
			if (current.length === 0) {
				result[property] = [];
			}
		} else {
			let isEmpty = true;
			for (let p in current) {
				isEmpty = false;
				recurse(current[p], property ? `${property}.${p}` : p);
			}
			if (isEmpty && property) {
				result[property] = {};
			}
		}
	}

	recurse(obj, '');

	return result;
}



const Customtable = ({ data, propDefaults, lastAction, name }) => {

	const drpSelection = [5, 10, 20];
	const [linesPerPage, setLinesPerPage] = useState(drpSelection[2]); // to present the dropdown with the number of pages to show
	const [paginationPage, setPaginationPage] = useState(1); //to show the specific section of table per selection
	const [numPages, setNumPages] = useState(); //how many sections will be - based on the linesPerPage
	const [dataToPresent, setDataToPresent] = useState(data.slice(0, drpSelection[0])); //to present partial data of all data on the page
	const [filteredData, setFilteredData] = useState([]);
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
			setFilteredData(data);
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


	const showDetail = (obj, x) => {

		const tmp = cols.find(y => y.field === x);

		return (tmp?.arr && !obj.final && x !== 'unitPrc') ? getD(tmp.arr, obj, x) :
			(x === 'date' && obj['date'].startDate !== null && !obj.final) ?
				dateFormat(obj[x].startDate, 'dd-mmm-yyyy') :
				(x === 'date' && obj['date'].startDate === null && !obj.final) ?
					'' :
					x === 'unitPrc' ? isNaN(parseFloat(obj[x])) ? obj[x] :
						new Intl.NumberFormat('en-US', {
							style: 'currency',
							currency: getD(cols.find(y => y.field === x)['arr'], obj, 'cur'),
							minimumFractionDigits: 2
						}).format(obj[x]) :
						(x === 'poWeight' || x === 'shiipedWeight') && obj[x] !== 0 ? new Intl.NumberFormat('en-US', {
							minimumFractionDigits: 3
						}).format(obj[x]) :
							x === 'remaining' && obj[x] !== 0 ? new Intl.NumberFormat('en-US', {
								minimumFractionDigits: 3
							}).format(obj[x] > 0 ? obj[x] : obj[x] * -1) :
								obj[x]


	}

	const styledDiv = (obj, key) => {

		return (
			(key === 'remaining' && obj[key] < 0) ? 'text-red-400 font-semibold' :
				(key === 'invoiceStatus' && obj.final && obj.canceled) ? 'text-red-700 p-1.5 rounded-xl bg-slate-200 px-2 justify-center flex font-medium' :
					'md:py-1.5'
		)
	}

	const onSearchChange = (event) => {

		setSearchValue(event.target.value);
		const searchTerm = event.target.value;

		let tmpArr = cols.map(z => z.field)
		const newObj = data.map((obj) => {
			const tmp = {};

			for (let key of Object.keys(obj)) {
				if (tmpArr.includes(key) || key === 'id' || key === 'client1' || key === 'totalPo1'
					|| key === 'destination1') {
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

		const numLines = tmp.length;

		const numPagesTmp =
			(numLines / linesPerPage) % 1 != 0
				? Math.ceil(numLines / linesPerPage)
				: numLines / linesPerPage;


		if (paginationPage <= numPagesTmp) {
			const start = linesPerPage * (paginationPage - 1);
			const end = linesPerPage * paginationPage;

			setDataToPresent(tmp.slice(start, end));
			tmp.length === 0 && setPaginationPage(1)
		} else {
			const start = linesPerPage * (numPagesTmp - 1);
			const end = linesPerPage * numPagesTmp;

			setDataToPresent(tmp.slice(start, end));
			tmp.length === 0 ? setPaginationPage(1) : setPaginationPage(numPagesTmp)
		}


		setFilteredData(tmp)


	}; //search

	const resetTable = () => {
		setFilteredData(data)
		setSearchValue('')
		setDataToPresent(data.slice(0, drpSelection[0]))
		setPaginationPage(1)
		setLinesPerPage(drpSelection[0])
	}

	return (
		<div className="flex flex-col relative border rounded-lg ">
			<div  >
				<Header cols={cols} data={data} name={name}
					onChange={onSearchChange} searchValue={searchValue} resetTable={resetTable}
					setCols={setCols} />

				<div className="overflow-x-auto ">
					<table className="w-full ">
						<thead className="bg-gray-50 divide-y divide-gray-200 ">
							<tr className='border-b '>
								{cols.filter((col) => col.showcol === true).map(x => x.header)
									.map((y, k) => (
										<th
											scope="col"
											key={k}
											className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase dark:text-gray-400"
										>
											{y}
										</th>

									))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 ">
							{dataToPresent.map((obj, i) => (
								<tr key={i}>
									{
										cols.map(x => (
											dspl(x.field) && <td key={x.field} data-label={x.header} className='table_cell md:py-1.5' >
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