<template>
  <div class="chat-main">
    <DocumentMain>
      <div ref="workspaceRef" class="chat-workspace" :class="{ 'is-agent': isAgentTab }">
        <!-- 第一栏：图标导航（5%）。聊天 / 群聊 / Agent 是列表的三个标签，
             Agent 标签本身就是「与 Agent 对话」的入口，设置只做占位。 -->
        <aside class="chat-col chat-col--rail" :style="{ width: `${railWidth}%` }">
          <button
            v-for="tab in railTabs"
            :key="tab.id"
            class="chat-rail__button"
            :class="{ 'is-active': activeTab === tab.id }"
            type="button"
            :title="tab.label"
            :aria-label="tab.label"
            :aria-current="activeTab === tab.id ? 'true' : undefined"
            @click="handleRailSelect(tab.id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle
                v-for="circle in tab.circles"
                :key="`c-${circle[0]}-${circle[1]}`"
                :cx="circle[0]"
                :cy="circle[1]"
                :r="circle[2]"
              />
              <path v-for="path in tab.paths" :key="path" :d="path" />
            </svg>
          </button>
        </aside>

        <!-- Agent 标签：整块换成独立的对话布局（历史侧栏 + 居中对话流 + 悬浮输入框），
             不再复用下面「会话列表 + 消息区」那套三栏。 -->
        <ChatAgent v-if="isAgentTab" />

        <template v-else>
          <!-- 第一栏与第二栏之间不提供拖拽，宽度固定为 5% / 25%。 -->

          <!-- 第二栏：搜索栏 + 会话列表（25%）；设置标签只渲染占位块。 -->
          <section class="chat-col chat-col--side" :style="{ width: `${sideWidth}%` }">
            <div v-if="activeTab !== 'settings'" class="chat-side__search">
              <div ref="searchAreaRef" class="chat-side__search-area">
                <input
                  v-model="keyword"
                  class="chat-side__search-input"
                  type="text"
                  placeholder="搜索"
                  aria-label="搜索会话"
                  @focus="openSearchPanel"
                  @click="openSearchPanel"
                  @keydown.esc="closeSearchPanel"
                  @keydown.enter="handleSearchEnter"
                >

                <!-- 点击搜索栏弹出的二级窗口：添加好友 / 群聊 + 搜索记录。 -->
                <ChatSearchPanel
                  v-if="searchPanelOpen"
                  :history="config.searchHistory"
                  :note="searchNote"
                  @select="handleHistorySelect"
                  @clear="handleHistoryClear"
                  @add-contact="handleAddContact"
                />
              </div>
            </div>
            <div class="chat-side__body">
              <ChatConversationList
                v-if="activeTab !== 'settings'"
                :conversations="visibleConversations"
                :active-id="activeConversationId"
                :empty-text="listEmptyText"
                @select="handleSelect"
              />

              <!-- 设置标签：只做占位，不提供任何配置项。 -->
              <div v-else class="chat-side__placeholder">
                <p class="chat-side__placeholder-title">设置</p>
                <p class="chat-side__placeholder-text">栏目已预留，配置项待补充。</p>
              </div>
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

          <!-- 第三栏：展示区 + 合并区（功能列表 + 输入，70%）。
               没有选中会话时不显示下方合并区，展示区铺满整栏。 -->
          <section ref="mainColRef" class="chat-col chat-col--main" :style="{ width: `${mainWidth}%` }">
            <div class="chat-pane chat-pane--display" :style="displayPaneStyle">
              <ChatMessageList
                :conversation="activeConversation"
                :messages="messages"
                :loading="loading"
                :error="error"
                :empty-text="messageEmptyText"
              />
            </div>

            <template v-if="activeConversationId !== ''">
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
                <ChatToolbar :note="toolNote" @action="handleToolAction" />
              </div>

              <div class="chat-compose__input">
                <ChatComposer :hint="composerHint" @send="handleSend" />
              </div>
            </template>
          </section>
        </template>
      </div>
    </DocumentMain>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import type { ChatConversation, ChatMessage } from '../../api/chat'
