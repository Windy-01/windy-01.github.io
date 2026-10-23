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
      <div class="layout-aside__actions">
        <button
          class="aside-action"
          type="button"
          aria-label="便签"
          title="便签"
          @click="emit('toggle-sticky-note')"
        >
          <span aria-hidden="true">✎︎</span>
          <span v-if="!collapsed">便签</span>
        </button>

        <button
          class="aside-action"
          type="button"
          aria-label="设置"
          title="设置"
          @click="emit('open-settings')"
        >
          <span aria-hidden="true">⚙︎</span>
          <span v-if="!collapsed">设置</span>
        </button>
      </div>

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
  'open-settings': []
  'toggle-sticky-note': []
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
  /* 顶栏高度 + 间距，两个值都来自 globals.css，改高度不用动这里 */
  top: calc(var(--header-height) + var(--header-gap));
  left: 24px;
  z-index: 9;
  display: flex;
  flex-direction: column;
  width: 240px;
  height: calc(100vh - var(--header-height) - var(--header-gap) * 2);
  align-self: flex-start;
  flex-shrink: 0;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(255 255 255 / 45%);
  border-radius: 16px;
  background-color: rgb(255 255 255 / 42%);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 40px rgb(15 23 42 / 10%);
  transition:
    flex-basis 0.25s ease,
    width 0.25s ease;
  animation: layout-fade-in 0.7s ease-out 0.1s both;
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .layout-aside {
    background-color: rgb(255 255 255 / 72%);
  }
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

/* 侧栏动作区：与导航区一样左右各留 12px，hover 药丸才能和导航项对齐 */
.layout-aside__actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
}

.side-navigation {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px 12px;
}

/* 导航项与设置按钮共用同一套外观，保证"与主页按钮一致" */
.side-navigation a,
.aside-action {
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

.side-navigation a:hover,
.aside-action:hover {
  background-color: rgb(255 255 255 / 55%);
}

.side-navigation a span:first-child,
.aside-action span:first-child {
  flex: 0 0 16px;
  text-align: center;
}

/* 补齐 <button> 与 <a> 的默认差异 */
.aside-action {
  width: 100%;
  border: 0;
  background-color: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
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
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
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

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .back-to-top,
  .aside-popup-toggle {
    background-color: rgb(255 255 255 / 90%);
  }
}

:global(.dark-mode .layout-aside) {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 42%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 28%);
  color: #e2e8f0;
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  :global(.dark-mode .layout-aside) {
    background-color: rgb(15 23 42 / 88%);
  }

  :global(.dark-mode .back-to-top),
  :global(.dark-mode .aside-popup-toggle) {
    background-color: rgb(15 23 42 / 92%);
  }
}

/* 面板内的可点项（导航 / 便签 / 设置 / 主题切换）：暗色下统一「浅色文字 + 白色低透明 hover」，
   与顶栏按钮（`.header-action:hover` 同样是 10% 白）保持一致。
   ⚠️ `.aside-action`（便签 / 设置）以前**完全没有暗色规则** —— 文字停在亮色的 `#334155`，
   叠在 42% 深蓝玻璃上几乎看不见，hover 还会冒出一块 55% 的白底。 */
:global(.dark-mode .side-navigation a),
:global(.dark-mode .aside-action),
:global(.dark-mode .theme-toggle) {
  color: #cbd5e1;
}

:global(.dark-mode .side-navigation a:hover),
:global(.dark-mode .aside-action:hover),
:global(.dark-mode .theme-toggle:hover) {
  background-color: rgb(255 255 255 / 10%);
  color: #f8fafc;
}

/* 主题切换上沿的分隔线：亮色是深色 10%，暗色下换成白色 12% 才看得见 */
:global(.dark-mode .theme-toggle) {
  border-top-color: rgb(255 255 255 / 12%);
}

/* 折叠按钮：原来是「深色底 + hover 更深」，在深蓝玻璃上几乎没有反馈，改成白色系 */
:global(.dark-mode .layout-aside__toggle) {
  background-color: rgb(255 255 255 / 12%);
  color: #e2e8f0;
}

:global(.dark-mode .layout-aside__toggle:hover) {
  background-color: rgb(255 255 255 / 20%);
}

/* 浮在页面上的两个圆形按钮：要足够「实」才不会被背景图吃掉，保持深底，只补 hover */
:global(.dark-mode .back-to-top),
:global(.dark-mode .aside-popup-toggle) {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 72%);
  color: #e2e8f0;
}

:global(.dark-mode .back-to-top:hover),
:global(.dark-mode .aside-popup-toggle:hover) {
  background-color: rgb(30 41 59 / 94%);
  color: #f8fafc;
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
    bottom: 16px;
    display: grid;
  }

  .back-to-top {
    bottom: 80px;
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
