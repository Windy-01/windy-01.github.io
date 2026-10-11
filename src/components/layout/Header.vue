<template>
  <header class="layout-header">
    <div class="layout-header__content">
      <button
        class="layout-header__menu-toggle"
        type="button"
        :aria-expanded="isMenuOpen"
        aria-controls="header-mobile-menu"
        :aria-label="isMenuOpen ? '关闭菜单' : '打开菜单'"
        @click="toggleMenu"
      >
        <span aria-hidden="true">{{ isMenuOpen ? '×' : '☰' }}</span>
      </button>

      <div class="layout-header__brand">
        <strong>Windy</strong>
      </div>

      <nav class="layout-header__buttons" aria-label="页面按钮">
        <button
          v-for="action in headerActions"
          :key="action"
          class="header-action"
          type="button"
        >
          {{ action }}
        </button>
      </nav>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="header-menu">
      <div
        v-if="isMenuOpen"
        class="layout-header__menu-layer"
        @click.self="closeMenu"
      >
        <aside
          id="header-mobile-menu"
          class="layout-header__mobile-menu"
          aria-label="移动端二级菜单"
        >
          <nav class="layout-header__mobile-actions" aria-label="移动端页面按钮">
            <button
              v-for="action in headerActions"
              :key="action"
              class="header-action"
              type="button"
            >
              {{ action }}
            </button>
          </nav>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const headerActions = ['button1', 'button2']
const isMenuOpen = ref(false)

function closeMenu() {
  isMenuOpen.value = false
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
  }
}

watch(isMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.layout-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 10;
  width: 100%;
  margin-bottom: 24px;
  background-color: rgba(255, 255, 255, 0.312);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  animation: layout-fade-in 0.6s ease-out both;
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .layout-header {
    background-color: rgb(255 255 255 / 72%);
  }
}

.layout-header__content {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid rgb(15 23 42 / 10%);
  color: #1e293b;
}

.layout-header__brand {
  display: flex;
  align-items: center;
}

.layout-header__buttons {
  position: absolute;
  left: 50%;
  display: flex;
  height: 64px;
  transform: translateX(-50%);
}

.layout-header__buttons :deep(.header-action) {
  position: relative;
  min-width: 136px;
  height: 64px;
  padding: 0 32px;
  border: 0;
  border-right: 1px solid transparent;
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
}

.layout-header__buttons :deep(.header-action:hover) {
  background: radial-gradient(
    ellipse at center,
    rgb(255 255 255 / 62%) 0%,
    rgb(255 255 255 / 28%) 42%,
    transparent 78%
  );
  box-shadow: inset 0 0 18px rgb(255 255 255 / 36%);
  color: #0f172a;
}

.layout-header__menu-toggle {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.layout-header__menu-toggle {
  display: none;
}

.layout-header__menu-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgb(15 23 42 / 38%);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .layout-header__menu-layer {
    background-color: rgb(15 23 42 / 68%);
  }
}

.layout-header__mobile-menu {
  width: min(280px, 82vw);
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.600);
  box-shadow: 12px 0 32px rgb(15 23 42 / 22%);
}

.layout-header__mobile-actions {
  display: flex;
  flex-direction: column;
  padding: 0 20px;
}

.layout-header__mobile-actions :deep(.header-action) {
  width: 100%;
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.layout-header__mobile-actions :deep(.header-action:hover) {
  background-color: rgb(15 23 42 / 8%);
}

:global(.dark-mode) .layout-header {
  background-color: rgb(15 23 42 / 31.2%);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  :global(.dark-mode) .layout-header {
    background-color: rgb(15 23 42 / 88%);
  }

  :global(.dark-mode) .layout-header__menu-layer {
    background-color: rgb(2 6 23 / 82%);
  }
}

:global(.dark-mode) .layout-header__content {
  border-bottom-color: rgb(255 255 255 / 12%);
  color: #e2e8f0;
}

:global(.dark-mode) .layout-header__buttons :deep(.header-action) {
  color: #cbd5e1;
}

:global(.dark-mode) .layout-header__buttons :deep(.header-action:hover) {
  background: radial-gradient(
    ellipse at center,
    rgb(15 23 42 / 62%) 0%,
    rgb(15 23 42 / 28%) 42%,
    transparent 78%
  );
  box-shadow: inset 0 0 18px rgb(15 23 42 / 36%);
  color: #f8fafc;
}

:global(.dark-mode) .layout-header__mobile-menu {
  background-color: rgb(15 23 42 / 94%);
  box-shadow: 12px 0 32px rgb(0 0 0 / 35%);
}

:global(.dark-mode) .layout-header__mobile-actions :deep(.header-action) {
  color: #cbd5e1;
}

:global(.dark-mode) .layout-header__mobile-actions :deep(.header-action:hover) {
  background-color: rgb(255 255 255 / 10%);
}

.header-menu-enter-active,
.header-menu-leave-active {
  transition: opacity 0.25s ease;
}

.header-menu-enter-from,
.header-menu-leave-to {
  opacity: 0;
}

.header-menu-enter-active .layout-header__mobile-menu,
.header-menu-leave-active .layout-header__mobile-menu {
  transition: transform 0.3s ease;
}

.header-menu-enter-from .layout-header__mobile-menu,
.header-menu-leave-to .layout-header__mobile-menu {
  transform: translateX(-100%);
}

@keyframes layout-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .layout-header,
  .header-menu-enter-active,
  .header-menu-leave-active,
  .header-menu-enter-active .layout-header__mobile-menu,
  .header-menu-leave-active .layout-header__mobile-menu {
    animation: none;
    transition: none;
  }
}

@media (max-width: 768px) {
  .layout-header__content {
    min-height: 56px;
    padding: 0 16px;
  }

  .layout-header__menu-toggle {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-right: 12px;
    border-radius: 10px;
    background-color: rgb(255 255 255 / 48%);
    color: #334155;
    font-size: 1.25rem;
    line-height: 1;
  }

  .layout-header__brand {
    flex: 1;
  }

  .layout-header__buttons {
    display: none;
  }

  :global(.dark-mode) .layout-header__menu-toggle {
    background-color: rgb(15 23 42 / 55%);
    color: #e2e8f0;
  }

}
</style>
