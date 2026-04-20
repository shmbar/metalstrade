'use server'

import admin from 'firebase-admin'
import { getAuth } from 'firebase-admin/auth';

function getAdminAuth() {
    if (admin.apps.length === 0) {
        const serviceAccount = {
            type: process.env.FIREBASE_TYPE || "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI || "https://accounts.google.com/o/oauth2/auth",
            token_uri: process.env.FIREBASE_TOKEN_URI || "https://oauth2.googleapis.com/token",
            auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL || "https://www.googleapis.com/oauth2/v1/certs",
            client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
            universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN || "googleapis.com",
        };

        if (!serviceAccount.project_id || !serviceAccount.private_key || !serviceAccount.client_email) {
            throw new Error("Firebase Admin: missing required environment variables (FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL)");
        }

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    }
    return getAuth();
}

export async function createNewUser(obj) {
    return await getAdminAuth().createUser({
        email: obj.email,
        emailVerified: true,
        password: obj.password,
        displayName: obj.displayName,
        photoURL: 'http://www.example.com/12345678/photo.png',
        disabled: false,
    })
        .then(async (userRecord) => {
            await getAdminAuth()
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

export const setUidCollection = async (uid) => {
    await getAdminAuth()
        .setCustomUserClaims(uid, { uidCollection: 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2' })
        .then(() => {
            console.log('Successfully created uidCollection');
        });
}

export async function getAllUsers(uidCollection) {
    let arrs = await listAllUsers();
    arrs = arrs.filter(x => x?.customClaims?.uidCollection === uidCollection
        && x.uid !== "lmPDuojUfPYeZhpySVIDHupS9Io1"
        && x.uid !== "BYfS1Yf5Bac6cVhlVw68SjGVsAj2"
        && x.uid !== "1wD74Rzav1PZ40MxXStjn9WgtJm2"
    )
    return arrs;
}

const listAllUsers = async (nextPageToken) => {
    let arr = []
    await getAdminAuth()
        .listUsers(1000, nextPageToken)
        .then((listUsersResult) => {
            listUsersResult.users.forEach((userRecord) => {
                arr.push(userRecord.toJSON())
            });
            if (listUsersResult.pageToken) {
                listAllUsers(listUsersResult.pageToken);
            }
        })
        .catch((error) => {
            console.log('Error listing users:', error);
        });

    return arr;
};

export const updateUser = async (obj) => {
    function formatPhoneNumber(phoneNumber) {
        if (phoneNumber.charAt(0) !== '+') {
            return '+' + phoneNumber;
        }
        return phoneNumber;
    }

    let newObj = {
        email: obj.email,
        phoneNumber: obj.phoneNumber && obj.phoneNumber !== '' ? formatPhoneNumber(obj.phoneNumber) : null,
        displayName: obj.displayName,
    }

    if (obj.password) {
        newObj.password = obj.password;
    }

    return await getAdminAuth()
        .updateUser(obj.uid, newObj)
        .then(async (userRecord) => {
            await getAdminAuth()
                .setCustomUserClaims(userRecord.uid, {
                    title: obj.title,
                    uidCollection: obj.uidCollection,
                })
                .then(() => {
                    console.log('Successfully updated user:', userRecord);
                });
        })
        .then((userRecord) => {
            console.log('Successfully updated user', userRecord);
            return 'success';
        })
        .catch((error) => {
            console.log('Error updating user:', error);
            return { error };
        });
}

export const delUser = async (uid) => {
    await getAdminAuth()
        .deleteUser(uid)
        .then(() => {
            console.log('Successfully deleted user');
        })
        .catch((error) => {
            console.log('Error deleting user:', error);
        });
}
