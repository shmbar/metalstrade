import Modal from '@components/modal.js'
import SalesContractDetails from './salesContractDetails'

const DataModal = ({ isOpen, setIsOpen, title }) => {
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title}>
            <SalesContractDetails />
        </Modal>
    )
}

export default DataModal;
