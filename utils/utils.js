import { db } from '@utils/firebase'
import {
  setDoc, doc, getDoc, collection, getDocs, query, where, deleteDoc, writeBatch, updateDoc,
  arrayUnion, arrayRemove, increment, or, and, deleteField
} from "firebase/firestore";

import { getStorage, ref, uploadBytes, listAll, getDownloadURL, deleteObject } from "firebase/storage";
import { getTtl } from './languages';

const storage = getStorage();

//const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12']

export const getD = (array, value, item) => {
  const tmp = array.filter((x) => x.id === value[item]).length ?
    array.find((x) => x.id === value[item])[item] : ''
  return tmp;
}

export const validate = (value, fields) => {
  let errors = fields.map((x, i) => value[x] === '' || value[x] === null ? { [x]: true } : { [x]: false }).reduce((obj, item) => {
    return { ...obj, ...item };
  }, {});

  if (fields.includes('date')) {
    errors = value.dateRange.startDate === null ?
      { ...errors, date: true } : { ...errors, date: false }
  }

  return errors;
}

export const ErrDiv = ({ field, errors, ln }) => {
  return (
    <>
      {errors[field] &&
        <div className='text-[12px] text-red-600'>
          {getTtl('mustFilled', ln)}
        </div>
      }
    </>
  )
}

export const reOrderTableCon = (dt) => {
  const columnOrder = ['id', 'description', 'qnty', 'unitPrc']

  const reorderedData = dt.map((item) => {
    const reorderedItem = {};

    columnOrder.forEach((column, index) => {
      reorderedItem[column] = item[column];
    });

    return reorderedItem;
  });

  return reorderedData;
}

export const reOrderTableFinal = (dt) => {
  const columnOrder = ['id', 'descriptionText', 'remark', 'qnty', 'finalqnty', 'unitPrcFinal', 'finaltotal']

  const reorderedData = dt.map((item) => {
    const reorderedItem = {};

    columnOrder.forEach((column, index) => {
      reorderedItem[column] = item[column];
    });

    return reorderedItem;
  });

  return reorderedData;
}

export const reOrderTableInv = (dt) => {

  const columnOrder = ['id', 'po', 'description', 'container', 'qnty', 'unitPrc', 'total']
  const reorderedData = dt.map((item) => {
    const reorderedItem = {};
    columnOrder.forEach((column, index) => {
      reorderedItem[column] = item[column];
    });

    return reorderedItem;

  });

  return reorderedData;
}

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

export const sortArr = (arr, name) => {

  return arr.sort((a, b) => {
    const A = a[name]?.toString()?.toLowerCase(); // Convert to lowercase for case-insensitive sorting
    const B = b[name]?.toString()?.toLowerCase();

    if (A < B) return -1;
    if (A > B) return 1;
    return 0;
  });
}

export const filteredArray = (arr) => {

  const groupedByInvoice = arr.reduce((acc, obj) => {
    const invoiceNumber = obj.invoice;

    if (!acc[invoiceNumber]) {
      acc[invoiceNumber] = [];
    }

    acc[invoiceNumber].push(obj);

    return acc;
  }, {});

  // Filter objects based on both constraints
  const filteredArray = Object.values(groupedByInvoice).flatMap((group) => {
    const distinctInvTypes = new Set(group.map((obj) => parseInt(obj.invType, 10)));

    if (distinctInvTypes.size === 1) {
      // All invType fields are equal, include all objects
      return group;
    } else {
      // Eliminate items with lower invType
      const maxInvType = Math.max(...distinctInvTypes);
      return group.filter((obj) => parseInt(obj.invType, 10) === maxInvType);
    }
  });


  return filteredArray;
}

////////////// Firebase Funtions////////////////////////////////////

export const saveDataSettings = async (uidCollection, doc1, obj) => {
  return await setDoc(doc(db, uidCollection, doc1), obj).then(() => {
    return true;
  });
}

export const loadDataSettings = async (uidCollection, doc1) => {
  const docSnap = await getDoc(doc(db, uidCollection, doc1));
  return docSnap.exists() ? docSnap.data() : {};
}

export const saveData = async (uidCollection, path, obj) => {

  let m;
  let y;
  if (!obj.final) {
    m = obj.dateRange.startDate.substring(5, 7)
    y = obj.dateRange.startDate.substring(0, 4)
  } else {
    m = obj.m
    y = obj.dateRange.slice(-4);
  }

  return await setDoc(doc(db, uidCollection, "data", path + '_' + y, obj.id), { ...obj, m: m }).then(() => {
    return true;
  });
}

