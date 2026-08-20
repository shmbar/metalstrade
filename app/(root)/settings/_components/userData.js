import { UserAuth } from '../../../../contexts/useAuthContext';
import React, { useContext, useEffect, useState, useTransition, useMemo } from 'react'
import { ErrDiv, validate } from '../../../../utils/utils';
import { SettingsContext } from '../../../../contexts/useSettingsContext';
import { createNewUser, updateUser } from '../../../../actions/pass';
import { checkEmail, checkName, checkPassLenght, checkPassMatch } from '../../../../actions/validations';
import CheckBox from '../../../../components/checkbox';
import PagePermissions from './pagePermissions';
import { assignableRoles, defaultPagesForRole } from '../../../../utils/permissions';
import { Button } from '@components/ui/button';
import { Save, ShieldCheck } from 'lucide-react';



const UserD = ({ title, type, placeholder, name, value, onChange, errors, ln, dis, }) => {

    return (
        <div className='flex gap-4 justify-between my-3 w-full'>
            <p className='flex responsiveText font-medium whitespace-nowrap pt-1 responsiveTextInput shrink-0'>{title}:</p>
            <div className='flex-1'>
                <input
                    className="input shadow-lg responsiveTextInput w-full"
                    type={type}
                    name={name}
                    value={value[name] || ''}  // Dynamically bind value
                    onChange={onChange}  // Trigger the passed onChange function
                    placeholder={placeholder}
                    disabled={dis}
                />
                {errors && <ErrDiv field={name} errors={errors} ln={ln} />}
            </div>
        </div>
    );
};

