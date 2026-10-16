<template>
  <Transition name="settings-dialog">
    <div
      v-if="open"
      class="settings-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-dialog-title"
    >
      <div class="settings-dialog__backdrop" @click="emit('close')" />

      <div ref="panelRef" class="settings-dialog__panel" tabindex="-1">
        <button
          class="settings-dialog__close"
          type="button"
          aria-label="关闭设置"
          title="关闭"
          @click="emit('close')"
        >
          <span aria-hidden="true">×</span>
        </button>

        <header class="settings-dialog__header">
          <h2 id="settings-dialog-title" class="settings-dialog__title">设置</h2>
        </header>

        <div class="settings-dialog__main">
          <!-- 左栏：栏目导航。上下键可在栏目间移动（tablist 的键盘约定）。 -->
          <nav
            ref="navRef"
            class="settings-dialog__nav"
            role="tablist"
            aria-label="设置栏目"
            @keydown.up.prevent="focusSection(-1)"
            @keydown.down.prevent="focusSection(1)"
          >
            <button
              v-for="section in sections"
              :key="section.id"
              :data-section="section.id"
              :id="`settings-tab-${section.id}`"
              class="settings-nav-item"
              :class="{ 'is-active': activeSection === section.id }"
              type="button"
              role="tab"
              :aria-selected="activeSection === section.id"
              :aria-controls="`settings-panel-${section.id}`"
              :tabindex="activeSection === section.id ? 0 : -1"
              @click="activeSection = section.id"
            >
              <span class="settings-nav-item__icon" aria-hidden="true">{{ section.icon }}</span>
              <span class="settings-nav-item__label">{{ section.label }}</span>
            </button>
          </nav>

          <div
            :id="`settings-panel-${activeSection}`"
            ref="bodyRef"
            class="settings-dialog__body"
            role="tabpanel"
            :aria-labelledby="`settings-tab-${activeSection}`"
          >
            <template v-if="activeSection === 'general'">
              <h3 class="settings-group__title">通用</h3>

              <label class="settings-field">
                <span class="settings-field__label">背景图地址</span>
                <input
                  v-model="form.backgroundImageUrl"
                  class="settings-field__input"
                  type="text"
                  spellcheck="false"
                >
              </label>
            </template>

            <template v-else-if="activeSection === 'search'">
              <h3 class="settings-group__title">搜索</h3>

              <!-- ⚠️ 这里不能用 <label> 包：label 会把点击转发给内部第一个可聚焦元素，
                   和自定义下拉的开关逻辑打架。改成显式 id + aria-labelledby。 -->
              <div class="settings-field">
                <span id="settings-label-default-engine" class="settings-field__label">默认引擎</span>
                <SelectBox
                  v-model="form.defaultSearchEngineId"
                  :options="engineOptions"
                  labelledby="settings-label-default-engine"
                />
              </div>

              <ul class="settings-engines">
                <li
                  v-for="engine in form.searchEngines"
                  :key="engine.id"
                  class="settings-engine"
                >
                  <div class="settings-engine__head">
                    <img
                      v-if="engine.icon"
                      class="settings-engine__icon"
                      :src="engine.icon"
                      alt=""
                      decoding="async"
                    >
                    <span class="settings-engine__id">{{ engine.id }}</span>
                    <code class="settings-engine__pattern">{{ engine.pattern.source }}</code>
                  </div>

                  <div class="settings-engine__fields">
                    <label class="settings-field">
                      <span class="settings-field__label">名称</span>
                      <input v-model="engine.name" class="settings-field__input" type="text">
                    </label>

                    <label class="settings-field">
                      <span class="settings-field__label">搜索地址</span>
                      <input
                        v-model="engine.url"
                        class="settings-field__input"
                        type="text"
                        spellcheck="false"
                      >
                    </label>
                  </div>
                </li>
              </ul>
            </template>

            <template v-else-if="activeSection === 'network'">
              <h3 class="settings-group__title">网络</h3>

              <label class="settings-field">
                <span class="settings-field__label">API Base URL</span>
                <input
                  v-model="form.apiBaseUrl"
                  class="settings-field__input"
                  type="text"
                  spellcheck="false"
                  autocomplete="off"
                  placeholder="https://api.example.com"
                >
              </label>

              <p class="settings-hint">
                站内所有自有后端接口（登录 / 注册 / 退出登录等）都以此为前缀。
              </p>
              <p
                class="settings-hint"
                :class="apiBaseUrlHintIsError ? 'settings-hint--error' : 'settings-hint--muted'"
              >
                {{ apiBaseUrlHint }}
              </p>
            </template>

            <template v-else-if="activeSection === 'chat'">
              <h3 class="settings-group__title">聊天</h3>

              <!-- 同「搜索」栏目：label 会转发点击，换成显式 id + aria-labelledby。 -->
              <div class="settings-field">
                <span id="settings-label-chat-storage" class="settings-field__label">聊天记录存储方式</span>
                <SelectBox
                  v-model="form.chatStorage.mode"
                  :options="chatStorageOptions"
                  labelledby="settings-label-chat-storage"
                />
              </div>

              <p class="settings-hint settings-hint--muted">{{ chatStorageModeHint }}</p>

              <!-- 只有选了「本地磁盘」才需要指定位置 -->
              <template v-if="form.chatStorage.mode === 'disk'">
                <label class="settings-field settings-field--spaced">
                  <span class="settings-field__label">磁盘存储位置</span>
                  <input
                    v-model="form.chatStorage.directory"
                    class="settings-field__input"
                    type="text"
                    spellcheck="false"
                    autocomplete="off"
                    :placeholder="defaultChatStorageDirectory"
                  >
                </label>

                <p class="settings-hint">
                  用 Windows 的环境变量写法（<code class="settings-hint__code">%USERPROFILE%</code>
                  指当前用户目录），整串可以直接粘进「运行」（Win+R）或资源管理器地址栏打开。
                  若「文档」目录已被移到别的盘，把前半段换成实际位置即可。目前只考虑 Windows。
                  留空则回落到默认位置
                  <code class="settings-hint__code">{{ defaultChatStorageDirectory }}</code>。
                </p>
              </template>

              <p class="settings-hint settings-hint--muted">
                该配置目前只是占位：聊天记录的存储格式、读写时机与文件管理尚未实现。
              </p>
            </template>

            <!-- 占位栏目：只有入口，内容待补充。 -->
            <div v-else class="settings-placeholder">
              <span class="settings-placeholder__icon" aria-hidden="true">
                {{ activeSectionMeta.icon }}
              </span>
              <p class="settings-placeholder__title">{{ activeSectionMeta.label }}</p>
              <p class="settings-placeholder__hint">栏目已预留，配置项待补充。</p>
            </div>
          </div>
        </div>

        <footer class="settings-dialog__footer">
          <p class="settings-dialog__status" :class="{ 'is-error': saveFailed }">
            {{ statusText }}
          </p>

          <div class="settings-dialog__actions">
            <button
              class="settings-dialog__button"
              type="button"
              @click="handleReset"
            >
              恢复默认
            </button>

            <button
              class="settings-dialog__button settings-dialog__button--primary"
              type="button"
              :disabled="!isDirty"
              @click="handleSave"
            >
              保存
            </button>
          </div>
        </footer>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

