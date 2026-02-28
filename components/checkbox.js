
const CheckBox=({size, checked,  onChange})=>{

	return(
		<input type="checkbox"  checked={checked} onChange={onChange}
			className={`checkbox ${size} border cursor-pointer
			appearance-none rounded-lg border-[#cecece] shrink-0
			`}	
			/>
	)
}

export default CheckBox;
