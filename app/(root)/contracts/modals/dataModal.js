import Modal from '@components/modal.js'
import Tabs from './tabs/tabs'

const DataModal = ({ isOpen, setIsOpen, title }) => {
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title} >
            <Tabs />
        </Modal>
    )
}

export default DataModal;