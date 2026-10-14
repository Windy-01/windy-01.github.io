<template>
  <Background :class="{ 'dark-mode': isDarkMode }">
    <template #background>
      <!-- 编辑背景内容的位置：在此插入页面专属背景内容。 -->
      <slot name="background" />
    </template>

    <Header />

    <div class="home-body">
      <div class="aside-slot" :class="{ 'is-collapsed': !isAsideExpanded }">
        <Aside
          :expanded="isAsideExpanded"
          :popup-open="isAsidePopupOpen"
          :dark-mode="isDarkMode"
          @update:expanded="updateAsideExpanded"
          @toggle-popup="toggleAsidePopup"
          @toggle-dark-mode="toggleDarkMode"
          @open-settings="openSettings"
          @toggle-sticky-note="toggleStickyNote"
        />
      </div>

      <slot />
    </div>

    <SettingsDialog :open="isSettingsOpen" @close="isSettingsOpen = false" />

    <StickyNote :open="isStickyNoteOpen" />
  </Background>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import Aside from './Aside.vue'
import Background from './Background.vue'
import Header from './Header.vue'
import SettingsDialog from './SettingsDialog.vue'
import StickyNote from '../common/StickyNote.vue'
import { stickyNote } from '../../config/stickyNote'

const themeStorageKey = 'windy-theme'
const asideStorageKey = 'windy-aside-expanded'

/** 桌面端侧栏默认收起；用户手动切换后由 localStorage 记住选择。 */
function readAsideExpanded() {
  // 移动端侧栏是浮层，展开态只用来决定是否显示文字，保持展开。
  if (window.innerWidth <= 768) {
    return true
  }

  return window.localStorage.getItem(asideStorageKey) === 'true'
}

const isAsideExpanded = ref(readAsideExpanded())
const isAsidePopupOpen = ref(false)
const isDarkMode = ref(false)
const isSettingsOpen = ref(false)
const isStickyNoteOpen = ref(stickyNote.open)

function updateAsideExpanded(expanded: boolean) {
  isAsideExpanded.value = expanded
  window.localStorage.setItem(asideStorageKey, String(expanded))
}

function toggleAsidePopup() {
  isAsidePopupOpen.value = !isAsidePopupOpen.value
}

function closeAsidePopupOnOutsideClick(event: MouseEvent) {
  if (!isAsidePopupOpen.value) {
    return
  }

  const target = event.target

  if (!(target instanceof Element)) {
    return
  }

  if (
    !target.closest('.layout-aside')
    && !target.closest('.aside-popup-toggle')
  ) {
    isAsidePopupOpen.value = false
  }
}

function toggleDarkMode() {
  isDarkMode.value = !isDarkMode.value
  window.localStorage.setItem(themeStorageKey, isDarkMode.value ? 'dark' : 'light')
}

/** 侧栏「设置」入口，控制设置弹窗的显隐。 */
function openSettings() {
  isSettingsOpen.value = true
  // 移动端侧栏是浮层，打开设置时顺手收起，避免关掉设置后还叠着一层。
  isAsidePopupOpen.value = false
}

/** 侧栏「便签」入口，控制便签小窗的显隐。 */
function toggleStickyNote() {
  isStickyNoteOpen.value = !isStickyNoteOpen.value
  isAsidePopupOpen.value = false
}

function keepAsideExpandedOnMobile() {
  if (window.innerWidth <= 768) {
    isAsideExpanded.value = true
  }
}

onMounted(() => {
  isDarkMode.value = window.localStorage.getItem(themeStorageKey) === 'dark'
  document.addEventListener('click', closeAsidePopupOnOutsideClick)
  window.addEventListener('resize', keepAsideExpandedOnMobile)
})

onUnmounted(() => {
  document.removeEventListener('click', closeAsidePopupOnOutsideClick)
  window.removeEventListener('resize', keepAsideExpandedOnMobile)
})
</script>

<style scoped>
.home-body {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 24px;
  width: 96%;
  margin: 88px auto 0;
  padding: 0 24px 24px;
}

.aside-slot {
  flex: 0 0 240px;
  width: 240px;
  min-height: calc(100vh - 112px);
  transition:
    flex-basis 0.25s ease,
    width 0.25s ease;
}

.aside-slot.is-collapsed {
  flex-basis: 64px;
  width: 64px;
}

@media (max-width: 768px) {
  .home-body {
    gap: 0;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 0 16px 16px;
  }

  .aside-slot,
  .aside-slot.is-collapsed {
    flex: 0 0 0;
    width: 0;
    min-height: 0;
  }
}
</style>
