<template>
  <!-- 搜索栏的二级弹层：上面是动作入口，下面是搜索记录（就在这个弹层里查看）。 -->
  <div class="chat-search-panel" role="dialog" aria-label="搜索面板">
    <button class="chat-search-panel__action" type="button" @click="emit('add-contact')">
      <svg class="chat-search-panel__icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="8.5" cy="7" r="4" />
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <path d="M20 8v6" />
        <path d="M23 11h-6" />
      </svg>
      <span class="chat-search-panel__action-label">添加好友 / 群聊</span>
    </button>

    <div class="chat-search-panel__section">
      <p class="chat-search-panel__heading">
        <span class="chat-search-panel__heading-text">搜索记录</span>
        <button
          v-if="history.length > 0"
          class="chat-search-panel__clear"
          type="button"
          @click="emit('clear')"
        >
          清空
        </button>
      </p>

      <ul v-if="history.length > 0" class="chat-search-panel__list">
        <li v-for="term in history" :key="term">
          <button class="chat-search-panel__item" type="button" :title="term" @click="emit('select', term)">
            <svg class="chat-search-panel__icon chat-search-panel__icon--small" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3.5 2" />
            </svg>
            <span class="chat-search-panel__term">{{ term }}</span>
          </button>
        </li>
      </ul>

      <p v-else class="chat-search-panel__empty">暂无搜索记录</p>
    </div>

    <p v-if="note !== ''" class="chat-search-panel__note">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
interface Props {
  /** 搜索记录，最近的在前。 */
  history: string[]
  /** 底部的临时提示（例如「尚未接入」或写盘失败）；空串表示不显示。 */
  note?: string
}

withDefaults(defineProps<Props>(), {
  note: '',
})

const emit = defineEmits<{
  /** 选中一条搜索记录。 */
  select: [term: string]
  /** 清空全部搜索记录。 */
  clear: []
  /** 点击「添加好友 / 群聊」。 */
  'add-contact': []
}>()
</script>

<style scoped>
.chat-search-panel {
  --csp-bg: rgb(255 255 255 / 94%);
  --csp-border: rgb(15 23 42 / 10%);
  --csp-shadow: 0 14px 34px rgb(15 23 42 / 18%);
  --csp-text: #0f172a;
  --csp-muted: #64748b;
  --csp-hover: rgb(15 23 42 / 6%);
  --csp-accent: #2563eb;
  --csp-divider: rgb(15 23 42 / 8%);

  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  left: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  max-height: 320px;
  /* 滚动条样式不在这里写：统一由 globals.css 通过 .layout-background 下发。 */
  overflow-y: auto;
  border: 1px solid var(--csp-border);
  border-radius: 12px;
  background-color: var(--csp-bg);
  box-shadow: var(--csp-shadow);
  backdrop-filter: blur(12px);
}

.chat-search-panel__action {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
  padding: 12px;
  border: 0;
  background: transparent;
  color: var(--csp-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  text-align: left;
}

.chat-search-panel__action:hover {
  background-color: var(--csp-hover);
}

.chat-search-panel__action-label {
  font-weight: 600;
}

.chat-search-panel__icon {
  flex: 0 0 auto;
  width: 18px;
  height: 18px;
  color: var(--csp-muted);
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.chat-search-panel__icon--small {
  width: 14px;
  height: 14px;
}

.chat-search-panel__section {
  flex: 0 0 auto;
  padding-bottom: 6px;
  border-top: 1px solid var(--csp-divider);
}

.chat-search-panel__heading {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
  margin: 0;
  padding: 8px 12px 4px;
}

.chat-search-panel__heading-text {
  color: var(--csp-muted);
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.chat-search-panel__clear {
  padding: 2px 6px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--csp-accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.75rem;
}

.chat-search-panel__clear:hover {
  background-color: var(--csp-hover);
}

.chat-search-panel__list {
  display: flex;
  flex-direction: column;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chat-search-panel__item {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 7px 12px;
  border: 0;
  background: transparent;
  color: var(--csp-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.85rem;
  text-align: left;
}

.chat-search-panel__item:hover {
  background-color: var(--csp-hover);
}

.chat-search-panel__term {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-search-panel__empty {
  margin: 0;
  padding: 4px 12px 8px;
  color: var(--csp-muted);
  font-size: 0.8rem;
}

.chat-search-panel__note {
  flex: 0 0 auto;
  margin: 0;
  padding: 8px 12px;
  border-top: 1px solid var(--csp-divider);
  color: var(--csp-muted);
  font-size: 0.75rem;
}

.chat-search-panel__action:focus-visible,
.chat-search-panel__item:focus-visible,
.chat-search-panel__clear:focus-visible {
  outline: 2px solid rgb(59 130 246 / 55%);
  outline-offset: -2px;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .chat-search-panel) {
  --csp-bg: rgb(15 23 42 / 94%);
  --csp-border: rgb(255 255 255 / 12%);
  --csp-shadow: 0 14px 34px rgb(0 0 0 / 45%);
  --csp-text: #e2e8f0;
  --csp-muted: #94a3b8;
  --csp-hover: rgb(255 255 255 / 8%);
  --csp-accent: #93c5fd;
  --csp-divider: rgb(255 255 255 / 10%);
}
</style>
