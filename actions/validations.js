
export const checkName = (user) => {
    return user.displayName.length < 3
}

export const checkEmail = (user) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return !emailRegex.test(user.email)
}

export const checkPassLenght = (user) => {
    return user.password.length < 6
}

export const checkPassMatch = (user) => {
    return user.password !== user.password1
}

export const completeUserEmail = (userName) => {

    return userName.includes('@') ? userName :
        userName === 'isims' ? 'isims@is.is' :
            userName === 'isgis' ? 'isgis@is.is' :
                userName.slice(-3) === 'ims' ? userName + '@ims-metals.com' : userName + '@gismetals.com'
}