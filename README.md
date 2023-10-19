# IndexedDB
Easily interact with the IndexedDB API with a simplified, promise-based approach.

## Features
  · Simplified promise-based API
  · Singleton pattern to ensure only one instance of the database is active
  · Default configurations to get started quickly
  · Bulk addition of items

## Usage  

```javascript
import Database from 'your-library-name';

// Initialize with custom configuration (optional)
const db = Database([
  {
    storeName: 'customStore',
    keyPath: 'customID',
    indexes: [
      {
        name: 'indexName',
        keyPath: 'indexKeyPath',
        unique: false
      }
    ]
  }
]);

// Add item
db.add({ customID: 1, name: 'John Doe' }, 'customStore');

// Get item
db.get(1, 'customStore').then(item => console.log(item));

// Update item
db.put({ customID: 1, name: 'Jane Doe' }, 'customStore');

// Delete item
db.remove(1, 'customStore');

// Bulk addition
db.addAll([{ customID: 2, name: 'Alice' }, { customID: 3, name: 'Bob' }], 'customStore');

// Close the connection (optional, if needed)
db.close();

```

## API  

**Database(storeConfigs)**  
Initializes the database with the provided store configurations.  

**.get(key, storeName)**  
Retrieves an item by key from the specified store.

**.add(data, storeName)**  
Adds an item to the specified store.

**.put(data, storeName)**  
Updates an item in the specified store.

**.remove(key, storeName)**  
Deletes an item by key from the specified store.

**.addAll(items, storeName)**  
Adds multiple items to the specified store.

**.destroy(databaseName)**  
Deletes the specified database.

**.close()**  
Closes the connection to the database.


## Licence
Bind is [MIT Licensed](https://github.com/sswahn/bind/blob/main/LICENSE)
