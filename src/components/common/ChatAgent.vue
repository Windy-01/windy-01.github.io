<template>
  <div class="chat-agent">
    <!-- 左侧：对话历史（可收起）。原第二栏的「会话列表」在这里被替换成历史侧栏。 -->
    <aside class="chat-agent__history" :class="{ 'is-collapsed': !historyOpen }">
      <div class="chat-agent__history-inner">
        <div class="chat-agent__history-head">
          <button class="chat-agent__new" type="button" @click="startNewSession">
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            <span>新对话</span>
          </button>
        </div>

        <ul class="chat-agent__sessions">
          <li v-for="session in sortedSessions" :key="session.id">
            <button
              class="chat-agent__session"
              :class="{ 'is-active': session.id === activeSessionId }"
              type="button"
              :aria-current="session.id === activeSessionId ? 'true' : undefined"
              @click="selectSession(session.id)"
            >
              <span class="chat-agent__session-title">{{ session.title === '' ? '新对话' : session.title }}</span>
              <span class="chat-agent__session-time">{{ formatConversationTime(session.updatedAt) }}</span>
            </button>
          </li>
        </ul>

        <p class="chat-agent__history-note">历史只存在内存中，刷新即清空。</p>
      </div>
    </aside>

    <!-- 右侧：对话区。顶部一条细栏，中间是居中的对话流，底部是悬浮输入框。 -->
    <section class="chat-agent__main">
      <header class="chat-agent__bar">
        <button
          class="chat-agent__icon"
          type="button"
          :aria-expanded="historyOpen"
          aria-label="切换对话历史"
          :title="historyOpen ? '收起历史' : '展开历史'"
          @click="historyOpen = !historyOpen"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
            <path d="M9 4v16" />
          </svg>
        </button>

        <span class="chat-agent__bar-title">{{ barTitle }}</span>

        <!-- 后端地址设置：齿轮 + 弹层。填 ip:port 就能让 Agent 用独立于站内后端。 -->
        <div ref="settingsRef" class="chat-agent__settings">
          <button
            class="chat-agent__icon"
            :class="{ 'is-active': settingsOpen }"
            type="button"
            :aria-expanded="settingsOpen"
            aria-haspopup="dialog"
            aria-label="Agent 后端设置"
            title="Agent 后端设置"
            @click="toggleSettings"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>

          <div
            v-if="settingsOpen"
            class="chat-agent__popover"
            role="dialog"
            aria-label="Agent 后端设置"
          >
            <p class="chat-agent__popover-title">Agent 后端</p>

            <label class="chat-agent__popover-field">
              <span class="chat-agent__popover-label">ip:port</span>
              <input
                v-model="formEndpoint"
                class="chat-agent__popover-input"
                :class="{ 'is-invalid': endpointInvalid }"
                type="text"
                spellcheck="false"
                autocomplete="off"
                placeholder="127.0.0.1:8000"
                @keydown.enter.prevent="saveEndpoint"
              >
            </label>

            <p class="chat-agent__popover-hint" :class="{ 'is-error': endpointInvalid }">
              {{ endpointHint }}
            </p>
            <p class="chat-agent__popover-hint">{{ endpointStatus }}</p>
            <p v-if="endpointNotice !== ''" class="chat-agent__popover-hint is-error">
              {{ endpointNotice }}
            </p>

            <div class="chat-agent__popover-actions">
              <button class="chat-agent__popover-button" type="button" @click="settingsOpen = false">
                取消
              </button>
              <button
                class="chat-agent__popover-button is-primary"
                type="button"
                @click="saveEndpoint"
              >
                保存
              </button>
            </div>
          </div>
        </div>

        <button
          class="chat-agent__icon"
          type="button"
          aria-label="新对话"
          title="新对话"
          @click="startNewSession"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </header>

      <div ref="scrollRef" class="chat-agent__scroll" role="log" aria-label="Agent 对话">
        <div class="chat-agent__inner">
          <!-- 空态：一句问候 + 几个示例提示词，点一下填进输入框 -->
          <div v-if="messages.length === 0" class="chat-agent__empty">
            <span class="chat-agent__empty-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path :d="sparklePath" />
              </svg>
            </span>
            <h2 class="chat-agent__empty-title">有什么可以帮你？</h2>
            <p class="chat-agent__empty-text">{{ emptyText }}</p>

            <div class="chat-agent__suggestions">
              <button
                v-for="suggestion in agentSuggestions"
                :key="suggestion"
                class="chat-agent__suggestion"
                type="button"
                @click="fillSuggestion(suggestion)"
              >
                {{ suggestion }}
              </button>
            </div>
          </div>

          <!-- 对话流：用户靠右气泡，Agent 靠左纯文本 -->
          <div v-else class="chat-agent__thread">
            <article
              v-for="message in messages"
              :key="message.id"
              class="agent-msg"
              :class="message.outgoing ? 'is-user' : 'is-agent'"
            >
              <span v-if="!message.outgoing" class="agent-msg__mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path :d="sparklePath" />
                </svg>
              </span>

              <p class="agent-msg__text">{{ message.content }}</p>
            </article>

            <div v-if="pending" class="agent-msg is-agent">
              <span class="agent-msg__mark" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false">
                  <path :d="sparklePath" />
                </svg>
              </span>
              <span class="agent-typing" aria-label="Agent 正在输入">
                <i /><i /><i />
              </span>
            </div>
          </div>

          <!-- 发送失败：红条放在对话流末尾，不塞进消息历史（重开对话就没了） -->
          <p v-if="errorText !== ''" class="chat-agent__error" role="alert">
            {{ errorText }}
          </p>
        </div>
      </div>

      <footer class="chat-agent__composer">
        <div class="chat-agent__composer-inner">
          <form class="agent-composer" @submit.prevent="send">
            <textarea
              ref="inputRef"
              v-model="draft"
              class="agent-composer__input"
              rows="1"
              placeholder="给 Agent 发消息…"
              aria-label="消息输入框"
              @input="autoGrow"
              @keydown="handleKeydown"
            />

            <button
              class="agent-composer__send"
              type="submit"
              aria-label="发送"
              :disabled="!canSend"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 19V5" />
                <path d="M5 12l7-7 7 7" />
              </svg>
            </button>
          </form>

          <p class="agent-composer__hint">{{ composerHint }}</p>
        </div>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import type { AgentSession } from '../../api/agent'
