
const CheckBox=({size, checked,  onChange})=>{

	return(
		<input type="checkbox"  checked={checked} onChange={onChange}
			className={`checkbox ${size} border cursor-pointer
			appearance-none rounded-md border-slate-600 border-opacity-50 shrink-0
			`}	
			/>
	)
}

export default CheckBox;