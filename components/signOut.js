import { useContext } from "react";
import { UserAuth } from "@contexts/useAuthContext";
import { useRouter } from "next/navigation";
import { BiLogOutCircle } from 'react-icons/bi';
import { SettingsContext } from "@contexts/useSettingsContext";
import { getTtl } from "@utils/languages";


const SignOut = () => {

    const router = useRouter()
    const { SignOut } = UserAuth();
    const { compData } = useContext(SettingsContext);
    const ln = compData.lng


    const LogOut = async () => {
        router.push("/");
        await SignOut();
    }

    return (
            <button className='gap-2 px-3 py-1 border border-slate-300 rounded-lg text-slate-600 shadow-sm flex items-center
            text-sm hover:bg-slate-200'
                onClick={LogOut}
            >
                <BiLogOutCircle />
                {getTtl('Logout', ln) }
            </button>
    );
};

export default SignOut;