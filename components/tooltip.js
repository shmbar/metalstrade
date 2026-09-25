/* The hover hint that sits next to a picker inside a `relative group` wrapper.
   `bottom-full` parks it clear above that wrapper — `-top-3` used to land it
   halfway down the control it was describing — and pointer-events-none keeps it
   from becoming the click target for whatever it covers. Drawn as the same pill as
   every other tooltip (components/ui/tooltip.tsx, components/GlobalTooltip.js). */
const Tooltip = ({txt}) => {
  return (
    <span className="tooltip-pill absolute hidden group-hover:flex bottom-full mb-2 z-tooltip pointer-events-none w-fit text-center whitespace-nowrap">
      {txt}</span>
  )
}

export default Tooltip;
