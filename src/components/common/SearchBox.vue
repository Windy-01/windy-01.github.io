<template>
  <form class="search-box" @submit.prevent="submitSearch">
    <button
      class="search-box__engine"
      type="button"
      :aria-expanded="isEngineMenuOpen"
      aria-label="选择搜索方式"
      @click="toggleEngineMenu"
    >
      <span
        class="search-box__engine-icon"
        :class="{ 'has-image': activeEngine.icon }"
        aria-hidden="true"
      >
        <img
          v-if="activeEngine.icon"
          class="search-box__engine-icon-image"
          :src="activeEngine.icon"
          :alt="`${activeEngine.name} icon`"
        >
        <span v-else>{{ getFallbackIcon(activeEngine) }}</span>
      </span>
    </button>

    <div v-if="isEngineMenuOpen" class="search-box__engine-menu">
      <button
        v-for="engine in searchEngines"
        :key="engine.id"
        class="search-box__engine-option"
        type="button"
        @click="selectEngine(engine)"
      >
        <span
          class="search-box__engine-icon"
          :class="{ 'has-image': engine.icon }"
          aria-hidden="true"
        >
          <img
            v-if="engine.icon"
            class="search-box__engine-icon-image"
            :src="engine.icon"
            :alt="`${engine.name} icon`"
          >
          <span v-else>{{ getFallbackIcon(engine) }}</span>
        </span>
        <span>{{ engine.name }}</span>
      </button>
    </div>

    <input
      v-model="searchQuery"
      class="search-box__input"
      type="text"
      placeholder="Search"
      aria-label="Search"
    >

    <button
      v-if="searchQuery"
      class="search-box__clear-button"
      type="button"
      aria-label="Clear search"
      @click="clearSearch"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
      >
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </button>

    <button class="search-box__button" type="submit" aria-label="Search">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import {
  createSearchUrl,
  defaultSearchEngine,
  resolveSearchEngine,
  searchEngines,
  type SearchEngineConfig,
} from '../../config/searchEngines'

const searchQuery = ref('')
const selectedEngine = ref<SearchEngineConfig>(defaultSearchEngine)
const isEngineMenuOpen = ref(false)

const activeEngine = computed(() => {
  const matchedEngine = resolveSearchEngine(searchQuery.value)

  return matchedEngine === defaultSearchEngine && selectedEngine.value !== defaultSearchEngine
    ? selectedEngine.value
    : matchedEngine
})

function toggleEngineMenu() {
  isEngineMenuOpen.value = !isEngineMenuOpen.value
}

function selectEngine(engine: SearchEngineConfig) {
  selectedEngine.value = engine
  isEngineMenuOpen.value = false
}

function getFallbackIcon(engine: SearchEngineConfig) {
  return engine.name.charAt(0)
}

function clearSearch() {
  searchQuery.value = ''
}

function submitSearch() {
  if (!searchQuery.value.trim()) {
    return
  }

  window.open(createSearchUrl(activeEngine.value, searchQuery.value), '_blank', 'noopener,noreferrer')
}
</script>

<style scoped>
.search-box {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  width: min(100%, 900px);
  max-height: 50px;
  padding: 6px 8px 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.263);
  border-radius: 999px;
  background-color: rgba(255, 255, 255, 0.037);
  color: #1e293b;
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 28px rgb(15 23 42 / 14%);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .search-box {
    background-color: rgb(255 255 255 / 80%);
  }
}

.search-box__engine {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
  gap: 8px;
  min-height: 44px;
  padding: 0 10px 0 0;
  border: 0;
  background: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.search-box__engine-icon {
  display: grid;
  flex: 0 0 24px;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(145deg, #1683d8, #12a5a5);
  color: #fff;
  font-family: Georgia, serif;
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
}

.search-box__engine-icon-image {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
}

.search-box__engine-icon.has-image {
  background: transparent;
}

.search-box__engine-menu {
  position: absolute;
  z-index: 2;
  top: calc(100% + 8px);
  left: 0;
  display: grid;
  min-width: 150px;
  padding: 6px;
  border: 1px solid rgb(255 255 255 / 58%);
  border-radius: 14px;
  background-color: rgb(255 255 255 / 84%);
  box-shadow: 0 10px 28px rgb(15 23 42 / 20%);
}

.search-box__engine-option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  padding: 4px 10px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.search-box__engine-option:hover {
  background-color: rgb(15 23 42 / 8%);
}

.search-box__input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  -webkit-text-fill-color: currentColor;
  font: inherit;
  font-size: 1rem;
}

.search-box__input::placeholder {
  color: rgb(51 65 85 / 68%);
}

.search-box__button {
  display: grid;
  flex: 0 0 44px;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(71 85 105 / 82%);
  cursor: pointer;
}

.search-box__clear-button {
  display: grid;
  flex: 0 0 36px;
  place-items: center;
  width: 36px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: rgb(71 85 105 / 82%);
  cursor: pointer;
}

.search-box__clear-button:hover,
.search-box__button:hover {
  color: #475569;
}

.search-box__clear-button svg {
  width: 19px;
  height: 19px;
}

.search-box__button:hover {
  background-color: rgb(255 255 255 / 36%);
}

.search-box__button svg {
  width: 21px;
  height: 21px;
}

:global(.layout-background.dark-mode .search-box) {
  border-color: rgb(255 255 255 / 18%);
  background-color: rgb(15 23 42 / 38%);
  color: #fff;
  box-shadow: 0 10px 28px rgb(0 0 0 / 24%);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  :global(.layout-background.dark-mode .search-box) {
    background-color: rgb(15 23 42 / 88%);
  }
}

:global(.layout-background.dark-mode .search-box__input) {
  color: #ffffffe2;
}

:global(.layout-background.dark-mode .search-box__engine) {
  color: #fff;
}

:global(.layout-background.dark-mode .search-box__engine-menu) {
  border-color: rgb(255 255 255 / 18%);
  background-color: rgb(15 23 42 / 94%);
}

:global(.layout-background.dark-mode .search-box__engine-option) {
  color: #ffffff;
}

:global(.layout-background.dark-mode .search-box__engine-option:hover) {
  background-color: rgb(255 255 255 / 10%);
}

:global(.layout-background.dark-mode .search-box__input::placeholder) {
  color: rgba(255, 255, 255, 0.379);
}

:global(.layout-background.dark-mode .search-box__button) {
  color: rgb(148 163 184 / 88%);
}

:global(.layout-background.dark-mode .search-box__clear-button) {
  color: rgb(148 163 184 / 88%);
}

:global(.layout-background.dark-mode .search-box__clear-button:hover),
:global(.layout-background.dark-mode .search-box__button:hover) {
  color: #cbd5e1;
  background-color: rgb(255 255 255 / 10%);
}

@media (max-width: 768px) {
  .search-box {
    min-height: 54px;
    padding-left: 8px;
  }
}
</style>
