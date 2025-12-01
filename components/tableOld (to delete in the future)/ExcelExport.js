import Tooltip from '@components/tooltip';
import { SiMicrosoftexcel } from 'react-icons/si';
import { getD } from '@utils/utils.js';
import dateFormat from "dateformat";
const fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8';

const saveAsExcelFile = (buffer, fileName) => {
	import('file-saver').then((module) => {
		if (module && module.default) {
			let EXCEL_TYPE = fileType;
			const data = new Blob([buffer], { type: EXCEL_TYPE });
			module.default.saveAs(data, fileName + '.xlsx');
		}
	});
};

const getprefixInv = (x) => {
	return (x.invType === '1111' || x.invType === 'Invoice') ? '' :
		(x.invType === '2222' || x.invType === 'Credit Note') ? 'CN' : 'FN'
}

const ExcelExport = ({ data, cols, name }) => {

	const showDetail = (obj, x) => {
		const tmp = cols.filter(y => y.field === x)[0];

		return (tmp.arr != null && !obj.final && x !== 'conValue' && x !== 'totalInvoices' && x !== 'totalPrepayment1' && x !== 'deviation'
		&& x !== 'inDebt' && x !== 'payments' && x !== 'debtaftr' && x !== 'debtBlnc' && x !== 'expenses1'
		&& x !== 'profit' && x !== 'totalAmount' && x !== 'unitPrc' && x !== 'total') ? getD(tmp.arr, obj, x) :
			(x === 'date' && obj['date'].startDate !== null && !obj.final) ? dateFormat(obj[x].startDate, 'dd-mmm-yyyy') :
				(x === 'date' && obj['date'].startDate === null && !obj.final) ? '' :
					x === 'percentage' ? obj.invType !== '1111' ? '-' : obj[x] === '' ? '' : obj[x] + '%' :
						obj.final && x === 'client' ? obj.client.client :

						(x === 'conValue' || x === 'totalInvoices' || x === 'totalPrepayment1' || x === 'deviation'
						|| x === 'inDebt' || x === 'payments' || x === 'debtaftr' || x === 'debtBlnc' || x === 'expenses1'
						|| x === 'profit' || x==='totalAmount') ? obj[x] :

							obj.final && x === 'cur' ? obj.cur.cur :
								x === 'invoiceStatus' && !obj.final && !obj.canceled ? 'Draft' :
									x === 'invoiceStatus' && obj.final && !obj.canceled ? 'Final' :
										x === 'invoiceStatus' && obj.final && obj.canceled ? 'Canceled' :
										x==='invoice'? obj.invoice + getprefixInv(obj):
										x === 'supplier' || x === 'rcvd' || x === 'fnlzing' || x === 'status' ? getD(tmp.arr, obj, x) :
										obj[x]
	}


	const exportExcel = () => {
		const columnOrder = cols.map((x) => x.field);
		const headerTitles = cols.map((x) => x.header);

		const reorderedData = data.map((item) => {
			const reorderedItem = {};
			columnOrder.forEach((column, index) => {
				reorderedItem[headerTitles[index]] = showDetail(item, column);
			});
			return reorderedItem;
		});

		import('xlsx').then((xlsx) => {
			const worksheet = xlsx.utils.json_to_sheet(reorderedData);
			const workbook = { Sheets: { data: worksheet }, SheetNames: ['data'] };
			const excelBuffer = xlsx.write(workbook, { bookType: 'xlsx', type: 'array', });

			saveAsExcelFile(excelBuffer, name);
		});
	};

	return (
		<div>
			<button onClick={exportExcel}
				className="group hover:bg-slate-200 text-slate-700 justify-center w-10 h-10 inline-flex
     items-center text-sm rounded-full  hover:drop-shadow-md focus:outline-none"
			>
				<SiMicrosoftexcel className="scale-[1.4] text-gray-500" />
				<Tooltip txt='Excel' />
			</button>
		</div>
	);
}

export default ExcelExport