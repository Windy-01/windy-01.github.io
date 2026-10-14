<template>
  <div class="chat-main">
    <DocumentMain>
      <div ref="workspaceRef" class="chat-workspace">
        <!-- 第一栏：图标导航（5%）。 -->
        <aside class="chat-col chat-col--rail" :style="{ width: `${railWidth}%` }">
          <!-- 占位内容：替换为真实导航图标。 -->
          <button class="chat-rail__button" type="button" aria-label="会话">☰</button>
          <button class="chat-rail__button" type="button" aria-label="联系人">◇</button>
          <button class="chat-rail__button" type="button" aria-label="设置">⚙</button>
        </aside>

        <!-- 第一栏与第二栏之间不提供拖拽，宽度固定为 5% / 25%。 -->

        <!-- 第二栏：搜索栏 + 列表（25%）。 -->
        <section class="chat-col chat-col--side" :style="{ width: `${sideWidth}%` }">
          <div class="chat-side__search">
            <input
              class="chat-side__search-input"
              type="text"
              placeholder="搜索"
              aria-label="搜索"
            >
          </div>
          <div class="chat-side__body">
            <!-- 占位内容：替换为会话/结果列表。 -->
            <p class="chat-placeholder">列表区域</p>
          </div>
        </section>

        <div
          class="chat-splitter chat-splitter--column"
          :style="{ left: `calc(${railWidth + sideWidth}% - 4px)` }"
          role="separator"
          aria-orientation="vertical"
          aria-label="调整第二栏宽度"
          @pointerdown.prevent="startColumnDrag(1, $event)"
        />

        <!-- 第三栏：展示区 + 合并区（功能列表 + 输入，70%）。 -->
        <section ref="mainColRef" class="chat-col chat-col--main" :style="{ width: `${mainWidth}%` }">
          <div class="chat-pane chat-pane--display" :style="{ height: `${displayHeight}%` }">
            <!-- 占位内容：替换为消息展示区。 -->
            <p class="chat-placeholder">展示窗口</p>
          </div>

          <div
            class="chat-splitter chat-splitter--row"
            :style="{ top: `calc(${displayHeight}% - 4px)` }"
            role="separator"
            aria-orientation="horizontal"
            aria-label="调整展示窗口高度"
            @pointerdown.prevent="startRowDrag(0, $event)"
          />

          <!-- 合并区：功能列表在上（固定 5% 高），输入窗口在下；两者之间不提供拖拽手柄。 -->
          <div class="chat-compose__tools" :style="{ height: `${toolsHeight}%` }">
            <!-- 占位内容：替换为功能列表。 -->
            <p class="chat-placeholder">功能列表</p>
          </div>

          <div class="chat-compose__input">
            <!-- 占位内容：替换为消息输入框。 -->
            <p class="chat-placeholder">输入窗口</p>
          </div>
        </section>
      </div>
    </DocumentMain>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue'

import DocumentMain from '../layout/DocumentMain.vue'

type DragKind = 'column' | 'row'

interface DragState {
  kind: DragKind
  index: number
  startPosition: number
  startSizes: number[]
  containerSize: number
}

const minColumnWidth = 3
const minRowHeight = 8

const workspaceRef = ref<HTMLElement | null>(null)
const mainColRef = ref<HTMLElement | null>(null)

const columnWidths = ref<number[]>([5, 25, 70])
// 展示区高度（可拖拽调整）。下方合并区自动占满剩余高度。
const displayHeight = ref(60)
// 功能列表固定高度：占主列 5%。与输入窗口上下相邻、合并为一块区域，不可拖拽调整比例。
const toolsHeight = 5

const railWidth = computed(() => columnWidths.value[0] ?? 0)
const sideWidth = computed(() => columnWidths.value[1] ?? 0)
const mainWidth = computed(() => columnWidths.value[2] ?? 0)

const composeHeight = computed(() => 100 - displayHeight.value)

