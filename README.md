# mongodb-populate-refs

[![build](https://github.com/Lchemist/mongodb-populate-refs/workflows/build/badge.svg)](https://github.com/Lchemist/mongodb-populate-refs/actions?query=workflow%3Abuild)
[![Coverage Status](https://img.shields.io/codecov/c/github/Lchemist/mongodb-populate-refs/main.svg)](https://codecov.io/gh/Lchemist/mongodb-populate-refs/branch/main)
[![NPM](https://img.shields.io/npm/v/mongodb-populate-refs.svg)](https://www.npmjs.com/package/mongodb-populate-refs)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](https://commitizen.github.io/cz-cli/)
[![Conventional Changelog](https://img.shields.io/badge/changelog-conventional-brightgreen.svg)](https://conventional-changelog.github.io)

Tiny utility tool that populates embedded [DBRefs](https://docs.mongodb.com/manual/reference/database-references/#dbrefs) with native [MongoDB driver](https://www.npmjs.com/package/mongodb).

<table style="display:inline-table">
<tr>
<th>Before</th>
<th>After</th>
</tr>
<tr>
<td>

```js
[
  {
    _id: 'book1',
    author: {
      $ref: 'user-collection',
      $id: 'uid1'
    },
    vendors: [
      {
        $ref: 'vendor-collection',
        $id: 'vid1'
      },
      {
        $ref: 'vendor-collection',
        $id: 'vid2',
        $db: 'another-db'
      },
    ]
  },
  // ...
]
```

</td>
<td>

```js
[
  {
    _id: 'book1',
    author: {
      _id: 'uid1'
      name: 'John Doe',
      age: 33,
    },
    vendors: [
      { 
        _id: 'vid1'
        name: 'BookMart',
      },
      {
        _id: 'vid2'
        name: 'Barnes & Nobel',
      },
    ]
  },
  // ...
]
```

</td>
</tr>
</table>

## Usage

1. If all DBRefs are pointing to documents in the same database:

```js
import client from 'WHERE_MONGODB_CLIENT_IS_EXPORTED'
import { fromDb } from 'mongodb-populate-refs'
// OR: import { populateFromDb } from 'mongodb-populate-refs'

client.connect(async () => {
  const db = client.db('DB_NAME')
  const rawData = await db.collection('COLLECTION_NAME').find().toArray()

  const populatedData = await fromDb(db).populate(rawData)
  // OR: await populateFromDb(db, rawData)

  client.close()
})
```

2. If DBRefs are pointing to documents in multiple databases:
```js
import client from 'WHERE_MONGODB_CLIENT_IS_EXPORTED'
import populate from 'mongodb-populate-refs'
// OR: import { fromClient } from 'mongodb-populate-refs'

client.connect(async () => {
  const defaultDb = 'DB_NAME'
  const rawData = await client.db(defaultDb).collection('COLLECTION_NAME').find().toArray()
  const populatedData = await populate(client, defaultDb, rawData)
  // OR: await fromClient(client).defaultDb(defaultDb).populate(rawData)

  client.close()
})
```

3. To limit the returned populated fields:
```js
// In the examples below, only '_id', 'name', 'createdAt' fields will be read from the referenced documents.
await fromDb(db).populate(rawData, ['_id', 'name', 'createdAt'])
await populateFromDb(db, rawData, ['_id', 'name', 'createdAt'])
await populate(client, 'DEFAULT_DB', rawData, ['_id', 'name', 'createdAt'])
await fromClient(client).defaultDb('DEFAULT_DB').populate(rawData, ['_id', 'name', 'createdAt'])
```

## License

[Apache License 2.0](/LICENSE)