export const loadData = async (uidCollection, path, dateSelect) => {

  let arr = []

  let startYr = dateSelect.start?.substring(0, 4)
  let endYr = dateSelect.end?.substring(0, 4)

  for (let i = startYr; i <= endYr; i++) {

    const q = query(
      collection(db, uidCollection, 'data', path + '_' + i),
      where('date', '>=', dateSelect.start),
      where('date', '<=', dateSelect.end)
    );

    const querySnapshot = await getDocs(q);

    let tmp = querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    arr = [...arr, ...tmp]
  }

  return arr;
}

export const loadDataWeightAnalysis = async (uidCollection, path, dateSelect, entity, name) => {

  let arr = []

  let startYr = dateSelect.start?.substring(0, 4)
  let endYr = dateSelect.end?.substring(0, 4)

  for (let i = startYr; i <= endYr; i++) {

    const q = query(
      collection(db, uidCollection, 'data', path + '_' + i),
      where('date', '>=', dateSelect.start),
      where('date', '<=', dateSelect.end),
      where(entity, '==', name)
    );

    const querySnapshot = await getDocs(q);

    let tmp = querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    arr = [...arr, ...tmp]
  }

  return arr;
}

export const delDoc = async (uidCollection, path, obj) => {

  try {
    const y = obj.date.substring(0, 4)
    return await deleteDoc(doc(db, uidCollection, 'data', path + '_' + y, obj.id)).then(() => {
      return true;
    });
  } catch (error) {
    console.error(error);
  }
}

export const loadInvoice = async (uidCollection, path, obj) => {

  const y = obj.date.substring(0, 4)

  const docSnap = await getDoc(doc(db, uidCollection, 'data', path + '_' + y, obj.id));
  return docSnap.exists() ? docSnap.data() : {};
}



// export const saveDataFinalCancel = async (uidCollection, path, obj) => {
//   const y = obj.dateRange.substring(obj.dateRange.length - 4, obj.dateRange.length)
//   return await setDoc(doc(db, uidCollection, "data", path + '_' + y, obj.id), obj).then(() => {
//     return true;
//   });
// }

export const updatePoSupplierInv = async (uidCollection, val, invcs) => {
  const batch = writeBatch(db);

  for (let i = 0; i < invcs.length; i++) {
    const y = invcs[i].date.substring(0, 4)
    let ref = doc(db, uidCollection, 'data', 'invoices_' + y, invcs[i].id);
    batch.update(ref, { poSupplier: { id: val.id, order: val.order, date: val.dateRange.startDate } });
  }

  await batch.commit();

}

export const updatePoSupplierExp = async (uidCollection, val, exps) => {
  const batch = writeBatch(db);

  for (let i = 0; i < exps.length; i++) {
    const y = exps[i].date.substring(0, 4)
    let ref = doc(db, uidCollection, 'data', 'expenses_' + y, exps[i].id);
    batch.update(ref, { poSupplier: { id: val.id, order: val.order, date: val.dateRange.startDate } });
  }

  await batch.commit();

}

export const updateExpenseInContracts = async (uidCollection, valalExp, poData) => {

  const y = poData.date.substring(0, 4)

  const Ref = doc(db, uidCollection, "data", 'contracts_' + y, poData.id);

  // Atomically add a new region to the "regions" array field.
  await updateDoc(Ref, {
    expenses: arrayUnion(valalExp)
  });
}

export const delExpenseInContracts = async (uidCollection, valalExp, poData) => {

  const y = poData.date.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", 'contracts_' + y, poData.id);

  await updateDoc(Ref, {
    expenses: arrayRemove(valalExp)
  });

}

export const updateDocument = async (uidCollection, path, field, poData, newFieldData) => {

  const y = poData.date.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", path + '_' + y, poData.id);

  // Set the "capital" field of the city 'DC'
  await updateDoc(Ref, { [field]: newFieldData });
}

export const delField = async (uidCollection, path, field, obj) => {

  const y = obj.date.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", path + '_' + y, obj.id);

  // Remove the 'capital' field from the document
  await updateDoc(Ref, {
    [field]: deleteField()
  });
}

