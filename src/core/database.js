
const DEFAULT_CONFIG = {
  storeName: 'store',
  dbName: 'indexedDB',
  dbVersion: 1,
  keyPath: 'id'
}

const normalizeConfig = storeConfigs => {
  if (!Array.isArray(storeConfigs) || storeConfigs.length === 0) {
    throw new TypeError('At least one store configuration is required.')
  }

  const configs = storeConfigs.map(config => ({
    ...DEFAULT_CONFIG,
    ...config,
    keyPath: config.keyPath ?? DEFAULT_CONFIG.keyPath,
    indexes: config.indexes ?? []
  }))

  const { dbName, dbVersion } = configs[0]

  if (
    typeof dbName !== 'string' ||
    !dbName.trim() ||
    !Number.isInteger(dbVersion) ||
    dbVersion < 1
  ) {
    throw new TypeError('Invalid database name or version.')
  }

  const storeNames = new Set()

  configs.forEach(config => {
    if (
      config.dbName !== dbName ||
      config.dbVersion !== dbVersion
    ) {
      throw new TypeError(
        'All stores must use the same database name and version.'
      )
    }

    if (
      typeof config.storeName !== 'string' ||
      !config.storeName.trim() ||
      typeof config.keyPath !== 'string' ||
      !config.keyPath.trim()
    ) {
      throw new TypeError('Invalid store name or key path.')
    }

    if (storeNames.has(config.storeName)) {
      throw new TypeError(
        `Duplicate store configuration: ${config.storeName}.`
      )
    }

    storeNames.add(config.storeName)

    if (!Array.isArray(config.indexes)) {
      throw new TypeError('Indexes must be an array.')
    }

    const indexNames = new Set()

    config.indexes.forEach(index => {
      if (
        !index ||
        typeof index.name !== 'string' ||
        !index.name.trim() ||
        !(
          typeof index.keyPath === 'string' ||
          (
            Array.isArray(index.keyPath) &&
            index.keyPath.length > 0 &&
            index.keyPath.every(
              key => typeof key === 'string' && key.length > 0
            )
          )
        ) ||
        (
          index.unique !== undefined &&
          typeof index.unique !== 'boolean'
        ) ||
        indexNames.has(index.name)
      ) {
        throw new TypeError(
          `Invalid or duplicate index in store ${config.storeName}.`
        )
      }

      indexNames.add(index.name)
    })
  })

  return configs
}

