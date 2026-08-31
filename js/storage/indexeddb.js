/**
 * IndexedDB Helper for Pano (Clipboard Board)
 * Stores image blobs persistently
 */

const DB_NAME = 'SecurityToolkitDB';
const DB_VERSION = 1;
const STORE_NAME = 'panoImages';

let dbInstance = null;

/**
 * Initialize IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
function initDB() {
    return new Promise((resolve, reject) => {
        if (dbInstance) {
            resolve(dbInstance);
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            reject(new Error('IndexedDB açılamadı'));
        };

        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
}

/**
 * Save image blob to IndexedDB
 * @param {string} id - Item ID
 * @param {Blob} blob - Image blob
 * @returns {Promise<void>}
 */
async function saveImage(id, blob) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({ id, blob });

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Görsel kaydedilemedi'));
    });
}

/**
 * Get image blob from IndexedDB
 * @param {string} id - Item ID
 * @returns {Promise<Blob|null>}
 */
async function getImage(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const result = request.result;
            resolve(result ? result.blob : null);
        };

        request.onerror = () => reject(new Error('Görsel alınamadı'));
    });
}

/**
 * Delete image from IndexedDB
 * @param {string} id - Item ID
 * @returns {Promise<void>}
 */
async function deleteImage(id) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error('Görsel silinemedi'));
    });
}

/**
 * Delete multiple images
 * @param {Array<string>} ids - Item IDs
 * @returns {Promise<void>}
 */
async function deleteImages(ids) {
    const db = await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        let completed = 0;
        let hasError = false;

        ids.forEach(id => {
            const request = store.delete(id);
            request.onsuccess = () => {
                completed++;
                if (completed === ids.length && !hasError) {
                    resolve();
                }
            };
            request.onerror = () => {
                hasError = true;
                reject(new Error('Görseller silinemedi'));
            };
        });
    });
}



