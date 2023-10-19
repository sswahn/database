const DEFAULT_STORE = 'store'
const DB_NAME = 'indexedDB'
const DB_VERSION = 1
const DEFAULT_KEY_PATH = 'id'

const openDatabase = async (store) => {
  return new Promise((resolve, reject) => {
    const connection = indexedDB.open(DB_NAME, DB_VERSION);
    connection.onupgradeneeded = event => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(store)) {
        db.createObjectStore(store, { keyPath: DEFAULT_KEY_PATH })
      }
    }
    connection.onsuccess = () => resolve(connection.result)
    connection.onerror = () => reject(connection.error)
  })
}

const executeRequest = async (db, store, mode, action, data) => {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, mode)
    const objectStore = transaction.objectStore(store)
    const request = action(objectStore, data)

    request.onsuccess = () => {
      db.close()
      resolve(request.result)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

const Database = (store = DEFAULT_STORE) => {
  return {
    get: async key => {
      const db = await openDatabase(store)
      return executeRequest(db, store, 'readonly', (os) => os.get(key))
    },

    add: async data => {
      const db = await openDatabase(store)
      return executeRequest(db, store, 'readwrite', (os) => os.add(data))
    },

    put: async data => {
      const db = await openDatabase(store)
      return executeRequest(db, store, 'readwrite', (os) => os.put(data))
    },

    remove: async key => {
      const db = await openDatabase(store)
      return executeRequest(db, store, 'readwrite', (os) => os.delete(key))
    },

    destroy: async (database = DB_NAME) => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.deleteDatabase(database)
        request.onsuccess = () => resolve(`Database ${database} deleted successfully.`)
        request.onerror = () => reject(request.error)
      })
    }
  }
}

export default Database