// Roles are radio-like cards rather than a dropdown: the whole point of this
// screen is comparing what each level means, and a closed <select> hides that.
const RolePicker = ({ roles, value, onChange, disabled }) => (
    <div className='flex flex-col gap-1.5'>
        <p className='responsiveTextInput font-semibold'>Role</p>
        {roles.map((r) => {
            const selected = r.key === value;
            return (
                <button
                    key={r.key}
                    type='button'
                    disabled={disabled}
                    onClick={() => onChange(r.key)}
                    className={`text-left rounded-control border px-3 py-2 transition-colors
                        ${selected
                            ? 'border-[var(--brand)] bg-[var(--brand-soft)]'
                            : 'border-[var(--line)] bg-[var(--bg-card)] hover:border-[var(--line-strong)]'}
                        ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                    <span className={`flex items-center gap-1.5 responsiveTextInput ${selected ? 'font-semibold text-[var(--brand)]' : 'font-medium'}`}>
                        {r.key === 'superadmin' && <ShieldCheck size={14} />}
                        {r.label}
                    </span>
                    <span className='block responsiveText text-[var(--ink-muted)] mt-0.5'>{r.blurb}</span>
                </button>
            );
        })}
    </div>
);

const UserData = ({ setIsOpen, data, setData, user, setUser }) => {

    const { claims, user: me, getIdToken, refreshAccess } = UserAuth();
    const [isPending, startTransition] = useTransition();
    const [errors, setErrors] = useState({})
    const { setToast, setLoading, ln } = useContext(SettingsContext);
    const [checked, setChecked] = useState(false)

    const isNew = !user.uid;

    // Only offer roles the signed-in admin actually outranks, so the form can't
    // even express "Admin promotes someone to Super Admin".
    const roles = useMemo(
        () => assignableRoles(claims || {}, me?.uid || ''),
        [claims, me]
    );

    const handleChange = (e) => {
        setUser((prevUser) => ({
            ...prevUser,
            [e.target.name]: e.target.value,
        }));
    };

    // Switching role re-baselines the page list to that role's default. Keeping
    // the old ticks would silently leave, say, a demoted Admin holding Margins.
    const changeRole = (role) => {
        setUser((prev) => ({ ...prev, role, pages: [...defaultPagesForRole(role)] }));
    };

    const setPages = (pages) => setUser((prev) => ({ ...prev, pages }));

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

                let errs = checked ? validate(user, ['displayName', 'email', 'password', 'password1', 'role']) :
                    validate(user, ['displayName', 'email', 'role'])
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

                // The server re-checks all of this against the token; sending it is
                // what lets the server know who is asking in the first place.
                const idToken = await getIdToken();
                if (!idToken) {
                    setToast({ show: true, text: 'Your session expired. Please sign in again.', clr: 'fail' })
                    setLoading(false)
                    return false;
                }

                const payload = {
                    idToken,
                    uid: user.uid,
                    email: user.email,
                    displayName: user.displayName,
                    phoneNumber: user.phoneNumber,
                    role: user.role,
                    pages: user.pages,
                };
                if (checked && user.password) payload.password = user.password;

                const result = isNew
                    ? await createNewUser(payload)
                    : await updateUser(payload);

                if (result?.error) {
                    setToast({ show: true, text: result.error.message, clr: 'fail' })
                    setLoading(false)
                    return false;
                }

                const saved = {
                    ...user,
                    uid: result.uid,
                    role: result.role,
                    title: result.title,
                    pages: user.pages,
                    customPages: Array.isArray(result.pages),
                    password: '',
                    password1: '',
                };

                setToast({
                    show: true,
                    text: isNew ? 'User is successfully added!' : 'User is successfully updated!',
                    clr: 'success',
                })
                setData(isNew ? [...data, saved] : data.map(z => z.uid === saved.uid ? { ...z, ...saved } : z))

                // If the admin edited their own workspace access indirectly, pull a
                // fresh token so the nav reflects reality without a reload.
                refreshAccess?.();

                setIsOpen(false)
                setLoading(false)
            }

            runSave()
        });

    }

    const roleLocked = roles.length === 0;

    return (
        <div className='p-4 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2'>

            {/* ── Identity ─────────────────────────────────────────────── */}
            <div>
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

                <div className='flex gap-3 items-center w-full'>
                    <div className='flex-1'>
                        <UserD title='Password' value={user} onChange={handleChange} type='password'
                            placeholder='Password' name='password' errors={errors} ln={ln}
                            dis={!checked} />
                    </div>
                    <CheckBox size='size-5' checked={checked} onChange={() => setChecked(!checked)} />
                </div>

                <div className='flex gap-4 justify-between my-3 w-full'>
                    <p className='flex responsiveText font-medium whitespace-nowrap pt-1 responsiveTextInput shrink-0'>Password Verification:</p>
                    <div className='flex-1'>
                        <input
                            className="input shadow-lg responsiveTextInput w-full"
                            type='password'
                            name='password1'
                            value={user.password1 || ''}
                            onChange={handleChange}
                            placeholder='Repeat Password'
                            disabled={!checked}
                        />
                        <ErrDiv field='password1' errors={errors} ln={ln} />
                    </div>
                </div>

                <RolePicker roles={roles} value={user.role} onChange={changeRole} disabled={roleLocked} />
                <ErrDiv field='role' errors={errors} ln={ln} />
                {roleLocked && (
                    <p className='responsiveText text-[var(--ink-muted)] mt-1'>
                        You do not have permission to change this member&apos;s role.
                    </p>
                )}
            </div>

            {/* ── Access ───────────────────────────────────────────────── */}
            <div className='flex flex-col gap-3'>
                <PagePermissions role={user.role} pages={user.pages} setPages={setPages} />
            </div>

            <div className={`col-span-full pt-4 responsiveText font-medium leading-5 text-[var(--port-gore)] flex gap-4 flex-wrap justify-center md:justify-start
                ${isPending ? 'opacity-70' : ''}`}>

                <Button onClick={SaveUser}
                    disabled={isPending}
                    variant='customBlue'>
                    <Save />Save
                </Button>

            </div>
        </div>
    )
}

export default UserData