export const setNewInvoiceNum = async (uidCollection) => {
  const Ref = doc(db, uidCollection, "invoiceNum");

  await updateDoc(Ref, {
    num: increment(1)
  });
}

export const getInvoices = async (uidCollection, path, arrTmp) => {

  let arr = []

  for (let i = 0; i < arrTmp.length; i++) {
    let obj = arrTmp[i]

    if (obj.arrInv.length) {
      const q = query(
        collection(db, uidCollection, 'data', path + '_' + obj.yr),
        where('invoice', "in", obj.arrInv)
      );
      const querySnapshot = await getDocs(q);

      let tmp = querySnapshot.docs.map((doc) => {
        doc.empty && console.log('No matching documents');
        return !doc.empty && doc.data();
      });
      arr = [...arr, ...tmp]
    }
  }
  return arr;
}

export const getExpenses = async (uidCollection, path, arrTmp) => {

  let arr = []

  for (let i = 0; i < arrTmp.length; i++) {
    let obj = arrTmp[i]

    const q = query(
      collection(db, uidCollection, 'data', path + '_' + obj.yr),
      where('id', "in", obj.arrInv)
    );
    const querySnapshot = await getDocs(q);

    let tmp = querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    arr = [...arr, ...tmp]
  }
  return arr;
}


export const updatePnl = async (uidCollection, path, field, shipData) => {

  const y = shipData.date.startDate !== undefined ? shipData.date.startDate.substring(0, 4) :
    shipData.date.slice(-4)

  const Ref = doc(db, uidCollection, "data", path + '_' + y, shipData.id);

  //  delete shipData.id
  // delete shipData.date

  return await updateDoc(Ref, { [field]: shipData }).then(() => {
    return true;
  });
}

export const updateDocumentContract = async (uidCollection, path, field, poData, newFieldData) => {
  const y = poData.dateRange.startDate.substring(0, 4)
  const Ref = doc(db, uidCollection, "data", path + '_' + y, poData.id);

  return await updateDoc(Ref, { [field]: newFieldData }).then(() => {
    return true;
  });
}

export const uploadFile = async (id, imageUplaod, setList) => {
  if (imageUplaod == null) return;

  const Ref = ref(storage, `${id}/${imageUplaod.name}`);

  return await uploadBytes(Ref, imageUplaod).then(async (snapshot) => {
    await getDownloadURL(snapshot.ref).then((url) => {
      setList((prev) => [...prev, { name: imageUplaod.name, url: url }])
    })
  })
}

export const getAllfiles = async (id) => {

  const Ref = ref(storage, `${id}/`);
  const response = await listAll(Ref);

  const urlArr = await Promise.all(response.items.map(async (x) => {
    const url = { name: x.name, url: await getDownloadURL(x) };
    return url;
  }));

  return urlArr;
}

export const deleteFile = async (id, name) => {

  const Ref = ref(storage, `${id}/${name}`);

  // Delete the file
  deleteObject(Ref).then(() => {
    // File deleted successfully
  }).catch((error) => {
    // Uh-oh, an error occurred!
  });
}

export const saveStockIn = async (uidCollection, stockArr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < stockArr.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'stocks', stockArr[i].id);
    batch.set(ref, stockArr[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

}

export const loadStockData = async (uidCollection, key, stockArr) => {
  const chunkSize = 30; // Firestore limit for "in" operator
  const chunks = [];

  // Split stockArr into chunks of 30
  for (let i = 0; i < stockArr.length; i += chunkSize) {
    chunks.push(stockArr.slice(i, i + chunkSize));
  }

  const allDocs = [];

  // Run a separate query for each chunk
  for (const chunk of chunks) {
    const q = query(
      collection(db, uidCollection, 'data', 'stocks'),
      where(key, 'in', chunk)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      allDocs.push(doc.data());
    });
  }

  if (allDocs.length === 0) {
    console.log('No matching documents');
  }

  return allDocs;
  /*
    const q = query(
      collection(db, uidCollection, 'data', 'stocks'), where(key, 'in', stockArr));
  
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    */
}

export const loadAllStockData = async (uidCollection) => {

  const querySnapshot = await getDocs(collection(db, uidCollection, 'data', 'stocks'));

  return querySnapshot.docs.map((doc) => {
    doc.empty && console.log('No matching documents');
    return !doc.empty && doc.data();
  });
}

