'use client'
import { useEffect, useState } from 'react'
import { useRouter } from "next/navigation";
import Spinner from '@components/spinner';

const BackToLoginPage = () => {

    const [timer, setTimer] = useState(7)
    const router = useRouter();

    useEffect(() => {
        if (timer > 0) {
            const countdownInterval = setInterval(() => {
                setTimer(prevTimer => prevTimer - 1);
            }, /*1000*/0); // 1000 milliseconds = 1 second

            return () => {
                clearInterval(countdownInterval);
            };
        } else {
            router.push("/");
        }
    }, [timer]);


    return (
        <div className='w-full text-center mt-10'>
            <Spinner />
         {/*   <div>You must login to see this page.</div>
            <div>{`You will be redirected to login page in: ${timer} seconds`}</div>
    */}
        </div>

    )
}

export default BackToLoginPage;