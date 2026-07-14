import { mount } from '@vue/test-utils'
import { nextTick, type Component } from 'vue'
import { afterEach, beforeEach } from 'vitest'

const mountedHosts = new Set<HTMLElement>()
const mountedWrappers = new Set<{ unmount: () => void }>()
const imageRestores = new Set<() => void>()

function cleanupMountedTestElements() {
  for (const wrapper of mountedWrappers) wrapper.unmount()
  mountedWrappers.clear()
  for (const restore of imageRestores) restore()
  for (const host of mountedHosts) host.remove()
  mountedHosts.clear()
  document.body.replaceChildren()
}

beforeEach(() => {
  cleanupMountedTestElements()
})

export function mountInDocument(component: Component, options: Parameters<typeof mount>[1] = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  mountedHosts.add(host)

  const wrapper = mount(component, { ...options, attachTo: host })
  mountedWrappers.add(wrapper)

  return wrapper
}

export async function settleTeleportUpdates() {
  await nextTick()
  await Promise.resolve()
  await nextTick()
}

export function dispatchDocumentPointerDown(target: EventTarget = document.body) {
  target.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, composed: true }))
}

export function dispatchDocumentKeydown(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

type ImageCallback = (() => void) | null

export class ControlledImage {
  static instances: ControlledImage[] = []

  onload: ImageCallback = null
  onerror: ImageCallback = null
  referrerPolicy = ''
  src = ''

  constructor() {
    ControlledImage.instances.push(this)
  }

  triggerLoad() {
    if (!this.onload) throw new Error('Expected preload image to register an onload callback')
    this.onload()
  }

  triggerError() {
    if (!this.onerror) throw new Error('Expected preload image to register an onerror callback')
    this.onerror()
  }
}

export function mockWindowImage() {
  const originalImage = window.Image
  ControlledImage.instances = []
  window.Image = ControlledImage as unknown as typeof Image

  const restore = () => {
    window.Image = originalImage
    imageRestores.delete(restore)
  }
  imageRestores.add(restore)

  return {
    images: ControlledImage.instances,
    restore,
  }
}

afterEach(() => {
  cleanupMountedTestElements()
})
