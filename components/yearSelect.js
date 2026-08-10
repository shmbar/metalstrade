import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react'

/* Styled to match the control band the rest of the app uses (h-8, 10px corners,
   --line-strong outline, ink text). It was the last pill-shaped control left:
   a brand-coloured border and rounded-full button, with a rounded-full dropdown
   panel to match — which is why it stood out beside the margin-alert input next
   to it. Its cashflow twin was updated during the redesign; this one was missed. */
const YearSelect = ({yr, setYr}) => {

    const currentYear = new Date().getFullYear();
    const yrArr = Array.from({ length: 5 }, (_, i) => currentYear - 3 + i);

    return (
        <Menu>
            <MenuButton className='h-8 border border-[var(--line-strong)] rounded-control px-3 text-[var(--ink)] responsiveTextInput hover:border-[var(--brand-border)] transition-colors'>{yr}</MenuButton>
            <MenuItems anchor="bottom" className='z-dropdown border border-[var(--line)] rounded-2xl p-2 mt-1 bg-[var(--bg-card)]' style={{ boxShadow: 'var(--shadow-md)' }}>
                {yrArr.map(z => {
                    return (
                        <MenuItem key={z} >
                            <button className={`hover:bg-[var(--bg-subtle)] flex w-full items-center gap-2 rounded-lg py-1 my-0.5 px-2 responsiveTextInput transition-colors
                            ${yr === z ? 'bg-[var(--brand-soft)] text-[var(--brand-strong)] font-semibold' : 'text-[var(--ink)]'}`}
                                onClick={() => setYr(z)}>
                                {z}
                            </button>
                        </MenuItem>
                    )
                })
                }
            </MenuItems>
        </Menu>
    )
}

export default YearSelect;
