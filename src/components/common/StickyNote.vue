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
      <span class="sticky-note__title">{{ config.stickyNote.title }}</span>

      <div class="sticky-note__actions">
        <!-- 编辑入口只在展开时出现，最小化态保持「便签 −」的紧凑样子。 -->
        <button
          v-if="!minimized"
          class="sticky-note__button"
          type="button"
          :aria-label="isEditing ? '完成编辑' : '编辑便签'"
          :aria-pressed="isEditing"
          :title="isEditing ? '完成编辑' : '编辑'"
          @click="toggleEditing"
        >
          <svg
            v-if="isEditing"
            class="sticky-note__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6 9 17l-5-5" />
          </svg>
          <svg
            v-else
            class="sticky-note__icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>

        <button
          class="sticky-note__button"
          type="button"
          :aria-label="minimized ? '展开便签' : '最小化便签'"
          :title="minimized ? '展开' : '最小化'"
          @click="toggleMinimized"
        >
          <span aria-hidden="true">{{ minimized ? '+' : '−' }}</span>
        </button>
      </div>
    </header>

    <div v-show="!minimized" class="sticky-note__body">
      <!-- 编辑态：直接编辑任务列表的 Markdown 源文本 -->
      <textarea
        v-if="isEditing"
        ref="editorRef"
        v-model="content"
        class="sticky-note__editor"
        aria-label="便签内容（Markdown 任务列表）"
        placeholder="- [ ] 待办事项&#10;- [x] 已完成事项"
        spellcheck="false"
      />

      <!-- 展示态：点左侧勾选框可直接切换完成状态（写回源文本） -->
      <div
        v-else
        ref="contentRef"
        class="sticky-note__content"
        v-html="html"
        @click="handleContentClick"
      />
    </div>

    <!-- 落盘失败时给个明确提示：内容还在页面上，但刷新会丢 -->
    <p v-if="saveFailed && !minimized" class="sticky-note__error" role="status">
      保存失败：Cookie 被禁用或内容超出容量，改动只保留在当前页面。
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { useConfig } from '../../config'
import { renderMarkdown } from '../../utils/markdown'

const props = defineProps<{
  /** 是否展示便签小窗。 */
  open: boolean
}>()

const { config, saveConfig } = useConfig()

const noteRef = ref<HTMLElement | null>(null)
const barRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const editorRef = ref<HTMLTextAreaElement | null>(null)
const minimized = ref(false)
const isEditing = ref(false)
const dragging = ref(false)

/**
 * 便签正文。初始值来自 cookie（没有则用 `src/config` 的默认值），
 * 编辑后防抖写回 cookie。
 */
const content = ref(config.stickyNote.content)

/** 写 cookie 失败（被禁用或内容超长）时提示；此时内容仍留在当前页面。 */
const saveFailed = ref(false)

/** 输入停顿多久后落盘，避免每敲一个字就写一次 cookie。 */
const saveDebounceMs = 400
let saveTimer: number | undefined

/** 立刻把当前正文写进 cookie。 */
function persistContent() {
  window.clearTimeout(saveTimer)
  saveTimer = undefined
  saveFailed.value = !saveConfig({ stickyNoteContent: content.value })
}

/** 防抖落盘：编辑过程中不写，停顿后再写。 */
function schedulePersist() {
  saveFailed.value = false
  window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(persistContent, saveDebounceMs)
}

/** 便签关闭 / 组件卸载前，把还没落盘的改动补写一次。 */
function flushPendingSave() {
  if (saveTimer !== undefined) {
    persistContent()
  }
}

// 正文变化就排一次落盘。
// 与配置里已有的值相同说明这次变化来自外部同步（比如设置面板「恢复默认」），
// 不需要再回写一遍，否则会把刚清掉的 cookie 又写回来。
watch(content, (value) => {
  if (value === config.stickyNote.content) {
    return
  }

  schedulePersist()
})

// 外部改动（恢复默认）会把配置重置，这里跟随同步。
watch(
  () => config.stickyNote.content,
  (value) => {
    if (value === content.value) {
      return
    }

    window.clearTimeout(saveTimer)
    saveTimer = undefined
    content.value = value
    saveFailed.value = false
  },
)

// 关闭便签时补写，避免「刚改完就关掉」丢改动。
watch(
  () => props.open,
  (open) => {
    if (!open) {
      flushPendingSave()
    }
  },
)

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

const html = computed(() => renderMarkdown(content.value))

/**
 * 解禁渲染出来的勾选框。
 *
 * marked 给任务列表生成的 checkbox 带 `disabled`，不点不动；这里去掉它，
 * 点击事件由 `handleContentClick` 接管（状态以源文本为准，改完重新渲染）。
 */
