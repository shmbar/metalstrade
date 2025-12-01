import Modal from '@components/modal.js'
import Invoice from './invoiceDetails'

const DataModal = ({ isOpen, setIsOpen, title }) => {
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title} >
           <Invoice />
        </Modal>
    )
}

export default DataModal;