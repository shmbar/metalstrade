
const CheckBox=({size, checked,  onChange})=>{

	return(
		<input type="checkbox"  checked={checked} onChange={onChange}
			className={`checkbox ${size} border cursor-pointer
			appearance-none rounded-lg border-[var(--line-strong)] shrink-0
			`}	
			/>
	)
}

export default CheckBox;
