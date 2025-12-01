import { UserAuth } from '@contexts/useAuthContext';
import React, { useContext, useEffect, useState, useTransition } from 'react'
import { VscSaveAs } from 'react-icons/vsc';
import CBox from '@components/combobox.js'
import { ErrDiv, validate } from '@utils/utils';
import { getTtl } from '@utils/languages';
import { SettingsContext } from '@contexts/useSettingsContext';
import { createNewUser, updateUser } from '@actions/pass';
import { checkEmail, checkName, checkPassLenght, checkPassMatch } from '@actions/validations';
import CheckBox from '@components/checkbox';
import { Titles } from '@components/const';




const UserD = ({ title, type, placeholder, name, value, onChange, errors, ln, dis }) => {

    return (
        <div className='flex gap-4 justify-between  my-3 w-full'>
            <p className='flex text-sm font-medium whitespace-nowrap pt-1'>{title}:</p>
            <div className='w-full '>
                <input
                    className="input text-[12px] shadow-lg h-7"
                    type={type}
                    name={name}
                    value={value[name] || ''}  // Dynamically bind value
                    onChange={onChange}  // Trigger the passed onChange function
                    placeholder={placeholder}
                    disabled={dis}
                />
                {name !== 'phoneNumber' && <ErrDiv field={name} errors={errors} ln={ln} />}
            </div>
        </div>
    );
};

const USerDSelect = ({ data, value, setValue, name, errors, ln }) => {

    return (
        <div className='flex gap-4 justify-between'>
            <p className='flex items-center text-sm font-medium whitespace-nowrap'>Title:</p>
            <div className='w-full'>
                <CBox data={data} setValue={setValue} value={value} name={name}
                />

                <ErrDiv field={name} errors={errors} ln={ln} />
            </div>
        </div>
    )
}

const UserData = ({ setIsOpen, data, setData, user, setUser }) => {

    const { uidCollection } = UserAuth();
    const [isPending, startTransition] = useTransition();
    const [errors, setErrors] = useState({})
    const { setToast, setLoading, ln } = useContext(SettingsContext);
    const [checked, setChecked] = useState(false)

    const handleChange = (e) => {
        setUser((prevUser) => ({
            ...prevUser,
            [e.target.name]: e.target.value,
        }));
    };

    useEffect(() => {
        if (user.uid === '') { //new user
            setChecked(true)
        } else {
            setChecked(false)
        }
    }, [])

    const SaveUser = () => {

        startTransition(() => {
            const runSave = async () => {
                setLoading(true)

                let errs = checked ? validate(user, ['displayName', 'email', 'password', 'password1', 'title']) :
                    validate(user, ['displayName', 'email', 'title'])
                setErrors(errs)

                const isNotFilled = Object.values(errs).includes(true); //all filled

                if (isNotFilled) {
                    setToast({ show: true, text: 'Some fields are missing!', clr: 'fail' })
                    setLoading(false)
                    return false;
                }

                if (checkName(user)) {
                    setToast({ show: true, text: 'Name must be more than two letters!', clr: 'fail' })
                    setLoading(false)
                    return false;
                }

                if (checkEmail(user)) {
                    setToast({ show: true, text: 'Wrong email address!', clr: 'fail' })
                    setLoading(false)
                    return false;
                }

                if (checked) {
                    if (checkPassLenght(user)) {
                        setToast({ show: true, text: 'Password must be more at least 6 letters!', clr: 'fail' })
                        setLoading(false)
                        return false;
                    }
                    if (checkPassMatch(user)) {
                        setToast({ show: true, text: 'The verification password doesn`t match the password!', clr: 'fail' })
                        setLoading(false)
                        return false;
                    }
                }

                let us = {
                    ...user, title: Titles.find(z => z.id === user.title).title
                }
                if (!checked) {
                    delete us.password
                }

                if (us.uid === '') { //new User
                    let result = await createNewUser({ ...us, uidCollection: uidCollection })
                    if (result === 'success') {
                        setToast({ show: true, text: 'User is successfully added!', clr: 'success' })
                        setData([...data, us])
                    } else {
                        setToast({ show: true, text: 'Something went wrong!', clr: 'fail' })
                    }
                } else {
                    let result = await updateUser({ ...us, uidCollection: uidCollection })

                    if (result === 'success') {
                        setToast({ show: true, text: 'User is successfully updated!', clr: 'success' })
                        setData(data.map(z => z.uid === us.uid ? us : z))
                    } else {
                        setToast({
                            show: true,
                            text: result?.error?.code.split("auth/")[1] + ": " + result?.error?.message,
                            clr: 'fail'
                        })
                    }
                }

                setIsOpen(false)
                setLoading(false)
            }

            runSave()
        });

    }

    return (
        <div className='p-4 '>
            <UserD
                title='Name'
                name='displayName'
                placeholder='User Name'
                value={user}   // Pass the value dynamically
                onChange={handleChange}  // Pass the memoized handleChange
                errors={errors}
                ln={ln}
            />
            <UserD title='Phone Number' value={user} onChange={handleChange}
                placeholder='Phone Number' name='phoneNumber' />
            <UserD title='Email' value={user} onChange={handleChange}
                placeholder='Email Address' name='email' errors={errors} ln={ln} />

            <div className='flex gap-3 items-center'>
                <UserD title='Password' value={user} onChange={handleChange} type='password'
                    placeholder='Password' name='password' errors={errors} ln={ln}
                    dis={!checked} />
                <CheckBox size='size-5' checked={checked} onChange={() => setChecked(!checked)} />
            </div>

            <UserD title='Password Verification' value={user} onChange={handleChange} type='password'
                placeholder='Repeat Password' name='password1' errors={errors} ln={ln}
                dis={!checked} />


            <USerDSelect
                data={Titles}
                setValue={setUser}
                value={user}
                name='title'
                errors={errors} ln={ln}
            />


            <div className={`pt-2 text-lg font-medium leading-5 text-gray-900 flex gap-4 flex-wrap justify-center md:justify-start
                ${isPending ? 'opacity-50' : ''}`}>
                <button
                    type="button"
                    className="blackButton"
                    onClick={SaveUser}
                    disabled={isPending}

                >
                    <VscSaveAs className='scale-110' />
                    Save
                </button>
            </div>
        </div>
    )
}

export default UserData