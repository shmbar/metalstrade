import React, { useContext, useEffect, useState } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SettingsContext } from '@contexts/useSettingsContext';
import { UserAuth } from '@contexts/useAuthContext';
import Image from 'next/image';


const companies = [
    { value: 'oldIMS', link: '/logo/imsLogo.png' },
    { value: 'newIMS', link: '/logo/logoNew.png' }
]

const CompanySelect = () => {
    const [company, setCompany] = useState();
    const { compData, setCompData, updateCompanyData1, setToast } = useContext(SettingsContext);
    const { uidCollection } = UserAuth();

    useEffect(() => {
        setCompany(companies.find(z => z.link === compData.logolink)?.value)
    }, [compData])

    const handleChange = async (val) => {

        let newObj = {
            ...compData,
            logolink: val === 'oldIMS' ? '/logo/imsLogo.png' : '/logo/logoNew.png',
            street: val === 'oldIMS' ? 'Narva Mnt 13a' : 'Jõe tn 4C',
            reg: val === 'oldIMS' ? '14976408' : '17031890',
            eori: val === 'oldIMS' ? 'EE14976408' : 'EE17031890',
            name: val === 'oldIMS' ? 'IMS Stainless and Alloys OU' : 'IMS Metals & Alloys OU',
            email: val === 'oldIMS' ? 'sbashan@ims-stainless.com' : 'sbashan@ims-metals.com',
            website: val === 'oldIMS' ? 'www.ims-stainless.com' : 'www.ims-metals.com',
            logoSignatureLink: val === 'oldIMS' ? '/logo/imsSignature.png' : '/logo/imsSignatureNew.png',
        }

        setCompany(val)
        setCompData(newObj)

        await updateCompanyData1(uidCollection, newObj)
        setToast({ show: true, text: 'Company data saved', clr: 'success' })

    }
    //w-[180px

    return (
        <div className='w-full'>
            <Select className='' value={company}
                onValueChange={(value) => handleChange(value)} >
                <SelectTrigger className="w-full border border-slate-400 py-6 h-9
            focus:outline-none focus:ring-0 focus:ring-offset-0">
                    <SelectValue placeholder="Theme" className='w-full' />
                </SelectTrigger>
                <SelectContent>
                    {companies.map((z, i) => {
                        return (
                            <SelectItem key={i} value={z.value}>{
                                <Image
                                    src={z.link}
                                    width={70}
                                    height={70}
                                    alt="Picture of the author"
                                />}
                            </SelectItem>
                        )
                    })}
                </SelectContent>
            </Select>
        </div>
    )
}

export default CompanySelect