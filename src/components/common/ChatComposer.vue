<template>
  <form class="chat-composer" @submit.prevent="submit">
    <textarea
      ref="inputRef"
      v-model="draft"
      class="chat-composer__input"
      :placeholder="placeholder"
      :disabled="disabled"
      aria-label="消息输入框"
      rows="3"
      @keydown="handleKeydown"
    />

    <div class="chat-composer__actions">
      <p class="chat-composer__hint">{{ hint }}</p>
      <span class="chat-composer__count">{{ draft.length }} 字</span>
      <button class="chat-composer__send" type="submit" :disabled="!canSend">
        {{ sendLabel }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

interface Props {
  placeholder?: string
  /** 左下角的提示文案，父组件可以用它反馈「接口未接入」之类的信息。 */
  hint?: string
  sendLabel?: string
  /** 只影响输入与按钮，不影响父组件状态。 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '输入消息，Enter 发送，Shift + Enter 换行',
  hint: '',
  sendLabel: '发送',
  disabled: false,
})

const emit = defineEmits<{
  /** 提交一条消息；父组件决定是发请求还是只在本地演示。 */
  send: [content: string]
}>()

const draft = ref('')
const inputRef = ref<HTMLTextAreaElement | null>(null)

const canSend = computed(() => !props.disabled && draft.value.trim() !== '')

/**
 * 回车发送、Shift + Enter 换行。
 *
 * ⚠️ 必须放掉输入法组字状态（`isComposing`）：中文输入时按回车是「选词」，
 * 不判断的话会把拼音直接发出去。
 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  submit()
}

function submit() {
  if (!canSend.value) {
    return
  }

  emit('send', draft.value.trim())
  draft.value = ''
  inputRef.value?.focus()
}
</script>

<style scoped>
.chat-composer {
  --cc-text: #0f172a;
  --cc-muted: #64748b;
  --cc-accent: #2563eb;
  --cc-send-hover: rgb(37 99 235 / 10%);
  --cc-send-disabled: rgb(100 116 139 / 45%);

  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: 6px;
  min-height: 0;
  height: 100%;
  padding: 10px 14px 12px;
}

/* 无底框：输入区不画边框、不铺底色，直接落在聊天表面上（光标用强调色提示位置）。 */
.chat-composer__input {
  flex: 1 1 auto;
  min-height: 0;
  padding: 2px 0;
  border: 0;
  background: transparent;
  caret-color: var(--cc-accent);
  color: var(--cc-text);
  font: inherit;
  font-size: 0.95rem;
  line-height: 1.55;
  resize: none;
}

.chat-composer__input:focus {
  outline: none;
}

.chat-composer__input::placeholder {
  color: var(--cc-muted);
}

.chat-composer__actions {
  display: flex;
  flex: 0 0 auto;
  gap: 10px;
  align-items: center;
}

.chat-composer__hint {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--cc-muted);
  font-size: 0.75rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-composer__count {
  flex: 0 0 auto;
  color: var(--cc-muted);
  font-size: 0.75rem;
}

/* 发送按钮同样是无底框：默认只有文字色，悬停才浮出一层很淡的底色。 */
.chat-composer__send {
  flex: 0 0 auto;
  padding: 6px 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--cc-accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
}

.chat-composer__send:hover:not(:disabled) {
  background-color: var(--cc-send-hover);
}

.chat-composer__send:disabled {
  color: var(--cc-send-disabled);
  cursor: not-allowed;
}

.chat-composer__send:focus-visible {
  outline: 2px solid rgb(37 99 235 / 45%);
  outline-offset: 2px;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .chat-composer) {
  --cc-text: #e2e8f0;
  --cc-muted: #94a3b8;
  --cc-accent: #93c5fd;
  --cc-send-hover: rgb(147 197 253 / 14%);
  --cc-send-disabled: rgb(148 163 184 / 45%);
}
</style>