import {
  chatStorageModes,
  configCookieName,
  defaultChatStorage,
  isApiBaseUrlInvalid,
  useConfig,
} from '../../config'
import type { ChatStorageMode } from '../../config'
import SelectBox from '../common/SelectBox.vue'

const props = defineProps<{
  /** 是否展示设置弹窗。 */
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)
const navRef = ref<HTMLElement | null>(null)
const bodyRef = ref<HTMLElement | null>(null)

/** 设置栏目 id。社区 / 聊天目前只有入口，没有配置项。 */
type SettingsSectionId = 'general' | 'search' | 'network' | 'community' | 'chat'

interface SettingsSection {
  id: SettingsSectionId
  label: string
  /** 纯字形图标，与侧栏保持同一种风格（不用彩色 emoji）。 */
  icon: string
}

const sections: SettingsSection[] = [
  { id: 'general', label: '通用', icon: '◈' },
  { id: 'search', label: '搜索', icon: '◎' },
  { id: 'network', label: '网络', icon: '⬡' },
  { id: 'community', label: '社区', icon: '◇' },
  { id: 'chat', label: '聊天', icon: '○' },
]

const activeSection = ref<SettingsSectionId>('general')

/** 存储方式的中文文案；顺序取自配置层的 `chatStorageModes`，不在这里另定一份顺序。 */
const chatStorageModeLabels: Record<ChatStorageMode, string> = {
  cache: '存储在浏览器中',
  disk: '本地磁盘',
}

