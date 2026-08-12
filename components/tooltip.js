
const Tooltip = ({txt}) => {
  return (
    <span className="absolute hidden group-hover:flex -top-3 w-fit px-2 py-1 bg-[var(--tooltip-bg)] border border-[var(--tooltip-border)] rounded-lg text-center text-[var(--tooltip-ink)] responsiveTextInput whitespace-nowrap shadow-sm">
      {txt}</span>
  )
}

export default Tooltip;
