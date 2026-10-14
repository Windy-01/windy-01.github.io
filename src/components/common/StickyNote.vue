<template>
  <section
    v-if="open"
    ref="noteRef"
    class="sticky-note"
    :class="{ 'is-minimized': minimized, 'is-dragging': dragging }"
    :style="noteStyle"
    aria-label="便签"
  >
    <!-- 标题栏同时是拖动手柄 -->
    <header
      ref="barRef"
      class="sticky-note__bar"
      @pointerdown="startDrag"
      @pointermove="moveDrag"
      @pointerup="endDrag"
      @pointercancel="endDrag"
    >
      <span class="sticky-note__title">{{ config.title }}</span>

      <button
        class="sticky-note__button"
        type="button"
        :aria-label="minimized ? '展开便签' : '最小化便签'"
        :title="minimized ? '展开' : '最小化'"
        @click="toggleMinimized"
      >
        <span aria-hidden="true">{{ minimized ? '+' : '−' }}</span>
      </button>
    </header>

    <div v-show="!minimized" class="sticky-note__body">
      <!-- 内容暂时只做展示：正文来自 config，改动不落盘。 -->
      <div class="sticky-note__content" v-html="html" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

import { stickyNote as config } from '../../config/stickyNote'
import { renderMarkdown } from '../../utils/markdown'

defineProps<{
  /** 是否展示便签小窗。 */
  open: boolean
}>()

const noteRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)
const minimized = ref(false)
const dragging = ref(false)

/**
 * 统一用「距视口右边缘 / 上边缘的偏移」定位，不用 left。
 * 这样最小化时 width 变窄，收缩方向自然朝向**右上角**（右边缘不动），
 * 而不是左边缘不动、往左上收。
 */
const position = ref<{ right: number, top: number } | null>(null)

let dragOrigin = {
  pointerX: 0,
  pointerY: 0,
  right: 0,
  top: 0,
}

const html = computed(() => renderMarkdown(config.content))

const noteStyle = computed<Record<string, string>>(() => {
  const offset = position.value ?? config.offset

  return {
    '--sn-width': `${config.width}px`,
    right: `${offset.right}px`,
    top: `${offset.top}px`,
  }
})

/** 把偏移夹在视口内，避免拖出屏幕后找不回来。 */
function clampOffset(right: number, top: number) {
  const element = noteRef.value

  if (!element) {
    return { right, top }
  }

  const { width, height } = element.getBoundingClientRect()
  const maxRight = Math.max(8, window.innerWidth - width - 8)
  const maxTop = Math.max(8, window.innerHeight - height - 8)

  return {
    right: Math.min(Math.max(8, right), maxRight),
    top: Math.min(Math.max(8, top), maxTop),
  }
}

function startDrag(event: PointerEvent) {
  // 标题栏里的按钮不触发拖动。
  if (event.target instanceof Element && event.target.closest('button')) {
    return
  }

  const element = noteRef.value

  if (!element) {
    return
  }

  const rect = element.getBoundingClientRect()
  const right = window.innerWidth - rect.right
  const top = rect.top

  position.value = { right, top }
  dragging.value = true
  dragOrigin = {
    pointerX: event.clientX,
    pointerY: event.clientY,
    right,
    top,
  }

  barRef.value?.setPointerCapture(event.pointerId)
}

function moveDrag(event: PointerEvent) {
  if (!dragging.value) {
    return
  }

  // 指针右移 → 元素右移 → 距右边缘的偏移变小，故取负号。
  position.value = clampOffset(
    dragOrigin.right - (event.clientX - dragOrigin.pointerX),
    dragOrigin.top + (event.clientY - dragOrigin.pointerY),
  )
}

function endDrag(event: PointerEvent) {
  if (!dragging.value) {
    return
  }

  dragging.value = false
  barRef.value?.releasePointerCapture(event.pointerId)
}

/** 最小化 / 还原：尺寸变化后重新夹一次，防止展开时越出左边界。 */
async function toggleMinimized() {
  minimized.value = !minimized.value
  await nextTick()

  if (!position.value) {
    return
  }

  const rect = noteRef.value?.getBoundingClientRect()

  if (!rect) {
    return
  }

  position.value = clampOffset(window.innerWidth - rect.right, rect.top)
}

