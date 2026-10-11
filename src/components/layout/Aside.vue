<template>
  <aside
    class="layout-aside"
    :class="{
      'is-collapsed': collapsed,
      'is-popup-open': popupOpen,
    }"
    @click.stop
  >
    <button
      class="layout-aside__toggle"
      type="button"
      :aria-expanded="!collapsed"
      :aria-label="collapsed ? '展开侧边栏' : '折叠侧边栏'"
      @click="toggle"
    >
      <span aria-hidden="true">{{ collapsed ? '›' : '‹' }}</span>
    </button>

    <div class="layout-aside__content">
      <nav class="side-navigation" aria-label="主页导航">
        <a href="#home">
          <span aria-hidden="true">⌂</span>
          <span v-if="!collapsed">首页</span>
        </a>
        <a href="#features">
          <span aria-hidden="true">◇</span>
          <span v-if="!collapsed">功能</span>
        </a>
        <a href="#about">
          <span aria-hidden="true">○</span>
          <span v-if="!collapsed">关于</span>
        </a>
      </nav>
    </div>

    <div class="layout-aside__footer">
      <button
        class="theme-toggle"
        type="button"
        :aria-label="darkMode ? '切换到亮色模式' : '切换到暗色模式'"
        :title="darkMode ? '亮色模式' : '暗色模式'"
        @click="emit('toggle-dark-mode')"
      >
        <span aria-hidden="true">{{ darkMode ? '☀' : '☾' }}</span>
        <span v-if="!collapsed">{{ darkMode ? '亮色模式' : '暗色模式' }}</span>
      </button>
    </div>
  </aside>

  <button
    class="aside-popup-toggle"
    :class="{ 'is-open': popupOpen }"
    type="button"
    :aria-expanded="popupOpen"
    :aria-label="popupOpen ? '关闭侧边栏' : '打开侧边栏'"
    title="侧边栏"
    @click.stop="emit('toggle-popup')"
  >
    {{ popupOpen ? '×' : '☷' }}
  </button>

  <button
    class="back-to-top"
    :class="{ 'is-visible': isBackToTopVisible }"
    type="button"
    aria-label="回到顶部"
    title="回到顶部"
    @click="scrollToTop"
  >
    ↑
  </button>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  expanded?: boolean
  popupOpen?: boolean
  darkMode?: boolean
}>(), {
  expanded: true,
  popupOpen: false,
  darkMode: false,
})

const emit = defineEmits<{
  'update:expanded': [value: boolean]
  toggle: [value: boolean]
  'toggle-popup': []
  'toggle-dark-mode': []
}>()

const collapsed = computed(() => !props.expanded)
const darkMode = computed(() => props.darkMode)
const isBackToTopVisible = ref(false)

function toggle() {
  const nextValue = !props.expanded
  emit('update:expanded', nextValue)
  emit('toggle', nextValue)
}

