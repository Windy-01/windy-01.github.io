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

      <a
        class="header-brand"
        href="https://github.com/Windy-01"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Windy 的 GitHub 主页"
        title="GitHub"
      >
        <svg class="header-brand__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        </svg>
        <span class="header-brand__name">Windy</span>
      </a>

      <nav class="layout-header__buttons" aria-label="页面按钮">
        <template v-for="action in headerActions" :key="action.label">
          <RouterLink
            v-if="action.to"
            class="header-action"
            :to="action.to"
            @click="closeMenu"
          >
            {{ action.label }}
          </RouterLink>
          <button
            v-else
            class="header-action"
            type="button"
          >
            {{ action.label }}
          </button>
        </template>
      </nav>

      <!-- 占位内容：头像与用户名后续替换为真实用户信息。 -->
      <div class="layout-header__user">
        <RouterLink class="header-user" to="/user/dev" aria-label="用户：user">
          <span class="header-user__avatar" aria-hidden="true">
            <svg viewBox="0 0 40 40" focusable="false">
              <circle cx="20" cy="20" r="20" fill="#cbd5e1" />
              <circle cx="20" cy="16" r="6.5" fill="#f8fafc" />
              <path d="M20 24c-6.63 0-12 5.37-12 12v4h24v-4c0-6.63-5.37-12-12-12z" fill="#f8fafc" />
            </svg>
          </span>
          <span class="header-user__name">user</span>
        </RouterLink>
      </div>
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
            <template v-for="action in headerActions" :key="`${action.label}-mobile`">
              <RouterLink
                v-if="action.to"
                class="header-action"
                :to="action.to"
                @click="closeMenu"
              >
                {{ action.label }}
              </RouterLink>
              <button
                v-else
                class="header-action"
                type="button"
              >
                {{ action.label }}
              </button>
            </template>
          </nav>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'

const headerActions = [
  { label: 'Community', to: '/community' },
  { label: 'Document', to: '/document' },
  { label: 'Chat', to: '/Chat' },
]
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

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  border-radius: 10px;
  color: #334155;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.header-brand__icon {
  display: block;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
}

.header-brand__name {
  line-height: 1;
}

.header-brand:hover {
  background-color: rgb(255 255 255 / 55%);
  color: #0f172a;
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
  display: grid;
  place-items: center;
  min-width: 136px;
  height: 64px;
  padding: 0 32px;
  border: 0;
  border-right: 1px solid transparent;
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
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
    transparent 100%
  );
  color: #0f172a;
}

.layout-header__user {
  display: flex;
  align-items: center;
  margin-left: auto;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 6px;
  border-radius: 999px;
  color: #334155;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.header-user:hover {
  background-color: rgb(255 255 255 / 55%);
  color: #0f172a;
}

.header-user__avatar {
  display: grid;
  flex: 0 0 32px;
  place-items: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: 50%;
  background-color: rgb(203 213 225 / 60%);
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 10%);
}

.header-user__avatar svg {
  display: block;
  width: 100%;
  height: 100%;
}

.header-user__name {
  line-height: 1;
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
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

.layout-header__mobile-actions :deep(.header-action:hover) {
  background-color: rgb(15 23 42 / 8%);
}

:global(.dark-mode) .header-brand {
  color: #cbd5e1;
}

:global(.dark-mode) .header-brand:hover {
  background-color: rgb(255 255 255 / 10%);
  color: #f8fafc;
}

:global(.dark-mode) .header-user {
  color: #cbd5e1;
}

:global(.dark-mode) .header-user:hover {
  background-color: rgb(255 255 255 / 10%);
  color: #f8fafc;
}

:global(.dark-mode) .header-user__avatar {
  background-color: rgb(51 65 85 / 70%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 12%);
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
    transparent 100%
  );
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

  .header-brand {
    flex: 1;
  }

  .layout-header__buttons {
    display: none;
  }

  .header-user {
    padding: 4px;
  }

  .header-user__name {
    display: none;
  }

  :global(.dark-mode) .layout-header__menu-toggle {
    background-color: rgb(15 23 42 / 55%);
    color: #e2e8f0;
  }

}
</style>
