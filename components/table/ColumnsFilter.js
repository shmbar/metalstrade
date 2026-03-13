"use client"
import Image from 'next/image';
import ChkBox from '../../components/checkbox.js'
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Tooltip from '../../components/tooltip';
import { useContext } from 'react';
import { SettingsContext } from "../../contexts/useSettingsContext";
import { getTtl } from '../../utils/languages';
import Tltip from '../../components/tlTip';


const ColFilter = ({ table }) => {

	const [open, setOpen] = useState(false)
	const { ln } = useContext(SettingsContext);
	const portalNodeRef = useRef(null)
	const triggerRef = useRef(null)
    const dropdownRef = useRef(null)
    const [dropdownStyle, setDropdownStyle] = useState({ position: 'absolute', top: 0, left: 0 })

	useEffect(() => {
		// create portal node
		const node = document.createElement('div')
		node.setAttribute('id', 'columns-filter-portal')
		portalNodeRef.current = node
		document.body.appendChild(node)
		return () => {
			const node = portalNodeRef.current
			if (node) {
				if (node.parentNode) node.parentNode.removeChild(node)
				portalNodeRef.current = null
			}
		}
	}, [])

	useEffect(() => {
		if (!open) return;
		const updatePos = () => {
			const trig = triggerRef.current;
			const dd = dropdownRef.current;
			if (!trig || !dd) return;
			const rect = trig.getBoundingClientRect();
			const ddWidth = dd.offsetWidth || 288; // w-72 => 288px
			const ddHeight = dd.offsetHeight || 300;
			const margin = 12; // larger margin for desktop
			const desktopOffset = 16; // space between trigger and dropdown on desktop

			const isDesktop = window.innerWidth >= 768; // md breakpoint
			if (isDesktop) {
				// Use fixed positioning to escape any overflow:hidden containers
				let top = rect.bottom + 8;
				let left = rect.right - ddWidth;
				
				// Keep within viewport
				if (left < margin) left = margin;
				if (left + ddWidth > window.innerWidth - margin) {
					left = window.innerWidth - ddWidth - margin;
				}

				// If dropdown would go below viewport, show above trigger
				if (top + ddHeight > window.innerHeight - margin) {
					top = rect.top - ddHeight - 8;
					if (top < margin) top = margin;
				}

				setDropdownStyle({ position: 'fixed', top: Math.round(top) + 'px', left: Math.round(left) + 'px', zIndex: 999999, minWidth: ddWidth + 'px' });
			} else {
				// Mobile/tablet: fallback to fixed top/right like before
				const topFixed = 64; // matches previous top-16 (64px)
				setDropdownStyle({ position: 'fixed', top: topFixed + 'px', right: '16px', zIndex: 999999, minWidth: ddWidth + 'px' });
			}
		}

		// measure after render
		const raf = requestAnimationFrame(updatePos);
		const onResize = () => requestAnimationFrame(updatePos);
		window.addEventListener('resize', onResize);
		window.addEventListener('scroll', onResize, true);

		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener('resize', onResize);
			window.removeEventListener('scroll', onResize, true);
		}
	}, [open])

	const DropdownContent = (
		<div ref={dropdownRef} style={dropdownStyle} className="w-64 rounded-2xl shadow-xl border border-[#dbeeff] overflow-hidden" aria-hidden={open ? 'false' : 'true'}>
			<div className='py-2 px-4 text-sm font-semibold' style={{ background: '#dbeeff', color: 'var(--chathams-blue)' }}>{getTtl('Columns', ln)}</div>
			<div className='overflow-y-auto bg-white' style={{ maxHeight: '60vh', scrollbarWidth: 'thin', scrollbarColor: '#9fb8d4 #ebf2fc' }}>
				<style>{`#columns-filter-portal ::-webkit-scrollbar { width: 6px; } #columns-filter-portal ::-webkit-scrollbar-track { background: #ebf2fc; } #columns-filter-portal ::-webkit-scrollbar-thumb { background: #9fb8d4; border-radius: 6px; }`}</style>
				{table.getAllColumns().filter(column => column.getCanHide()).map(col => (
					<div key={col.id}
						onClick={col.columnDef.accessorKey !== 'expander' ? col.getToggleVisibilityHandler() : () => { }}
						className='whitespace-nowrap text-left py-1.5 items-center flex w-full px-3 cursor-pointer transition-colors hover:bg-[#ebf2fc]'>
						<ChkBox checked={col.getIsVisible()} size='h-4 w-4'
							onChange={col.columnDef.accessorKey !== 'expander' ? col.getToggleVisibilityHandler() : () => { }} />
						<span className='ml-2 text-xs' style={{ color: 'var(--chathams-blue)' }}>{col.columnDef.header}</span>
					</div>
				))}
			</div>
		</div>
	)

	return (
		<div className="relative">
			   <Tltip direction='bottom' tltpText={getTtl('Columns', ln)}>
  <div
    ref={triggerRef}
    onClick={() => setOpen(!open)}
    className="justify-center w-8 h-8 inline-flex items-center text-sm rounded focus:outline-none cursor-pointer"
  >
    <Image src="/logo/colums.svg" alt="Columns" width={16} height={16} className="w-4 h-4 object-cover inline-block align-middle" priority />
  </div>
</Tltip>

			{open && portalNodeRef.current ? createPortal(
				<>
					<div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 999998, background: 'transparent' }} onClick={() => setOpen(false)} />
					{DropdownContent}
				</>,
				portalNodeRef.current
			) : null}
		</div>

	);

};

export default ColFilter;
