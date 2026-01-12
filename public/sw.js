// sw.js

const DB_NAME = 'EstimateAI-PWA-DB';
const DB_VERSION = 1;
const PENDING_FILES_STORE = 'pending-files';

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(PENDING_FILES_STORE)) {
        db.createObjectStore(PENDING_FILES_STORE, { keyPath: 'timestamp' });
      }
    };
  });
}

async function saveFile(file) {
  if (!file) return;
  const db = await openDB();
  const transaction = db.transaction(PENDING_FILES_STORE, 'readwrite');
  const store = transaction.objectStore(PENDING_FILES_STORE);
  
  // Create a record with the file and a timestamp
  const record = {
    timestamp: Date.now(),
    file: file,
  };

  return new Promise((resolve, reject) => {
    // Clear the store before adding a new file to ensure only one is pending
    const clearRequest = store.clear();
    clearRequest.onerror = (event) => reject(event.target.error);
    clearRequest.onsuccess = () => {
        const addRequest = store.add(record);
        addRequest.onerror = (event) => reject(event.target.error);
        addRequest.onsuccess = () => resolve();
    };
  });
}


self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (event.request.method === 'POST' && url.pathname === '/share-handler') {
    event.respondWith(
      (async () => {
        try {
          const formData = await event.request.formData();
          const files = formData.getAll('shared_files');
          
          if (files && files.length > 0) {
            // Save the first valid file
            const file = files[0];
            if (file && file.size > 0) {
              await saveFile(file);
              // Redirect to the dashboard with a query param to signal a share
              return Response.redirect('/dashboard?share-received=true', 303);
            }
          }
          // If no files, redirect without the param
          return Response.redirect('/dashboard?share-failed=nofile', 303);
        } catch (error) {
          console.error('Error handling shared file in Service Worker:', error);
          return Response.redirect('/dashboard?share-failed=error', 303);
        }
      })()
    );
  }
});


self.addEventListener('install', (event) => {
  console.log('Service Worker installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated');
  event.waitUntil(clients.claim());
});
