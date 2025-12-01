'use client';
import { useContext, useEffect, useRef, useState } from 'react';

import { SettingsContext } from "@contexts/useSettingsContext";

import Toast from '@components/toast.js'

import { loadDataSettings, saveDataSettings } from '@utils/utils'

import Spinner from '@components/spinner';
import { UserAuth } from "@contexts/useAuthContext"
import { Tab, TabPanel, TabGroup, TabList, TabPanels } from '@headlessui/react'
import Fenicr from './tabs/fenicr';
import SupperAlloys from './tabs/supperalloys';
import Stainless from './tabs/stainless';
import { Button } from '@components/ui/button';
import { getCur } from '@components/exchangeApi';
import dateFormat from "dateformat";

function classNames(...classes) {
	return classes.filter(Boolean).join(' ')
}



const Page = () => {


	const { settings, setToast } = useContext(SettingsContext);

	const { uidCollection } = UserAuth();
	const [value, setValue] = useState({})
	const removeNonNumeric = (num) => num.toString().replace(/[^0-9.-]/g, "");
	const [focusedField, setFocusedField] = useState(null);

	useEffect(() => {
		const loadData = async () => {
			let data = await loadDataSettings(uidCollection, 'formulasCalc')
			let rate = await getCur(dateFormat(new Date(), 'yyyy-mm-dd'));

			data.general.euroRate = rate;
			if (rate) {
				setValue(data)
			}
		}

		loadData()
	}, [])


	const handleChange = (e, type) => {
		const { name, value: inputValue } = e.target;
		const clean = inputValue.replace(/[^0-9.]/g, '');
		setValue(prev => ({
			...prev,
			[type]: {
				...prev[type],
				[name]: clean,
			},
		}));
	};


	const addComma = (nStr) => {
		nStr += '';
		let [x1, x2 = ''] = nStr.split('.');
		x2 = x2 ? '.' + x2 : '';
		const rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1,$2');
		}
		return '$' + x1 + x2;
	};

	// const addComma = (nStr, z) => {
	// 	nStr += '';
	// 	var x = nStr.split('.');
	// 	var x1 = x[0];
	// 	var x2 = x.length > 1 ? '.' + x[1] : '';
	// 	var rgx = /(\d+)(\d{3})/;
	// 	while (rgx.test(x1)) {
	// 		x1 = x1.replace(rgx, '$1,$2');
	// 	}

	// 	const symbol = !z ? '$' : '€'
	// 	return (x1 + x2);
	// }

	let tabs = ['FeNiCr', 'SuperAlloys', 'Stainless']

	const SetDiv = (x) => {
		if (x === 0) {
			return <Fenicr value={value} handleChange={handleChange} />
		} else if (x === 1) {
			return <SupperAlloys value={value} handleChange={handleChange} />
		} else if (x === 2) {
			return <Stainless value={value} handleChange={handleChange} />
		}
	}

	const saveData = async () => {
		let result = await saveDataSettings(uidCollection, 'formulasCalc', value)
		result && setToast({ show: true, text: 'Data is saved', clr: 'success' })
	}



	const addCurrency = (nStr, symbol = '$') => {
		return symbol + addComma(nStr);
	};


	const getDisplayValue = (type, fieldName) => {
		const raw = value[type]?.[fieldName] || '';
		return focusedField === fieldName ? raw : addComma(raw); // 👈 only raw if focused
	};
	return (
		<div className="container mx-auto px-2 md:px-8 xl:px-10 mt-16 md:mt-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<Toast />
					{value.general == null && <Spinner />}
					<div className="border border-slate-200 rounded-xl p-4 mt-8 shadow-md relative">
						<div className='flex items-center justify-between flex-wrap pb-2'>
							<div className="text-3xl p-1 pb-2 text-slate-500">{'Formulas'}</div>


							<div className="w-full px-2 sm:px-0 pt-4">
								<TabGroup >
									<TabList className="overflow-x-auto max-w-xl flex space-x-1 rounded-xl p-1 gap-3">
										{tabs.map((z) => (
											<Tab
												key={z}
												className={({ selected }) =>
													classNames(
														'w-full rounded-lg py-2.5 px-2  font-medium leading-5 whitespace-nowrap',
														'ring-slate-500 ring-opacity-60 focus:outline-none focus:ring-1',
														selected
															? 'text-slate-700 bg-white shadow text-md'
															: 'text-slate-400 hover:bg-slate-100 hover:text-slate-400 text-sm'
													)
												}
											>
												{z}
											</Tab>
										))}
									</TabList>
									{value.general != null ? <div className='border border-slate-300 rounded-lg p-4 mt-2 relative flex gap-4'>
										<div className='border-y border-slate-500  border-x w-[120px] flex flex-col justify-center'>
											<span className='title_style bg-gray-300'>Ni LME</span>
											<input type='input' className='input_style text-red-700' name='nilme'
												onChange={(e) => handleChange(e, 'general')}
												value={focusedField === 'nilme' ? value.general?.nilme : addComma(value.general?.nilme)}
												onFocus={() => setFocusedField('nilme')}
												onBlur={() => setFocusedField(null)}
											/>
										</div>

										<div className='border-y border-slate-500  border-x w-[120px] flex flex-col justify-center'>
											<span className='title_style bg-gray-300'>Mo Oxide - Lb</span>
											<input type='input' className='input_style text-red-700 '
												value={focusedField === 'MoOxideLb' ? value.general?.MoOxideLb : addComma(value.general?.MoOxideLb)}
												name='MoOxideLb' onChange={(e) => handleChange(e, 'general')}
												onFocus={() => setFocusedField('MoOxideLb')}
												onBlur={() => setFocusedField(null)}
											/>
										</div>

										<div className='border-y border-slate-500  border-x w-[120px] flex flex-col justify-center'>
											<span className='title_style bg-gray-300'>Charge Cr - Lb</span>
											<input type='input' className='input_style text-red-700 '
												name='chargeCrLb' onChange={(e) => handleChange(e, 'general')}
												value={focusedField === 'chargeCrLb' ? value.general?.chargeCrLb : addComma(value.general?.chargeCrLb)}
												onFocus={() => setFocusedField('chargeCrLb')}
												onBlur={() => setFocusedField(null)}
											/>
										</div>

										<div className='border-y border-slate-500  border-x w-[120px] flex flex-col justify-center'>
											<span className='title_style bg-gray-300'>1 MT </span>
											<input type='input' className='input_style text-red-700 ' value={(value.general?.mt) + ' Lb'}
												name='mt' onChange={(e) => handleChange(e, 'general')} />
										</div>

										<div className='border-y border-slate-500  border-x w-[120px] flex flex-col justify-center'>
											<span className='title_style bg-gray-300'> Euro / USD </span>
											<input type='input' className='input_style text-red-700 ' value={(value.general?.euroRate)}
												name='euroRate' onChange={(e) => handleChange(e, 'general')} />
										</div>

										<Button className='px-2 h-full w-20 border border-slate-400 text-md bg-orange-200'
											variant='outline' onClick={saveData}>
											Save
										</Button>

									</div>
										: ''
									}
									<TabPanels className="mt-2">
										{tabs.map((tab, idx) => (
											<TabPanel
												key={idx}
												className={classNames(
													'rounded-xl bg-white',
													'ring-white ring-opacity-60 focus:outline-none focus:ring-2'
												)}
											>
												{SetDiv(idx)}

											</TabPanel>
										))}
									</TabPanels>
								</TabGroup>
							</div>
						</div>
					</div>
				</>}
		</div>
	);
};

export default Page;

