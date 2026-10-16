<template>
  <div class="chat-toolbar">
    <button
      v-for="tool in tools"
      :key="tool.key"
      class="chat-toolbar__button"
      type="button"
      :title="`${tool.label}（尚未接入）`"
      :aria-label="tool.label"
      @click="emit('action', tool.key, tool.label)"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle v-for="circle in tool.circles" :key="`c-${circle[0]}-${circle[1]}`" :cx="circle[0]" :cy="circle[1]" :r="circle[2]" />
        <path v-for="path in tool.paths" :key="path" :d="path" />
      </svg>
    </button>

    <p class="chat-toolbar__note">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
interface ToolAction {
  key: string
  label: string
  /** SVG 描边路径；统一用 feather 风格（24 网格、无填充）。 */
  paths: string[]
  /** 需要圆形图元时用，三元组 `[cx, cy, r]`。 */
  circles: Array<[number, number, number]>
}

interface Props {
  /** 右侧的说明文案，通常用来提示「接口尚未接入」或展示操作反馈。 */
  note?: string
}

withDefaults(defineProps<Props>(), {
  note: '功能接口尚未接入',
})

const emit = defineEmits<{
  /** 点击某个功能按钮。 */
  action: [key: string, label: string]
}>()

const tools: ToolAction[] = [
  {
    key: 'emoji',
    label: '表情',
    paths: ['M8 14s1.5 2 4 2 4-2 4-2', 'M9 9h.01', 'M15 9h.01'],
    circles: [[12, 12, 10]],
  },
  {
    key: 'image',
    label: '图片',
    // 圆角方框（feather 的 rect 用 path 写，避免模板里再引入一种图元）+ 山形 + 圆点。
    paths: [
      'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
      'M21 15l-5-5L5 21',
    ],
    circles: [[8.5, 8.5, 1.5]],
  },
  {
    key: 'file',
    label: '文件',
    paths: ['M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48'],
    circles: [],
  },
  {
    key: 'voice',
    label: '语音',
    paths: [
      'M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z',
      'M19 10v2a7 7 0 0 1-14 0v-2',
      'M12 19v4',
      'M8 23h8',
    ],
    circles: [],
  },
  {
    key: 'video',
    label: '视频通话',
    paths: ['M23 7l-7 5 7 5V7z', 'M3 5h11a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z'],
    circles: [],
  },
]
</script>

<style scoped>
.chat-toolbar {
  --ct-text: #475569;
  --ct-hover: rgb(15 23 42 / 8%);
  --ct-note: #64748b;

  display: flex;
  gap: 4px;
  align-items: center;
  height: 100%;
  padding: 0 12px;
}

.chat-toolbar__button {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ct-text);
  cursor: pointer;
}

.chat-toolbar__button:hover {
  background-color: var(--ct-hover);
}

.chat-toolbar__button:focus-visible {
  outline: 2px solid rgb(59 130 246 / 55%);
  outline-offset: 1px;
}

.chat-toolbar__button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 2;
}

.chat-toolbar__note {
  margin: 0 0 0 auto;
  color: var(--ct-note);
  font-size: 0.72rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .chat-toolbar) {
  --ct-text: #cbd5e1;
  --ct-hover: rgb(255 255 255 / 10%);
  --ct-note: #94a3b8;
}
</style>
