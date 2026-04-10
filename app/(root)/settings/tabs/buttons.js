import { Button } from '@components/ui/button'
import { getTtl } from '@utils/languages'
import Tltip from '@components/tlTip';
import { CirclePlus, FilePenLine, Eraser, Trash } from "lucide-react";


const Buttons = ({ disabledButton, addItem, updateList, setIsDeleteOpen, clickClear, ln, value }) => {
    return (
        <div className='border border-slate-300 p-4 rounded-lg mt-1 shadow-md  w-full gap-4 flex flex-wrap'>
            <Tltip direction='top' tltpText='Add new supplier'>
                <Button className={`h-8 responsiveText ${disabledButton ? 'cursor-not-allowed' : ''}`} disabled={disabledButton}
                    onClick={addItem}>
                    <CirclePlus />   {getTtl('Add', ln)}
                </Button>
            </Tltip>
            <Tltip direction='top' tltpText='Update supplier data'>
                <Button className='h-8 responsiveText'
                    variant='outline'
                    onClick={updateList}>
                    <FilePenLine />
                    {getTtl('Update', ln)}
                </Button>
            </Tltip>
            <Tltip direction='top' tltpText='Delete supplier'>
                <Button
                    className='h-8 responsiveText'
                    variant='outline'
                    onClick={() => setIsDeleteOpen(true)}
                    disabled={!value.id}>
                    <Trash />{getTtl('Delete', ln)}
                </Button>
            </Tltip>
            <Tltip direction='top' tltpText='Clear form'>
                <Button
                    className='h-8 responsiveText'
                    variant='outline'
                    onClick={clickClear}>
                    <Eraser />{getTtl('Clear', ln)}
                </Button>
            </Tltip>
        </div>
    )
}

export default Buttons