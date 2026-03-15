import { getTtl } from '../utils/languages';
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom';
import { BsThreeDotsVertical } from 'react-icons/bs';

export default function Example({ isSelection, selectOrEdit, indx, ln }) {
    const btnRef = useRef(null)
    const menuRef = useRef(null)
    const [open, setOpen] = useState(false)
    const [pos, setPos] = useState({ top: 0, left: 0 })

    const handleOpen = () => {
        if (btnRef.current) {
            const rect = btnRef.current.getBoundingClientRect()
            setPos({
                top: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
            })
        }
        setOpen(true)
    }

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target) &&
                btnRef.current && !btnRef.current.contains(e.target)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [open])

    const itemCls = (active, disabled) =>
        `group flex w-full items-center rounded-md px-3 py-2 text-xs whitespace-nowrap
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${active && !disabled ? 'bg-[#dbeeff] text-[var(--endeavour)]' : 'text-[var(--port-gore)]'}`

    return (
        <div>
            <button ref={btnRef} onClick={handleOpen} type="button">
                <BsThreeDotsVertical className='scale-125 font-medium' />
            </button>

            {open && typeof window !== 'undefined' && createPortal(
                <div
                    ref={menuRef}
                    style={{ position: 'absolute', top: pos.top + 4, left: pos.left, zIndex: 9999 }}
                    className="divide-y divide-[#dbeeff] rounded-xl bg-white shadow-lg border border-[#dbeeff] min-w-[160px]"
                >
                    <div className="px-1 py-1">
                        <button
                            className={itemCls(false, !isSelection)}
                            disabled={!isSelection}
                            onMouseEnter={e => !(!isSelection) && e.currentTarget.classList.add('bg-[#dbeeff]', 'text-[var(--endeavour)]')}
                            onMouseLeave={e => e.currentTarget.classList.remove('bg-[#dbeeff]', 'text-[var(--endeavour)]')}
                            onClick={() => { selectOrEdit('edit', indx); setOpen(false) }}
                        >
                            {getTtl('Edit Description', ln)}
                        </button>
                        <button
                            className={itemCls(false, isSelection)}
                            disabled={isSelection}
                            onMouseEnter={e => !(isSelection) && e.currentTarget.classList.add('bg-[#dbeeff]', 'text-[var(--endeavour)]')}
                            onMouseLeave={e => e.currentTarget.classList.remove('bg-[#dbeeff]', 'text-[var(--endeavour)]')}
                            onClick={() => { selectOrEdit('select', indx); setOpen(false) }}
                        >
                            {getTtl('Original Description', ln)}
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