const chatStorageOptions = chatStorageModes.map((value) => ({
  value,
  label: chatStorageModeLabels[value],
}))

/** 磁盘存储位置的默认值，用作输入框占位符与「留空回落」说明。 */
const defaultChatStorageDirectory = defaultChatStorage.directory

const activeSectionMeta = computed(() => {
  return sections.find((section) => section.id === activeSection.value) ?? sections[0]!
})

/** 上下键在栏目间循环移动，并把焦点带过去。 */
function focusSection(offset: number) {
  const currentIndex = sections.findIndex((section) => section.id === activeSection.value)
  const next = sections[(currentIndex + offset + sections.length) % sections.length]

  if (next === undefined) {
    return
  }

  activeSection.value = next.id
  navRef.value?.querySelector<HTMLElement>(`[data-section="${next.id}"]`)?.focus()
}

const { config, isUsingDefaults, saveConfig, resetConfig } = useConfig()

/**
 * 表单是已保存配置的一份副本，点「保存」才写回并落盘。
 * 打开弹窗时会从配置重新同步，未保存的编辑会被丢弃。
 */
const form = reactive({
  backgroundImageUrl: config.backgroundImageUrl,
  defaultSearchEngineId: config.defaultSearchEngineId,
  searchEngines: config.searchEngines.map((engine) => ({ ...engine })),
  apiBaseUrl: config.apiBaseUrl,
  chatStorage: {
    mode: config.chatStorage.mode,
    directory: config.chatStorage.directory,
  },
})

/** 默认引擎下拉的选项，直接由表单里的引擎列表派生（改名后立刻跟着变）。 */
const engineOptions = computed(() =>
  form.searchEngines.map((engine) => ({ value: engine.id, label: engine.name })),
)

const saveFailed = ref(false)

/** 表单与已保存的配置是否一致。 */
const isDirty = computed(() => {
  if (form.backgroundImageUrl !== config.backgroundImageUrl) {
    return true
  }

  if (form.defaultSearchEngineId !== config.defaultSearchEngineId) {
    return true
  }

  if (form.apiBaseUrl !== config.apiBaseUrl) {
    return true
  }

  if (
    form.chatStorage.mode !== config.chatStorage.mode
    || form.chatStorage.directory !== config.chatStorage.directory
  ) {
    return true
  }

  return form.searchEngines.some((engine) => {
    const saved = config.searchEngines.find((item) => item.id === engine.id)

    return saved === undefined || engine.name !== saved.name || engine.url !== saved.url
  })
})

/** 表单里填的 base url 是否格式不合法（留空不算错误）。 */
const apiBaseUrlHintIsError = computed(() => isApiBaseUrlInvalid(form.apiBaseUrl))

/** base url 字段下方的动态说明：告诉用户当前会走哪个地址。 */
const apiBaseUrlHint = computed(() => {
  if (apiBaseUrlHintIsError.value) {
    return '地址格式不正确，将按「与站点同源」处理。请填写完整的 http:// 或 https:// 地址。'
  }

  if (form.apiBaseUrl.trim() === '') {
    return '留空表示与站点同源，接口走相对路径。'
  }

  return '保存后，后端接口会请求到该地址。'
})

/** 存储方式下方的动态说明：把两种方式的差别（备注）说清楚。 */
const chatStorageModeHint = computed(() => {
  return form.chatStorage.mode === 'disk'
    ? '聊天文件存储在本地：聊天记录会写入本地磁盘，位置可在下方指定。'
    : '不会在本地存储：只在浏览器里保留少量最近的聊天记录。'
})

const statusText = computed(() => {
  if (saveFailed.value) {
    return '保存失败：浏览器拒绝写入 Cookie（可能被禁用或数据超出容量）。'
  }

  if (isDirty.value) {
    return '有未保存的修改。'
  }

  return isUsingDefaults.value
    ? `当前使用默认配置，保存后写入 Cookie「${configCookieName}」。`
    : `已保存到 Cookie「${configCookieName}」。`
})

/** 把已保存的配置同步回表单。 */
function syncFormFromConfig() {
  form.backgroundImageUrl = config.backgroundImageUrl
  form.defaultSearchEngineId = config.defaultSearchEngineId
  form.searchEngines = config.searchEngines.map((engine) => ({ ...engine }))
  form.apiBaseUrl = config.apiBaseUrl
  form.chatStorage.mode = config.chatStorage.mode
  form.chatStorage.directory = config.chatStorage.directory
  saveFailed.value = false
}