import {
  activeAgentSessionId,
  agentBackend,
  agentChatPath,
  agentSessions,
  agentSuggestions,
  createAgentSession,
  requestAgentReply,
  titleFromContent,
} from '../../api/agent'
import type { ChatMessage } from '../../api/chat'
import { isAgentBaseUrlInvalid, normalizeAgentBaseUrl, useConfig } from '../../config'
import { formatConversationTime } from '../../utils/chatTime'

/** 四角星（AI 通用语义）。上面那条路径是主星，两条短线是右上角的小星。 */
const sparklePath
  = 'M9.94 15.5A2 2 0 0 0 8.5 14.06L2.37 12.48a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.14a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.14 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.14a.5.5 0 0 1-.96 0z'

/** 历史侧栏是否展开。窄屏默认收起，把宽度全留给对话。 */
const historyOpen = ref(!window.matchMedia('(max-width: 768px)').matches)

const draft = ref('')
/** 正在等 Agent 回复：显示「正在输入」，并临时禁用发送。 */
const pending = ref(false)

const scrollRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

/* ── 后端设置（ip:port） ─────────────────────────────────── */

const { config, saveConfig } = useConfig()

/** 弹层是否打开。 */
const settingsOpen = ref(false)
/** 输入框里正在编辑的值；打开弹层时才从配置同步，避免边打字边被覆盖。 */
const formEndpoint = ref('')
/** 保存失败 / 输入不合法的提示。 */
const endpointNotice = ref('')

const settingsRef = ref<HTMLElement | null>(null)

/** 当前生效的后端（读响应式配置，保存后立刻跟着变）。 */
const backend = computed(() => agentBackend())

const endpointInvalid = computed(() => isAgentBaseUrlInvalid(formEndpoint.value))

