import { useEffect, useState, useContext } from 'react'
import Modal from '@components/modal.js'
import { uploadFile, getAllfiles, deleteFile } from '@utils/utils'
import Link from 'next/link'
import { VscArchive } from 'react-icons/vsc';
import { FileUploader } from "react-drag-drop-files";
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from '@utils/languages';



const fileTypes = ['XLSX', 'PDF', "PNG"];

const DataModal = ({ isOpen, setIsOpen, valueCon, setToast }) => {

    const [imageUplaod, setImageUpload] = useState(null)
    const [list, setList] = useState([])
    const {ln } = useContext(SettingsContext);

    
    const handleChange = async (file) => {
        setImageUpload(file);

        await uploadFile(valueCon.id, file, setList)
        setToast({ show: true, text: 'Attachment successfully uploaded!', clr: 'success' })
    };


    useEffect(() => {
        const loadList = async () => {
            let arr = await getAllfiles(valueCon.id)
            setList(arr)
        }

        loadList()
    }, [])

    const deletefiles = (name) => {
        let newList = list.filter(x => x.name !== name)
        setList(newList)
        deleteFile(valueCon.id, name)
        setToast({ show: true, text: 'Attachment successfully deleted!', clr: 'success' })
    }


    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('Contract files', ln)} w='max-w-3xl'>
            <div className='flex flex-wrap p-2 justify-between gap-2'>

                <div className='max-w-md grow '>
                    <ul className="flex flex-col mt-1 max-w-md overflow-auto max-h-80 ring-1 ring-black/5 rounded-lg divide-y" >
                        {list.map((x, i) => {
                            return (
                                <li key={i} className="justify-between flex items-center gap-x-2 py-2 px-4 text-xs
                             text-slate-700 hover:bg-slate-100">
                                    <Link href={x.url} target="_blank">
                                        <p className='text-xs'>{x.name}</p>
                                    </Link>
                                    <VscArchive className='self-center flex scale-110 cursor-pointer font-medium text-blue-900 drop-shadow-lg'
                                        onClick={() => deletefiles(x.name)} />
                                </li>
                            )
                        })}
                    </ul>

                </div>


                <div className='focus:outline-0 p-1 shrink'>
                    <FileUploader handleChange={handleChange} name="file" types={fileTypes}
                     classes='dnd'/>
                </div>
            </div>
        </Modal>
    )
}

export default DataModal;

