
'use client';
import { useContext, useEffect, useState } from 'react';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import Toast from '../../../components/toast.js'
import { loadDataSettings, saveDataSettings } from '../../../utils/utils'
import VideoLoader from '../../../components/videoLoader';
import { TableSkeleton } from "../../../components/skeletons";
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
import LoadingButton from '../../../components/LoadingButton';

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
			{Object.keys(settings).length === 0 ? <TableSkeleton /> :
				<>
					<Toast />
					<VideoLoader loading={loading} fullScreen={true} />
					<div className="bg-[var(--bg-card)] rounded-2xl p-2 sm:p-3 mt-4 border border-[var(--line)] shadow-card">
						<div className='pb-2'>
							<div>
								<h1 className="text-display">Formulas</h1>
								<p className="responsiveTextInput text-[var(--ink-muted)] mt-0.5">Pricing formula calculations</p>
							</div>

							<div className="w-full">
								<TabGroup>
									<TabList className="inline-flex gap-1 mb-2 mt-2 p-0.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--line)]">
										{tabs.map((z) => (
											<Tab
												key={z}
												className={({ selected }) =>
													classNames(
														'px-4 py-1.5 h-8 flex items-center responsiveTextInput whitespace-nowrap transition-colors rounded-lg focus:outline-none',
														selected
															? 'font-medium text-[var(--ink)] bg-[var(--bg-card)] shadow-card'
															: 'font-medium text-[var(--ink-secondary)] hover:text-[var(--ink)]'
													)
												}
											>
												{z}
											</Tab>
										))}
									</TabList>

									{value.general != null && !loading && (
										<div className='bg-[var(--bg-card)] rounded-2xl border border-[var(--line)] shadow-card p-4 mb-3'>
											<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end'>
												<div className='min-w-0'>
													<p className='responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1.5'>Ni LME ($/MT)</p>
													<div className='relative'>
														<input
															type='text'
															className='w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] pl-2.5 pr-8 responsiveTextTitle font-semibold tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors'
															name='nilme'
															onChange={(e) => handleChange(e, 'general')}
															value={focusedField === 'nilme' ? value.general?.nilme || '' : addComma(value.general?.nilme || '0')}
															onFocus={() => setFocusedField('nilme')}
															onBlur={() => setFocusedField(null)}
														/>
														<button
															onClick={refreshMetal}
															title="Refresh live price"
															className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded text-[var(--ink-muted)] hover:text-[var(--brand)] hover:bg-[var(--bg-subtle)] transition-colors"
														>
															<RefreshCw className={`w-3 h-3 ${metalLoading ? 'animate-spin' : ''}`} />
														</button>
													</div>
												</div>

												<div className='min-w-0'>
													<p className='responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1.5'>Mo Oxide ($/lb)</p>
													<input
														type='text'
														className='w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] px-2.5 responsiveTextTitle font-semibold tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors'
														value={focusedField === 'MoOxideLb' ? value.general?.MoOxideLb || '' : addComma(value.general?.MoOxideLb || '0')}
														name='MoOxideLb'
														onChange={(e) => handleChange(e, 'general')}
														onFocus={() => setFocusedField('MoOxideLb')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='min-w-0'>
													<p className='responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1.5'>Charge Cr ($/lb)</p>
													<input
														type='text'
														className='w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] px-2.5 responsiveTextTitle font-semibold tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors'
														name='chargeCrLb'
														onChange={(e) => handleChange(e, 'general')}
														value={focusedField === 'chargeCrLb' ? value.general?.chargeCrLb || '' : addComma(value.general?.chargeCrLb || '0')}
														onFocus={() => setFocusedField('chargeCrLb')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<div className='min-w-0'>
													<p className='responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1.5'>1 MT (lb)</p>
													<input
														type='text'
														className='w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] px-2.5 responsiveTextTitle font-semibold tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors'
														/* The ' Lb' suffix used to be concatenated into the VALUE of this
														   editable input, so typing wrote "2204.62 Lb" straight back into
														   state. The unit lives in the label now. */
														value={value.general?.mt ?? ''}
														name='mt'
														onChange={(e) => handleChange(e, 'general')}
													/>
												</div>

												<div className='min-w-0'>
													<p className='responsiveTextTable font-semibold uppercase tracking-[0.04em] text-[var(--ink-muted)] mb-1.5'>EUR / USD</p>
													<input
														type='text'
														className='w-full h-8 rounded-control border border-[var(--line-strong)] bg-[var(--bg-card)] px-2.5 responsiveTextTitle font-semibold tabular-nums text-[var(--ink)] focus:outline-none focus:border-[var(--brand)] focus:ring-[3px] focus:ring-[var(--brand-soft)] transition-colors'
														value={focusedField === 'euroRate'
															? (value.general?.euroRate ?? '')
															: Number(value.general?.euroRate || 0).toFixed(2)}
														name='euroRate'
														onChange={(e) => handleChange(e, 'general')}
														onFocus={() => setFocusedField('euroRate')}
														onBlur={() => setFocusedField(null)}
													/>
												</div>

												<LoadingButton className='w-full' onClick={saveData}>
													Save
												</LoadingButton>
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