function handleSave() {
  saveFailed.value = !saveConfig({
    backgroundImageUrl: form.backgroundImageUrl,
    defaultSearchEngineId: form.defaultSearchEngineId,
    searchEngines: form.searchEngines.map((engine) => ({ ...engine })),
    apiBaseUrl: form.apiBaseUrl,
    chatStorage: {
      mode: form.chatStorage.mode,
      directory: form.chatStorage.directory,
    },
  })
}

/** 恢复默认：立即清掉 Cookie 并重置运行时配置，同时把表单同步过来。 */
function handleReset() {
  resetConfig()
  syncFormFromConfig()
}

// 用户一改动表单，上一次的保存失败提示就作废，避免显示过期错误。
watch(form, () => {
  saveFailed.value = false
}, { deep: true })

// 切换栏目后内容区回到顶部：内容区是同一个滚动容器，不重置会带着上一个栏目的滚动位置。
watch(activeSection, async () => {
  await nextTick()
  bodyRef.value?.scrollTo({ top: 0 })
})

/** 打开前的 body overflow，关闭时原样恢复。 */
let previousBodyOverflow = ''

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

function lockScroll() {
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
}

function unlockScroll() {
  document.body.style.overflow = previousBodyOverflow
}

watch(
  () => props.open,
  async (open) => {
    if (open) {
      syncFormFromConfig()
      window.addEventListener('keydown', handleKeydown)
      lockScroll()
      await nextTick()
      panelRef.value?.focus()
      return
    }

    window.removeEventListener('keydown', handleKeydown)
    unlockScroll()
  },
)

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  unlockScroll()
})
</script>

<style scoped>
.settings-dialog {
  --sd-border: rgb(15 23 42 / 10%);
  --sd-surface: rgb(255 255 255 / 80%);
  --sd-card-bg: rgb(15 23 42 / 4%);
  --sd-field-bg: rgb(255 255 255 / 80%);
  --sd-field-border: rgb(15 23 42 / 14%);
  --sd-title: #0f172a;
  --sd-text: #475569;
  --sd-muted: #64748b;
  --sd-accent: #1d4ed8;
  --sd-primary-text: #ffffff;
  --sd-danger: #dc2626;
  --sd-nav-hover: rgb(15 23 42 / 6%);
  --sd-nav-active: rgb(37 99 235 / 12%);
  --sd-nav-active-text: #1d4ed8;
  --sd-tag-bg: rgb(37 99 235 / 10%);
  --sd-close-hover: rgb(15 23 42 / 10%);
  --sd-backdrop: rgb(15 23 42 / 45%);
  --sd-shadow: 0 24px 64px rgb(15 23 42 / 26%);

  position: fixed;
  inset: 0;
  z-index: 120;
  display: grid;
  padding: 24px 16px;
  place-items: center;
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .settings-dialog) {
  --sd-border: rgb(255 255 255 / 12%);
  --sd-surface: rgb(15 23 42 / 90%);
  --sd-card-bg: rgb(255 255 255 / 5%);
  --sd-field-bg: rgb(2 6 23 / 45%);
  --sd-field-border: rgb(255 255 255 / 14%);
  --sd-title: #f8fafc;
  --sd-text: #cbd5e1;
  --sd-muted: #94a3b8;
  --sd-accent: #7dd3fc;
  --sd-primary-text: #0f172a;
  --sd-danger: #fca5a5;
  --sd-nav-hover: rgb(255 255 255 / 8%);
  --sd-nav-active: rgb(125 211 252 / 16%);
  --sd-nav-active-text: #7dd3fc;
  --sd-tag-bg: rgb(125 211 252 / 14%);
  --sd-close-hover: rgb(255 255 255 / 14%);
  --sd-backdrop: rgb(2 6 23 / 62%);
  --sd-shadow: 0 24px 64px rgb(0 0 0 / 45%);
}

.settings-dialog__backdrop {
  position: absolute;
  inset: 0;
  background-color: var(--sd-backdrop);
  -webkit-backdrop-filter: blur(3px);
  backdrop-filter: blur(3px);
}