export const loadStockDataPerDescription = async (uidCollection, stock, description) => {

  const q = query(
    collection(db, uidCollection, 'data', 'stocks'), and(where('stock', '==', stock),
      or(where('description', '==', description), where('descriptionId', '==', description))));

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => {
    doc.empty && console.log('No matching documents');
    return !doc.empty && doc.data();
  });
}


export const delStock = async (uidCollection, delArr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < delArr.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'stocks', delArr[i]);
    batch.delete(ref);
  }

  // Commit the batch
  await batch.commit();

}

export const loadExpensesForAccounting = async (uidCollection, expArr) => { //for accounting

  let yrs = [...new Set(expArr.map(x => x.date.substring(0, 4)))]

  let dataExp = [];

  for (let i = 0; i < yrs.length; i++) { //loop each year in the Expenses array

    //filter objecst with the same year
    let filteredExpArr = expArr.filter(x => x.date.substring(0, 4) === yrs[i])

    let idArr = filteredExpArr.map(x => x.id)

    const maxxArr = 30;

    for (let k = 0; k < idArr.length; k += maxxArr) {
      const idChunkArr = idArr.slice(k, k + maxxArr);

      const q = query(
        collection(db, uidCollection, 'data', 'expenses_' + yrs[i]), where('id', 'in', idChunkArr));

      const querySnapshot = await getDocs(q);

      let tmp = querySnapshot.docs.map((doc) => {
        return !doc.empty && doc.data();
      });
      dataExp = [...dataExp, ...tmp]
    }
  }

  return dataExp;
}

export const loadAdditionalCNFN = async (uidCollection, CNFN) => { //for accounting

  let yrs = [...new Set(CNFN.map(x => x.date.substring(0, 4)))]

  let dataCNFN = [];

  for (let i = 0; i < yrs.length; i++) { //loop each year in the CNFN array

    //filter objecst with the same year
    let filteredInvArr = CNFN.filter(x => x.date.substring(0, 4) === yrs[i])

    let idArr = filteredInvArr.map(x => x.id)

    const maxxArr = 30;

    for (let k = 0; k < idArr.length; k += maxxArr) {
      const idChunkArr = idArr.slice(k, k + maxxArr);

      const q = query(
        collection(db, uidCollection, 'data', 'invoices_' + yrs[i]), where('id', 'in', idChunkArr));

      const querySnapshot = await getDocs(q);

      let tmp = querySnapshot.docs.map((doc) => {
        return !doc.empty && doc.data();
      });
      dataCNFN = [...dataCNFN, ...tmp]
    }
  }

  return dataCNFN;

}

