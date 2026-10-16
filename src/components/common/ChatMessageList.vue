<template>
  <div class="chat-message-list">
    <header v-if="conversation" class="chat-message-list__header">
      <span class="chat-message-list__avatar" aria-hidden="true">
        <img v-if="conversation.avatar" class="chat-message-list__image" :src="conversation.avatar" alt="">
        <template v-else>{{ initialOf(conversation.name) }}</template>
      </span>
      <span class="chat-message-list__title-group">
        <span class="chat-message-list__title">{{ conversation.name }}</span>
        <span class="chat-message-list__subtitle">{{ subtitleOf(conversation) }}</span>
      </span>
      <span v-if="showDemoTag" class="chat-message-list__tag">演示数据</span>
    </header>

    <div ref="scrollRef" class="chat-message-list__body" role="log" aria-label="消息记录">
      <p v-if="loading" class="chat-message-list__status">正在加载消息…</p>
      <p v-else-if="error" class="chat-message-list__status is-error">{{ error }}</p>
      <p v-else-if="items.length === 0" class="chat-message-list__status">{{ emptyText }}</p>

      <template v-else>
        <template v-for="item in items" :key="item.message.id">
          <p v-if="item.divider !== ''" class="chat-message-list__divider">{{ item.divider }}</p>

          <article class="chat-message" :class="{ 'is-outgoing': item.message.outgoing }">
            <span class="chat-message__avatar" aria-hidden="true">{{ initialOf(item.message.authorName) }}</span>

            <div class="chat-message__main">
              <p v-if="showAuthor(item.message)" class="chat-message__author">
                {{ item.message.authorName }}
              </p>

              <div class="chat-message__bubble">{{ item.message.content }}</div>

              <p class="chat-message__meta">
                <span>{{ formatClock(item.message.sentAt) }}</span>
                <span v-if="statusTextOf(item.message) !== ''">{{ statusTextOf(item.message) }}</span>
              </p>
            </div>
          </article>
        </template>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

import type { ChatConversation, ChatMessage } from '../../api/chat'
import { formatClock, formatDayDivider, isSameDayIso } from '../../utils/chatTime'

interface Props {
  /** 当前会话；为空时只渲染消息区（没有头部）。 */
  conversation?: ChatConversation | null
  messages: ChatMessage[]
  loading?: boolean
  /** 出错文案；非空时优先展示。 */
  error?: string
  /** 没有消息时的提示文案（未选中会话与选了空会话是两种场景，由调用方决定）。 */
  emptyText?: string
  /** 是否显示「演示数据」标记。 */
  showDemoTag?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  conversation: null,
  loading: false,
  error: '',
  emptyText: '还没有消息，打个招呼吧。',
  showDemoTag: true,
})

const scrollRef = ref<HTMLElement | null>(null)

/** 消息 + 该条之前要插入的日期分隔（没有就是空串）。 */
const items = computed(() =>
  props.messages.map((message, index) => {
    const previous = index === 0 ? undefined : props.messages[index - 1]

    return {
      message,
      divider: previous === undefined || !isSameDayIso(previous.sentAt, message.sentAt)
        ? formatDayDivider(message.sentAt)
        : '',
    }
  }),
)

function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase()
}

function subtitleOf(conversation: ChatConversation): string {
  if (conversation.kind === 'group') {
    return `群聊 · ${conversation.memberCount} 人`
  }

  return conversation.kind === 'bot' ? '系统通知' : '单聊'
}

/** 群聊里别人发的消息才显示发送者名字（自己的消息靠右侧气泡已经能区分）。 */
function showAuthor(message: ChatMessage): boolean {
  return !message.outgoing && props.conversation?.kind === 'group'
}

function statusTextOf(message: ChatMessage): string {
  if (!message.outgoing) {
    return ''
  }

  switch (message.status) {
    case 'sending':
      return '发送中'
    case 'read':
      return '已读'
    case 'failed':
      return '发送失败'
    default:
      return '已发送'
  }
}

/** 滚到底部：新消息、切换会话、首次挂载都要贴底。 */
async function scrollToBottom() {
  await nextTick()

  const element = scrollRef.value

  if (element !== null) {
    element.scrollTop = element.scrollHeight
  }
}

watch(
  () => [props.messages, props.conversation?.id, props.loading],
  () => {
    void scrollToBottom()
  },
)

onMounted(() => {
  void scrollToBottom()
})
</script>

<style scoped>
.chat-message-list {
  --cm-text: #0f172a;
  --cm-muted: #64748b;
  --cm-border: rgb(15 23 42 / 8%);
  --cm-avatar-bg: rgb(100 116 139 / 22%);
  --cm-avatar-text: #334155;
  --cm-incoming-bg: rgb(255 255 255 / 72%);
  --cm-outgoing-bg: rgb(59 130 246 / 16%);
  --cm-outgoing-border: rgb(59 130 246 / 28%);

  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.chat-message-list__header {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
  padding: 10px 16px;
  border-bottom: 1px solid var(--cm-border);
}

.chat-message-list__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: var(--cm-avatar-bg);
  color: var(--cm-avatar-text);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1;
  overflow: hidden;
}

.chat-message-list__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-message-list__title-group {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.chat-message-list__title {
  color: var(--cm-text);
  font-size: 0.98rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-message-list__subtitle {
  color: var(--cm-muted);
  font-size: 0.75rem;
}

.chat-message-list__tag {
  flex: 0 0 auto;
  padding: 2px 8px;
  border: 1px solid var(--cm-border);
  border-radius: 999px;
  color: var(--cm-muted);
  font-size: 0.7rem;
}

.chat-message-list__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}

.chat-message-list__status {
  margin: auto;
  color: var(--cm-muted);
  font-size: 0.9rem;
}

.chat-message-list__status.is-error {
  color: #dc2626;
}

.chat-message-list__divider {
  margin: 4px 0;
  color: var(--cm-muted);
  font-size: 0.75rem;
  text-align: center;
}

.chat-message {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  max-width: 78%;
}

.chat-message.is-outgoing {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.chat-message__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background-color: var(--cm-avatar-bg);
  color: var(--cm-avatar-text);
  font-size: 0.85rem;
  font-weight: 600;
  line-height: 1;
}

.chat-message__main {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.chat-message.is-outgoing .chat-message__main {
  align-items: flex-end;
}

.chat-message__author {
  margin: 0 0 0 2px;
  color: var(--cm-muted);
  font-size: 0.75rem;
}

.chat-message__bubble {
  padding: 9px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background-color: var(--cm-incoming-bg);
  color: var(--cm-text);
  font-size: 0.92rem;
  line-height: 1.5;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.chat-message.is-outgoing .chat-message__bubble {
  border-color: var(--cm-outgoing-border);
  background-color: var(--cm-outgoing-bg);
}

.chat-message__meta {
  display: flex;
  gap: 6px;
  margin: 0 2px;
  color: var(--cm-muted);
  font-size: 0.7rem;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .chat-message-list) {
  --cm-text: #e2e8f0;
  --cm-muted: #94a3b8;
  --cm-border: rgb(255 255 255 / 10%);
  --cm-avatar-bg: rgb(148 163 184 / 24%);
  --cm-avatar-text: #e2e8f0;
  --cm-incoming-bg: rgb(15 23 42 / 42%);
  --cm-outgoing-bg: rgb(59 130 246 / 24%);
  --cm-outgoing-border: rgb(96 165 250 / 34%);
}

:global(.dark-mode .chat-message-list__status.is-error) {
  color: #fca5a5;
}
</style>
