
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
import MarketBar from './marketBar';
import { Button } from '../../../components/ui/button';
import { getCur } from '../../../components/exchangeApi';
import dateFormat from "dateformat";
import useMetalPrices from '../../../hooks/useMetalPrices';

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
										<MarketBar
											value={value}
											handleChange={handleChange}
											focusedField={focusedField}
											setFocusedField={setFocusedField}
											addComma={addComma}
											refreshMetal={refreshMetal}
											metalLoading={metalLoading}
											onSave={saveData}
										/>
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