function enableCheckboxes() {
  const boxes = contentRef.value?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')

  boxes?.forEach((box) => box.removeAttribute('disabled'))
}

// 渲染结果、展示/编辑模式、便签显隐三者任一变化后，都要重新解禁一次。
// 便签默认关闭，首次打开时节点才挂上，所以要一并监听 open。
watch(
  [html, isEditing, () => props.open],
  async () => {
    if (isEditing.value) {
      return
    }

    await nextTick()
    enableCheckboxes()
  },
  { immediate: true, flush: 'post' },
)

/** 任务列表行的前缀：`- [ ]` / `* [x]` / `+ [X]` 等。 */
const taskLinePattern = /^\s*[-*+]\s+\[[ xX]\]/
const checkedTaskPattern = /^\s*[-*+]\s+\[[xX]\]/
const fencePattern = /^\s*(?:```|~~~)/

/**
 * 切换第 index 个任务的完成状态。
 *
 * 逐行扫描而不是直接对全文跑正则：代码围栏（``` / ~~~）里的 `- [ ]`
 * 不会被 marked 渲染成勾选框，必须跳过，否则序号会和渲染结果错位。
 */
function toggleTaskAt(source: string, index: number): string {
  const lines = source.split('\n')
  let seen = -1
  let inFence = false

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? ''

    if (fencePattern.test(line)) {
      inFence = !inFence
      continue
    }

    if (inFence || !taskLinePattern.test(line)) {
      continue
    }

    seen += 1

    if (seen !== index) {
      continue
    }

    lines[i] = checkedTaskPattern.test(line)
      ? line.replace(/^(\s*[-*+]\s+)\[[xX]\]/, '$1[ ]')
      : line.replace(/^(\s*[-*+]\s+)\[ \]/, '$1[x]')

    break
  }

  return lines.join('\n')
}

/** 点勾选框 = 切换对应任务；状态由源文本驱动，所以先拦掉浏览器自己的勾选。 */
function handleContentClick(event: MouseEvent) {
  const target = event.target

  if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') {
    return
  }

  event.preventDefault()

  const boxes = contentRef.value?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
  const index = boxes === undefined ? -1 : Array.from(boxes).indexOf(target)

  if (index < 0) {
    return
  }

  content.value = toggleTaskAt(content.value, index)
}

/** 切换编辑态；进入编辑时聚焦并把光标放到末尾，方便接着写。 */
async function toggleEditing() {
  isEditing.value = !isEditing.value

  if (!isEditing.value) {
    return
  }

  await nextTick()

  const editor = editorRef.value

  if (!editor) {
    return
  }

  editor.focus()
  editor.setSelectionRange(editor.value.length, editor.value.length)
}

const noteStyle = computed<Record<string, string>>(() => {
  const offset = position.value ?? config.stickyNote.offset

  return {
    '--sn-width': `${config.stickyNote.width}px`,
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

  // 最小化后正文不可见，编辑态一并退出，避免展开时莫名其妙还是输入框。
  if (minimized.value) {
    isEditing.value = false
  }

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
  flushPendingSave()
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
  --sn-danger: #dc2626;
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
  --sn-danger: #fca5a5;
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

.sticky-note__actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 2px;
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

.sticky-note__button:focus-visible {
  outline: 2px solid var(--sn-accent);
  outline-offset: 1px;
}

/* 编辑态：笔换成对勾，用强调色标出来 */
.sticky-note__button[aria-pressed='true'] {
  color: var(--sn-accent);
}

.sticky-note__icon {
  display: block;
  width: 13px;
  height: 13px;
}

.sticky-note__body {
  max-height: 40vh;
  padding: 10px 12px 12px;
  overflow-y: auto;
}

/* 编辑态：直接编辑任务列表的 Markdown 源文本 */
.sticky-note__editor {
  display: block;
  width: 100%;
  min-height: 168px;
  max-height: 40vh;
  padding: 0;
  border: 0;
  background-color: transparent;
  color: var(--sn-text);
  font-family: inherit;
  font-size: inherit;
  line-height: 1.7;
  resize: none;
}

.sticky-note__editor:focus {
  outline: none;
}

.sticky-note__editor::placeholder {
  color: var(--sn-muted);
}

/* 内容为空时给一句提示，避免看起来像坏了 */
.sticky-note__content:empty::before {
  content: '暂无内容，点右上角 ✎ 开始编辑';
  color: var(--sn-muted);
}

/* 落盘失败提示：固定在正文下方，不跟着正文滚动 */
.sticky-note__error {
  flex: 0 0 auto;
  margin: 0;
  padding: 6px 12px 8px;
  border-top: 1px solid var(--sn-border);
  color: var(--sn-danger);
  font-size: 0.72rem;
  line-height: 1.5;
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
  cursor: pointer;
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
