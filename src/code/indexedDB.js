const DEFAULT_STORE = 'store';
const DB_NAME = 'indexedDB';
const DB_VERSION = 1;
const DEFAULT_KEY_PATH = 'id';

const openDatabase = async (storeConfigs) => {
  return new Promise((resolve, reject) => {
    const connection = indexedDB.open(DB_NAME, DB_VERSION);
    connection.onupgradeneeded = event => {
      const db = event.target.result;
      storeConfigs.forEach(storeConfig => {
        if (!db.objectStoreNames.contains(storeConfig.name)) {
          const store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath || DEFAULT_KEY_PATH });
          
          // Create indexes if specified
          storeConfig.indexes && storeConfig.indexes.forEach(index => {
            store.createIndex(index.name, index.keyPath, { unique: index.unique });
          });
        }
      });
    };
    connection.onsuccess = () => resolve(connection.result);
    connection.onerror = () => reject(connection.error);
  });
};

const executeRequest = async (db, store, mode, action, data) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const objectStore = transaction.objectStore(store);
    const request = action(objectStore, data);

    request.onsuccess = () => {
      db.close();
      resolve(request.result);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

const Database = (storeConfigs = [{ name: DEFAULT_STORE }]) => {
  return {
    get: async (key, storeName = DEFAULT_STORE) => {
      const db = await openDatabase(storeConfigs);
      return executeRequest(db, storeName, 'readonly', (os) => os.get(key));
    },

    add: async (data, storeName = DEFAULT_STORE) => {
      const db = await openDatabase(storeConfigs);
      return executeRequest(db, storeName, 'readwrite', (os) => os.add(data));
    },

    put: async (data, storeName = DEFAULT_STORE) => {
      const db = await openDatabase(storeConfigs);
      return executeRequest(db, storeName, 'readwrite', (os) => os.put(data));
    },

    remove: async (key, storeName = DEFAULT_STORE) => {
      const db = await openDatabase(storeConfigs);
      return executeRequest(db, storeName, 'readwrite', (os) => os.delete(key));
    },

    destroy: async (database = DB_NAME) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(database);
        request.onsuccess = () => resolve(`Database ${database} deleted successfully.`);
        request.onerror = () => reject(request.error);
      });
    },

    // Bulk add
    addAll: async (items, storeName = DEFAULT_STORE) => {
      const db = await openDatabase(storeConfigs);
      const transaction = db.transaction(storeName, 'readwrite');
      const objectStore = transaction.objectStore(storeName);
      items.forEach(item => objectStore.add(item));

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          db.close();
          resolve();
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      });
    }
  };
};

export default Database
