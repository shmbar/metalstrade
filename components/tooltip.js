
const Tooltip = ({txt}) => {
  return (
    <span className="absolute hidden group-hover:flex -top-2 w-fit px-1.5
				 py-1 bg-slate-500 rounded-md text-center text-white text-xs">
						{txt}</span>
  )
}

export default Tooltip;