/** 输入框下方的即时预览：填了什么、会被打到哪个地址。 */
const endpointHint = computed(() => {
  const raw = formEndpoint.value.trim()

  if (endpointInvalid.value) {
    return '格式不对：应形如 127.0.0.1:8000 或 http://127.0.0.1:8000'
  }

  if (raw === '') {
    return '留空：回落到「设置 → 网络」里的 API Base URL'
  }

  return `将请求 ${normalizeAgentBaseUrl(raw)}${agentChatPath}`
})

/** 当前实际生效的地址来源。 */
const endpointStatus = computed(() => {
  if (backend.value.source === 'custom') {
    return `当前：已连接 ${backend.value.chatUrl}`
  }

  if (backend.value.source === 'global') {
    return `当前：沿用全局地址 ${backend.value.chatUrl}`
  }

  return '当前：未配置任何后端，发消息只会得到本地演示回复'
})

/** 空态与底部提示都跟着「有没有后端」变，别让人以为已经连上了。 */
const emptyText = computed(() => {
  return backend.value.source === 'none'
    ? '还没有配置 Agent 后端。点右上角的设置填上 ip:port，就能连上你自己的服务。'
    : '后端已就绪，说点什么吧。'
})

const composerHint = computed(() => {
  return backend.value.source === 'none'
    ? 'Enter 发送，Shift + Enter 换行 · 未配置后端，当前为本地演示'
    : `Enter 发送，Shift + Enter 换行 · ${backend.value.chatUrl}`
})

/** 发送失败的文案；放在对话流末尾，不写进消息历史。 */
const errorText = ref('')

function toggleSettings() {
  settingsOpen.value = !settingsOpen.value

  if (settingsOpen.value) {
    // 每次打开都回到「已保存的值」，取消即等于放弃这次编辑。
    formEndpoint.value = config.agentApiBaseUrl
    endpointNotice.value = ''
  }
}

function saveEndpoint() {
  if (endpointInvalid.value) {
    endpointNotice.value = '地址格式不对，未保存。'
    return
  }

  const value = formEndpoint.value.trim()

  // `saveConfig` 先写 cookie、成功才改内存；失败时保留弹层让用户重试。
  if (!saveConfig({ agentApiBaseUrl: value })) {
    endpointNotice.value = '保存失败：浏览器拒绝了写入（cookie 被禁用或空间不足）。'
    return
  }

  formEndpoint.value = value
  endpointNotice.value = ''
  settingsOpen.value = false
}

/** 点弹层外面收起。弹层里的点击会被 `settingsRef.contains()` 挡住。 */
function handleDocumentClick(event: MouseEvent) {
  if (!settingsOpen.value) {
    return
  }

  const root = settingsRef.value

  if (root !== null && event.target instanceof Node && root.contains(event.target)) {
    return
  }

  settingsOpen.value = false
}

let messageSequence = 0

const activeSessionId = computed(() => activeAgentSessionId.value)

const activeSession = computed<AgentSession | null>(
  () => agentSessions.value.find((item) => item.id === activeAgentSessionId.value) ?? null,
)

const messages = computed<ChatMessage[]>(() => activeSession.value?.messages ?? [])

/** 历史按最后活动时间倒序（派生，不手动挪数组）。 */
const sortedSessions = computed(() =>
  [...agentSessions.value].sort((a, b) => timeValue(b.updatedAt) - timeValue(a.updatedAt)),
)

const barTitle = computed(() => {
  const title = activeSession.value?.title ?? ''

  return title === '' ? '新对话' : title
})

const canSend = computed(() => draft.value.trim() !== '' && !pending.value)

/** 非法时间当 0（沉底），避免 NaN 把排序搅乱。 */
function timeValue(iso: string): number {
  const parsed = Date.parse(iso)
  return Number.isNaN(parsed) ? 0 : parsed
}

function nextMessageId(): string {
  messageSequence += 1
  return `agent-msg-${Date.now().toString(36)}-${messageSequence}`
}

/** 输入框随内容长高，最高 180px（超过后自己滚动）。 */
function autoGrow() {
  const element = inputRef.value

  if (element === null) {
    return
  }

  element.style.height = 'auto'
  element.style.height = `${Math.min(element.scrollHeight, 180)}px`
}

