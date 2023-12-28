import { UserAuth } from "@contexts/useAuthContext";
import { useRouter } from "next/navigation";
import { BiLogOutCircle } from 'react-icons/bi';


const SignOut = () => {

    const router = useRouter()
    const { SignOut } = UserAuth();

    const LogOut = async () => {
        router.push("/");
        await SignOut();
    }

    return (
        <div className='justify-end hidden md:flex mt-3 '>
            <button className='gap-2 px-3 py-1 border border-slate-300 rounded-lg text-slate-600 shadow-sm flex items-center'
                onClick={LogOut}
            >
                <BiLogOutCircle />
                Logout
            </button>
        </div>
    );
};

export default SignOut;