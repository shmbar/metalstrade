import Modal from '@components/modal.js'
import UserData from './userData';


const DataModal = ({ isOpen, setIsOpen, title, data, setData, user, setUser }) => {
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title} w='max-w-sm' >
            <UserData setIsOpen={setIsOpen} data={data} setData={setData} 
            user={user} setUser={setUser}/>
        </Modal>
    )
}

export default DataModal;