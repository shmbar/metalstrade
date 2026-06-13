import { useEffect, useState, useContext } from 'react'
import Modal from '../../../../components/modal.js'
import { uploadFile, getAllfiles, deleteFile } from '../../../../utils/utils'
import Link from 'next/link'
import { VscArchive } from 'react-icons/vsc'
import { FileUploader } from "react-drag-drop-files"
import { SettingsContext } from "../../../../contexts/useSettingsContext"
import { getTtl } from '../../../../utils/languages'

const fileTypes = ['XLSX', 'PDF', 'PNG', 'JPG', 'JPEG']

// Attachments for an expense invoice. Files are stored in a folder keyed by the
// expense id when the expense is saved (so they follow it when it's linked to a
// sales invoice), or in a shared "generalExpenses" folder for unsaved entries.
const ExpenseFilesModal = ({ isOpen, setIsOpen, folderId, setToast }) => {

    const [list, setList] = useState([])
    const { ln } = useContext(SettingsContext)
    const isGeneral = !folderId || folderId === 'generalExpenses'
    const folder = folderId || 'generalExpenses'

    const handleChange = async (file) => {
        await uploadFile(folder, file, setList)
        setToast?.({ show: true, text: 'Attachment successfully uploaded!', clr: 'success' })
    }

    useEffect(() => {
        const loadList = async () => {
            const arr = await getAllfiles(folder)
            setList(arr)
        }
        loadList()
    }, [folder])

    const deletefiles = (name) => {
        setList(list.filter(x => x.name !== name))
        deleteFile(folder, name)
        setToast?.({ show: true, text: 'Attachment successfully deleted!', clr: 'success' })
    }

    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={getTtl('Expense files', ln)} w='max-w-3xl'>
            <div className='px-2 pt-1'>
                <p className='responsiveTextTable text-[var(--regent-gray)]'>
                    {isGeneral
                        ? 'Uploading to the general expenses folder. Save the expense first to keep files attached to this specific record.'
                        : 'Files are attached to this expense and stay with it when it is linked to a sales invoice.'}
                </p>
            </div>
            <div className='flex flex-wrap p-2 justify-between gap-2'>
                <div className='max-w-md grow'>
                    <ul className="flex flex-col mt-1 max-w-md overflow-auto max-h-80 rounded-2xl divide-y border border-[#b8ddf8]">
                        {list.map((x, i) => (
                            <li key={i} className="justify-between flex items-center gap-x-2 py-2 px-4 responsiveTextTable text-[var(--port-gore)] hover:bg-[#f4f9ff]">
                                <Link href={x.url} target="_blank">
                                    <p className='responsiveTextTable'>{x.name}</p>
                                </Link>
                                <VscArchive className='self-center flex scale-110 cursor-pointer font-medium text-blue-900 drop-shadow-lg'
                                    onClick={() => deletefiles(x.name)} />
                            </li>
                        ))}
                        {list.length === 0 && (
                            <li className='py-3 px-4 responsiveTextTable text-[var(--regent-gray)] text-center'>No files yet</li>
                        )}
                    </ul>
                </div>

                <div className='focus:outline-0 p-1 shrink'>
                    <FileUploader handleChange={handleChange} name="file" types={fileTypes} classes='dnd' />
                </div>
            </div>
        </Modal>
    )
}

export default ExpenseFilesModal
