import type { MonthRecord } from './model';
const database = 'e9-salary-v1';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('months', { keyPath: 'month' });
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('STORAGE_BLOCKED'));
    request.onsuccess = () => resolve(request.result);
  });
}
async function transaction<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('months', mode);
    const request = action(tx.objectStore('months'));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onerror = () => { db.close(); reject(tx.error); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('STORAGE_ABORTED')); };
  });
}
export const salaryStore = {
  all: () => transaction('readonly', store => store.getAll()) as Promise<MonthRecord[]>,
  save: (record: MonthRecord) => transaction('readwrite', store => store.put(record)),
  remove: (month: string) => transaction('readwrite', store => store.delete(month)),
  clear: () => transaction('readwrite', store => store.clear()),
};