export const saveMargins = async (uidCollection, data, yr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < data.length; i++) {
    let ref = doc(db, uidCollection, 'margins', String(yr), data[i].month);
    batch.set(ref, data[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

}


export const loadMargins = async (uidCollection, yr) => {

  let arr = []

  // Query a reference to a subcollection
  const querySnapshot = await getDocs(collection(db, uidCollection, 'margins', String(yr)));
  querySnapshot.forEach((doc) => {
    arr.push(doc.data());
  });

  return arr;
}

////////////////////////////////////////
export const speciaInvoices = async (uidCollection, data) => {

  const batch = writeBatch(db);

  for (let i = 0; i < data.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'specialInvoices', data[i].id);
    batch.set(ref, data[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

}

export const loadDataInvoices = async (uidCollection, path, dateSelect) => {

  let arr = []

  let startYr = dateSelect.start?.substring(0, 4)
  let endYr = dateSelect.end?.substring(0, 4)

  for (let i = startYr; i < endYr; i++) {
    const q = query(
      collection(db, uidCollection, 'data', path),
      where('date', '>=', dateSelect.start),
      where('date', '<=', dateSelect.end)
    );

    const querySnapshot = await getDocs(q);

    let tmp = querySnapshot.docs.map((doc) => {
      doc.empty && console.log('No matching documents');
      return !doc.empty && doc.data();
    });
    arr = [...arr, ...tmp]
  }

  return arr;
}

export const loadCompanyExpense = async (uidCollection, path, obj) => {

  const y = obj.date.substring(0, 4)

  const docSnap = await getDoc(doc(db, uidCollection, 'data', path, obj.id));
  return docSnap.exists() ? docSnap.data() : {};
}

export const loadCompanyExpenses = async (uidCollection, path, dateSelect) => {


  const q = query(
    collection(db, uidCollection, 'data', path),
    where('date', '>=', dateSelect.start),
    where('date', '<=', dateSelect.end)
  );

  const querySnapshot = await getDocs(q);

  let tmp = querySnapshot.docs.map((doc) => {
    doc.empty && console.log('No matching documents');
    return !doc.empty && doc.data();
  });

  return tmp;
}

export const saveCompanyExpense = async (uidCollection, obj) => {
  try {
    await setDoc(doc(db, uidCollection, "data", "companyExpenses", obj.id), obj);
    return true;
  } catch (error) {
    console.error("Error saving company expense:", error);
    return false;
  }
};

export const delCompExp = async (uidCollection, path, obj) => {

  try {
    //  const y = obj.date.substring(0, 4)
    return await deleteDoc(doc(db, uidCollection, 'data', path, obj.id)).then(() => {
      return true;
    });
  } catch (error) {
    console.error(error);
  }
}

export const saveMaterials = async (uidCollection, data) => {

  const batch = writeBatch(db);

  for (let i = 0; i < data.length; i++) {
    let ref = doc(db, uidCollection, 'data', 'materialtables', data[i].id);
    batch.set(ref, data[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

};

export const loadMaterials = async (uidCollection) => {
  let arr = []
  const querySnapshot = await getDocs(collection(db, uidCollection, 'data', 'materialtables'));
  querySnapshot.forEach((doc) => {
    arr.push(doc.data());
  });

  return arr;
};


export const saveCashflow = async (uidCollection, yr, data) => {
  const ref = doc(db, uidCollection, "cashflow");

  await setDoc(
    ref,
    { [yr]: data },
    { merge: true } // keeps existing years & fields
  );

  return true;
}

export const saveCashflowFinanced = async (uidCollection, data) => {
  const ref = doc(db, uidCollection, "cashflow"); // MUST be a DocumentReference

  await setDoc(ref, { financed: data }, { merge: true });
  return true;
};

export const updateClientPayment = async (uidCollection, inv) => {

  const y = inv.date.substring(0, 4)

  const Ref = doc(db, uidCollection, "data", 'invoices_' + y, inv.id);

  // Atomically add a new payment to the "payments" array field.
  return await updateDoc(Ref, inv).then(() => {
    return 'success'
  });

}


export const saveMultipleData = async (uidCollection, path, arr) => {

  const batch = writeBatch(db);

  for (let i = 0; i < arr.length; i++) {
    const y = arr[i].date.substring(0, 4)
    let ref = doc(db, uidCollection, 'data', path + '_' + y, arr[i].id);
    batch.set(ref, arr[i]);
  }

  return await batch.commit().then(() => {
    return true;
  });

}

export const updateExpPayments = async (uidCollection, arr) => {
  const batch = writeBatch(db);

  for (let i = 0; i < arr.length; i++) {
    if (arr[i].poSupplier) { //normal expense
      const y = arr[i].date.substring(0, 4)
      let ref = doc(db, uidCollection, 'data', 'expenses_' + y, arr[i].id);
      batch.update(ref, { paid: '111' });
    } else { //company expense
      let ref = doc(db, uidCollection, 'data', 'companyExpenses', arr[i].id);
      batch.update(ref, { paid: '111' });
    }
  }

  return await batch.commit().then(() => {
    return true;
  });

}

export const loadAcntStatement = async (uidCollection, year, clientId, date1) => {

  const docSnap = await getDoc(doc(db, uidCollection, 'actStatements', year, clientId, date1, date1));
  return docSnap.exists() ? docSnap.data() : [];
}

export const loadContract = async (uidCollection, orderNum) => {

  function extractYear(str) {
    if (!/^\d{4}-?\d{2}/.test(str)) return null;

    const yy = str[4] === "-"
      ? str.slice(5, 7)
      : str.slice(4, 6);

    return 2000 + Number(yy);
  }

  const year = extractYear(orderNum);

  const q = query(
    collection(db, uidCollection, "data", `contracts_${year}`),
    where("order", "==", orderNum)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    console.log("No matching documents");
    return [];
  }

  return querySnapshot.docs.map(doc => doc.data());
};

export const updateOpenMonth = async (uidCollection, month, year, open) => {

  await setDoc(
    doc(db,
      uidCollection,
      "margins",
      String(year),
      String(month)),
    { openMonth: open, month: String(month) },
    { merge: true }
  );

}