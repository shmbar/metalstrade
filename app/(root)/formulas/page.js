
'use client';
import { useContext, useEffect, useState } from 'react';
import { SettingsContext } from "../../../contexts/useSettingsContext";
import Toast from '../../../components/toast.js'
import { loadDataSettings, saveDataSettings } from '../../../utils/utils'
import Spinner from '../../../components/spinner';
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
		nStr += '';
		let [x1, x2 = ''] = nStr.split('.');
		x2 = x2 ? '.' + x2 : '';
		const rgx = /(\d+)(\d{3})/;
		while (rgx.test(x1)) {
			x1 = x1.replace(rgx, '$1,');
		}
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
		<div className="container mx-auto px-1 pb-2 md:pb-0 mt-1 md:mt-0">
			{Object.keys(settings).length === 0 ? <Spinner /> :
				<>
					<Toast />
					{loading && <Spinner />}
					<div className="bg-white rounded-2xl shadow-md p-2 mt-1 border border-slate-100">
						<div className='pb-3'>
							<div className="text-lg font-semibold text-[var(--port-gore)] mb-0 mt-0">Formulas</div>

							<div className="w-full">
								<TabGroup>
									<TabList className="flex bg-[#EAF4FF] p-0.5 rounded-full w-fit border border-[#D9ECFF] mb-1">
										{tabs.map((z) => (
										<Tab
										key={z}
										className={({ selected }) =>
											classNames(
											'px-3 py-0.5 text-[11px] font-medium transition-all rounded-sm',
											selected
												? 'bg-[var(--endeavour)] text-white shadow'
												: 'text-[#2F6FDB] hover:bg-white'
											)
										}
										>
										{z}
										</Tab>
										))}
									</TabList>


									
									{value.general != null && !loading && (
										<div className="rounded-xl p-2 mb-2 border border-[#E6EEF8]">
											<div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-2'>
												
<div className="border border-[#D9ECFF] rounded-xl shadow-sm overflow-hidden text-center">
  {/* Header strip */}
	<div className="bg-[#EAF4FF] px-1 py-0.5">
		<p className="text-xs text-[#2F6FDB]">
      Ni LME
    </p>
  </div>

  {/* Value area */}
 	<div className="bg-white px-1 py-1">
		<input
				type="text"
				className="w-full text-center bg-transparent text-xs text-[#F44336] focus:outline-none py-0.5 w-28"
      name="nilme"
      value={
        focusedField === 'nilme'
          ? value.general?.nilme || ''
          : addComma(value.general?.nilme || '0')
      }
      onChange={(e) => handleChange(e, 'general')}
      onFocus={() => setFocusedField('nilme')}
      onBlur={() => setFocusedField(null)}
    />
  </div>
</div>



<div className="border border-[#D9ECFF] rounded-xl shadow-sm overflow-hidden text-center">
  {/* Header */}
	<div className="bg-[#EAF4FF] px-1 py-0.5">
		<p className="text-xs text-[#2F6FDB]">
			Mo Oxide – Lb
		</p>
	</div>

	{/* Value */}
	<div className="bg-white px-1 py-1">
		<input
			type="text"
			className="w-full text-center bg-transparent text-xs text-[#F44336] focus:outline-none py-0.5 w-28"
			name="MoOxideLb"
      value={
        focusedField === 'MoOxideLb'
          ? value.general?.MoOxideLb || ''
          : addComma(value.general?.MoOxideLb || '0')
      }
      onChange={(e) => handleChange(e, 'general')}
      onFocus={() => setFocusedField('MoOxideLb')}
      onBlur={() => setFocusedField(null)}
    />
  </div>
</div>


												
													<div className="border border-[#D9ECFF] rounded-xl shadow-sm overflow-hidden text-center">
	<div className="bg-[#EAF4FF] px-1 py-0.5">
		<p className="text-xs text-[#2F6FDB]">
			Charge Cr – Lb
		</p>
	</div>

	<div className="bg-white px-1 py-1">
		<input
			type="text"
			className="w-full text-center bg-transparent text-xs text-[#F44336] focus:outline-none py-0.5 w-28"
			name="chargeCrLb"
      value={
        focusedField === 'chargeCrLb'
          ? value.general?.chargeCrLb || ''
          : addComma(value.general?.chargeCrLb || '0')
      }
      onChange={(e) => handleChange(e, 'general')}
      onFocus={() => setFocusedField('chargeCrLb')}
      onBlur={() => setFocusedField(null)}
    />
  </div>
</div>


											
												<div className="border border-[#D9ECFF] rounded-xl shadow-sm overflow-hidden text-center">
	<div className="bg-[#EAF4FF] px-1 py-0.5">
		<p className="text-xs text-[#2F6FDB]">
			1 MT
		</p>
	</div>

	<div className="bg-white px-1 py-1">
		<input
			type="text"
			className="w-full text-center bg-transparent text-xs text-[#F44336] focus:outline-none py-0.5 w-28"
			value={(value.general?.mt || '0') + ' Lb'}
			name="mt"
			onChange={(e) => handleChange(e, 'general')}
		/>
	</div>
</div>
						

	<div className="border border-[#D9ECFF] rounded-xl shadow-sm overflow-hidden text-center">
	<div className="bg-[#EAF4FF] px-1 py-0.5">
	  <p className="text-xs  text-[#2F6FDB]">
	    Euro / USD
	  </p>
	</div>

	<div className="bg-white px-1 py-1">
		<input
			type="text"
			className="w-full text-center bg-transparent text-xs text-[#F44336] focus:outline-none py-0.5 w-28"
	    value={value.general?.euroRate || '0'}
	    name="euroRate"
	    onChange={(e) => handleChange(e, 'general')}
	  />
	</div>
</div>


												<div className=" rounded-xl shadow-sm overflow-hidden flex items-center justify-center bg-white">
										<Button
											className="h-7 px-3 rounded-sm bg-[var(--endeavour)] hover:bg-[var(--chathams-blue)] text-white font-semibold shadow-sm text-sm"
											onClick={saveData}
										>
										Save
										</Button>
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