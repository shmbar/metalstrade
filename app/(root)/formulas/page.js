
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
import useMetalPrices from '../../../hooks/useMetalPrices';
import { RefreshCw } from 'lucide-react';

function classNames(...classes) {
	return classes.filter(Boolean).join(' ')
}

const Page = () => {
	const { settings, setToast } = useContext(SettingsContext);
	const { uidCollection } = UserAuth();
	const [value, setValue] = useState({})
	const [focusedField, setFocusedField] = useState(null);
	const [loading, setLoading] = useState(true);
	const { prices: metalPrices, loading: metalLoading, refresh: refreshMetal } = useMetalPrices();

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

		if (!uidCollection) return;
		loadData()
		
	}, [uidCollection])

	// Auto-fill Ni LME from live metals price
	useEffect(() => {
		if (!loading && metalPrices?.['LME-NI']?.price != null) {
			setValue(prev => ({
				...prev,
				general: {
					...prev.general,
					nilme: String(Math.round(metalPrices['LME-NI'].price)),
				}
			}));
		}
	}, [metalPrices, loading]);

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
		<div className="mx-auto w-full max-w-full px-1 md:px-2 pb-4 mt-[72px]">
			{Object.keys(settings).length === 0 ? <VideoLoader loading={true} fullScreen={true} /> :
				<>
					<Toast />
					<VideoLoader loading={loading} fullScreen={true} />
					<div className="bg-white rounded-2xl p-2 sm:p-3 mt-4 border border-[#b8ddf8]">
						<div className='pb-2'>
							<h1 className="text-[var(--chathams-blue)] font-poppins responsiveTextTitle font-medium border-l-4 border-[var(--chathams-blue)] pl-2">Formulas</h1>

							<div className="w-full">
								<TabGroup>
									<TabList className="flex gap-4 mb-2 mt-2 pb-2">
										{tabs.map((z) => (
											<Tab
												key={z}
												className={({ selected }) =>
													classNames(
														'px-5 py-2 h-[32px] flex items-center text-[0.75rem] font-poppins whitespace-nowrap transition-all rounded-full focus:outline-none',
														'focus:outline-none',
														selected
															? 'font-semibold text-white bg-[var(--endeavour)] shadow-md border border-[var(--endeavour)]'
															: 'text-[var(--endeavour)] bg-[#dbeeff] border border-[#b8ddf8] font-medium hover:bg-[#c5e4f8] hover:border-[var(--endeavour)] hover:shadow-sm'
													)
												}
											>
												{z}
											</Tab>
										))}
									</TabList>

									{value.general != null && !loading && (
										<div className='bg-white rounded-xl p-3 mb-2 w-fit border border-[#b8ddf8]'>
											<div className='flex flex-wrap items-end gap-2.5'>
												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[100px] flex-1'>
													<span className='text-[0.75rem] text-[var(--endeavour)] bg-[#dbeeff] text-center py-1.5 font-medium flex items-center justify-center gap-1'>
														Ni LME
														<button onClick={refreshMetal} title="Refresh live price" className="hover:text-[var(--chathams-blue)] transition-colors">
															<RefreshCw className={`w-3 h-3 ${metalLoading ? 'animate-spin' : ''}`} />
														</button>
													</span>
													<input
														type='text'
														className='px-2 py-1 font-medium text-[#F44336] text-center bg-white focus:outline-none w-full text-[0.75rem]'
																						name='nilme'
														onChange={(e) => handleChange(e, 'general')}
														value={focusedField === 'nilme' ? value.general?.nilme || '' : addComma(value.general?.nilme || '0')}
														onFocus={() => setFocusedField('nilme')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[100px] flex-1'>
													<span className='text-[0.75rem] text-[var(--endeavour)] bg-[#dbeeff] text-center py-1.5 font-medium'>Mo Oxide - Lb</span>
													<input
														type='text'
														className='px-2 py-1 font-medium text-[#F44336] text-center bg-white focus:outline-none text-[0.75rem]'
																						value={focusedField === 'MoOxideLb' ? value.general?.MoOxideLb || '' : addComma(value.general?.MoOxideLb || '0')}
														name='MoOxideLb'
														onChange={(e) => handleChange(e, 'general')}
														onFocus={() => setFocusedField('MoOxideLb')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[100px] flex-1'>
													<span className='text-[0.75rem] text-[var(--endeavour)] bg-[#dbeeff] text-center py-1.5 font-medium'>Charge Cr - Lb</span>
													<input
														type='text'
														className='px-2 py-1 font-medium text-[#F44336] text-center bg-white focus:outline-none text-[0.75rem]'
																						name='chargeCrLb'
														onChange={(e) => handleChange(e, 'general')}
														value={focusedField === 'chargeCrLb' ? value.general?.chargeCrLb || '' : addComma(value.general?.chargeCrLb || '0')}
														onFocus={() => setFocusedField('chargeCrLb')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[100px] flex-1'>
													<span className='text-[0.75rem] text-[var(--endeavour)] bg-[#dbeeff] text-center py-1.5 font-medium'>1 MT</span>
													<input
														type='text'
														className='px-2 py-1 font-medium text-[#F44336] text-center bg-white focus:outline-none text-[0.75rem]'
																						value={(value.general?.mt || '0') + ' Lb'}
														name='mt'
														onChange={(e) => handleChange(e, 'general')}
													/>
												</div>

												<div className='flex flex-col rounded-xl border border-[var(--rock-blue)] bg-white overflow-hidden min-w-[100px] flex-1'>
													<span className='text-[0.75rem] text-[var(--endeavour)] bg-[#dbeeff] text-center py-1.5 font-medium'>Euro / USD</span>
													<input
														type='text'
														className='px-2 py-1 font-medium text-[#F44336] text-center bg-white focus:outline-none text-[0.75rem]'
																						value={(value.general?.euroRate || '0')}
														name='euroRate'
														onChange={(e) => handleChange(e, 'general')}
													/>
												</div>

												<div
													className='flex items-center justify-center rounded-full border border-[var(--endeavour)] overflow-hidden min-w-[80px] px-5 py-2 cursor-pointer bg-[var(--endeavour)] hover:bg-[var(--chathams-blue)] hover:border-[var(--chathams-blue)] transition-all self-stretch shadow-md'
													onClick={saveData}
												>
													<span className='text-[0.75rem] font-semibold text-white'>Save</span>
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
