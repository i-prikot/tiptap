<template>
  <div class="tiptap-dropdown-menu-item" role="menuitem" tabindex="-1">
    <slot />
  </div>
</template>

<script setup lang="ts">
/**
 * Пункт одноуровневого DropdownMenu: клик по menuitem закрывает собственный
 * DropdownMenuContent при closeOnSelect. Компонент не эмитит @select и не
 * управляет submenu-цепочкой; для этого контракта используйте MenuItem.
 */
</script>