async function scrollToBottom() {
  await nextTick()

  const element = scrollRef.value

  if (element !== null) {
    element.scrollTop = element.scrollHeight
  }
}

function fillSuggestion(text: string) {
  draft.value = text
  void nextTick(() => {
    autoGrow()
    inputRef.value?.focus()
  })
}

async function startNewSession() {
  const session = createAgentSession()

  agentSessions.value = [session, ...agentSessions.value]
  activeAgentSessionId.value = session.id
  draft.value = ''
  pending.value = false
  errorText.value = ''

  await nextTick()
  autoGrow()
  inputRef.value?.focus()
}

function selectSession(id: string) {
  if (id === activeAgentSessionId.value) {
    return
  }

  activeAgentSessionId.value = id
  draft.value = ''
  pending.value = false
  errorText.value = ''

  void nextTick(() => {
    autoGrow()
    void scrollToBottom()
  })
}

/**
 * Enter 发送、Shift + Enter 换行。
 *
 * ⚠️ **必须判 `event.isComposing`**：中文输入法选词时按回车也会触发 keydown，
 * 不拦会把拼音当成消息发出去（`ChatComposer` 里踩过同一个坑）。
 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  void send()
}

async function send() {
  const content = draft.value.trim()
  const session = activeSession.value

  if (content === '' || session === null || pending.value) {
    return
  }

  const sentAt = new Date().toISOString()

  session.messages.push({
    id: nextMessageId(),
    conversationId: session.id,
    authorName: '我',
    outgoing: true,
    content,
    sentAt,
    status: 'sent',
  })

  // 首条消息充当标题，历史列表里才看得出这条对话讲什么。
  if (session.title === '') {
    session.title = titleFromContent(content)
  }

  session.updatedAt = sentAt
  draft.value = ''
  pending.value = true
  errorText.value = ''

  await nextTick()
  autoGrow()
  void scrollToBottom()

  try {
    const reply = await requestAgentReply({ sessionId: session.id, content })

    session.messages.push({
      id: nextMessageId(),
      conversationId: session.id,
      authorName: 'Agent',
      outgoing: false,
      content: reply,
      sentAt: new Date().toISOString(),
      status: 'sent',
    })

    session.updatedAt = new Date().toISOString()
  } catch (cause) {
    // 用户那条消息留在历史里（他确实发了），失败原因单独显示在末尾。
    errorText.value = cause instanceof Error ? cause.message : 'Agent 请求失败。'
  } finally {
    pending.value = false
  }
}

// 新消息 / 等待回复 / 切换会话都贴底。
watch(
  () => [messages.value.length, pending.value, activeAgentSessionId.value],
  () => {
    void scrollToBottom()
  },
)

onMounted(() => {
  autoGrow()
  void scrollToBottom()
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.chat-agent {
  /* 层次靠「侧栏压暗、内容提亮」拉开：
     两层叠在 DocumentMain（27% 白）之上，合成后侧栏约 37%、对话区约 52%，
     差距足够让正文压住背后的图片。之前两层都写 20/26%，看上去是一整块。 */
  --ca-panel-bg: rgb(255 255 255 / 14%);
  --ca-main-bg: rgb(255 255 255 / 34%);
  --ca-border: rgb(15 23 42 / 10%);
  --ca-text: #0f172a;
  /* 原来的 #64748b 在透明面板上发虚，压深一档 */
  --ca-muted: #475569;
  --ca-hover: rgb(255 255 255 / 45%);
  --ca-active: rgb(255 255 255 / 78%);
  --ca-input-bg: rgb(255 255 255 / 92%);
  --ca-input-border: rgb(15 23 42 / 12%);
  --ca-input-text: #0f172a;
  /* 用户气泡沿用「聊天」栏目里己方消息的蓝色，全站只有一种"我说的话"的语言 */
  --ca-bubble: rgb(59 130 246 / 14%);
  --ca-bubble-border: rgb(59 130 246 / 22%);
  --ca-accent: #2563eb;
  --ca-accent-soft: rgb(59 130 246 / 14%);
  /* 主按钮上的文字色：浅色主题配白字，暗色主题的 accent 是浅蓝，要配深字 */
  --ca-accent-contrast: #fff;
  --ca-shadow: 0 8px 24px rgb(15 23 42 / 10%);
  /* 弹层要压住下面的正文，几乎做实；阴影也比卡片重一档 */
  --ca-popover-bg: rgb(255 255 255 / 97%);
  --ca-popover-shadow: 0 18px 48px rgb(15 23 42 / 18%);
  --ca-danger: #b91c1c;
  --ca-danger-soft: rgb(185 28 28 / 10%);

  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
}

