import Dexie, { type EntityTable } from 'dexie'

export const database = new Dexie('pulse-mission-control') as Dexie & {
  saves: EntityTable<{ id: string; version: number; savedAt: string; state: unknown }, 'id'>
}
database.version(1).stores({ saves: 'id, savedAt' })