/** 视口变化后重新夹一次，防止便签留在可视区外。 */
function handleResize() {
  if (!position.value) {
    return
  }

  position.value = clampOffset(position.value.right, position.value.top)
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.sticky-note {
  /* 容器外观对齐 DocumentMain：同为白色玻璃描边 + 半透明底 + 20px 圆角 */
  --sn-edge: rgb(255 255 255 / 45%);
  --sn-surface: rgb(255 255 255 / 26.9%);
  --sn-shadow: 0 16px 40px rgb(15 23 42 / 12%);

  /* 内部文字配色对齐 MarkdownView */
  --sn-bar: rgb(255 255 255 / 48%);
  --sn-border: rgb(15 23 42 / 12%);
  --sn-code-bg: rgb(15 23 42 / 5%);
  --sn-title: #0f172a;
  --sn-text: #1e293b;
  --sn-muted: #64748b;
  --sn-accent: #2563eb;
  --sn-hover: rgb(15 23 42 / 10%);

  position: fixed;
  z-index: 30;
  display: flex;
  flex-direction: column;
  width: var(--sn-width);
  max-width: calc(100vw - 32px);
  overflow: hidden;
  border: 1px solid var(--sn-edge);
  border-radius: 20px;
  background-color: var(--sn-surface);
  /* 与 document 唯一的差别：模糊加大到 28px */
  -webkit-backdrop-filter: blur(28px);
  backdrop-filter: blur(28px);
  box-shadow: var(--sn-shadow);
  color: var(--sn-text);
  font-size: 0.84rem;
}

@supports not ((backdrop-filter: blur(28px)) or (-webkit-backdrop-filter: blur(28px))) {
  .sticky-note {
    background-color: rgb(255 255 255 / 72%);
  }
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .sticky-note) {
  --sn-edge: rgb(255 255 255 / 18%);
  --sn-surface: rgb(15 23 42 / 60%);
  --sn-shadow: 0 16px 40px rgb(0 0 0 / 38%);

  --sn-bar: rgb(255 255 255 / 10%);
  --sn-border: rgb(255 255 255 / 14%);
  --sn-code-bg: rgb(255 255 255 / 8%);
  --sn-title: #f8fafc;
  --sn-text: #e2e8f0;
  --sn-muted: #94a3b8;
  --sn-accent: #7dd3fc;
  --sn-hover: rgb(255 255 255 / 14%);
}

@supports not ((backdrop-filter: blur(28px)) or (-webkit-backdrop-filter: blur(28px))) {
  :global(.dark-mode .sticky-note) {
    background-color: rgb(15 23 42 / 88%);
  }
}

.sticky-note.is-dragging {
  box-shadow: 0 24px 56px rgb(15 23 42 / 30%);
}

.sticky-note__bar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--sn-border);
  background-color: var(--sn-bar);
  cursor: grab;
  touch-action: none;
  user-select: none;
}

/* 最小化：横向也收缩到「便签 −」的宽度，中间不留空白 */
.sticky-note.is-minimized {
  width: auto;
}

.sticky-note.is-minimized .sticky-note__bar {
  gap: 8px;
  justify-content: flex-start;
  border-bottom: 0;
}

.sticky-note.is-minimized .sticky-note__title {
  flex: 0 0 auto;
}

.sticky-note.is-dragging .sticky-note__bar {
  cursor: grabbing;
}

.sticky-note__title {
  overflow: hidden;
  color: var(--sn-title);
  font-size: 0.82rem;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.sticky-note__button {
  display: grid;
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background-color: transparent;
  color: var(--sn-text);
  cursor: pointer;
  font-size: 0.95rem;
  line-height: 1;
  place-items: center;
  transition: background-color 0.2s ease;
}

.sticky-note__button:hover {
  background-color: var(--sn-hover);
}

.sticky-note__body {
  max-height: 40vh;
  padding: 10px 12px 12px;
  overflow-y: auto;
}

/* 任务列表：勾选框 + 文本一行一条 */
.sticky-note__content :deep(ul) {
  margin: 0;
  padding: 0;
  list-style: none;
}

.sticky-note__content :deep(li) {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 3px 0;
  line-height: 1.5;
}

.sticky-note__content :deep(li input[type='checkbox']) {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  margin: 3px 0 0;
  accent-color: var(--sn-accent);
  text-decoration: none;
}

/* 已完成的条目：置灰 + 删除线 */
.sticky-note__content :deep(li:has(input[type='checkbox']:checked)) {
  color: var(--sn-muted);
  text-decoration: line-through;
}

.sticky-note__content :deep(p) {
  margin: 0 0 8px;
  line-height: 1.6;
}

.sticky-note__content :deep(p:last-child) {
  margin-bottom: 0;
}

.sticky-note__content :deep(a) {
  color: var(--sn-accent);
}

.sticky-note__content :deep(code) {
  padding: 1px 5px;
  border-radius: 5px;
  background-color: var(--sn-code-bg);
  font-size: 0.78rem;
}

@media (prefers-reduced-motion: reduce) {
  .sticky-note__button {
    transition: none;
  }
}
</style>
