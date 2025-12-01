import { Radio, RadioGroup } from '@headlessui/react'
import Image from 'next/image'

import { useEffect, useState } from 'react'

const plans = [
    { logo: 'old', link: '/logo/imsLogo.png', signature: '/logo/imsSignature.png' },
    { logo: 'new', link: '/logo/logoNew.png' , signature: '/logo/imsSignatureNew.png'},
]

const Logos = ({ compData, setCompData }) => {

    const [selected, setSelected] = useState(plans.find(z=> z.link===compData.logolink))
    
    useEffect(() => {
        setCompData({ ...compData, 
            logolink: selected?.link,
            street: selected?.logo==='old'? 'Narva Mnt 13a': 'Jõe tn 4C',
            reg: selected?.logo==='old'? '14976408': '17031890',
            eori: selected?.logo==='old'? 'EE14976408': 'EE17031890',
            name: selected?.logo==='old'? 'IMS Stainless and Alloys OU': 'IMS Metals & Alloys OU',
            email: selected?.logo==='old'? 'sbashan@ims-stainless.com': 'sbashan@ims-metals.com',
            website: selected?.logo==='old'? 'www.ims-stainless.com': 'www.ims-metals.com',
            logoSignatureLink: selected?.signature
        })
    }, [selected])

    return (
        <div className="w-full px-4">
            Select Logo
            <div className="mx-auto w-full max-w-md">
                <RadioGroup by="logo" value={selected} onChange={setSelected} aria-label="Server size" className="space-y-2 flex">
                    {plans.map((plan, i) => (
                        <Radio
                            key={plan.logo}
                            value={plan}
                            className="group relative flex cursor-pointer rounded-lg bg-white/5 py-2"
                        >
                            <div className={`flex w-full items-center justify-between border-2
                                ${selected?.link === plan.link ? 'border-slate-500' : ''} `}>
                                <Image
                                    unoptimized
                                    src={plan.link}
                                    alt="Picture of a triangle"
                                    width={150}
                                    height={150}
                                />
                            </div>
                        </Radio>
                    ))}
                </RadioGroup>
            </div>
        </div>
    )
}

export default Logos;