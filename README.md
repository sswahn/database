# Database
Easily interact with the IndexedDB API with a simplified, promise-based approach.

## Features
- Simplified API to perform common operations like get, set, delete, and more.
- Singleton pattern ensures only one database instance is used.
- Default configurations for quick setup.  

## Installation  
```bash
npm install @sswahn/database
```

## Usage  
Import library.  
```javascript
import database from '@sswahn/indexedDB'
```

Initialize with optional custom configuration.  
```javascript
const db = database([
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
])
```

### Get
Retrieves an item by key from the specified store.  
```javascript
db.get(1, 'customStore')
```  

### Get All
Retrieves all items from the specified store.  
```javascript
db.getAll('customStore')
```  

### Count
Retrieves count of all items in the specified store.  
```javascript
db.count('customStore')
```  

### Add
Adds an item to the specified store.  
```javascript
db.add({ customID: 1, name: 'John Doe' }, 'customStore')
```

### Add All
Adds multiple items to the specified store.  
```javascript
db.addAll([{ customID: 2, name: 'Alice' }, { customID: 3, name: 'Bob' }], 'customStore')
```

### Put
Updates an item in the specified store.  
```javascript
db.put({ customID: 1, name: 'Jane Doe' }, 'customStore')
```  

### Delete
Deletes an item by key from the specified store.  
```javascript
db.delete(1, 'customStore')
```  

### Destroy
Deletes the specified database.  
```javascript
db.destroy('databaseName')
```  

### Close
Closes the connection to the database.  
```javascript
db.close()
```  

## Example  
To use this library, you first initialize a database instance and then perform various operations on it. Below is a basic example to store a record and retrieve it:  

```javascript
import database from '@sswahn/bind'
const db = database()

const storeLocally = async () => {
  try {
    await db.add({ id: 1, name: 'John Doe' })
    return db.get(1)
  } catch (error) {
    console.error(`Error: ${error}`)
  }
}

const data = await storeLocally()
```

## License
Database is [MIT Licensed](https://github.com/sswahn/database/blob/main/LICENSE)
