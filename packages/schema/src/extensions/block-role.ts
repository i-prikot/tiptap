import { Extension, type Editor } from '@tiptap/core'
import type { ResolvedPos } from '@tiptap/pm/model'
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state'
import { TOP_LEVEL_BLOCK_ID_NODE_TYPES } from './block-id.js'

export const BLOCK_ROLE_ATTRIBUTE = 'blockRole'
export const BLOCK_ROLE_META = 'blockRole:normalized'

export type BlockRoleValue = string | null

export interface BlockRoleOption {
  label: string
  value: string
}

export interface BlockRoleOptions {
  roles: readonly string[]
}

export type BlockRoleRejectionReason =
  'invalid-role' | 'missing-node' | 'unsupported-node' | 'nested-node' | 'unchanged-role'

export interface SetBlockRoleSuccess {
  ok: true
  nodeType: string
  pos: number
  previousRole: BlockRoleValue
  nextRole: BlockRoleValue
}

export interface SetBlockRoleRejection {
  ok: false
  reason: BlockRoleRejectionReason
  requestedRole: BlockRoleValue
  nodeType: string | null
  pos: number
}

export type SetBlockRoleResult = SetBlockRoleSuccess | SetBlockRoleRejection

const supportedNodeTypes = new Set<string>(TOP_LEVEL_BLOCK_ID_NODE_TYPES)
const blockRolePluginKey = new PluginKey('blockRole')

export function isValidBlockRole(value: unknown, roles?: readonly string[]): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    (roles === undefined || roles.includes(value))
  )
}

export function normalizeBlockRole(value: unknown, roles?: readonly string[]): BlockRoleValue {
  return isValidBlockRole(value, roles) ? value : null
}

interface NormalizationResult {
  transaction: Transaction
  clearedInvalid: number
  strippedNested: number
  topLevelBlocks: number
}

function createNormalizationTransaction(
  state: EditorState,
  roles: readonly string[],
): NormalizationResult | null {
  const transaction = state.tr
  let clearedInvalid = 0
  let strippedNested = 0

  state.doc.descendants((node, pos) => {
    const role = node.attrs[BLOCK_ROLE_ATTRIBUTE]
    if (role == null) return true

    const isDirectDocChild = state.doc.resolve(pos).depth === 0
    if (!isDirectDocChild) {
      transaction.setNodeMarkup(
        pos,
        undefined,
        { ...node.attrs, [BLOCK_ROLE_ATTRIBUTE]: null },
        node.marks,
      )
      strippedNested += 1
      return true
    }

    if (!isValidBlockRole(role, roles)) {
      transaction.setNodeMarkup(
        pos,
        undefined,
        { ...node.attrs, [BLOCK_ROLE_ATTRIBUTE]: null },
        node.marks,
      )
      clearedInvalid += 1
    }
    return true
  })

  if (clearedInvalid === 0 && strippedNested === 0) return null

  transaction.setMeta(BLOCK_ROLE_META, true)
  transaction.setMeta('addToHistory', false)
  return {
    transaction,
    clearedInvalid,
    strippedNested,
    topLevelBlocks: state.doc.childCount,
  }
}

function dispatchNormalization(
  editor: Pick<Editor, 'state' | 'view'>,
  roles: readonly string[],
): void {
  const normalization = createNormalizationTransaction(editor.state, roles)
  if (!normalization) return
  editor.view.dispatch(normalization.transaction)
}

function scheduleNormalization(editor: Editor, roles: readonly string[]): void {
  queueMicrotask(() => {
    if (!editor.isDestroyed) dispatchNormalization(editor, roles)
  })
}

function skippedRoleChange(
  reason: BlockRoleRejectionReason,
  requestedRole: unknown,
  nodeType: string | null,
  pos: number,
  roles: readonly string[],
): SetBlockRoleRejection {
  const normalizedRequestedRole = normalizeRequestedRole(requestedRole, roles)
  const result: SetBlockRoleRejection = {
    ok: false,
    reason,
    requestedRole: normalizedRequestedRole,
    nodeType,
    pos,
  }
  console.warn('[BlockRole] role change skipped', {
    reason: result.reason,
    requestedRole: result.requestedRole,
    nodeType: result.nodeType,
    pos: result.pos,
  })
  return result
}

