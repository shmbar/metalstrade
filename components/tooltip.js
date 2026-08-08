
const Tooltip = ({txt}) => {
  return (
    <span className="absolute hidden group-hover:flex -top-3 w-fit px-2 py-1 bg-[var(--bg-subtle)] border border-[var(--line)] rounded-lg text-center text-[var(--chathams-blue)] responsiveTextInput whitespace-nowrap shadow-sm">
      {txt}</span>
  )
}

export default Tooltip;
