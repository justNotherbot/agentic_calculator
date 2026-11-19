const DB_NAME = 'precision-calculator-history';

function openHistory() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('calculations', { keyPath: 'id', autoIncrement: true });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function transact(mode, action) {
  const db = await openHistory();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('calculations', mode);
      const request = action(transaction.objectStore('calculations'));
      let result;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error('History transaction aborted'));
    });
  } finally {
    db.close();
  }
}

export const historyStore = {
  list: () => transact('readonly', (store) => store.getAll()),
  save: (entry) => transact('readwrite', (store) => store.add(entry)),
  clear: () => transact('readwrite', (store) => store.clear()),
};
