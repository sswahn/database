const DEFAULT_CONFIG = {
  storeName: 'store',
  dbName: 'indexedDB',
  dbVersion: 1,
  keyPath: 'id'
}

let dbInstance = null

const openDatabase = async storeConfigs => {
  if (dbInstance) {
    return dbInstance
  }
  const effectiveConfig = { 
    ...DEFAULT_CONFIG, 
    ...storeConfigs[0] 
  }
  return new Promise((resolve, reject) => {
    const connection = indexedDB.open(
      effectiveConfig.dbName, 
      effectiveConfig.dbVersion
    )
    connection.onupgradeneeded = event => {
      const db = event.target.result
      storeConfigs.forEach(storeConfig => {
        if (!db.objectStoreNames.contains(storeConfig.name)) {
          const store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath || effectiveConfig.keyPath })
          storeConfig.indexes && storeConfig.indexes.forEach(index => {
            store.createIndex(index.name, index.keyPath, { unique: index.unique })
          })
        }
      })
    }
    connection.onsuccess = () => {
      dbInstance = connection.result
      resolve(dbInstance)
    }
    connection.onerror = event => {
      reject(new Error(`Failed to open DB: ${event.target.error}`))
    }
  })
}

const executeRequest = async (storeConfigs, storeName, mode, operation, data) => {
  const db = await openDatabase(storeConfigs)
  const transaction = db.transaction(storeName, mode)
  const objectStore = transaction.objectStore(storeName)
  const request = data ? objectStore[operation](data) : objectStore[operation]()

  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result)
    }
    request.onerror = event => {
      reject(new Error(`Failed to execute ${operation} on ${storeName}: ${event.target.error}`))
    }
  })
}

const database = (storeConfigs = [DEFAULT_CONFIG]) => {
  return {
    get(key, storeName = DEFAULT_CONFIG.storeName) {
      return executeRequest(storeConfigs, storeName, 'readonly', 'get', key)
    },
    add(data, storeName = DEFAULT_CONFIG.storeName) {
      return executeRequest(storeConfigs, storeName, 'readwrite', 'add', data)
    },
    put(data, storeName = DEFAULT_CONFIG.storeName) {
      return executeRequest(storeConfigs, storeName, 'readwrite', 'put', data)
    },
    remove(key, storeName = DEFAULT_CONFIG.storeName) {
      return executeRequest(storeConfigs, storeName, 'readwrite', 'delete', key)
    },
    destroy(database = DEFAULT_CONFIG.dbName) => new Promise((resolve, reject) {
      const request = indexedDB.deleteDatabase(database)
      request.onsuccess = () => {
        if (dbInstance) {
          dbInstance.close()
          dbInstance = null
        }
        resolve(`Database ${database} deleted successfully.`)
      }
      request.onerror = event => {
        reject(new Error(`Failed to delete ${database}: ${event.target.error}`))
      }
    }),
    async addAll(items, storeName = DEFAULT_CONFIG.storeName) {
      const db = await openDatabase(storeConfigs)
      const transaction = db.transaction(storeName, 'readwrite')
      const objectStore = transaction.objectStore(storeName)
      items.forEach(item => objectStore.add(item))

      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => {
          resolve()
        }
        transaction.onerror = event => {
          reject(new Error(`Failed to add items to ${storeName}: ${event.target.error}`))
        }
      })
    },
    close() {
      if (dbInstance) {
        dbInstance.close()
        dbInstance = null
      }
    }
  }
}

export default database