import { fetchConversations, fetchMessages } from '../../api/chat'
import {
  buildColumnWidths,
  chatRailWidth,
  clampDisplayHeight,
  pushSearchHistory,
  useConfig,
} from '../../config'
import ChatAgent from './ChatAgent.vue'
import ChatComposer from './ChatComposer.vue'
import ChatConversationList from './ChatConversationList.vue'
import ChatMessageList from './ChatMessageList.vue'
import ChatSearchPanel from './ChatSearchPanel.vue'
import ChatToolbar from './ChatToolbar.vue'
import DocumentMain from '../layout/DocumentMain.vue'

type DragKind = 'column' | 'row'

interface DragState {
  kind: DragKind
  index: number
  startPosition: number
  startSizes: number[]
  containerSize: number
}

/**
 * 第一栏的四个标签。
 *
 * `agent` 是「与 Agent 对话」的入口：切过去后**整块换成 `ChatAgent.vue` 的对话布局**
 * （历史侧栏 + 居中对话流 + 悬浮输入框），不再走这里的会话列表 / 消息区；
 * `settings` 只做占位，不提供任何配置项。
 */
type ChatRailTabId = 'chat' | 'group' | 'agent' | 'settings'

interface RailTab {
  id: ChatRailTabId
  label: string
  /** SVG 描边路径；feather 风格（24 网格、无填充）。 */
  paths: string[]
  /** 需要圆形图元时用，三元组 `[cx, cy, r]`。 */
  circles: Array<[number, number, number]>
}

const railTabs: RailTab[] = [
  {
    // 对话气泡：聊天。
    id: 'chat',
    label: '聊天',
    paths: [
      'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z',
    ],
    circles: [],
  },
  {
    // 两个人形：群聊。
    id: 'group',
    label: '群聊',
    paths: [
      'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2',
      'M23 21v-2a4 4 0 0 0-3-3.87',
      'M16 3.13a4 4 0 0 1 0 7.75',
    ],
    circles: [[9, 7, 4]],
  },
  {
    // 四角星：与 Agent 对话（AI 的通用语义）。
    id: 'agent',
    label: '与 Agent 对话',
    paths: [
      'M9.94 15.5A2 2 0 0 0 8.5 14.06L2.37 12.48a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z',
      'M20 2v4',
      'M22 4h-4',
      'M4 17v2',
      'M5 18H3',
    ],
    circles: [],
  },
  {
    // 齿轮：设置（占位）。
    id: 'settings',
    label: '设置',
    paths: [
      'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
    ],
    circles: [[12, 12, 3]],
  },
]

/** 功能列表右侧的默认说明，点击某个功能后会被临时替换成反馈文案。 */
const defaultToolNote = '功能接口尚未接入'
/** 演示身份的显示名，接入真实登录后应改成当前用户名。 */
const demoUserName = 'Windy'

const { config, saveConfig } = useConfig()

const workspaceRef = ref<HTMLElement | null>(null)
const mainColRef = ref<HTMLElement | null>(null)
/** 搜索栏 + 二级弹层的外框；用来判断点击是否落在弹层之外。 */
const searchAreaRef = ref<HTMLElement | null>(null)

// 分栏比例来自配置（cookie），拖拽结束后写回。
// 边界（第二栏 12–65%、展示区 25–75%）由 `src/config/chatLayout.ts` 统一定义并夹取。
const columnWidths = ref<number[]>([...config.chatLayout.columnWidths])
const displayHeight = ref(config.chatLayout.displayHeight)
// 功能列表固定高度：占主列 5%。与输入窗口上下相邻、合并为一块区域，不可拖拽调整比例。
const toolsHeight = 5

const activeTab = ref<ChatRailTabId>('chat')
/** 会话数据；**展示顺序不依赖这个数组的顺序**，由 `sortedConversations` 按时间派生。 */
const conversations = ref<ChatConversation[]>([])
/**
 * 当前选中的会话。
 *
 * **初始为空串 = 不选中任何会话**：打开页面时不自动打开聊天窗口，
 * 由用户自己点列表里的某一项。空串时消息区只显示一句提示。
 */
