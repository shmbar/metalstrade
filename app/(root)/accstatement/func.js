import { db } from '@utils/firebase'
import {
    doc, getDoc, collection, getDocs, query, where, deleteDoc, writeBatch,
} from "firebase/firestore";

const ims = 'DQ9gNTpvXqh6K9BqMTPTgCfxD2Z2'
const gis = 'aB3dE7FgHi9JkLmNoPqRsTuVwGIS'
const dateRange = { start: `${new Date().getFullYear()}-01-01`, end: new Date().toISOString().split("T")[0] };
const currentYear = new Date().getFullYear();
const month = new Date().toLocaleString("en-US", { month: "long" });
let date1 = new Date().getDate() === 15 ? `mid${month.substring(0, 3)}` : month

export const groupedArrayInvoice = (arrD) => {

    const groupedArray1 = arrD.sort((a, b) => {
        return a.invoice - b.invoice;
    }).reduce((result, obj) => {

        const group = result.find((group) => group[0]?.invoice === obj.invoice);

        if (group) {
            group.push(obj);
        } else {
            result.push([obj]);
        }

        return result;
    }, []); // Initialize result as an empty array

    return groupedArray1;
};

export const runAccountStatement = async () => {
    // const clients = await db.collection("messages").get();
    //in firebase functions, we need to write the following function a bit diffrent

    let clients = await getDoc(doc(db, ims, 'settings'));
    clients = clients.data().Client.Client.map(x => x.id)
    let arr = []

    for (let i = 0; i < clients.length; i++) {

        const q = query(
            collection(db, ims, 'data', 'invoices' + '_' + currentYear),
            where('date', '>=', dateRange.start),
            where('date', '<=', dateRange.end),
            where('client', '==', clients[i])
        );

        const querySnapshot = await getDocs(q);

        let tmp = querySnapshot.docs.map((doc) => {
            doc.empty && console.log('No matching documents');
            return !doc.empty && doc.data();
        });
        arr = [...arr, ...tmp]
    }

    arr = arr.map(z => ({ ...z, invoice: (z.invoice).toString() }))

    let groupedArr = groupedArrayInvoice(arr)

    arr = []

    groupedArr.forEach(x => {

        let totalPayments = 0;
        let finalInv = null;

        if (x.length > 1) {
            finalInv = x.find(q => q.invType !== '1111')

            x.forEach(obj => {
                obj.payments.forEach(payment => {
                    totalPayments += parseFloat(payment.pmnt);  // Ensure the value is parsed as a number
                });
            });

        } else {
            finalInv = x[0];

            finalInv.payments.forEach(payment => {
                totalPayments += parseFloat(payment.pmnt);  // Ensure the value is parsed as a number
            });

        }

        const date1 = new Date(finalInv?.date);  // Create a Date object from the string
        const daysToAdd = 5;  // Example: Add 5 days
        date1.setDate(date1.getDate() + daysToAdd);  // Add the number of days
        const formattedDate = date1.toISOString().split('T')[0];

        let obj = {
            client: x[0].client,
            invoice: finalInv.invoice, date: finalInv.date, amount: Math.round(finalInv.totalAmount * 100) / 100,
            cur: finalInv.cur, due: formattedDate, paid: Math.round(totalPayments * 100) / 100,
            notPaid: Math.round(finalInv.totalAmount * 100) / 100 - Math.round(totalPayments * 100) / 100
        }

        arr.push(obj)
        //    if (obj.notPaid > 1) arr.push(obj)

    })


    let clnts = [...new Set(arr.map(x => x.client))]

    const batch = writeBatch(db);

    for (let i = 0; i < clnts.length; i++) {
        let clntId = clnts[i]
        let arrData = arr.filter(c => c.client === clntId)
        let ref = doc(db, ims, 'actStatements', String(currentYear), clntId, date1, date1);
        batch.set(ref, { data: arrData });
    }

    await batch.commit();
    console.log('done')
}

