import type { JSONContent } from '@tiptap/core'

export const CURRENT_SCHEMA_VERSION = 1 as const

export interface PersistedDocument {
  schemaVersion: number
  json: JSONContent
}

interface SchemaMigration {
  fromVersion: number
  toVersion: number
  transform: (json: JSONContent) => JSONContent
}

const migrations: readonly SchemaMigration[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    transform: (json) => json,
  },
]

export function createPersistedDocument(json: JSONContent): PersistedDocument {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    json,
  }
}

export function migrate(json: JSONContent, fromVersion: number): JSONContent {
  if (!Number.isInteger(fromVersion) || fromVersion < 0) {
    throw new Error(`Schema version must be a non-negative integer; received ${fromVersion}.`)
  }

  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new Error(
      `Cannot migrate schema version ${fromVersion}; the latest supported version is ${CURRENT_SCHEMA_VERSION}.`,
    )
  }

  let migratedJson = structuredClone(json)

  for (let version = fromVersion; version < CURRENT_SCHEMA_VERSION; version += 1) {
    const migration = migrations.find((entry) => entry.fromVersion === version)

    if (!migration || migration.toVersion !== version + 1) {
      throw new Error(`Missing schema migration from version ${version} to ${version + 1}.`)
    }

    migratedJson = migration.transform(migratedJson)
  }

  return migratedJson
}
