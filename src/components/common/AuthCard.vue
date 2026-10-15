<template>
  <DocumentMain class="auth-card">
    <div class="auth-card__inner">
      <header class="auth-card__header">
        <h1 class="auth-card__title">{{ title }}</h1>
        <p v-if="hint" class="auth-card__hint">{{ hint }}</p>
      </header>

      <slot />

      <p
        v-if="status"
        class="auth-card__status"
        :class="{ 'is-error': statusIsError }"
        role="status"
      >
        {{ status }}
      </p>

      <footer v-if="$slots.footer" class="auth-card__footer">
        <slot name="footer" />
      </footer>
    </div>
  </DocumentMain>
</template>

<script setup lang="ts">
import DocumentMain from '../layout/DocumentMain.vue'

/**
 * 登录 / 注册 / 退出登录三个页面共用的卡片外壳。
 *
 * 只负责版式：毛玻璃卡片 + 标题 + 状态行 + 底部链接区，并通过 `:deep()`
 * 下发一套统一的表单控件样式（`.auth-form` / `.auth-field` / `.auth-submit` …），
 * 页面里直接写这些类名即可，不必各自重复写样式。
 */
withDefaults(
  defineProps<{
    /** 页面标题。 */
    title: string
    /** 标题下方的一句说明。 */
    hint?: string
    /** 状态行文案（提示或错误信息）。 */
    status?: string
    /** 状态行是否按错误样式显示。 */
    statusIsError?: boolean
  }>(),
  {
    hint: '',
    status: '',
    statusIsError: false,
  },
)
</script>

<style scoped>
.auth-card {
  --auth-text: #1e293b;
  --auth-title: #0f172a;
  --auth-muted: #64748b;
  --auth-border: rgb(15 23 42 / 14%);
  --auth-field-bg: rgb(255 255 255 / 78%);
  --auth-accent: #2563eb;
  --auth-accent-text: #ffffff;
  --auth-danger: #dc2626;

  flex: 0 0 auto;
  flex-shrink: 0;
  width: 100%;
  max-width: 420px;
  margin: 0;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .auth-card) {
  --auth-text: #cbd5e1;
  --auth-title: #f8fafc;
  --auth-muted: #94a3b8;
  --auth-border: rgb(255 255 255 / 14%);
  --auth-field-bg: rgb(2 6 23 / 45%);
  --auth-accent: #7dd3fc;
  --auth-accent-text: #0f172a;
  --auth-danger: #fca5a5;
}

/* `DocumentMain` 自带的暗色覆盖目前是坏的（`:global(.dark-mode) .xxx` 会被编译器
   塌缩成裸 `.dark-mode`），所以卡片在暗色下仍是亮色玻璃 —— 而正文颜色已经是浅色。
   那个文件暂时按约定不动，这里用更具体的选择器把认证卡片局部兜住。
   选择器里带上 `.layout-document-main` 是为了稳赢 `DocumentMain` 自己的样式，不依赖顺序。 */
:global(.dark-mode .layout-document-main.auth-card) {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 26.9%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 28%);
}

.auth-card__header {
  margin-bottom: 20px;
}

.auth-card__title {
  margin: 0;
  color: var(--auth-title);
  font-size: 1.6rem;
  line-height: 1.25;
}

.auth-card__hint {
  margin: 6px 0 0;
  color: var(--auth-muted);
  font-size: 0.86rem;
  line-height: 1.6;
}

.auth-card__status {
  margin: 14px 0 0;
  color: var(--auth-muted);
  font-size: 0.82rem;
  line-height: 1.6;
}

.auth-card__status.is-error {
  color: var(--auth-danger);
}

.auth-card__footer {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px solid var(--auth-border);
  color: var(--auth-muted);
  font-size: 0.82rem;
  line-height: 1.7;
}

/* ---------- 下发给页面使用的表单控件样式 ---------- */

.auth-card :deep(.auth-form) {
  display: grid;
  gap: 14px;
}

.auth-card :deep(.auth-field) {
  display: block;
}

.auth-card :deep(.auth-field__label) {
  display: block;
  margin-bottom: 5px;
  color: var(--auth-muted);
  font-size: 0.78rem;
}

.auth-card :deep(.auth-field__input) {
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--auth-border);
  border-radius: 10px;
  background-color: var(--auth-field-bg);
  color: var(--auth-text);
  font: inherit;
  font-size: 0.9rem;
}

.auth-card :deep(.auth-field__input:focus) {
  border-color: var(--auth-accent);
  outline: none;
}

.auth-card :deep(.auth-field__error) {
  margin: 5px 0 0;
  color: var(--auth-danger);
  font-size: 0.76rem;
}

.auth-card :deep(.auth-submit) {
  min-height: 42px;
  margin-top: 4px;
  border: 1px solid transparent;
  border-radius: 10px;
  background-color: var(--auth-accent);
  color: var(--auth-accent-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  transition: opacity 0.2s ease;
}

.auth-card :deep(.auth-submit:hover:not(:disabled)) {
  opacity: 0.86;
}

.auth-card :deep(.auth-submit:disabled) {
  cursor: not-allowed;
  opacity: 0.5;
}

.auth-card :deep(.auth-link) {
  color: var(--auth-accent);
  text-decoration: none;
}

.auth-card :deep(.auth-link:hover) {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.auth-card :deep(.auth-note) {
  margin: 0;
  color: var(--auth-muted);
  font-size: 0.82rem;
  line-height: 1.7;
}

@media (max-width: 768px) {
  .auth-card {
    max-width: 100%;
  }
}
</style>