const activeConversationId = ref('')
const messages = ref<ChatMessage[]>([])
const loading = ref(false)
const error = ref('')
const keyword = ref('')
const composerHint = ref('')
const toolNote = ref(defaultToolNote)
/** 搜索栏的二级弹层是否展开。 */
const searchPanelOpen = ref(false)
/** 弹层底部的临时提示（「尚未接入」/ 写盘失败），空串表示不显示。 */
const searchNote = ref('')

/** 请求序号守卫：快速切换会话时避免旧响应覆盖新内容（与 `document.vue` 同套路）。 */
let requestToken = 0
let toolNoteTimer: number | undefined
let composerHintTimer: number | undefined
let statusTimer: number | undefined
let searchNoteTimer: number | undefined

const railWidth = computed(() => columnWidths.value[0] ?? chatRailWidth)
const sideWidth = computed(() => columnWidths.value[1] ?? 0)
const mainWidth = computed(() => columnWidths.value[2] ?? 0)

/**
 * Agent 标签用的是**另一套布局**（`ChatAgent.vue`）：第二、三栏整个不渲染，
 * 分栏比例、会话列表、功能条、拖拽手柄都与它无关。
 */
const isAgentTab = computed(() => activeTab.value === 'agent')

const composeHeight = computed(() => 100 - displayHeight.value)

const activeConversation = computed(
  () => conversations.value.find((item) => item.id === activeConversationId.value) ?? null,
)

/** 把 ISO 时间解析成可比较的数值；非法值当 0（排到最后），避免 NaN 把整个排序搅乱。 */
function timeValue(iso: string): number {
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? 0 : parsed
}

/**
 * 会话列表按「最后一条消息的时间」倒序 —— **收发消息后会话自动回到顶部**。
 *
 * 刻意做成**派生排序**，而不是在发消息 / 收到消息时手动挪动数组元素：
 * 只要某条会话的 `updatedAt` 被刷新，它就会自己浮到最前面。
 * 这样接入后端后，收到消息那条分支不需要再补一遍重排逻辑。
 */
const sortedConversations = computed(() =>
  [...conversations.value].sort((a, b) => timeValue(b.updatedAt) - timeValue(a.updatedAt)),
)

/** 当前标签下的会话：先按最后消息时间倒序，群聊标签再只看群，最后按关键词本地过滤。 */
const visibleConversations = computed(() => {
  const scoped = activeTab.value === 'group'
    ? sortedConversations.value.filter((item) => item.kind === 'group')
    : sortedConversations.value
  const key = keyword.value.trim().toLowerCase()

  if (key === '') {
    return scoped
  }

  return scoped.filter(
    (item) => item.name.toLowerCase().includes(key) || item.lastMessage.toLowerCase().includes(key),
  )
})

const listEmptyText = computed(() => {
  const searching = keyword.value.trim() !== ''

  if (activeTab.value === 'group') {
    return searching ? '没有匹配的群聊' : '暂无群聊'
  }

  return searching ? '没有匹配的会话' : '暂无会话'
})

/** 消息区的空态：没选会话时提示去选一个，选了但没消息时才说「打个招呼」。 */
const messageEmptyText = computed(() => {
  return activeConversationId.value === '' ? '从左侧选择一个会话开始聊天。' : '还没有消息，打个招呼吧。'
})

/**
 * 展示区高度。
 *
 * 未选中会话时下方合并区（功能列表 + 输入栏）整个不渲染，展示区铺满整栏；
 * 选中后才按用户拖出来的比例分栏。
 */
const displayPaneStyle = computed(() => ({
  height: activeConversationId.value === '' ? '100%' : `${displayHeight.value}%`,
}))

