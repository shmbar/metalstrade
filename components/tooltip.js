
const Tooltip = ({txt}) => {
  return (
    <span className="absolute hidden group-hover:flex -top-3 w-fit px-2 py-1 bg-[var(--surface-header)] border border-[var(--border-divider)] rounded-lg text-center text-[var(--chathams-blue)] text-xs whitespace-nowrap shadow-sm">
      {txt}</span>
  )
}

export default Tooltip;
