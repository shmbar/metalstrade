import Modal from '@components/modal.js'
import Tabs from './tabs/tabs'

const DataModal = ({ isOpen, setIsOpen, title }) => {
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title} w='max-w-5xl'>
            {/* Client request: the contract/invoice popup was too big — zoom scales the
                whole editor to 80% (≈30% less area) and the panel width shrinks to match.
                Portalled popovers (selects, datepickers) position off visual rects, so
                they stay aligned. */}
            <div style={{ zoom: 0.8 }}>
                <Tabs />
            </div>
        </Modal>
    )
}

export default DataModal;