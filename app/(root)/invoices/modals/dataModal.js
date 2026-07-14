import Modal from '../../../../components/modal.js'
import Invoice from './invoiceDetails'

const DataModal = ({ isOpen, setIsOpen, title }) => {
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title} w='max-w-5xl'>
            {/* Client request: the invoice popup was too big — zoom scales the editor to
                80% (≈30% less area) and the panel width shrinks to match. */}
            <div style={{ zoom: 0.88 }}>
                <Invoice />
            </div>
        </Modal>
    )
}

export default DataModal;