/* ── 历史侧栏 ───────────────────────────────────────────── */

.chat-agent__history {
  flex: 0 0 auto;
  width: 260px;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--ca-border);
  background-color: var(--ca-panel-bg);
  transition: width 0.2s ease;
}

/* 收起时宽度归零；内层固定 260px，避免收起过程中文字被挤成一列。
   ⚠️ 边框也要一起归零：全局 `box-sizing: border-box` 下，`width: 0` 仍会被
   1px 边框撑成 1px，收起后留一条细线。 */
.chat-agent__history.is-collapsed {
  width: 0;
  border-right-width: 0;
}

.chat-agent__history-inner {
  display: flex;
  flex-direction: column;
  width: 260px;
  height: 100%;
  min-height: 0;
}

.chat-agent__history-head {
  flex: 0 0 auto;
  padding: 12px;
  border-bottom: 1px solid var(--ca-border);
}

.chat-agent__new {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid var(--ca-border);
  border-radius: 10px;
  background: transparent;
  color: var(--ca-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  transition: background-color 0.18s ease;
}

.chat-agent__new:hover {
  background-color: var(--ca-hover);
}

.chat-agent__new svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.chat-agent__sessions {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-height: 0;
  margin: 0;
  padding: 8px;
  overflow-y: auto;
  list-style: none;
}

/* 历史项：**单行** —— 标题占满剩余宽度并截断，时间贴右侧。 */
.chat-agent__session {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background-color 0.18s ease;
}

.chat-agent__session:hover {
  background-color: var(--ca-hover);
}

.chat-agent__session.is-active {
  background-color: var(--ca-active);
}

.chat-agent__session-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--ca-text);
  font-size: 0.86rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-agent__session-time {
  flex: 0 0 auto;
  color: var(--ca-muted);
  font-size: 0.72rem;
}

.chat-agent__history-note {
  flex: 0 0 auto;
  margin: 0;
  padding: 10px 12px;
  border-top: 1px solid var(--ca-border);
  color: var(--ca-muted);
  font-size: 0.7rem;
  line-height: 1.5;
}

/* ── 对话区 ─────────────────────────────────────────────── */

.chat-agent__main {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  background-color: var(--ca-main-bg);
}

.chat-agent__bar {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  align-items: center;
  height: 52px;
  padding: 0 12px;
  border-bottom: 1px solid var(--ca-border);
}

.chat-agent__bar-title {
  flex: 1 1 auto;
  min-width: 0;
  color: var(--ca-text);
  font-size: 0.9rem;
  font-weight: 600;
  overflow: hidden;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-agent__icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ca-muted);
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.chat-agent__icon:hover {
  background-color: var(--ca-hover);
  color: var(--ca-text);
}

.chat-agent__icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

/* 设置弹层打开时按钮保持高亮，让人看得出这块是「点开的」 */
.chat-agent__icon.is-active {
  background-color: var(--ca-active);
  color: var(--ca-text);
}

/* ── 后端设置弹层（ip:port） ─────────────────────────────── */

.chat-agent__settings {
  position: relative;
  display: flex;
  flex: 0 0 auto;
}

/* 绝对定位挂在齿轮下方：不需要额外遮罩，滚动区不会跟着动 */
.chat-agent__popover {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: 296px;
  padding: 14px;
  border: 1px solid var(--ca-border);
  border-radius: 14px;
  background-color: var(--ca-popover-bg);
  box-shadow: var(--ca-popover-shadow);
}

.chat-agent__popover-title {
  margin: 0 0 10px;
  color: var(--ca-text);
  font-size: 0.86rem;
  font-weight: 600;
}

