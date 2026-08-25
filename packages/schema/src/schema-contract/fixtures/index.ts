import { createLogger } from '../../utils/logger.js'
import { invalidDocuments } from './invalid-documents.js'
import { validDocuments } from './valid-documents.js'
import type { InvalidFixture, ValidFixture } from '../types.js'

export { invalidDocuments, validDocuments }
export type { InvalidFixture, ValidFixture } from '../types.js'

/**
 * Returns a valid or invalid fixture by its stable public key.
 *
 * @example
 * const fixture = getFixtureByKey('unsafe-link-href')
 */
export function getFixtureByKey(key: string): ValidFixture | InvalidFixture | undefined {
  return [...validDocuments, ...invalidDocuments].find((fixture) => fixture.key === key)
}

createLogger('SchemaContractFixtures').debug('fixture index loaded', {
  validCount: validDocuments.length,
  invalidCount: invalidDocuments.length,
})
