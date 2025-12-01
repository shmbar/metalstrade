'use server'

import admin from 'firebase-admin'
import serviceAccount from '@/utils/skey.json'
const { getAuth } = require('firebase-admin/auth');


if (admin.apps.length === 0) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    })
}

/****************************** */
export async function createNewUser(obj) {

    return await getAuth().createUser({
        email: obj.email,
        emailVerified: true,
        password: obj.password,
        displayName: obj.displayName,
        photoURL: 'http://www.example.com/12345678/photo.png',
        disabled: false,
    })
        .then(async (userRecord) => {
            // See the UserRecord reference doc for the contents of userRecord.

            //Set Uidcollction
            await getAuth()
                .setCustomUserClaims(userRecord.uid, {
                    uidCollection: obj.uidCollection,
                    title: obj.title
                })
                .then(() => {
                    console.log('Successfully created new user:', userRecord.uid);
                    return 'success';
                });
            return 'success';
        })
        .catch((error) => {
            console.log('Error creating new user:', error);
            return error;
        });

}

/****************************** */

export const setUidCollection = async () => {

    await getAuth()
        .setCustomUserClaims(uid, { uidCollection: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2' })
        .then(() => {
            console.log('Successfully created uidCollection');
        });
}


/*************Get Users */

export async function getAllUsers(uidCollection) {
    let arrs = await listAllUsers();
    arrs = arrs.filter(x => x?.customClaims?.uidCollection === uidCollection
        && x.uid !== "lmPDuojUfPYeZhpySVIDHupS9Io1" //isims
        && x.uid !== "BYfS1Yf5Bac6cVhlVw68SjGVsAj2" //isgis
        && x.uid !== "1wD74Rzav1PZ40MxXStjn9WgtJm2" //is@is.is
    )
    return arrs;
}

const listAllUsers = async (nextPageToken) => {
    // List batch of users, 1000 at a time.

    let arr = []
    await getAuth()
        .listUsers(1000, nextPageToken)
        .then((listUsersResult) => {
            listUsersResult.users.forEach((userRecord) => {
                arr.push(userRecord.toJSON())
            });
            if (listUsersResult.pageToken) {
                // List next batch of users.
                listAllUsers(listUsersResult.pageToken);
            }
        })
        .catch((error) => {
            console.log('Error listing users:', error);
        });

    return arr;
};

/*********************** */

export const updateUser = async (obj) => {

    function formatPhoneNumber(phoneNumber) {
        // Check if the number doesn't start with a '+'
        if (phoneNumber.charAt(0) !== '+') {
            return '+' + phoneNumber;
        }
        return phoneNumber;
    }

    let newObj = {
        email: obj.email,
        phoneNumber: obj.phoneNumber && obj.phoneNumber !== '' ? formatPhoneNumber(obj.phoneNumber) : null,
        //    emailVerified: true,
        displayName: obj.displayName,
        //   photoURL: 'http://www.example.com/12345678/photo.png',
        //  disabled: false,
    }

    if (obj.password) {
        newObj.password = obj.password;
    }

    return await getAuth()
        .updateUser(obj.uid, newObj)
        .then(async (userRecord) => {
            // See the UserRecord reference doc for the contents of userRecord.
            //Set Uidcollction
            await getAuth()
                .setCustomUserClaims(userRecord.uid, {
                    title: obj.title,
                    uidCollection: obj.uidCollection,
                })
                .then(() => {
                    console.log('Successfully updated user:', userRecord);
                });

        })
        .then((userRecord) => {
            // See the UserRecord reference doc for the contents of userRecord.
            console.log('Successfully updated user', userRecord/*.toJSON()*/);
            return 'success';
        })
        .catch((error) => {
            console.log('Error updating user:', error);
            return { error };
        });

}

/***************** */
export const delUser = async (uid) => {
    await getAuth()
        .deleteUser(uid)
        .then(() => {
            console.log('Successfully deleted user');
        })
        .catch((error) => {
            console.log('Error deleting user:', error);
        });
}


///***** */