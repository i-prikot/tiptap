import { createLogger } from '../utils/logger.js'

export {
  buildSchemaContract,
  cloneSchemaDocument,
  extractMarkDefinition,
  extractNodeDefinition,
  getSchemaContract,
} from './builder.js'
export {
  isSchemaContractUrlSafe,
  schemaRuleDefinitions,
  schemaValidationRules,
  validateSchemaDocument,
} from './rules.js'
export * from './fixtures/index.js'
export type * from './types.js'
export { CURRENT_SCHEMA_VERSION } from '../migrations/index.js'

createLogger('SchemaContract').debug('public module loaded')
