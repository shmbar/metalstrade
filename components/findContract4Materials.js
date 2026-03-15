import Modal from "@components/modal"
import { ContractsContext } from "@contexts/useContractsContext"
import { loadContract } from "@utils/utils"
import { useContext, useState } from "react"


const FindCOntract4Materials = ({ open, setOpen, uidCollection, value, setValue }) => {

    const [value1, setValue1] = useState('')
    const [contract, setContract] = useState(null)
    const { valueCon, setValueCon } = useContext(ContractsContext);

    const findContract = async () => {

        let cont = await loadContract(uidCollection, value1);
        setContract(cont)

        if (cont.length > 0) {
            let tmpArr = cont[0].productsData.map(x => ({ ...x, import: true, importedFrom: { id: cont[0].id, date: cont[0].date } }))

            let newProductsData = [
                ...new Map(
                    [...valueCon.productsData, ...tmpArr].map(item => [item.id, item])
                ).values()
            ]
            let newValueCon = {
                ...valueCon,
                productsData: newProductsData
            }

            setValueCon(newValueCon)

            let newVal = { ...value, productsData: newProductsData }
            setValue(newVal)
            setOpen(false)
        }
    }


    return (
        <Modal isOpen={open} setIsOpen={setOpen} title="Insert Contract" w="max-w-sm">
            <div className="flex flex-col gap-3 p-3">
                <div className="flex flex-col gap-1">
                    <p className="text-xs font-medium text-[var(--chathams-blue)]">Order Number:</p>
                    <input
                        className="input h-7 text-xs rounded-xl border-[#b8ddf8] bg-white w-full"
                        value={value1}
                        onChange={(e) => setValue1(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && findContract()}
                    />
                    {(contract?.length === 0 && contract != null) &&
                        <span className="text-xs text-red-600 pl-1">Contract not found</span>
                    }
                </div>
                <div className="flex gap-2 pt-1">
                    <button
                        type="button"
                        className="blackButton py-1 text-xs"
                        onClick={findContract}
                    >
                        Find
                    </button>
                    <button
                        type="button"
                        className="whiteButton py-1 text-xs"
                        onClick={() => setOpen(false)}
                    >
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    )
}


export default FindCOntract4Materials;
