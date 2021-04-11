/*!
Copyright 2021 Yusipeng Xuan

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import { MongoClient, Db, ObjectId } from 'mongodb'
import type { RawDBRef } from '.'
import { fromDb, fromClient } from '.'

const { MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_DB } = process.env

const uri = `mongodb+srv://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}/${MONGO_DB}?retryWrites=true&w=majority`
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true })

beforeAll(async () => {
  await client.connect()
})

afterAll(async () => {
  await client.close()
})

type User = {
  _id: ObjectId
  name: string
  age: number
}

type Vendor = {
  _id: ObjectId
  name: string
  desc: string
}

type Book = {
  _id?: ObjectId
  title: string
  author: RawDBRef | User
  vendors?: Array<RawDBRef | Vendor>
}

describe('fromDb', () => {
  let db: Db
  let books: Book[]
  const rawBook: Book = {
    title: 'Hairy Potter',
    author: {
      $ref: 'users',
      $id: new ObjectId('606b7167857eb9fd3ff2d6aa'),
    },
    vendors: [
      {
        $ref: 'vendors',
        $id: new ObjectId('606b71c9857eb9fd3ff2d6ab'),
        $db: undefined,
      },
    ],
  }

  beforeAll(async () => {
    db = client.db(MONGO_DB)
    books = await db.collection('books').find().toArray()
  })

  it('correctly populates a document with fields containing a single or an array of DBRef objects', async () => {
    const book = await fromDb(db).populate(books[0])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly populates an array of documents with fields containing a single or an array of DBRef objects', async () => {
    const [book] = await fromDb(db).populate(books)

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly limited the returned fields', async () => {
    const [book] = await fromDb(db).populate(books, ['name'])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author._id).toBe(undefined)
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(undefined)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0]._id).toBe(undefined)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe(undefined)
  })

  it('correctly populates a document with fields containing a single or an array of raw DBRef objects', async () => {
    const book = await fromDb(db).populate(rawBook)

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly populates an array of documents with fields containing a single or an array of raw DBRef objects', async () => {
    const [book] = await fromDb(db).populate([rawBook])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly limited the returned fields', async () => {
    const [book] = await fromDb(db).populate([rawBook], ['name'])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author._id).toBe(undefined)
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(undefined)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0]._id).toBe(undefined)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe(undefined)
  })
})

describe('fromClient', () => {
  const defaultDb = MONGO_DB + '-2'
  let books: Book[]
  const rawBook: Book = {
    title: 'Hairy Potter',
    author: {
      $ref: 'users',
      $id: new ObjectId('606b8c2b857eb9fd3ff2d6ae'),
    },
    vendors: [
      {
        $ref: 'vendors',
        $id: new ObjectId('606b71c9857eb9fd3ff2d6ab'),
        $db: 'mongodb-populate-refs',
      },
    ],
  }

  beforeAll(async () => {
    books = await client.db(defaultDb).collection('books').find().toArray()
  })

  it('correctly populates a document with fields containing a single or an array of DBRef objects', async () => {
    const book = await fromClient(client).defaultDb(defaultDb).populate(books[0])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly populates an array of documents with fields containing a single or an array of DBRef objects', async () => {
    const [book] = await fromClient(client).defaultDb(defaultDb).populate(books)

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly limited the returned fields', async () => {
    const [book] = await fromClient(client).defaultDb(defaultDb).populate(books, ['name'])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author._id).toBe(undefined)
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(undefined)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0]._id).toBe(undefined)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe(undefined)
  })

  it('correctly populates a document with fields containing a single or an array of raw DBRef objects', async () => {
    const book = await fromClient(client).defaultDb(defaultDb).populate(rawBook)

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly populates an array of documents with fields containing a single or an array of raw DBRef objects', async () => {
    const [book] = await fromClient(client).defaultDb(defaultDb).populate([rawBook])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(33)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe('')
  })

  it('correctly limited the returned fields', async () => {
    const [book] = await fromClient(client).defaultDb(defaultDb).populate([rawBook], ['name'])

    expect(typeof book).toBe('object')
    expect(book.title).toBe('Hairy Potter')

    const author = book.author as User
    expect(typeof author).toBe('object')
    expect(author._id).toBe(undefined)
    expect(author.name).toBe('John Doe')
    expect(author.age).toBe(undefined)

    const vendors = book.vendors as Vendor[]
    expect(Array.isArray(vendors)).toBe(true)
    expect(vendors[0]._id).toBe(undefined)
    expect(vendors[0].name).toBe('BookMart')
    expect(vendors[0].desc).toBe(undefined)
  })
})
