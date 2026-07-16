<template>
  <Teleport v-if="shouldRender && visible" :to="teleportTarget">
    <div class="tiptap-cta" role="dialog" aria-modal="true" aria-label="Notion-like Template">
      <Button variant="ghost" class="tiptap-cta__close" aria-label="Close" @click="close">
        <svg
          class="tiptap-cta__close-icon"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M18.7071 6.70711C19.0976 6.31658 19.0976 5.68342 18.7071 5.29289C18.3166 4.90237 17.6834 4.90237 17.2929 5.29289L12 10.5858L6.70711 5.29289C6.31658 4.90237 5.68342 4.90237 5.29289 5.29289C4.90237 5.68342 4.90237 6.31658 5.29289 6.70711L10.5858 12L5.29289 17.2929C4.90237 17.6834 4.90237 18.3166 5.29289 18.7071C5.68342 19.0976 6.31658 19.0976 6.70711 18.7071L12 13.4142L17.2929 18.7071C17.6834 19.0976 18.3166 19.0976 18.7071 18.7071C19.0976 18.3166 19.0976 17.6834 18.7071 17.2929L13.4142 12L18.7071 6.70711Z"
            fill="currentColor"
          />
        </svg>
      </Button>
      <h3 class="tiptap-cta__title">Notion-like Template</h3>
      <p class="tiptap-cta__subtitle">Share your unique link to collaborate.</p>
      <div class="tiptap-cta__actions">
        <Button size="small" class="tiptap-cta__btn tiptap-cta__btn--ghost" @click="copyLink">
          <svg
            class="tiptap-button-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M13.0607 8.11097C11.6644 6.71468 9.40033 6.71468 8.00404 8.11097L4.11097 12.004C2.71468 13.4003 2.71468 15.6644 4.11097 17.0607C5.50725 18.457 7.77136 18.457 9.16764 17.0607L10.0808 16.1475C10.4713 15.757 11.1045 15.757 11.495 16.1475C11.8856 16.5381 11.8856 17.1712 11.495 17.5617L10.5819 18.4749C8.40456 20.6522 4.87405 20.6522 2.69675 18.4749C0.51946 16.2976 0.519459 12.7671 2.69675 10.5898L6.58983 6.69675C8.76712 4.51946 12.2976 4.51946 14.4749 6.69675C14.8654 7.08728 14.8654 7.72044 14.4749 8.11097C14.0844 8.50149 13.4512 8.50149 13.0607 8.11097Z"
              fill="currentColor"
            />
            <path
              d="M10.9393 15.889C12.3356 17.2853 14.5997 17.2853 15.996 15.889L19.889 11.996C21.2853 10.5997 21.2853 8.33557 19.889 6.93929C18.4927 5.543 16.2286 5.543 14.8324 6.93929L13.9192 7.85246C13.5287 8.24298 12.8955 8.24298 12.505 7.85246C12.1145 7.46193 12.1145 6.82877 12.505 6.43824L13.4181 5.52507C15.5954 3.34778 19.126 3.34778 21.3032 5.52507C23.4805 7.70236 23.4805 11.2329 21.3032 13.4102L17.4102 17.3032C15.2329 19.4805 11.7024 19.4805 9.52507 17.3032C9.13454 16.9127 9.13454 16.2796 9.52507 15.889C9.91559 15.4985 10.5488 15.4985 10.9393 15.889Z"
              fill="currentColor"
            />
          </svg>
          <span class="tiptap-button-text">{{ copied ? 'Copied!' : 'Copy link' }}</span>
        </Button>
        <Button size="small" class="tiptap-cta__btn tiptap-cta__btn--primary" @click="openDocs">
          <svg
            class="tiptap-button-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fill-rule="evenodd"
              clip-rule="evenodd"
              d="M12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20C16.4183 20 20 16.4183 20 12C20 7.58172 16.4183 4 12 4ZM2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12ZM12.2929 8.29289C12.6834 7.90237 13.3166 7.90237 13.7071 8.29289L16.7071 11.2929C17.0976 11.6834 17.0976 12.3166 16.7071 12.7071L13.7071 15.7071C13.3166 16.0976 12.6834 16.0976 12.2929 15.7071C11.9024 15.3166 11.9024 14.6834 12.2929 14.2929L13.5858 13H8C7.44772 13 7 12.5523 7 12C7 11.4477 7.44772 11 8 11H13.5858L12.2929 9.70711C11.9024 9.31658 11.9024 8.68342 12.2929 8.29289Z"
              fill="currentColor"
            />
          </svg>
          <span class="tiptap-button-text">Start now</span>
        </Button>
      </div>
      <div class="tiptap-cta__footer">
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 0C4.89484 0 3.85946 0.298796 2.97027 0.820005C2.79114 0.925 2.71259 1.15835 2.86472 1.29965C2.99858 1.42397 3.17791 1.5 3.375 1.5H8.625C8.82209 1.5 9.00143 1.42397 9.13528 1.29965C9.28741 1.15835 9.20886 0.925 9.02973 0.820005C8.14054 0.298796 7.10516 0 6 0Z"
            fill="currentColor"
          />
          <path
            d="M12 6C12 5.58578 11.6642 5.25 11.25 5.25H0.75C0.335779 5.25 0 5.58578 0 6C0 6.41422 0.335779 6.75 0.75 6.75H11.25C11.6642 6.75 12 6.41422 12 6Z"
            fill="currentColor"
          />
          <path
            d="M9.13529 10.7004C9.28742 10.8417 9.20886 11.075 9.02974 11.18C8.14054 11.7012 7.10516 12 6 12C4.89484 12 3.85946 11.7012 2.97026 11.18C2.79114 11.075 2.71258 10.8417 2.86471 10.7004C2.99857 10.576 3.17791 10.5 3.375 10.5H8.625C8.82209 10.5 9.00143 10.576 9.13529 10.7004Z"
            fill="currentColor"
          />
          <path
            d="M0.75 3.375C0.75 2.96078 1.08578 2.625 1.5 2.625H10.5C10.9142 2.625 11.25 2.96078 11.25 3.375C11.25 3.78922 10.9142 4.125 10.5 4.125H1.5C1.08578 4.125 0.75 3.78922 0.75 3.375Z"
            fill="currentColor"
          />
          <path
            d="M0.75 8.625C0.75 8.21078 1.08578 7.875 1.5 7.875H10.5C10.9142 7.875 11.25 8.21078 11.25 8.625C11.25 9.03922 10.9142 9.375 10.5 9.375H1.5C1.08578 9.375 0.75 9.03922 0.75 8.625Z"
            fill="currentColor"
          />
        </svg>
        <span>Built with Tiptap, by Tiptap</span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
/**
 * Промо-попап шаблона: показывается только при наличии query-параметра
 * ?cta. Порт CTA-попапа из чанка 3xpmbr0kqzhen.
 */
import { computed, ref } from 'vue'
import { useEditorOverlayTarget } from '../../editor/composables/useEditorOverlayTarget'
import Button from '../../editor/components/primitives/Button.vue'

const overlayTarget = useEditorOverlayTarget()
const teleportTarget = computed(() => overlayTarget?.value ?? 'body')

const shouldRender =
  typeof document !== 'undefined' && new URLSearchParams(window.location.search).has('cta')
const visible = ref(true)
const copied = ref(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 1500)
  } catch {
    // клипборд недоступен — молча игнорируем, как оригинал
  }
}

function close() {
  visible.value = false
  const url = new URL(window.location.href)
  url.searchParams.delete('cta')
  window.history.replaceState({}, '', url.toString())
}

function openDocs() {
  window.open('https://tiptap.dev/docs/ui-components/templates/notion-like-editor', '_blank')
}
</script>
