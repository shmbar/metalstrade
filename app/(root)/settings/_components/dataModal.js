import Modal from '../../../../components/modal';
import UserData from './userData';


const DataModal = ({ isOpen, setIsOpen, title, data, setData, user, setUser, Delete }) => {
    // lg, not sm: the form is now two columns — identity and role on the left,
    // the page-permission checklist on the right.
    return (
        <Modal isOpen={isOpen} setIsOpen={setIsOpen} title={title} size='lg' >
            <UserData setIsOpen={setIsOpen} data={data} setData={setData} 
            user={user} setUser={setUser} />
        </Modal>
    )
}

export default DataModal;