function updateBackToTopVisibility() {
  isBackToTopVisible.value = window.scrollY > 0
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

onMounted(() => {
  updateBackToTopVisibility()
  window.addEventListener('scroll', updateBackToTopVisibility, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('scroll', updateBackToTopVisibility)
})
</script>

<style scoped>
.layout-aside {
  position: fixed;
  top: 88px;
  left: 24px;
  z-index: 9;
  display: flex;
  flex-direction: column;
  width: 240px;
  height: calc(100vh - 112px);
  align-self: flex-start;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 16px;
  background-color: rgb(255 255 255 / 42%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 16px 40px rgb(15 23 42 / 10%);
  transition:
    flex-basis 0.25s ease,
    width 0.25s ease;
  animation: layout-fade-in 0.7s ease-out 0.1s both;
}

.layout-aside.is-collapsed {
  flex-basis: 64px;
  width: 64px;
}

.layout-aside__toggle {
  display: grid;
  flex: 0 0 40px;
  place-items: center;
  align-self: flex-end;
  width: 40px;
  margin: 12px 12px 8px;
  border: 0;
  border-radius: 10px;
  background: rgb(255 255 255 / 55%);
  color: #334155;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  transition: background-color 0.2s ease;
}

.layout-aside__toggle:hover {
  background: rgb(255 255 255 / 85%);
}

.layout-aside__content {
  min-width: 0;
  overflow-x: hidden;
  overflow-y: auto;
}

.layout-aside__footer {
  flex: 0 0 auto;
  margin-top: auto;
}

.side-navigation {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
}

.side-navigation a {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  color: #334155;
  text-decoration: none;
  white-space: nowrap;
}

.side-navigation a:hover {
  background-color: rgb(255 255 255 / 55%);
}

.side-navigation a span:first-child {
  flex: 0 0 16px;
  text-align: center;
}

.theme-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  min-height: 48px;
  padding: 0 24px;
  border: 0;
  border-top: 1px solid rgb(15 23 42 / 10%);
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  text-align: left;
  white-space: nowrap;
}

.theme-toggle:hover {
  background-color: rgb(255 255 255 / 55%);
}

.theme-toggle span:first-child {
  flex: 0 0 16px;
  text-align: center;
}

.back-to-top,
.aside-popup-toggle {
  position: fixed;
  right: 24px;
  z-index: 13;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 50%;
  background-color: rgb(255 255 255 / 72%);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  box-shadow: 0 8px 24px rgb(15 23 42 / 18%);
  color: #334155;
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
}

.back-to-top {
  bottom: 24px;
  opacity: 0;
  pointer-events: none;
  transform: scale(0);
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease,
    transform 0.2s ease;
}

.back-to-top.is-visible {
  opacity: 1;
  pointer-events: auto;
  transform: scale(1);
}

.back-to-top:hover {
  background-color: rgb(255 255 255 / 90%);
  transform: scale(1) translateY(-2px);
}

.aside-popup-toggle {
  bottom: 24px;
  z-index: 14;
  display: none;
  transition:
    background-color 0.2s ease,
    transform 0.25s ease;
}

.aside-popup-toggle.is-open {
  transform: scale(1.08);
}

:global(.dark-mode) .layout-aside {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 42%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 28%);
  color: #e2e8f0;
}

:global(.dark-mode) .layout-aside__toggle {
  background-color: rgb(15 23 42 / 55%);
  color: #e2e8f0;
}

:global(.dark-mode) .layout-aside__toggle:hover {
  background-color: rgb(15 23 42 / 85%);
}

:global(.dark-mode) .side-navigation a {
  color: #cbd5e1;
}

:global(.dark-mode) .side-navigation a:hover,
:global(.dark-mode) .theme-toggle:hover {
  background-color: rgb(15 23 42 / 55%);
}

:global(.dark-mode) .theme-toggle {
  border-top-color: rgb(255 255 255 / 12%);
  color: #cbd5e1;
}

:global(.dark-mode) .back-to-top,
:global(.dark-mode) .aside-popup-toggle {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 72%);
  color: #e2e8f0;
}

:global(.dark-mode) .back-to-top:hover {
  background-color: rgb(30 41 59 / 90%);
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
  .layout-aside {
    animation: none;
  }
}

@media (max-width: 768px) {
  .layout-aside {
    position: fixed;
    top: auto;
    right: 16px;
    bottom: 72px;
    left: auto;
    z-index: 15;
    display: none;
    width: 72%;
    max-width: 320px;
    height: auto;
    max-height: calc(100dvh - 120px);
    transform-origin: bottom right;
    animation: none;
  }

  .layout-aside.is-popup-open {
    display: flex;
    animation: aside-popup-in 0.2s ease-out both;
  }

  .layout-aside.is-collapsed {
    flex-basis: auto;
    width: 72%;
    max-width: 320px;
  }

  .layout-aside__content {
    max-height: calc(100dvh - 200px);
  }

  .layout-aside__toggle {
    display: none;
  }

  .aside-popup-toggle {
    bottom: 8px;
    display: grid;
  }

  .back-to-top {
    bottom: 64px;
  }
}

@keyframes aside-popup-in {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.82);
  }

  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@media (max-width: 640px) {
  .back-to-top,
  .aside-popup-toggle {
    right: 16px;
  }
}
</style>
