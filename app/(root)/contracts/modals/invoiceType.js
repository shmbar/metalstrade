import { RadioGroup } from '@headlessui/react'
import { getTtl } from '@utils/languages'


export default function InvType({ setSelected, plans, value , ln}) {

    let slctd = value.invType === '' ? plans[0] : plans.find(x => x.id === value.invType)

    //   let dis1 = value.id !== '' && value.invType === '1111' && (plan.id === '2222' || plan.id === '3333')
    return (
        <div className="w-full py-1 ">
            <div className="mx-auto w-full ">
                <RadioGroup value={slctd} onChange={setSelected}>
                    <div className="space-y-2">
                        {plans.map((plan) => (
                            <RadioGroup.Option
                                key={plan.invType}
                                value={plan}
                                disabled={
                                    (value.id !== '' && value.invType === '1111' && (plan.id === '2222' || plan.id === '3333')) ||
                                    (value.id !== '' && (value.invType === '2222' || value.invType === '3333') && plan.id === '1111')
                                }
                                className={({ active, checked }) =>
                                    `
                  ${checked ? 'bg-slate-500 text-white' : 'bg-white border border-slate-400'
                                    } 
                                    ${(value.id !== '' && value.invType === '1111' && (plan.id === '2222' || plan.id === '3333')) ||
                                        (value.id !== '' && (value.invType === '2222' || value.invType === '3333') && plan.id === '1111') ? 'bg-gray-100 cursor-not-allowed' : 'cursor-pointer'}
                    relative flex rounded-md px-4 py-1.5 shadow-lg focus:outline-none`
                                }
                            >
                                {({ active, checked }) => (
                                    <>
                                        <div className="flex w-full items-center justify-between">
                                            <div className="flex items-center">
                                                <div className="text-xs">
                                                    <RadioGroup.Label
                                                        as="p"
                                                        className={`font-medium  ${checked ? 'text-white' : 'text-gray-900'
                                                            } 
                                                            `}
                                                    >
                                                       {getTtl(plan.invType, ln)} 
                                                    </RadioGroup.Label>

                                                </div>
                                            </div>
                                            {checked && (
                                                <div className="shrink-0 text-white">
                                                    <CheckIcon className="h-5 w-5" />
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </RadioGroup.Option>
                        ))}
                    </div>
                </RadioGroup>
            </div>
        </div>
    )
}

function CheckIcon(props) {
    return (
        <svg viewBox="0 0 24 24" fill="none" {...props}>
            <circle cx={12} cy={12} r={12} fill="#fff" opacity="0.2" />
            <path
                d="M7 13l3 3 7-7"
                stroke="#fff"
                strokeWidth={1.5}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