let dragState: DragState | null = null

function beginDrag(kind: DragKind, index: number, event: PointerEvent) {
  const container = kind === 'column' ? workspaceRef.value : mainColRef.value

  if (!container) {
    return
  }

  dragState = {
    kind,
    index,
    startPosition: kind === 'column' ? event.clientX : event.clientY,
    startSizes: [...(kind === 'column' ? columnWidths.value : [displayHeight.value, composeHeight.value])],
    containerSize: kind === 'column' ? container.clientWidth : container.clientHeight,
  }

  document.body.style.userSelect = 'none'
  document.body.style.cursor = kind === 'column' ? 'col-resize' : 'row-resize'
  window.addEventListener('pointermove', handleDragMove)
  window.addEventListener('pointerup', endDrag)
}

function startColumnDrag(index: number, event: PointerEvent) {
  beginDrag('column', index, event)
}

function startRowDrag(index: number, event: PointerEvent) {
  beginDrag('row', index, event)
}

function handleDragMove(event: PointerEvent) {
  const state = dragState

  if (!state || state.containerSize <= 0) {
    return
  }

  const pointer = state.kind === 'column' ? event.clientX : event.clientY
  const delta = ((pointer - state.startPosition) / state.containerSize) * 100
  const first = state.startSizes[state.index]
  const second = state.startSizes[state.index + 1]

  if (first === undefined || second === undefined) {
    return
  }

  const minSize = state.kind === 'column' ? minColumnWidth : minRowHeight
  const total = first + second
  // 纵向拖拽时，合并区还要放得下固定高度的功能列表，上界需再减去 toolsHeight。
  const upperBound = state.kind === 'column' ? total - minSize : total - minSize - toolsHeight
  const clampedFirst = Math.min(Math.max(first + delta, minSize), upperBound)

  if (state.kind === 'column') {
    const next = [...state.startSizes]
    next[state.index] = clampedFirst
    next[state.index + 1] = total - clampedFirst
    columnWidths.value = next
  } else {
    displayHeight.value = clampedFirst
  }
}

function endDrag() {
  dragState = null
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  window.removeEventListener('pointermove', handleDragMove)
  window.removeEventListener('pointerup', endDrag)
}

onUnmounted(endDrag)
</script>

<style scoped>
.chat-main {
  flex: 0 0 auto;
  width: 80%;
  height: calc(100vh - 112px);
}

/* 去掉 DocumentMain 作为“外圈”的存在：不再有边框、阴影与内边距，
   让 chat 直接铺满它，保留半透明底色、毛玻璃与圆角作为 chat 表面。
   重复类名以提高优先级，避免与 DocumentMain 的 scoped 样式（含暗色规则）冲突。 */
.chat-main :deep(.layout-document-main.layout-document-main) {
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
  border: 0;
  box-shadow: none;
}

.chat-main :deep(.layout-document-main__content) {
  height: 100%;
}