.chat-agent__popover-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.chat-agent__popover-label {
  color: var(--ca-muted);
  font-size: 0.72rem;
}

.chat-agent__popover-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--ca-input-border);
  border-radius: 9px;
  background-color: var(--ca-input-bg);
  /* ⚠️ 别写 inherit：`.dark-mode` 不下发全局文字色，会继承到 body 的黑色 */
  color: var(--ca-input-text);
  font: inherit;
  font-size: 0.82rem;
  outline: none;
  transition: border-color 0.18s ease;
}

.chat-agent__popover-input:focus {
  border-color: var(--ca-accent);
}

.chat-agent__popover-input.is-invalid {
  border-color: var(--ca-danger);
}

.chat-agent__popover-hint {
  margin: 8px 0 0;
  color: var(--ca-muted);
  font-size: 0.72rem;
  line-height: 1.5;
  word-break: break-all;
}

.chat-agent__popover-hint.is-error {
  color: var(--ca-danger);
}

.chat-agent__popover-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
}

.chat-agent__popover-button {
  padding: 6px 14px;
  border: 1px solid var(--ca-border);
  border-radius: 9px;
  background-color: transparent;
  color: var(--ca-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  transition: background-color 0.18s ease, opacity 0.18s ease;
}

.chat-agent__popover-button:hover {
  background-color: var(--ca-hover);
}

.chat-agent__popover-button.is-primary {
  border-color: transparent;
  background-color: var(--ca-accent);
  color: var(--ca-accent-contrast);
}

.chat-agent__popover-button.is-primary:hover {
  background-color: var(--ca-accent);
  opacity: 0.88;
}

/* 发送失败的红条：在对话流末尾，不占消息位置 */
.chat-agent__error {
  margin: 4px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background-color: var(--ca-danger-soft);
  color: var(--ca-danger);
  font-size: 0.78rem;
  line-height: 1.6;
  word-break: break-word;
}

.chat-agent__scroll {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
}

/* 对话列宽固定上限并居中 —— 市面 Agent 界面的通行做法，长行不横跨整屏。 */
.chat-agent__inner {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
  padding: 20px 24px 8px;
}

/* ── 空态 ───────────────────────────────────────────────── */

.chat-agent__empty {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  justify-content: center;
  padding-bottom: 32px;
  text-align: center;
}

.chat-agent__empty-mark {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: 6px;
  border-radius: 16px;
  background-color: var(--ca-accent-soft);
  color: var(--ca-accent);
}

.chat-agent__empty-mark svg {
  width: 26px;
  height: 26px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.6;
}

.chat-agent__empty-title {
  margin: 0;
  color: var(--ca-text);
  font-size: 1.35rem;
  font-weight: 600;
}

.chat-agent__empty-text {
  margin: 0;
  color: var(--ca-muted);
  font-size: 0.86rem;
}

.chat-agent__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  max-width: 520px;
  margin-top: 14px;
}

.chat-agent__suggestion {
  padding: 7px 14px;
  border: 1px solid var(--ca-border);
  border-radius: 999px;
  background: transparent;
  color: var(--ca-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  transition: background-color 0.18s ease;
}

.chat-agent__suggestion:hover {
  background-color: var(--ca-hover);
}

/* ── 消息 ───────────────────────────────────────────────── */

.chat-agent__thread {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.agent-msg {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}

.agent-msg.is-user {
  justify-content: flex-end;
}

.agent-msg__mark {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 26px;
  height: 26px;
  margin-top: 3px;
  border-radius: 50%;
  background-color: var(--ca-accent-soft);
  color: var(--ca-accent);
}

.agent-msg__mark svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.7;
}

.agent-msg__text {
  margin: 0;
  color: var(--ca-text);
  font-size: 0.94rem;
  line-height: 1.75;
  overflow-wrap: break-word;
  white-space: pre-wrap;
}

.agent-msg.is-agent .agent-msg__text {
  padding-top: 3px;
}

/* 用户消息靠右、气泡收窄；Agent 消息不加气泡，读起来更像文档。
   边框用 inset 阴影而不是 border：不占盒尺寸，气泡宽度不会因 1px 抖动。 */
.agent-msg.is-user .agent-msg__text {
  max-width: 78%;
  padding: 10px 14px;
  border-radius: 16px 16px 4px 16px;
  background-color: var(--ca-bubble);
  box-shadow: inset 0 0 0 1px var(--ca-bubble-border);
}

.agent-typing {
  display: flex;
  gap: 4px;
  align-items: center;
  height: 26px;
}

.agent-typing i {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--ca-muted);
  animation: agent-typing-dot 1.1s infinite ease-in-out;
}

