
/* The hover hint that sits next to a picker inside a `relative group` wrapper.
   `bottom-full` parks it clear above that wrapper — `-top-3` used to land it
   halfway down the control it was describing — and pointer-events-none keeps it
   from becoming the click target for whatever it covers. */
const Tooltip = ({txt}) => {
  return (
    <span className="absolute hidden group-hover:flex bottom-full mb-1 z-tooltip pointer-events-none w-fit px-2 py-1 bg-[var(--tooltip-bg)] border border-[var(--tooltip-border)] rounded-lg text-center text-[var(--tooltip-ink)] responsiveTextInput whitespace-nowrap shadow-sm">
      {txt}</span>
  )
}

export default Tooltip;
