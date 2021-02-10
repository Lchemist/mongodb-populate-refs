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
import { ObjectId } from 'mongodb'

type Object = Record<string, unknown>
type DBRefObject = {
  _bsontype: 'DBRef'
  namespace: string
  oid: string
  db?: string
}

const isObject = (obj: unknown): obj is Object => typeof obj === 'object' && obj !== null && !Array.isArray(obj) && !(obj instanceof Date)
const isDBRef = (obj: Object): obj is DBRefObject => obj._bsontype === 'DBRef'

const gatherRefs = (data: unknown, defaultDb: string) => {
  const refs: Record<string, Record<string, Set<string>>> = Object.create(null)
  const process = (data: unknown) => {
    if (Array.isArray(data)) {
      data.forEach(e => process(e))
    } else if (isObject(data)) {
      if (!('_bsontype' in data)) {
        Object.values(data).forEach(v => process(v))
      } else if (isDBRef(data)) {
        const db = data?.db || defaultDb
        if (!refs[db]) refs[db] = Object.create(null)
        if (!refs[db][data.namespace]) refs[db][data.namespace] = new Set()
        refs[db][data.namespace].add(String(data.oid))
      }
    }
  }
  process(data)
  return refs
}

const populateRefs = (data: unknown, refData: Record<string, Record<string, Object[]>>, defaultDb: string, keys?: string[]): unknown => {
  const populate = (data: unknown): unknown => {
    if (Array.isArray(data)) return data.map(d => populate(d))
    if (!isObject(data)) return data
    if (data === null) return data
    if (isDBRef(data)) {
      const populatedData = refData[data?.db || defaultDb][data.namespace].find(d => String(d._id) === String(data.oid))
      if (populatedData && Array.isArray(keys)) return Object.fromEntries(Object.entries(populatedData).filter(([k]) => keys.includes(k)))
      else return populatedData
    }
    if ('_bsontype' in data) return data
    const temp: Object = {}
    for (const [k, v] of Object.entries(data)) {
      temp[k] = populate(v)
    }
    return temp
  }

  return populate(data)
}

export const populateFromClient = async (client: MongoClient, defaultDb: string, baseData: unknown, keys?: string[]) => {
  if (!client.isConnected()) await client.connect()

  const refEntries = Object.entries(gatherRefs(baseData, defaultDb))
  if (refEntries.length === 0) return baseData
  const newRefEntries = []
  for (const [db, collectionMap] of refEntries) {
    const collectionMapEntries: [string, unknown[]][] = []
    for (const [collection, ids] of Object.entries(collectionMap)) {
      collectionMapEntries.push([collection, await client.db(db).collection(collection).find({ _id: { $in: [...ids].map(id => new ObjectId(id)) } }).toArray()])  
    }
    newRefEntries.push([db, Object.fromEntries(collectionMapEntries)])
  }
  
  return populateRefs(baseData, Object.fromEntries(newRefEntries), defaultDb, keys)
}

export const populateFromDb = async (db: Db, baseData: unknown, keys?: string[]) => {
  const dbName = db.databaseName
  const refEntries = Object.entries(gatherRefs(baseData, dbName)[dbName] ?? {})
  if (refEntries.length === 0) return baseData
  const newRefEntries = []
  for (const [collection, ids] of refEntries) {
    newRefEntries.push([collection, await db.collection(collection).find({ _id: { $in: [...ids].map(id => new ObjectId(id)) } }).toArray()])
  }
  return populateRefs(baseData, { [dbName]: Object.fromEntries(newRefEntries) }, dbName, keys)
}

export const fromClient = (client: MongoClient) => ({
  defaultDb: (db: string) => ({
    populate: (data: unknown, keys?: string[]) => populateFromClient(client, db, data, keys)
  })
})

export const fromDb = (db: Db) => ({
  populate: (data: unknown, keys?: string[]) => populateFromDb(db, data, keys)
})

export default populateFromClient