const database = (storeConfigs = [DEFAULT_CONFIG]) => {
  const configs = normalizeConfig(storeConfigs)
  const { dbName, dbVersion } = configs[0]

  let dbInstance = null
  let openingPromise = null

  const getStoreConfig = storeName => {
    const config = configs.find(
      item => item.storeName === storeName
    )

    if (!config) {
      throw new Error(
        `Store "${storeName}" is not configured for ${dbName}.`
      )
    }

    return config
  }

  const openDatabase = () => {
    if (dbInstance) return Promise.resolve(dbInstance)
    if (openingPromise) return openingPromise

    openingPromise = new Promise((resolve, reject) => {
      let request

      try {
        request = indexedDB.open(dbName, dbVersion)
      } catch (error) {
        reject(error)
        return
      }

      request.onupgradeneeded = event => {
        const db = request.result
        const transaction = request.transaction

        try {
          configs.forEach(config => {
            const store = db.objectStoreNames.contains(
              config.storeName
            )
              ? transaction.objectStore(config.storeName)
              : db.createObjectStore(config.storeName, {
                  keyPath: config.keyPath
                })

            config.indexes.forEach(index => {
              if (!store.indexNames.contains(index.name)) {
                store.createIndex(
                  index.name,
                  index.keyPath,
                  { unique: index.unique ?? false }
                )
              }
            })
          })
        } catch (error) {
          transaction.abort()
          throw error
        }
      }

      request.onsuccess = () => {
        const db = request.result

        db.onversionchange = () => {
          db.close()

          if (dbInstance === db) {
            dbInstance = null
          }
        }

        dbInstance = db
        resolve(db)
      }

      request.onerror = () => {
        reject(new Error(
          `Failed to open database "${dbName}".`,
          { cause: request.error }
        ))
      }

      request.onblocked = () => {
        // The open request may still succeed once other
        // connections close. Do not settle the promise here.
        console.warn(
          `Opening "${dbName}" is blocked by another connection.`
        )
      }
    })

    return openingPromise.finally(() => {
      openingPromise = null
    })
  }

  const runTransaction = async (
    storeName,
    mode,
    execute
  ) => {
    getStoreConfig(storeName)

    const db = await openDatabase()
    let transaction

    try {
      transaction = db.transaction(storeName, mode)
    } catch (error) {
      throw new Error(
        `Failed to start ${mode} transaction on "${storeName}".`,
        { cause: error }
      )
    }

    const result = new Promise((resolve, reject) => {
      let request
      let resultValue
      let requestError = null

      transaction.oncomplete = () => {
        resolve(resultValue)
      }

      transaction.onabort = () => {
        reject(new Error(
          `Transaction aborted on "${storeName}".`,
          { cause: requestError || transaction.error }
        ))
      }

      transaction.onerror = () => {
        // onabort performs the final rejection.
        requestError ||= transaction.error
      }

      try {
        request = execute(transaction.objectStore(storeName))

        request.onsuccess = () => {
          resultValue = request.result
        }

        request.onerror = () => {
          requestError = request.error
          // Allow the transaction to abort naturally.
        }
      } catch (error) {
        requestError = error

        try {
          transaction.abort()
        } catch {
          // The transaction may already be inactive.
        }
      }
    })

    return result
  }

  return {
    get(key, storeName = DEFAULT_CONFIG.storeName) {
      return runTransaction(
        storeName,
        'readonly',
        store => store.get(key)
      )
    },

    getAll(storeName = DEFAULT_CONFIG.storeName) {
      return runTransaction(
        storeName,
        'readonly',
        store => store.getAll()
      )
    },

    add(data, storeName = DEFAULT_CONFIG.storeName) {
      return runTransaction(
        storeName,
        'readwrite',
        store => store.add(data)
      )
    },

    put(data, storeName = DEFAULT_CONFIG.storeName) {
      return runTransaction(
        storeName,
        'readwrite',
        store => store.put(data)
      )
    },

    delete(key, storeName = DEFAULT_CONFIG.storeName) {
      return runTransaction(
        storeName,
        'readwrite',
        store => store.delete(key)
      )
    },

    addAll(items, storeName = DEFAULT_CONFIG.storeName) {
      if (!Array.isArray(items)) {
        return Promise.reject(
          new TypeError('Items must be an array.')
        )
      }

      return runTransaction(
        storeName,
        'readwrite',
        store => {
          items.forEach(item => store.add(item))
          return store.count()
        }
      ).then(() => undefined)
    },

    count(storeName = DEFAULT_CONFIG.storeName) {
      return runTransaction(
        storeName,
        'readonly',
        store => store.count()
      )
    },

    async destroy() {
      const db = dbInstance

      if (db) {
        db.close()
        dbInstance = null
      }

      // If an open is in progress, wait for it to settle
      // before attempting deletion.
      if (openingPromise) {
        try {
          await openingPromise
        } catch {
          // Opening failed; deletion can still proceed.
        }

        if (dbInstance) {
          dbInstance.close()
          dbInstance = null
        }
      }

      return new Promise((resolve, reject) => {
        let request

        try {
          request = indexedDB.deleteDatabase(dbName)
        } catch (error) {
          reject(new Error(
            `Failed to delete database "${dbName}".`,
            { cause: error }
          ))
          return
        }

        request.onsuccess = () => resolve()

        request.onerror = () => {
          reject(new Error(
            `Failed to delete database "${dbName}".`,
            { cause: request.error }
          ))
        }

        request.onblocked = () => {
          console.warn(
            `Deleting "${dbName}" is blocked by another connection.`
          )
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