/* 第一栏 / 第二栏的背景不透明度：改这两个变量即可微调（暗色值见下方 .dark-mode 覆盖）。 */
.chat-workspace {
  --chat-rail-bg: rgb(255 255 255 / 20%);
  --chat-side-bg: rgb(255 255 255 / 20%);

  position: relative;
  display: flex;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.chat-col {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}

.chat-col--rail {
  align-items: center;
  gap: 8px;
  padding: 12px 0;
  background-color: var(--chat-rail-bg);
  border-right: 1px solid rgb(15 23 42 / 8%);
}

.chat-rail__button {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: #334155;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
}

.chat-rail__button:hover {
  background-color: rgb(15 23 42 / 8%);
}

.chat-col--side {
  background-color: var(--chat-side-bg);
  border-right: 1px solid rgb(15 23 42 / 8%);
}

.chat-side__search {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  height: 56px;
  padding: 0 12px;
  border-bottom: 1px solid rgb(15 23 42 / 8%);
}

.chat-side__search-input {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border: 1px solid rgb(15 23 42 / 10%);
  border-radius: 999px;
  background-color: rgb(255 255 255 / 60%);
  color: inherit;
  font: inherit;
  font-size: 0.95rem;
}

.chat-side__search-input:focus {
  outline: 2px solid rgb(59 130 246 / 45%);
  outline-offset: 1px;
}

.chat-side__body {
  flex: 1 1 auto;
  min-height: 0;
  padding: 12px;
  overflow: auto;
}

.chat-col--main {
  position: relative;
}

.chat-pane {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  min-height: 0;
  padding: 12px;
  overflow: auto;
}

.chat-pane--display {
  background-color: rgb(255 255 255 / 26%);
}

/* 合并区：功能列表（上，固定 5% 高）+ 输入窗口（下）。
   同属一块区域，两者之间无拖拽手柄、无分隔线。 */
.chat-compose__tools {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  min-height: 0;
  padding: 4px 12px;
  overflow: hidden;
  background-color: rgb(255 255 255 / 20%);
}

.chat-compose__tools .chat-placeholder {
  font-size: 0.8rem;
  line-height: 1.2;
}

.chat-compose__input {
  display: grid;
  flex: 1 1 auto;
  place-items: center;
  min-height: 0;
  padding: 12px;
  overflow: auto;
  background-color: rgb(255 255 255 / 30%);
}

.chat-placeholder {
  margin: 0;
  color: #64748b;
  font-size: 0.95rem;
}

.chat-splitter {
  position: absolute;
  z-index: 3;
  touch-action: none;
}

.chat-splitter--column {
  top: 0;
  width: 8px;
  height: 100%;
  cursor: col-resize;
}

.chat-splitter--row {
  left: 0;
  width: 100%;
  height: 8px;
  cursor: row-resize;
}

.chat-splitter::after {
  position: absolute;
  inset: 0;
  margin: auto;
  border-radius: 999px;
  background-color: rgb(15 23 42 / 14%);
  opacity: 0;
  content: '';
  transition: opacity 0.2s ease;
}

.chat-splitter--column::after {
  width: 2px;
  height: 100%;
}

.chat-splitter--row::after {
  width: 100%;
  height: 2px;
}

.chat-splitter:hover::after,
.chat-splitter:active::after {
  opacity: 1;
}

:global(.dark-mode) .chat-workspace {
  --chat-rail-bg: rgb(15 23 42 / 16%);
  --chat-side-bg: rgb(15 23 42 / 22%);
}

:global(.dark-mode) .chat-col--rail,
:global(.dark-mode) .chat-col--side {
  border-color: rgb(255 255 255 / 10%);
}

:global(.dark-mode) .chat-side__search {
  border-bottom-color: rgb(255 255 255 / 10%);
}

:global(.dark-mode) .chat-rail__button {
  color: #cbd5e1;
}

:global(.dark-mode) .chat-rail__button:hover {
  background-color: rgb(255 255 255 / 10%);
}

:global(.dark-mode) .chat-pane--display {
  background-color: rgb(15 23 42 / 20%);
}

:global(.dark-mode) .chat-compose__tools {
  background-color: rgb(15 23 42 / 12%);
}

:global(.dark-mode) .chat-compose__input {
  background-color: rgb(15 23 42 / 26%);
}

:global(.dark-mode) .chat-placeholder {
  color: #94a3b8;
}

:global(.dark-mode) .chat-splitter::after {
  background-color: rgb(255 255 255 / 18%);
}

@media (max-width: 768px) {
  .chat-main {
    width: 100%;
    height: calc(100vh - 88px);
  }

  .chat-main :deep(.layout-document-main.layout-document-main) {
    padding: 0;
  }

  .chat-workspace {
    min-width: 560px;
    overflow-x: auto;
    overflow-y: hidden;
  }
}
</style>
