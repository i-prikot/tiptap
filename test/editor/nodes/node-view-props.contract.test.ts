// @vitest-environment node
import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { compileScript, parse, registerTS } from '@vue/compiler-sfc'
import { nodeViewProps } from '@tiptap/vue-3'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

registerTS(() => ts)

const requiredNodeViewPropContract = {
  decorations: { type: Object, required: true },
  selected: { type: Boolean, required: true },
  updateAttributes: { type: Function, required: true },
  deleteNode: { type: Function, required: true },
  node: { type: Object, required: true },
  view: { type: Object, required: true },
  getPos: { type: Function, required: true },
  innerDecorations: { type: Object, required: true },
  editor: { type: Object, required: true },
  extension: { type: Object, required: true },
  HTMLAttributes: { type: Object, required: true },
}

const nodeViewComponents = [
  {
    name: 'image upload',
    file: fileURLToPath(
      new URL(
        '../../../packages/editor/src/nodes/image-upload/ImageUploadNodeView.vue',
        import.meta.url,
      ),
    ),
  },
  {
    name: 'image',
    file: fileURLToPath(
      new URL('../../../packages/editor/src/nodes/image/ImageNodeView.vue', import.meta.url),
    ),
  },
  {
    name: 'table of contents',
    file: fileURLToPath(
      new URL('../../../packages/editor/src/nodes/toc/TocNodeView.vue', import.meta.url),
    ),
  },
]

function expectCompiledRuntimePropContract(source: string, filename: string) {
  const { descriptor, errors } = parse(source, { filename })
  expect(errors).toEqual([])

  const compiled = compileScript(descriptor, {
    id: filename,
    fs: {
      fileExists: existsSync,
      readFile: (file) => readFileSync(file, 'utf8'),
      realpath: realpathSync,
    },
  })
  expect(compiled.content).toMatch(/props:\s*nodeViewProps,\s*\n\s*setup\(/)
}

describe('NodeView props compiler contract', () => {
  for (const component of nodeViewComponents) {
    it(`${component.name} keeps the runtime NodeView prop validators and requiredness`, () => {
      const source = readFileSync(component.file, 'utf8')

      expect(source).toMatch(
        /import\s*\{[^}]*\bnodeViewProps\b[^}]*\}\s*from\s*['"]@tiptap\/vue-3['"]/,
      )
      expect(source).toMatch(/defineProps\s*\(\s*nodeViewProps\s*\)/)
      expect(Object.keys(nodeViewProps).sort()).toEqual(
        Object.keys(requiredNodeViewPropContract).sort(),
      )
      expect(nodeViewProps).toMatchObject(requiredNodeViewPropContract)
      expectCompiledRuntimePropContract(source, component.file)
    })
  }
})
