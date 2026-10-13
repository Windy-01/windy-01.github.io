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
      @keydown="handleInputKeydown"
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

    <div
      v-if="isSuggestionOpen && suggestions.length > 0"
      class="search-box__suggestions"
      aria-label="搜索建议"
    >
      <button
        v-for="(suggestion, index) in suggestions"
        :key="suggestion"
        class="search-box__suggestion"
        :class="{ 'is-active': index === highlightedIndex }"
        type="button"
        @mousedown.prevent
        @mouseenter="highlightedIndex = index"
        @click="selectSuggestion(suggestion)"
      >
        {{ suggestion }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import {
  createSearchUrl,
  defaultSearchEngine,
  resolveSearchEngine,
  searchEngines,
  type SearchEngineConfig,
} from '../../config/searchEngines'
import { fetchBaiduSuggestions } from '../../utils/baiduSuggest'

// 输入变化后延迟请求，避免每敲一个字符都发一次建议请求。
const suggestionDebounceMs = 150

const searchQuery = ref('')
const selectedEngine = ref<SearchEngineConfig>(defaultSearchEngine)
const isEngineMenuOpen = ref(false)
const suggestions = ref<string[]>([])
const highlightedIndex = ref(-1)
const isSuggestionOpen = ref(false)

let suggestionTimer: number | undefined
let suggestionRequestId = 0
const suppressedSuggestionQuery = ref('')

const activeEngine = computed(() => {
  const matchedEngine = resolveSearchEngine(searchQuery.value)

  return matchedEngine === defaultSearchEngine && selectedEngine.value !== defaultSearchEngine
    ? selectedEngine.value
    : matchedEngine
})

watch(searchQuery, (value) => {
  window.clearTimeout(suggestionTimer)

  // 触发搜索时回填的关键词不需要再拉取建议。
  if (value === suppressedSuggestionQuery.value) {
    suppressedSuggestionQuery.value = ''
    return
  }

  const suggestionQuery = getSuggestionQuery(value)

  if (!suggestionQuery) {
    closeSuggestions()
    return
  }

  suggestionRequestId += 1
  const requestId = suggestionRequestId

  suggestionTimer = window.setTimeout(async () => {
    const results = await fetchBaiduSuggestions(suggestionQuery)

    if (requestId !== suggestionRequestId) {
      return
    }

    suggestions.value = results
    highlightedIndex.value = -1
    isSuggestionOpen.value = results.length > 0
  }, suggestionDebounceMs)
})

/** 去掉搜索引擎触发前缀（如 `!g `），建议词只针对真实搜索内容。 */
function getSuggestionQuery(value: string) {
  const trimmedValue = value.trim()

  return trimmedValue.replace(resolveSearchEngine(trimmedValue).pattern, '').trim()
}

function closeSuggestions() {
  window.clearTimeout(suggestionTimer)
  isSuggestionOpen.value = false
  highlightedIndex.value = -1
  suggestions.value = []
}

function handleInputKeydown(event: KeyboardEvent) {
  if (!isSuggestionOpen.value || suggestions.value.length === 0) {
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    highlightedIndex.value = (highlightedIndex.value + 1) % suggestions.value.length
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    highlightedIndex.value = highlightedIndex.value <= 0
      ? suggestions.value.length - 1
      : highlightedIndex.value - 1
  } else if (event.key === 'Escape') {
    closeSuggestions()
  } else if (event.key === 'Enter' && highlightedIndex.value >= 0) {
    event.preventDefault()
    const selectedSuggestion = suggestions.value[highlightedIndex.value]

    if (selectedSuggestion !== undefined) {
      selectSuggestion(selectedSuggestion)
    }
  }
}

function selectSuggestion(suggestion: string) {
  suppressedSuggestionQuery.value = suggestion
  searchQuery.value = suggestion
  submitSearch()
}

function handleDocumentClick(event: MouseEvent) {
  if (!isSuggestionOpen.value) {
    return
  }

  const target = event.target

  if (!(target instanceof Element)) {
    return
  }

  if (!target.closest('.search-box')) {
    closeSuggestions()
  }
}

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
  closeSuggestions()

  if (!searchQuery.value.trim()) {
    return
  }

  window.open(createSearchUrl(activeEngine.value, searchQuery.value), '_blank', 'noopener,noreferrer')
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
  window.clearTimeout(suggestionTimer)
})
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

.search-box__suggestions {
  position: absolute;
  z-index: 2;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  display: grid;
  gap: 2px;
  max-height: 304px;
  padding: 8px;
  overflow-y: auto;
  overscroll-behavior: contain;
  border: 1px solid rgba(255, 255, 255, 0.263);
  border-radius: 20px;
  background-color: rgba(255, 255, 255, 0.037);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 10px 28px rgb(15 23 42 / 14%);
  scrollbar-width: thin;
  scrollbar-color: rgb(71 85 105 / 40%) transparent;
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .search-box__suggestions {
    background-color: rgb(255 255 255 / 80%);
  }
}

.search-box__suggestions::-webkit-scrollbar {
  width: 8px;
}

.search-box__suggestions::-webkit-scrollbar-track {
  background: transparent;
}

.search-box__suggestions::-webkit-scrollbar-thumb {
  border: 2px solid transparent;
  border-radius: 999px;
  background-color: rgb(71 85 105 / 40%);
  background-clip: content-box;
}

.search-box__suggestions::-webkit-scrollbar-thumb:hover {
  background-color: rgb(71 85 105 / 60%);
  background-clip: content-box;
}

.search-box__suggestion {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 8px 12px;
  overflow: hidden;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-box__suggestion:hover,
.search-box__suggestion.is-active {
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

:global(.layout-background.dark-mode .search-box__suggestions) {
  border-color: rgb(255 255 255 / 18%);
  background-color: rgb(15 23 42 / 38%);
  box-shadow: 0 10px 28px rgb(0 0 0 / 24%);
  scrollbar-color: rgb(148 163 184 / 45%) transparent;
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  :global(.layout-background.dark-mode .search-box__suggestions) {
    background-color: rgb(15 23 42 / 88%);
  }
}

:global(.layout-background.dark-mode .search-box__suggestions::-webkit-scrollbar-thumb) {
  background-color: rgb(148 163 184 / 45%);
  background-clip: content-box;
}

:global(.layout-background.dark-mode .search-box__suggestions::-webkit-scrollbar-thumb:hover) {
  background-color: rgb(148 163 184 / 65%);
  background-clip: content-box;
}

:global(.layout-background.dark-mode .search-box__suggestion) {
  color: #fff;
}

:global(.layout-background.dark-mode .search-box__suggestion:hover),
:global(.layout-background.dark-mode .search-box__suggestion.is-active) {
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
