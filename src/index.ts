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

import type { MongoClient, Db } from 'mongodb'
import { ObjectId, DBRef as DBRefClass } from 'mongodb'

/**
 * Data type of the MongoDB document's _id field.
 * @note Although technically any data type other than Array
 * can be used for _id field, the unlikely ones are omitted from this type.
 **/
type MongoId = ObjectId | number | string

/**
 * @note Order of the properties matters,
 * see: https://docs.mongodb.com/manual/reference/database-references/#format
 **/
export type RawDBRef = {
  $ref: string
  $id: MongoId
  $db?: string
}

/**
 * @note This type is more accurate than the native `DBRef` class from `mongodb` package
 * @note Order of the properties matters,
 * see: https://docs.mongodb.com/manual/reference/database-references/#format
 **/
export type DBRef = {
  _bsontype: 'DBRef'
  namespace: string
  oid: MongoId
  db: string | undefined
}

type Dict<V extends unknown> = Record<string, V>
type PlainObject = Dict<unknown>

const isPlainObject = (obj: unknown): obj is PlainObject =>
  Object.prototype.toString.call(obj) === '[object Object]'
const isDBRef = (obj: PlainObject): obj is DBRef =>
  Object.getPrototypeOf(obj) === DBRefClass.prototype
const isRawDBRef = (obj: PlainObject): obj is RawDBRef => {
  const keys = Reflect.ownKeys(obj).join(',')
  if (keys === '$ref,$id' || keys === '$ref,$id,$db') return true
  return false
}
const isObjectId = (obj: unknown): obj is ObjectId => obj instanceof ObjectId
const isSameId = (id1: MongoId, id2: MongoId): boolean =>
  isObjectId(id1) ? isObjectId(id2) && id1.equals(id2) : id1 === id2

/** @returns [$ref, $id, $db] */
const getDBRefProps = (o: RawDBRef | DBRef): [string, MongoId, string | undefined] => [
  (<RawDBRef>o).$ref ?? (<DBRef>o).namespace,
  (<RawDBRef>o).$id ?? (<DBRef>o).oid,
  (<RawDBRef>o).$db ?? (<DBRef>o).db,
]

/** @polyfill */
const fromEntries = <T extends unknown>(entries: [string, T][]): Dict<T> => {
  const o = Object.create(null)
  for (const [k, v] of entries) {
    o[k] = v
  }
  return o
}

const gatherRefs = <T extends unknown>(data: T, defaultDb: string) => {
  const refs: Dict<Dict<Set<MongoId>>> = Object.create(null)
  const process = (data: unknown) => {
    if (Array.isArray(data)) {
      data.forEach(e => process(e))
    } else if (isPlainObject(data)) {
      if (isRawDBRef(data) || isDBRef(data)) {
        const [$ref, $id, $db = defaultDb] = getDBRefProps(data)
        if (!refs[$db]) refs[$db] = Object.create(null)
        if (!refs[$db][$ref]) refs[$db][$ref] = new Set()
        refs[$db][$ref].add($id)
      } else {
        Object.values(data).forEach(v => process(v))
      }
    }
  }
  process(data)
  return refs
}

const populateRefs = <T extends unknown>(
  data: T,
  refData: Dict<Dict<PlainObject[]>>,
  defaultDb: string,
  keys?: string[]
): T => {
  const populate = (data: unknown): unknown => {
    if (Array.isArray(data)) return data.map(d => populate(d))
    if (!isPlainObject(data)) return data
    if (isRawDBRef(data) || isDBRef(data)) {
      const [$ref, $id, $db = defaultDb] = getDBRefProps(data)
      const populatedData = refData[$db][$ref].find(d => isSameId(<MongoId>d._id, $id))
      if (populatedData && Array.isArray(keys))
        return fromEntries(Object.entries(populatedData).filter(([k]) => keys.includes(k)))
      else return populatedData
    }
    if ('_bsontype' in data) return data
    const temp: PlainObject = {}
    for (const [k, v] of Object.entries(data)) {
      temp[k] = populate(v)
    }
    return temp
  }

  return populate(data) as T
}

export const populateFromClient = async <T extends unknown>(
  client: MongoClient,
  defaultDb: string,
  baseData: T,
  keys?: string[]
): Promise<T> => {
  if (!client.isConnected()) await client.connect()

  const refEntries = Object.entries(gatherRefs(baseData, defaultDb))
  if (refEntries.length === 0) return baseData
  const newRefEntries: [string, Dict<PlainObject[]>][] = []
  for (const [db, collectionMap] of refEntries) {
    const collectionMapEntries: [string, PlainObject[]][] = []
    for (const [collection, ids] of Object.entries(collectionMap)) {
      collectionMapEntries.push([
        collection,
        await client
          .db(db)
          .collection(collection)
          .find({ _id: { $in: [...ids].map(id => new ObjectId(id)) } })
          .toArray(),
      ])
    }
    newRefEntries.push([db, fromEntries(collectionMapEntries)])
  }

  return populateRefs(baseData, fromEntries(newRefEntries), defaultDb, keys)
}

export const populateFromDb = async <T extends unknown>(
  db: Db,
  baseData: T,
  keys?: string[]
): Promise<T> => {
  const dbName = db.databaseName
  const refEntries = Object.entries(gatherRefs(baseData, dbName)[dbName] ?? {})
  if (refEntries.length === 0) return baseData
  const newRefEntries: [string, PlainObject[]][] = []
  for (const [collection, ids] of refEntries) {
    newRefEntries.push([
      collection,
      await db
        .collection(collection)
        .find({ _id: { $in: [...ids].map(id => new ObjectId(id)) } })
        .toArray(),
    ])
  }
  return populateRefs(baseData, { [dbName]: fromEntries(newRefEntries) }, dbName, keys)
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const fromClient = (client: MongoClient) => ({
  defaultDb: (db: string) => ({
    populate: <T extends unknown>(data: T, keys?: string[]): Promise<T> =>
      populateFromClient(client, db, data, keys),
  }),
})

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const fromDb = (db: Db) => ({
  populate: <T extends unknown>(data: T, keys?: string[]): Promise<T> =>
    populateFromDb(db, data, keys),
})

export default populateFromClient