function normalizeRequestedRole(requestedRole: unknown, roles?: readonly string[]): BlockRoleValue {
  return requestedRole === null || isValidBlockRole(requestedRole, roles) ? requestedRole : null
}

function configuredRoles(editor: Pick<Editor, 'extensionManager'>): readonly string[] {
  const extension = editor.extensionManager.extensions.find(({ name }) => name === BlockRole.name)
  const roles = extension?.options.roles
  return Array.isArray(roles) ? roles : []
}

/**
 * Applies a validated role change at a host-resolved document position.
 * Presentation, permissions, and labels remain host responsibilities.
 */
export function setBlockRoleAtPos(
  editor: Pick<Editor, 'state' | 'view' | 'extensionManager'>,
  pos: number,
  requestedRole: unknown,
): SetBlockRoleResult {
  const roles = configuredRoles(editor)
  let $pos: ResolvedPos
  try {
    $pos = editor.state.doc.resolve(pos)
  } catch {
    return skippedRoleChange('missing-node', requestedRole, null, pos, roles)
  }

  const node = $pos.nodeAfter
  if (!node) return skippedRoleChange('missing-node', requestedRole, null, pos, roles)
  const nodeType = node.type.name
  const nextRole = normalizeBlockRole(requestedRole, roles)
  if (requestedRole !== null && nextRole === null) {
    return skippedRoleChange('invalid-role', requestedRole, nodeType, pos, roles)
  }
  if ($pos.depth !== 0) return skippedRoleChange('nested-node', requestedRole, nodeType, pos, roles)
  if (!supportedNodeTypes.has(node.type.name)) {
    return skippedRoleChange('unsupported-node', requestedRole, nodeType, pos, roles)
  }

  const previousRole = normalizeBlockRole(node.attrs[BLOCK_ROLE_ATTRIBUTE], roles)
  if (previousRole === nextRole) {
    return skippedRoleChange('unchanged-role', requestedRole, nodeType, pos, roles)
  }

  editor.view.dispatch(
    editor.state.tr.setNodeMarkup(
      pos,
      undefined,
      { ...node.attrs, [BLOCK_ROLE_ATTRIBUTE]: nextRole },
      node.marks,
    ),
  )

  const result: SetBlockRoleSuccess = {
    ok: true,
    nodeType,
    pos,
    previousRole,
    nextRole,
  }

  return result
}

export const BlockRole = Extension.create({
  name: 'blockRole',

  addOptions(): BlockRoleOptions {
    return {
      roles: [],
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: [...TOP_LEVEL_BLOCK_ID_NODE_TYPES],
        attributes: {
          [BLOCK_ROLE_ATTRIBUTE]: {
            default: null,
            parseHTML: (element: HTMLElement) =>
              normalizeBlockRole(element.getAttribute('data-block-role'), this.options.roles),
            renderHTML: (attributes: Record<string, unknown>) => {
              const role = normalizeBlockRole(attributes[BLOCK_ROLE_ATTRIBUTE], this.options.roles)
              return role === null ? {} : { 'data-block-role': role }
            },
          },
        },
      },
    ]
  },

  addProseMirrorPlugins() {
    const roles = this.options.roles
    return [
      new Plugin({
        key: blockRolePluginKey,
        view: () => {
          scheduleNormalization(this.editor, roles)
          return {}
        },
        appendTransaction(transactions, _oldState, newState) {
          if (transactions.some((transaction) => transaction.getMeta(BLOCK_ROLE_META))) return null
          const normalization = createNormalizationTransaction(newState, roles)
          if (!normalization) return null

          return normalization.transaction
        },
      }),
    ]
  },
})
