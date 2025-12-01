import Modal from '@components/modal.js'
import Expense from './expenses'

const DataModal = ({ isOpen, setIsOpen, title}) => {
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title} w='max-w-3xl'>
            <Expense/>
        </Modal>
    )
}

export default DataModal;