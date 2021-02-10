# mongodb-populate-refs

<div>

[![NPM](https://img.shields.io/npm/v/mongodb-populate-refs.svg)](https://www.npmjs.com/package/mongodb-populate-refs)

</div>

Tiny utility function that populates given data's DBRefs with native [MongoDB driver](https://www.npmjs.com/package/mongodb).

## Usage

1. If all DBRefs are pointing to documents in the same database:

```js
import { fromDb } from 'mongodb-populate-refs'
// OR: import { populateFromDb } from 'mongodb-populate-refs'

mongo.connect(async () => {
  const db = mongo.db('DB_NAME')
  const baseData = await db.collection('COLLECTION_NAME').find().toArray()
  /* baseData:
  [
    {
      _id: 'user1',
      orders: [
        { $ref: 'orders', $id: 'od1' },
        { $ref: 'orders', $id: 'od2' },
      ]
    },
    {
      _id: 'user2',
      orders: [
        { $ref: 'orders', $id: 'od3' },
        { $ref: 'orders', $id: 'od4' },
      ]
    }
  ]
   */

  const populatedData = await fromDb(db).populate(baseData)
  /*
    OR:
      const populatedData = await populateFromDb(db, baseData)
    
    To limit the populated fields returned:
      const populatedData = await fromDb(db).populate(baseData, ['_id', 'name', 'createdAt'])
      const populatedData = await populateFromDb(db, baseData, ['_id', 'name', 'createdAt'])
   */

  /* populatedData:
  [
    {
      _id: 'user1',
      orders: [
        {
          _id: 'od1',
          name: ...,
          createdAt: ...
        },
        {
          _id: 'od2',
          name: ...,
          createdAt: ...
        },
      ]
    },
    {
      _id: 'user2',
      orders: [
        {
          _id: 'od3',
          name: ...,
          createdAt: ...
        },
        ...
      ]
    }
  ]
   */
  mongo.close()
})
```

2. If DBRefs are pointing to documents in multiple databases:
```js
import populate from 'mongodb-populate-refs'
// OR: import { fromClient } from 'mongodb-populate-refs'

mongo.connect(async () => {
  const defaultDb = 'DB_NAME'
  const baseData = await mongo.db(defaultDb).collection('COLLECTION_NAME').find().toArray()
  const populatedData = await populate(mongo, defaultDb, baseData)
  // OR: const populatedData = await fromClient(mongo).defaultDb(defaultDb).populate(baseData)
  mongo.close()
})
```

## License

[Apache License 2.0](/LICENSE)
