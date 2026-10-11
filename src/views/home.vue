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

      <main class="home-content">
        <div class="home-search-content">
          <Clock class="home-clock" />
          <SearchBox />
        </div>
      </main>
    </div>
  </Background>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

import Clock from '../components/common/Clock.vue'
import SearchBox from '../components/common/SearchBox.vue'
import Aside from '../components/layout/Aside.vue'
import Background from '../components/layout/Background.vue'
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

.home-content {
  display: flex;
  flex: 1 1 auto;
  justify-content: center;
  min-height: calc(100vh - 112px);
}

.home-search-content {
  display: flex;
  align-items: center;
  width: min(100%, 820px);
  margin-top: clamp(32px, 10vh, 112px);
  gap: 24px;
  flex-direction: column;
}

.home-clock {
  display: block;
  justify-content: center;
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

  .home-content {
    flex: 1 1 auto;
    width: 100%;
    min-height: calc(100vh - 88px);
  }

  .home-search-content {
    width: 100%;
    margin-top: clamp(24px, 8vh, 72px);
    padding: 0 8px;
  }
}
</style>
