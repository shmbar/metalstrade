
'use client';
import { useContext, useEffect, useState } from 'react';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import Toast from '../../../components/toast.js'
import { loadDataSettings, saveDataSettings } from '../../../utils/utils'
import VideoLoader from '../../../components/videoLoader';
import { UserAuth } from "../../../contexts/useAuthContext"
import { Tab, TabPanel, TabGroup, TabList, TabPanels } from '@headlessui/react'
import Fenicr from './tabs/fenicr';
import SupperAlloys from './tabs/supperalloys';
import Stainless from './tabs/stainless';
import { Button } from '../../../components/ui/button';
import { getCur } from '../../../components/exchangeApi';
import dateFormat from "dateformat";

function classNames(...classes) {
	return classes.filter(Boolean).join(' ')
}

const Page = () => {
	const { settings, setToast } = useContext(SettingsContext);
	const { uidCollection } = UserAuth();
	const [value, setValue] = useState({})
	const [focusedField, setFocusedField] = useState(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const loadData = async () => {
			try {
				setLoading(true);
				let data = await loadDataSettings(uidCollection, 'formulasCalc')

				const timeoutId = setTimeout(() => {
					if (!data?.general) {
						setValue({ general: {} });
						setLoading(false);
					}
				}, 5000);

				try {
					let rate = await getCur(dateFormat(new Date(), 'yyyy-mm-dd'));
					if (rate) {
						data.general.euroRate = rate;
					} else {
						data.general.euroRate = data.general?.euroRate || 1.0;
					}
				} catch (error) {
					console.error('Error fetching rate:', error);
					data.general.euroRate = data.general?.euroRate || 1.0;
				}

				setValue(data)
				clearTimeout(timeoutId);
			} catch (error) {
				console.error('Error loading data:', error);
				setValue({ general: {} });
			} finally {
				setLoading(false);
			}
		}
		loadData()
	}, [uidCollection])

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
		if (!nStr && nStr !== 0) return '$0';
		nStr = (nStr + '').replace(/[^0-9.]/g, '');
		if (!nStr) return '$0';
		let [x1, x2 = ''] = nStr.split('.');
		x2 = x2 ? '.' + x2 : '';
		x1 = x1.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
		return '$' + x1 + x2;
	};

	let tabs = ['FeNiCr', 'SuperAlloys', 'Stainless']

	const SetDiv = (x) => {
		if (x === 0) {
			return <Fenicr value={value} handleChange={handleChange} focusedField={focusedField} setFocusedField={setFocusedField} addComma={addComma} />
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

	return (
		<div className="mx-auto w-full max-w-[98%] px-1 sm:px-2 md:px-3 pb-4 mt-[72px]">
			{Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
				<>
					<Toast />
					<VideoLoader loading={loading} fullScreen={true} />
					<div className="bg-white rounded-2xl p-3 sm:p-4 mt-6 border border-[#b8ddf8]">
						<div className='pb-2'>
							<div className="text-xl font-semibold text-[var(--port-gore)] mb-3 border-l-4 border-[var(--chathams-blue)] pl-2">Formulas</div>

							<div className="w-full">
								<TabGroup>
									<TabList className="flex space-x-2 mb-3">
										{tabs.map((z) => (
											<Tab
												key={z}
												className={({ selected }) =>
													classNames(
														'px-5 py-1.5 text-sm font-medium rounded-full transition-colors',
														'focus:outline-none',
														selected
															? 'bg-[var(--endeavour)] text-white shadow-sm'
															: 'text-[var(--endeavour)] hover:bg-[var(--selago)]'
													)
												}
											>
												{z}
											</Tab>
										))}
									</TabList>

									{value.general != null && !loading && (
										<div className='bg-[var(--selago)] rounded-xl p-2.5 mb-3'>
											<div className='flex flex-wrap items-end gap-2'>
												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white min-w-[140px] flex-1'>
													<span className='text-xs text-[var(--endeavour)] bg-[#dbeeff] text-center py-1 font-medium rounded-t-xl'>Ni LME</span>
													<input
														type='text'
														className='px-3 py-1.5 text-sm font-semibold text-[#F44336] text-center bg-white focus:outline-none w-full'
														name='nilme'
														onChange={(e) => handleChange(e, 'general')}
														value={focusedField === 'nilme' ? value.general?.nilme || '' : addComma(value.general?.nilme || '0')}
														onFocus={() => setFocusedField('nilme')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[110px] flex-1'>
													<span className='text-xs text-[var(--endeavour)] bg-[#dbeeff] text-center py-1 font-medium'>Mo Oxide - Lb</span>
													<input
														type='text'
														className='px-3 py-1.5 text-sm font-semibold text-[#F44336] text-center bg-white focus:outline-none'
														value={focusedField === 'MoOxideLb' ? value.general?.MoOxideLb || '' : addComma(value.general?.MoOxideLb || '0')}
														name='MoOxideLb'
														onChange={(e) => handleChange(e, 'general')}
														onFocus={() => setFocusedField('MoOxideLb')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[110px] flex-1'>
													<span className='text-xs text-[var(--endeavour)] bg-[#dbeeff] text-center py-1 font-medium'>Charge Cr - Lb</span>
													<input
														type='text'
														className='px-3 py-1.5 text-sm font-semibold text-[#F44336] text-center bg-white focus:outline-none'
														name='chargeCrLb'
														onChange={(e) => handleChange(e, 'general')}
														value={focusedField === 'chargeCrLb' ? value.general?.chargeCrLb || '' : addComma(value.general?.chargeCrLb || '0')}
														onFocus={() => setFocusedField('chargeCrLb')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[110px] flex-1'>
													<span className='text-xs text-[var(--endeavour)] bg-[#dbeeff] text-center py-1 font-medium'>1 MT</span>
													<input
														type='text'
														className='px-3 py-1.5 text-sm font-semibold text-[#F44336] text-center bg-white focus:outline-none'
														value={(value.general?.mt || '0') + ' Lb'}
														name='mt'
														onChange={(e) => handleChange(e, 'general')}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[110px] flex-1'>
													<span className='text-xs text-[var(--endeavour)] bg-[#dbeeff] text-center py-1 font-medium'>Euro / USD</span>
													<input
														type='text'
														className='px-3 py-1.5 text-sm font-semibold text-[#F44336] text-center bg-white focus:outline-none'
														value={(value.general?.euroRate || '0')}
														name='euroRate'
														onChange={(e) => handleChange(e, 'general')}
													/>
												</div>

												<div
													className='flex items-center justify-center rounded-xl border border-[var(--rock-blue)] overflow-hidden min-w-[80px] px-5 cursor-pointer bg-[var(--endeavour)] hover:bg-[var(--chathams-blue)] transition-colors self-stretch'
													onClick={saveData}
												>
													<span className='text-sm font-semibold text-white'>Save</span>
												</div>
											</div>
										</div>
									)}

									<TabPanels>
										{tabs.map((tab, idx) => (
											<TabPanel key={idx}>
												{!loading && value.general != null && SetDiv(idx)}
											</TabPanel>
										))}
									</TabPanels>
								</TabGroup>
							</div>
						</div>
					</div>
				</>
			}
		</div>
	);
};

export default Page;
