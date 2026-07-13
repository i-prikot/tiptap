import { defineComponent } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import Avatar from '../../../../src/editor/components/primitives/avatar/Avatar.vue'
import AvatarFallback from '../../../../src/editor/components/primitives/avatar/AvatarFallback.vue'
import AvatarGroup from '../../../../src/editor/components/primitives/avatar/AvatarGroup.vue'
import AvatarImage from '../../../../src/editor/components/primitives/avatar/AvatarImage.vue'
import { mockWindowImage, mountInDocument, settleTeleportUpdates } from './test-utils'

const AvatarFixture = defineComponent({
  components: { Avatar, AvatarFallback, AvatarImage },
  props: {
    delayMs: { default: undefined, type: Number },
    src: { default: undefined, type: String },
  },
  template: `
    <Avatar>
      <AvatarImage :src="src" />
      <AvatarFallback :delay-ms="delayMs">JD</AvatarFallback>
    </Avatar>
  `,
})

const AvatarGroupFixture = defineComponent({
  components: { Avatar, AvatarGroup },
  template: `
    <AvatarGroup :max-visible="2">
      <Avatar><span>One</span></Avatar>
      <Avatar><span>Two</span></Avatar>
      <Avatar><span>Three</span></Avatar>
    </AvatarGroup>
  `,
})

afterEach(() => {
  vi.useRealTimers()
})

describe('Avatar', () => {
  it('exposes its configured size and optional user color on the root', () => {
    const wrapper = mountInDocument(Avatar, {
      props: { size: 'lg', userColor: '#8b5cf6' },
      slots: { default: '<span>JD</span>' },
    })
    const root = wrapper.get('.tiptap-avatar')

    expect(root.attributes('data-size')).toBe('lg')
    expect(root.attributes('style')).toContain('--dynamic-user-color: #8b5cf6')
  })

  it('keeps the image hidden until mocked preload success then renders its requested source', async () => {
    const { images } = mockWindowImage()
    const wrapper = mountInDocument(AvatarFixture, { props: { src: '/avatars/jd.png' } })

    expect(wrapper.find('.tiptap-avatar-image').exists()).toBe(false)
    expect(images).toHaveLength(1)
    expect(images[0]!.src).toBe('/avatars/jd.png')

    images[0]!.triggerLoad()
    await settleTeleportUpdates()

    expect(wrapper.get('.tiptap-avatar-image').attributes('src')).toBe('/avatars/jd.png')
  })

  it('keeps fallback behavior when mocked preload reports an error', async () => {
    const { images } = mockWindowImage()
    const wrapper = mountInDocument(AvatarFixture, { props: { src: '/avatars/missing.png' } })

    expect(images).toHaveLength(1)
    images[0]!.triggerError()
    await settleTeleportUpdates()

    expect(wrapper.find('.tiptap-avatar-image').exists()).toBe(false)
    expect(wrapper.get('.tiptap-avatar-fallback').text()).toBe('JD')
  })

  it('delays fallback rendering until its configured timer elapses', async () => {
    vi.useFakeTimers()
    const wrapper = mountInDocument(AvatarFixture, { props: { delayMs: 80 } })

    expect(wrapper.find('.tiptap-avatar-fallback').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(79)
    await settleTeleportUpdates()
    expect(wrapper.find('.tiptap-avatar-fallback').exists()).toBe(false)

    await vi.advanceTimersByTimeAsync(1)
    await settleTeleportUpdates()
    expect(wrapper.get('.tiptap-avatar-fallback').text()).toBe('JD')
  })

  it('hides an already visible fallback after image load succeeds', async () => {
    const { images } = mockWindowImage()
    const wrapper = mountInDocument(AvatarFixture, { props: { src: '/avatars/jd.png' } })

    expect(wrapper.find('.tiptap-avatar-fallback').exists()).toBe(true)
    expect(images).toHaveLength(1)

    images[0]!.triggerLoad()
    await settleTeleportUpdates()

    expect(wrapper.find('.tiptap-avatar-fallback').exists()).toBe(false)
    expect(wrapper.find('.tiptap-avatar-image').exists()).toBe(true)
  })

  it('limits visible group children and exposes a +N fallback for hidden avatars', () => {
    const wrapper = mountInDocument(AvatarGroupFixture)

    expect(wrapper.get('.tiptap-avatar-group').attributes('data-max-user-visible')).toBe('2')
    expect(wrapper.findAll('.tiptap-avatar')).toHaveLength(3)
    expect(wrapper.get('.tiptap-avatar-fallback').text()).toBe('+1')
  })
})