.agent-typing i:nth-child(2) {
  animation-delay: 0.15s;
}

.agent-typing i:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes agent-typing-dot {
  0%,
  60%,
  100% {
    opacity: 0.25;
    transform: translateY(0);
  }

  30% {
    opacity: 1;
    transform: translateY(-2px);
  }
}

/* ── 输入框 ─────────────────────────────────────────────── */

.chat-agent__composer {
  flex: 0 0 auto;
  padding: 8px 24px 16px;
}

.chat-agent__composer-inner {
  width: 100%;
  max-width: 760px;
  margin: 0 auto;
}

.agent-composer {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  padding: 10px 10px 10px 16px;
  border: 1px solid var(--ca-input-border);
  border-radius: 22px;
  background-color: var(--ca-input-bg);
  box-shadow: var(--ca-shadow);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.agent-composer:focus-within {
  border-color: rgb(59 130 246 / 55%);
  box-shadow: 0 0 0 3px rgb(59 130 246 / 14%);
}

/* ⚠️ 不能写 `color: inherit`：`.dark-mode` 只挂在 `.layout-background` 上、
   并没有下发全局文字色，继承下来的是 body 的黑色 —— 暗色下输入框里的字会看不见。 */
.agent-composer__input {
  flex: 1 1 auto;
  max-height: 180px;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--ca-input-text);
  font: inherit;
  font-size: 0.94rem;
  line-height: 1.6;
  outline: none;
  overflow-y: auto;
  resize: none;
}

.agent-composer__input::placeholder {
  color: var(--ca-muted);
}

.agent-composer__send {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background-color: var(--ca-accent);
  color: #ffffff;
  cursor: pointer;
  transition: opacity 0.18s ease, background-color 0.18s ease;
}

.agent-composer__send:disabled {
  background-color: var(--ca-muted);
  cursor: not-allowed;
  opacity: 0.5;
}

.agent-composer__send svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.agent-composer__hint {
  margin: 8px 0 0;
  color: var(--ca-muted);
  font-size: 0.72rem;
  text-align: center;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .chat-agent) {
  --ca-panel-bg: rgb(15 23 42 / 18%);
  --ca-main-bg: rgb(15 23 42 / 34%);
  --ca-border: rgb(255 255 255 / 12%);
  --ca-text: #e2e8f0;
  --ca-muted: #94a3b8;
  --ca-hover: rgb(255 255 255 / 8%);
  --ca-active: rgb(255 255 255 / 16%);
  --ca-input-bg: rgb(15 23 42 / 74%);
  --ca-input-border: rgb(255 255 255 / 14%);
  /* 输入的文字要比正文更亮：和顶栏一级文字同档（#f8fafc） */
  --ca-input-text: #f8fafc;
  --ca-bubble: rgb(96 165 250 / 18%);
  --ca-bubble-border: rgb(96 165 250 / 30%);
  --ca-accent: #60a5fa;
  --ca-accent-soft: rgb(96 165 250 / 18%);
  --ca-accent-contrast: #0f172a;
  --ca-shadow: 0 8px 24px rgb(0 0 0 / 32%);
  --ca-popover-bg: rgb(15 23 42 / 96%);
  --ca-popover-shadow: 0 18px 48px rgb(0 0 0 / 46%);
  --ca-danger: #fca5a5;
  --ca-danger-soft: rgb(248 113 113 / 16%);
}

@media (max-width: 1024px) {
  .chat-agent__history,
  .chat-agent__history-inner {
    width: 220px;
  }
}

@media (max-width: 768px) {
  .chat-agent__inner {
    padding: 16px 16px 8px;
  }

  .chat-agent__composer {
    padding: 8px 16px 12px;
  }
}
</style>
