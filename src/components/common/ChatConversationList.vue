<template>
  <div class="chat-conversation-list">
    <ul v-if="conversations.length > 0" class="chat-conversation-list__items">
      <li v-for="item in conversations" :key="item.id">
        <button
          class="chat-conversation"
          :class="{ 'is-active': item.id === activeId }"
          type="button"
          :aria-current="item.id === activeId ? 'true' : undefined"
          @click="emit('select', item.id)"
        >
          <span class="chat-conversation__avatar" aria-hidden="true">
            <img v-if="item.avatar" class="chat-conversation__image" :src="item.avatar" alt="">
            <template v-else>{{ initialOf(item.name) }}</template>
            <span v-if="badgeOf(item) !== ''" class="chat-conversation__badge">{{ badgeOf(item) }}</span>
          </span>

          <span class="chat-conversation__body">
            <span class="chat-conversation__row">
              <span class="chat-conversation__name">{{ item.name }}</span>
              <span class="chat-conversation__time">{{ formatConversationTime(item.updatedAt) }}</span>
            </span>
            <span class="chat-conversation__row">
              <span class="chat-conversation__preview">{{ item.lastMessage }}</span>
              <span v-if="item.unread > 0" class="chat-conversation__unread">
                {{ item.unread > 99 ? '99+' : item.unread }}
              </span>
            </span>
          </span>
        </button>
      </li>
    </ul>

    <p v-else class="chat-conversation-list__empty">{{ emptyText }}</p>
  </div>
</template>

<script setup lang="ts">
import type { ChatConversation } from '../../api/chat'
import { formatConversationTime } from '../../utils/chatTime'

interface Props {
  /** 要展示的会话；由调用方决定排序与筛选。 */
  conversations: ChatConversation[]
  /** 当前选中的会话 id。 */
  activeId: string
  /** 列表为空时的提示文案。 */
  emptyText?: string
}

withDefaults(defineProps<Props>(), {
  emptyText: '暂无会话',
})

const emit = defineEmits<{
  /** 选中某个会话。 */
  select: [id: string]
}>()

/** 没有头像时用名称首字生成占位。 */
function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase()
}

/** 头像右下角的小标记：群聊「群」、通知「通」，单聊不显示。 */
function badgeOf(conversation: ChatConversation): string {
  if (conversation.kind === 'group') {
    return '群'
  }

  return conversation.kind === 'bot' ? '通' : ''
}
</script>

<style scoped>
.chat-conversation-list {
  --cc-text: #0f172a;
  --cc-muted: #64748b;
  --cc-hover: rgb(255 255 255 / 45%);
  --cc-active: rgb(255 255 255 / 78%);
  --cc-avatar-bg: rgb(100 116 139 / 22%);
  --cc-avatar-text: #334155;
  --cc-unread-bg: #ef4444;
  --cc-unread-text: #ffffff;
  --cc-accent: #3b82f6;

  flex: 1 1 auto;
  min-height: 0;
  padding: 8px;
  overflow-y: auto;
}

.chat-conversation-list__items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chat-conversation {
  display: flex;
  gap: 10px;
  align-items: center;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background-color 0.18s ease;
}

.chat-conversation:hover {
  background-color: var(--cc-hover);
}

.chat-conversation:focus-visible {
  outline: 2px solid rgb(59 130 246 / 55%);
  outline-offset: -1px;
}

/* 选中态：底色 + 左侧竖条，比单纯换底色更容易看清。 */
.chat-conversation.is-active {
  position: relative;
  background-color: var(--cc-active);
}

.chat-conversation.is-active::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 24px;
  border-radius: 999px;
  background-color: var(--cc-accent);
  content: '';
  transform: translateY(-50%);
}

.chat-conversation__avatar {
  position: relative;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background-color: var(--cc-avatar-bg);
  color: var(--cc-avatar-text);
  font-size: 1rem;
  font-weight: 600;
  line-height: 1;
  overflow: hidden;
}

.chat-conversation__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.chat-conversation__badge {
  position: absolute;
  right: -1px;
  bottom: -1px;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: var(--cc-accent);
  color: #ffffff;
  font-size: 0.6rem;
  font-weight: 600;
}

.chat-conversation__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.chat-conversation__row {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
}

.chat-conversation__name {
  color: var(--cc-text);
  font-size: 0.95rem;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-conversation__time {
  flex: 0 0 auto;
  color: var(--cc-muted);
  font-size: 0.75rem;
}

.chat-conversation__preview {
  min-width: 0;
  color: var(--cc-muted);
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-conversation__unread {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background-color: var(--cc-unread-bg);
  color: var(--cc-unread-text);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1;
}

.chat-conversation-list__empty {
  margin: 24px 0 0;
  color: var(--cc-muted);
  font-size: 0.85rem;
  text-align: center;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .chat-conversation-list) {
  --cc-text: #e2e8f0;
  --cc-muted: #94a3b8;
  --cc-hover: rgb(255 255 255 / 8%);
  --cc-active: rgb(255 255 255 / 14%);
  --cc-avatar-bg: rgb(148 163 184 / 24%);
  --cc-avatar-text: #e2e8f0;
}
</style>