.settings-dialog__panel {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  /* 固定高度：切换栏目时面板不会因内容长短而跳动 */
  height: min(76vh, 680px);
  overflow: hidden;
  border: 1px solid var(--sd-border);
  border-radius: 18px;
  background-color: var(--sd-surface);
  -webkit-backdrop-filter: blur(18px);
  backdrop-filter: blur(18px);
  box-shadow: var(--sd-shadow);
  color: var(--sd-text);
}

.settings-dialog__panel:focus {
  outline: none;
}

/* 右上角圆形关闭按钮 */
.settings-dialog__close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1;
  display: grid;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid var(--sd-field-border);
  border-radius: 50%;
  background-color: var(--sd-field-bg);
  color: var(--sd-text);
  cursor: pointer;
  font-size: 1.25rem;
  line-height: 1;
  place-items: center;
  transition:
    background-color 0.2s ease,
    transform 0.2s ease;
}

.settings-dialog__close:hover {
  background-color: var(--sd-close-hover);
  transform: rotate(90deg);
}

.settings-dialog__header {
  flex: 0 0 auto;
  padding: 18px 62px 14px 22px;
  border-bottom: 1px solid var(--sd-border);
}

.settings-dialog__title {
  margin: 0;
  color: var(--sd-title);
  font-size: 1.15rem;
  font-weight: 700;
}

/* 主体：左栏栏目导航 + 右栏内容 */
.settings-dialog__main {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.settings-dialog__nav {
  display: flex;
  flex: 0 0 138px;
  flex-direction: column;
  gap: 4px;
  padding: 14px 10px;
  border-right: 1px solid var(--sd-border);
  overflow-y: auto;
}

.settings-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 12px;
  border: 0;
  border-radius: 10px;
  background-color: transparent;
  color: var(--sd-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  text-align: left;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.settings-nav-item:hover {
  background-color: var(--sd-nav-hover);
}

.settings-nav-item:focus-visible {
  outline: 2px solid var(--sd-accent);
  outline-offset: 1px;
}

.settings-nav-item.is-active {
  background-color: var(--sd-nav-active);
  color: var(--sd-nav-active-text);
  font-weight: 600;
}

.settings-nav-item__icon {
  flex: 0 0 16px;
  text-align: center;
}

.settings-dialog__body {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  padding: 18px 22px;
  overflow-y: auto;
}

/* 占位栏目：居中一段说明，等后续补配置项 */
.settings-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 100%;
  min-height: 200px;
  padding: 24px 16px;
  text-align: center;
}

.settings-placeholder__icon {
  color: var(--sd-muted);
  font-size: 1.7rem;
  line-height: 1;
  opacity: 0.55;
}

.settings-placeholder__title {
  margin: 0;
  color: var(--sd-title);
  font-size: 0.94rem;
  font-weight: 600;
}

.settings-placeholder__hint {
  margin: 0;
  color: var(--sd-muted);
  font-size: 0.8rem;
  line-height: 1.6;
}

/* 底部操作区：左侧状态说明，右侧按钮组 */
.settings-dialog__footer {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 22px 16px;
  border-top: 1px solid var(--sd-border);
}

.settings-dialog__status {
  margin: 0;
  color: var(--sd-muted);
  font-size: 0.78rem;
  line-height: 1.5;
}

.settings-dialog__status.is-error {
  color: var(--sd-danger);
}

.settings-dialog__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
}

