import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarTrigger,
} from "@/components/ui/menubar"
import { EllipsisVertical } from 'lucide-react';


function MenuOption({ label, value, current, onClick }) {
    const isActive = current === value

    return (
        <MenubarItem
            aria-disabled={isActive}
            className={`
                text-xs
                aria-disabled:opacity-50 
                aria-disabled:pointer-events-none
                ${isActive ? "bg-gray-200 text-gray-800 rounded-md" : ""}
            `}
            onClick={() => {
                if (isActive) return
                onClick(value)
            }}
        >
            {label}
        </MenubarItem>
    )
}

export default function Example({ obj, selectOrEdit, indx }) {

    return (
        <Menubar className='p-0 border-none '>
            <MenubarMenu className='p-0'>
                <MenubarTrigger className="p-0 cursor-pointer bg-transparent hover:bg-transparent data-[state=open]:bg-transparent ">
                    <EllipsisVertical size={20} />
                </MenubarTrigger>
                <MenubarContent className='min-w-28'>
                    <MenuOption
                        label="Edit Description"
                        value="edit"
                        current={obj.mtrlStatus}
                        onClick={(val) => selectOrEdit(val, indx)}
                    />
                    <MenuOption
                        label="Original Description"
                        value="select"
                        current={obj.mtrlStatus}
                        onClick={(val) => selectOrEdit(val, indx)}
                    />
                </MenubarContent>
            </MenubarMenu>
        </Menubar>
    )
}




