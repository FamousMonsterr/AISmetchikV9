// src/lib/pwa-helpers.ts

const DB_NAME = 'AI Smetchik-PWA-DB';
const DB_VERSION = 1;
const PENDING_FILES_STORE = 'pending-files';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    // onupgradeneeded is handled by the service worker
  });
}

/**
 * Retrieves the most recent pending file from IndexedDB.
 * @returns A Promise that resolves with the file object or null if none is found.
 */
export async function getPendingFile(): Promise<File | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PENDING_FILES_STORE], 'readonly');
    const store = transaction.objectStore(PENDING_FILES_STORE);
    // Get all files and sort by timestamp descending to get the latest one
    const getAllRequest = store.getAll();
    
    getAllRequest.onsuccess = () => {
      const results = getAllRequest.result;
      if (results && results.length > 0) {
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results[0].file);
      } else {
        resolve(null);
      }
    };
    getAllRequest.onerror = () => reject(getAllRequest.error);
  });
}

/**
 * Deletes all pending files from IndexedDB.
 * @returns A Promise that resolves when the operation is complete.
 */
export async function deletePendingFile(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([PENDING_FILES_STORE], 'readwrite');
    const store = transaction.objectStore(PENDING_FILES_STORE);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
