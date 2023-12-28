
const Tooltip = ({txt}) => {
  return (
    <span className="absolute hidden group-hover:flex top-12  w-fit px-1
				 py-1 bg-slate-500 rounded-md text-center text-white text-xs">
						{txt}</span>
  )
}

export default Tooltip;