<template>
  <Background :class="{ 'dark-mode': isDarkMode }">
    <template #background>
      <!-- 编辑背景内容的位置：在此插入页面专属背景内容。 -->
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
        />
      </div>

      <DocumentMain class="home-document-main">
        <!-- 社区内容占位：可在此处实现社区界面。 -->
        <section class="page-community" aria-label="社区内容">
          <h1 class="page-community__title">Community</h1>
          <p class="page-community__hint">社区功能即将上线。</p>
        </section>
      </DocumentMain>
    </div>
  </Background>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import Aside from '../components/layout/Aside.vue'
import Background from '../components/layout/Background.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import Header from '../components/layout/Header.vue'

const themeStorageKey = 'windy-theme'
const asideStorageKey = 'windy-aside-expanded'

function readAsideExpanded() {
  if (window.innerWidth <= 768) {
    return true
  }

  const savedAsideExpanded = window.localStorage.getItem(asideStorageKey)
  const savedAsideCollapsed = window.localStorage.getItem('windy-aside-collapsed')

  return savedAsideExpanded !== null
    ? savedAsideExpanded === 'true'
    : savedAsideCollapsed !== 'collapsed'
}

const isAsideExpanded = ref(readAsideExpanded())
const isAsidePopupOpen = ref(false)
const isDarkMode = ref(false)

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

.home-document-main {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin: 0;
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

  .home-document-main {
    width: 100%;
    margin: 0;
  }
}

.page-community {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  min-height: 480px;
  color: #1e293b;
  text-align: center;
}

:global(.dark-mode) .page-community {
  color: #e2e8f0;
}

.page-community__title {
  margin: 0;
  font-size: 2rem;
}

.page-community__hint {
  margin: 0;
  color: #64748b;
}
</style>