.settings-dialog__button {
  min-height: 36px;
  padding: 0 14px;
  border: 1px solid var(--sd-field-border);
  border-radius: 9px;
  background-color: var(--sd-field-bg);
  color: var(--sd-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.84rem;
  white-space: nowrap;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    opacity 0.2s ease;
}

.settings-dialog__button:hover:not(:disabled) {
  border-color: var(--sd-accent);
  color: var(--sd-accent);
}

.settings-dialog__button--primary {
  border-color: transparent;
  background-color: var(--sd-accent);
  color: var(--sd-primary-text);
}

.settings-dialog__button--primary:hover:not(:disabled) {
  border-color: transparent;
  background-color: var(--sd-accent);
  color: var(--sd-primary-text);
  opacity: 0.85;
}

.settings-dialog__button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.settings-group__title {
  margin: 0 0 14px;
  color: var(--sd-title);
  font-size: 0.95rem;
  font-weight: 700;
}

.settings-field {
  display: block;
}

.settings-field + .settings-field {
  margin-top: 10px;
}

/* 前面隔着一段说明文字时，相邻兄弟选择器不生效，单独给一点上间距 */
.settings-field--spaced {
  margin-top: 14px;
}

.settings-field__label {
  display: block;
  margin-bottom: 5px;
  color: var(--sd-muted);
  font-size: 0.78rem;
}

.settings-field__input {
  width: 100%;
  min-height: 36px;
  padding: 0 10px;
  border: 1px solid var(--sd-field-border);
  border-radius: 9px;
  background-color: var(--sd-field-bg);
  color: var(--sd-text);
  font: inherit;
  font-size: 0.86rem;
}

.settings-field__input:focus {
  border-color: var(--sd-accent);
  outline: none;
}

/*
 * 下拉框的样式不在这里 —— 原生 select 的展开列表是浏览器原生控件、改不了，
 * 所以换成了 `components/common/SelectBox.vue` 的自定义 listbox。
 * 那个组件通过 `--sb-*` 变量取这里的 `--sd-*` 配色，没有 --sd-* 时用自己的默认值。
 */

/* 字段下方的补充说明 */
.settings-hint {
  margin: 10px 0 0;
  color: var(--sd-muted);
  font-size: 0.78rem;
  line-height: 1.6;
}

.settings-hint--muted {
  margin-top: 6px;
  opacity: 0.8;
}

/* 填了但格式不合法：会回落到默认逻辑，用警示色提示 */
.settings-hint--error {
  margin-top: 6px;
  color: var(--sd-danger);
}

/* 说明文字里夹的路径 / 值，用等宽字体和浅底标出来 */
.settings-hint__code {
  padding: 1px 6px;
  border-radius: 6px;
  background-color: var(--sd-tag-bg);
  color: var(--sd-accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.94em;
  white-space: nowrap;
}

.settings-engines {
  display: grid;
  gap: 12px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
}

.settings-engine {
  padding: 12px 14px;
  border: 1px solid var(--sd-border);
  border-radius: 12px;
  background-color: var(--sd-card-bg);
}

.settings-engine__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}

.settings-engine__icon {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  border-radius: 4px;
}

.settings-engine__id {
  color: var(--sd-title);
  font-size: 0.86rem;
  font-weight: 600;
}

.settings-engine__pattern {
  margin-left: auto;
  padding: 2px 8px;
  border-radius: 999px;
  background-color: var(--sd-tag-bg);
  color: var(--sd-accent);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.72rem;
  white-space: nowrap;
}

.settings-dialog-enter-active,
.settings-dialog-leave-active {
  transition: opacity 0.2s ease;
}

.settings-dialog-enter-from,
.settings-dialog-leave-to {
  opacity: 0;
}

.settings-dialog-enter-active .settings-dialog__panel,
.settings-dialog-leave-active .settings-dialog__panel {
  transition: transform 0.2s ease;
}

.settings-dialog-enter-from .settings-dialog__panel,
.settings-dialog-leave-to .settings-dialog__panel {
  transform: translateY(12px) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .settings-dialog-enter-active,
  .settings-dialog-leave-active,
  .settings-dialog-enter-active .settings-dialog__panel,
  .settings-dialog-leave-active .settings-dialog__panel,
  .settings-dialog__close {
    transition: none;
  }

  .settings-dialog__close:hover {
    transform: none;
  }
}

@media (max-width: 640px) {
  .settings-dialog {
    padding: 12px;
  }

  .settings-dialog__panel {
    height: 88vh;
  }

  /* 窄屏：左栏改成横向标签条，放在内容上方 */
  .settings-dialog__main {
    flex-direction: column;
  }

  .settings-dialog__nav {
    flex: 0 0 auto;
    flex-direction: row;
    gap: 6px;
    padding: 10px 12px;
    border-right: 0;
    border-bottom: 1px solid var(--sd-border);
    overflow-x: auto;
    overflow-y: hidden;
  }

  .settings-nav-item {
    flex: 0 0 auto;
    min-height: 34px;
    padding: 0 12px;
    border-radius: 999px;
  }

  .settings-dialog__body {
    padding: 16px;
  }

  .settings-dialog__header {
    padding: 16px 58px 12px 16px;
  }

  .settings-dialog__footer {
    flex-direction: column;
    align-items: stretch;
    padding: 10px 16px 14px;
  }

  .settings-dialog__actions {
    justify-content: flex-end;
  }
}
</style>
