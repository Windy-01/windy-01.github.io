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

        <div class="settings-dialog__body">
          <!-- 内容暂时与 src/config 一一对应，后续接入真实配置读写时替换这里。 -->
          <section class="settings-group">
            <h3 class="settings-group__title">背景</h3>

            <label class="settings-field">
              <span class="settings-field__label">背景图地址</span>
              <input
                v-model="form.backgroundImageUrl"
                class="settings-field__input"
                type="text"
                spellcheck="false"
              >
            </label>
          </section>

          <section class="settings-group">
            <h3 class="settings-group__title">搜索引擎</h3>

            <label class="settings-field">
              <span class="settings-field__label">默认引擎</span>
              <select v-model="defaultEngineId" class="settings-field__input">
                <option
                  v-for="engine in form.searchEngines"
                  :key="engine.id"
                  :value="engine.id"
                >
                  {{ engine.name }}
                </option>
              </select>
            </label>

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
          </section>
        </div>

        <p class="settings-dialog__note">
          内容与 <code>src/config</code> 一一对应，修改暂不持久化。
        </p>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'

import { backgroundImageUrl } from '../../config/background'
import { defaultSearchEngine, searchEngines } from '../../config/searchEngines'

const props = defineProps<{
  /** 是否展示设置弹窗。 */
  open: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const panelRef = ref<HTMLElement | null>(null)

/** 表单是 config 的一份副本：设置面板暂时只做展示，改动不落盘。 */
const form = reactive({
  backgroundImageUrl,
  searchEngines: searchEngines.map((engine) => ({ ...engine })),
})

const defaultEngineId = ref(defaultSearchEngine.id)

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
  max-width: 640px;
  max-height: min(78vh, 720px);
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

.settings-dialog__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 18px 22px;
  overflow-y: auto;
}

.settings-dialog__note {
  flex: 0 0 auto;
  margin: 0;
  padding: 12px 22px 16px;
  border-top: 1px solid var(--sd-border);
  color: var(--sd-muted);
  font-size: 0.78rem;
}

.settings-dialog__note code {
  padding: 1px 5px;
  border-radius: 5px;
  background-color: var(--sd-tag-bg);
  color: var(--sd-accent);
  font-size: 0.76rem;
}

.settings-group + .settings-group {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--sd-border);
}

.settings-group__title {
  margin: 0 0 12px;
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
    max-height: 88vh;
  }

  .settings-dialog__body {
    padding: 16px;
  }

  .settings-dialog__header {
    padding: 16px 58px 12px 16px;
  }

  .settings-dialog__note {
    padding: 10px 16px 14px;
  }
}
</style>
