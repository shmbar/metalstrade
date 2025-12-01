import { HiChevronLeft } from 'react-icons/hi';
import { HiChevronRight } from 'react-icons/hi';
import { HiChevronDoubleRight } from 'react-icons/hi';
import { HiChevronDoubleLeft } from 'react-icons/hi';

const Paginator = ({ paginationPage, numPages, setPage, seLeftFirst, reduceLeft, increaseRight, setRightLast }) => {
let arr=0

if(numPages<=5){
	arr=[...Array(numPages)].map((_, index) => index + 1)
}else if(paginationPage===1){
	arr=[1,2,3,'...',numPages]
}else if((numPages-paginationPage)>2){
	arr=[paginationPage-1,paginationPage,paginationPage+1,'...',numPages]
}else if((numPages-paginationPage)<=2 && numPages>paginationPage){
	arr=[1,'...',paginationPage-1,paginationPage,paginationPage+1]
}else if(paginationPage===numPages){
	arr=[1,'...',paginationPage-2,paginationPage-1,numPages]
}
	return (
		<div className="py-1 px-1 md:px-4 self-center">
			<nav className="flex items-center space-x-2">
				<div className="inline-flex items-center gap-2"	>
					<HiChevronDoubleLeft className='paginator_arrow' onClick={seLeftFirst} />
					<HiChevronLeft className='paginator_arrow' onClick={reduceLeft} />
				</div>
				{/*[...Array(numPages)].map((_, index) => index + 1)*/arr.map((x, i) => {
					return (
						<button
							key={i}
							onClick={() => x!=='...' && setPage(x)}
							className={` ${paginationPage === x ? 'bg-slate-400 text-white' : 'text-gray-400'
								} ${paginationPage !== x ? 'hover:bg-slate-200' : null}
											justify-center  w-8 h-8 inline-flex items-center text-sm rounded-full`}
						>
							{x}
						</button>
					);
				})}
				<div className="inline-flex items-center gap-2"	>
					<HiChevronRight className='paginator_arrow' onClick={increaseRight} />
					<HiChevronDoubleRight className='paginator_arrow' onClick={setRightLast} />
				</div>
			</nav>
		</div>
	);
};
export default Paginator;