/** 布局拖拽结束后落盘；失败时在功能列表右侧提示（不阻断界面）。 */
function persistLayout() {
  const saved = saveConfig({
    chatLayout: {
      columnWidths: [...columnWidths.value],
      displayHeight: displayHeight.value,
    },
  })

  if (!saved) {
    showToolNote('布局保存失败：Cookie 不可用或已满')
  }
}

function handleRailSelect(id: ChatRailTabId) {
  activeTab.value = id

  // 设置标签下搜索栏整个不渲染，弹层必须一起收掉，否则会「悬空」留在内存里。
  // Agent 标签同理：那一整块（含搜索栏）都不渲染，不收起的话切回来弹层会自己冒出来。
  if (id === 'settings' || id === 'agent') {
    closeSearchPanel()
  }
}

async function loadConversations() {
  // 只拉列表，**不自动选中**任何会话。
  conversations.value = await fetchConversations()
}

async function loadMessages(conversationId: string) {
  if (conversationId === '') {
    messages.value = []
    return
  }

  const token = ++requestToken
  loading.value = true
  error.value = ''

  try {
    const list = await fetchMessages(conversationId)

    if (token !== requestToken) {
      return
    }

    messages.value = list
  } catch (cause) {
    if (token !== requestToken) {
      return
    }

    messages.value = []
    error.value = cause instanceof Error ? cause.message : '消息记录加载失败。'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

function showToolNote(text: string) {
  toolNote.value = text
  window.clearTimeout(toolNoteTimer)
  toolNoteTimer = window.setTimeout(() => {
    toolNote.value = defaultToolNote
  }, 2400)
}

function showComposerHint(text: string) {
  composerHint.value = text
  window.clearTimeout(composerHintTimer)
  composerHintTimer = window.setTimeout(() => {
    composerHint.value = ''
  }, 3200)
}

function openSearchPanel() {
  searchPanelOpen.value = true
}

function closeSearchPanel() {
  searchPanelOpen.value = false
}

function showSearchNote(text: string) {
  searchNote.value = text
  window.clearTimeout(searchNoteTimer)
  searchNoteTimer = window.setTimeout(() => {
    searchNote.value = ''
  }, 2400)
}

/**
 * 记一条搜索记录（最近的在前，去重后写进 cookie）。
 *
 * 返回是否写盘成功：cookie 被禁用或写满时失败，此时内存里的记录不变，
 * 失败提示会显示在仍然展开的弹层底部。
 */
function rememberSearch(term: string): boolean {
  const saved = saveConfig({ searchHistory: pushSearchHistory(config.searchHistory, term) })

  if (!saved) {
    showSearchNote('搜索记录保存失败：Cookie 不可用或已满')
  }

  return saved
}

/** 在搜索框里回车 = 明确搜了一次，把它记进搜索记录。弹层保持展开。 */
function handleSearchEnter() {
  if (keyword.value.trim() === '') {
    return
  }

  rememberSearch(keyword.value)
}

function handleHistorySelect(term: string) {
  keyword.value = term
  rememberSearch(term)
}

function handleHistoryClear() {
  if (saveConfig({ searchHistory: [] })) {
    showSearchNote('搜索记录已清空')
    return
  }

  showSearchNote('搜索记录清空失败：Cookie 不可用')
}

function handleAddContact() {
  // 「添加好友 / 群聊」目前没有对接任何接口，这里只回一句反馈。
  showSearchNote('添加好友 / 群聊尚未接入')
}

/**
 * 弹层只在「Esc」与「点击搜索框 / 弹层之外的区域」时收起。
 *
 * ⚠️ **输入内容不会收起弹层**（用户明确要求）：输入时弹层保持展开，
 * 一直到用户点到别处失去焦点为止。因此这里监听的是 document 的 pointerdown
 * 而不是输入框的 blur —— 点弹层内部的按钮同样会让输入框失焦，
 * 用 blur 会把「清空」「添加好友 / 群聊」这些操作也一起收掉。
 */
function handleDocumentPointerDown(event: PointerEvent) {
  if (!searchPanelOpen.value) {
    return
  }

  const area = searchAreaRef.value

  if (area !== null && !area.contains(event.target as Node)) {
    closeSearchPanel()
  }
}

function handleSelect(id: string) {
  activeConversationId.value = id

  // 演示：选中即本地清未读；接入后应由后端标记已读。
  const target = conversations.value.find((item) => item.id === id)

  if (target !== undefined) {
    target.unread = 0
  }
}

function handleToolAction(key: string, label: string) {
  // 功能列表目前没有对接任何能力，这里只回一句反馈，方便看清点击效果。
  showToolNote(`${label}（${key}）尚未接入`)
}

function handleSend(content: string) {
  const conversationId = activeConversationId.value

  if (conversationId === '') {
    return
  }

  // 演示：只在本地插一条消息，**不调用** `sendMessage()`（见 `src/api/chat.ts`）。
  // 接入后这里改成 `await sendMessage({ conversationId, content })` 再重新拉列表。
  const sentAt = new Date().toISOString()

  messages.value = [
    ...messages.value,
    {
      id: `local-${Date.now()}`,
      conversationId,
      authorName: demoUserName,
      outgoing: true,
      content,
      sentAt,
      status: 'sending',
    },
  ]

  const target = conversations.value.find((item) => item.id === conversationId)

  if (target !== undefined) {
    target.lastMessage = `我：${content}`
    // 只刷新摘要与时间即可：列表是按 `updatedAt` 派生排序的，这里改完会话会自动回到顶部。
    target.updatedAt = sentAt
  }

  showComposerHint('演示：消息只添加在本地，未发送到后端。')

  // 演示「发送中 → 已发送」的状态流转；接入后由接口结果决定。
  window.clearTimeout(statusTimer)
  statusTimer = window.setTimeout(() => {
    messages.value = messages.value.map((message) =>
      message.status === 'sending' ? { ...message, status: 'sent' } : message,
    )
  }, 600)
}

watch(activeConversationId, (id) => {
  void loadMessages(id)
}, { immediate: true })

onMounted(() => {
  void loadConversations()
  document.addEventListener('pointerdown', handleDocumentPointerDown)
})

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

  if (state === null || state.containerSize <= 0) {
    return
  }

  const first = state.startSizes[state.index]

  if (first === undefined) {
    return
  }

  const pointer = state.kind === 'column' ? event.clientX : event.clientY
  const delta = ((pointer - state.startPosition) / state.containerSize) * 100

  if (state.kind === 'column') {
    // 只有「第二栏 / 第三栏」之间有一根手柄，第一栏固定；第三栏吃掉剩余宽度。
    // 上下界由 `clampSideWidth()` 保证，不会把某一栏拖到不可用。
    columnWidths.value = buildColumnWidths(first + delta)
    return
  }

  // 上下拖拽只调展示区高度，下方合并区自动占满剩余（上界保证放得下功能列表与输入框）。
  displayHeight.value = clampDisplayHeight(first + delta)
}

function endDrag() {
  const wasDragging = dragState !== null

  dragState = null
  document.body.style.userSelect = ''
  document.body.style.cursor = ''
  window.removeEventListener('pointermove', handleDragMove)
  window.removeEventListener('pointerup', endDrag)

  // 一次拖拽结束才写 cookie，避免拖动过程中频繁写盘。
  if (wasDragging) {
    persistLayout()
  }
}

// 外部改了配置（例如设置面板里的「恢复默认」）时，把布局同步回来。
watch(
  () => config.chatLayout,
  (layout) => {
    columnWidths.value = [...layout.columnWidths]
    displayHeight.value = layout.displayHeight
  },
)

onUnmounted(() => {
  endDrag()
  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  window.clearTimeout(toolNoteTimer)
  window.clearTimeout(composerHintTimer)
  window.clearTimeout(statusTimer)
  window.clearTimeout(searchNoteTimer)
})
</script>

<style scoped>
.chat-main {
  flex: 0 0 auto;
  width: 80%;
  /* 顶栏高度与间距取自 globals.css，改高度不用动这里 */
  height: calc(100vh - var(--header-height) - var(--header-gap) * 2);
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
  line-height: 1;
}

.chat-rail__button svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.chat-rail__button:hover {
  background-color: rgb(15 23 42 / 8%);
}

.chat-rail__button.is-active {
  background-color: rgb(59 130 246 / 16%);
  color: #2563eb;
}

.chat-rail__button:focus-visible {
  outline: 2px solid rgb(59 130 246 / 55%);
  outline-offset: 1px;
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

/* 搜索框与二级弹层的定位参照：弹层绝对定位在它正下方。 */
.chat-side__search-area {
  position: relative;
  width: 100%;
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
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  /* 内边距与滚动交给会话列表组件自己处理，避免出现两层滚动条。 */
  padding: 0;
  overflow: hidden;
}

/* 设置标签的占位块（该标签不提供任何配置项）。 */
.chat-side__placeholder {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  text-align: center;
}

.chat-side__placeholder-title {
  margin: 0;
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 600;
}

.chat-side__placeholder-text {
  margin: 0;
  color: #64748b;
  font-size: 0.82rem;
}

.chat-col--main {
  position: relative;
}

.chat-pane {
  display: flex;
  flex: 0 0 auto;
  min-height: 0;
  overflow: hidden;
}

.chat-pane--display {
  background-color: rgb(255 255 255 / 26%);
}

/* 合并区：功能列表（上，固定 5% 高）+ 输入窗口（下）。
   同属一块区域，两者之间无拖拽手柄、无分隔线。 */
.chat-compose__tools {
  display: flex;
  flex: 0 0 auto;
  align-items: stretch;
  min-height: 0;
  overflow: hidden;
  background-color: rgb(255 255 255 / 20%);
}

.chat-compose__input {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background-color: rgb(255 255 255 / 30%);
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

/* Agent 模式下把第一栏压到与历史侧栏同一档：两者合成一条导航列，
   右侧对话区（34% 白）才立得起来。其他标签仍是 20%，不受影响。 */
.chat-workspace.is-agent {
  --chat-rail-bg: rgb(255 255 255 / 14%);
}

:global(.dark-mode .chat-workspace) {
  --chat-rail-bg: rgb(15 23 42 / 16%);
  --chat-side-bg: rgb(15 23 42 / 22%);
}

:global(.dark-mode .chat-workspace.is-agent) {
  --chat-rail-bg: rgb(15 23 42 / 18%);
}

:global(.dark-mode .chat-col--rail),
:global(.dark-mode .chat-col--side) {
  border-color: rgb(255 255 255 / 10%);
}

:global(.dark-mode .chat-side__search) {
  border-bottom-color: rgb(255 255 255 / 10%);
}

/* 图标导航这两条原来写成了会塌缩的 `:global(.dark-mode) .xxx`（编译后选择器被丢弃），
   新的 svg 图标在暗色下会看不清，所以顺手改成正确写法（完整选择器写在括号里）。 */
:global(.dark-mode .chat-rail__button) {
  color: #cbd5e1;
}

:global(.dark-mode .chat-rail__button:hover) {
  background-color: rgb(255 255 255 / 10%);
}

:global(.dark-mode .chat-rail__button.is-active) {
  background-color: rgb(96 165 250 / 22%);
  color: #93c5fd;
}

:global(.dark-mode .chat-side__placeholder-title) {
  color: #e2e8f0;
}

:global(.dark-mode .chat-side__placeholder-text) {
  color: #94a3b8;
}

:global(.dark-mode .chat-pane--display) {
  background-color: rgb(15 23 42 / 20%);
}

:global(.dark-mode .chat-compose__tools) {
  background-color: rgb(15 23 42 / 12%);
}

:global(.dark-mode .chat-compose__input) {
  background-color: rgb(15 23 42 / 26%);
}

:global(.dark-mode .chat-splitter::after) {
  background-color: rgb(255 255 255 / 18%);
}

@media (max-width: 768px) {
  .chat-main {
    width: 100%;
    height: calc(100vh - var(--header-height) - var(--header-gap));
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
