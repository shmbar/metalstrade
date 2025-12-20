import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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

        if (cont.length > 0) { //found
            let tmpArr = cont[0].productsData.map(x => ({ ...x, import: true, importedFrom: { id: cont[0].id, date: cont[0].date } }))

            let newProductsData = [
                    ...new Map(
                        [...valueCon.productsData, ...tmpArr].map(item => [item.id, item])
                    ).values()
                ]
            let newValueCon = {  //Remove duplicates
                ...valueCon, 
                productsData: newProductsData
            }

            setValueCon(newValueCon)

            let newVal = {...value, productsData:newProductsData }
            setValue(newVal)
            setOpen(false)
        }
    }


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Insert Contract</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-left gap-2">
                    <div className="grid flex-1 gap-2">
                        Order Number:
                        <Input
                            value={value1}
                            onChange={(e) => setValue1(e.target.value)}
                        />
                    </div>
                    {(contract?.length === 0 && contract != null) &&
                        <span className="text-sm text-red-700 pl-2">Contract not found</span>
                    }
                </div>
                <DialogFooter className="sm:justify-start">
                    <Button type="button" variant="outline" onClick={findContract}>
                        Find
                    </Button>
                    <DialogClose asChild>
                        <Button type="button" variant="secondary">
                            Close
                        </Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


export default FindCOntract4Materials;