<template>
  <article class="markdown-body" v-html="html" />
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { renderMarkdown } from '../../utils/markdown'

const props = defineProps<{
  /** Markdown 源码。组件只负责渲染，数据来源由调用方决定。 */
  source: string
}>()

const html = computed(() => renderMarkdown(props.source))
</script>

<style scoped>
/* v-html 生成的内容不带 scoped 标记，所有元素样式都需要 :deep()。
   颜色统一走局部变量，暗色模式只覆盖变量即可。 */
.markdown-body {
  --md-text: #1e293b;
  --md-heading: #0f172a;
  --md-muted: #64748b;
  --md-border: rgb(15 23 42 / 12%);
  --md-surface: rgb(15 23 42 / 5%);
  --md-accent: #2563eb;
  --md-quote-border: rgb(37 99 235 / 45%);
  --md-quote-surface: rgb(37 99 235 / 6%);
  --md-quote-text: #475569;

  color: var(--md-text);
  font-size: 1rem;
  line-height: 1.75;
  overflow-wrap: break-word;
}

/* 注意：Vue 的 :global() 会用括号内的内容整体替换选择器，
   因此完整选择器必须全部写在 :global() 内部，否则后半段会被丢弃。 */
:global(.dark-mode .markdown-body) {
  --md-text: #e2e8f0;
  --md-heading: #f8fafc;
  --md-muted: #94a3b8;
  --md-border: rgb(255 255 255 / 14%);
  --md-surface: rgb(255 255 255 / 8%);
  --md-accent: #7dd3fc;
  --md-quote-border: rgb(125 211 252 / 60%);
  --md-quote-surface: rgb(125 211 252 / 9%);
  --md-quote-text: #cbd5e1;
}

/* 标题 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 1.6em 0 0.6em;
  color: var(--md-heading);
  font-weight: 700;
  line-height: 1.3;
}

.markdown-body :deep(h1) {
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--md-border);
  font-size: 1.9rem;
}

.markdown-body :deep(h2) {
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--md-border);
  font-size: 1.5rem;
}

.markdown-body :deep(h3) {
  font-size: 1.28rem;
}

.markdown-body :deep(h4) {
  font-size: 1.12rem;
}

.markdown-body :deep(h5) {
  font-size: 1rem;
}

.markdown-body :deep(h6) {
  color: var(--md-muted);
  font-size: 0.92rem;
}

.markdown-body :deep(h1:first-child) {
  margin-top: 0;
}

/* 正文与行内样式 */
.markdown-body :deep(p) {
  margin: 0.9em 0;
}

.markdown-body :deep(strong) {
  color: var(--md-heading);
  font-weight: 700;
}

.markdown-body :deep(em) {
  font-style: italic;
}

.markdown-body :deep(del) {
  color: var(--md-muted);
}

.markdown-body :deep(a) {
  color: var(--md-accent);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.markdown-body :deep(a:hover) {
  text-decoration-thickness: 2px;
}

.markdown-body :deep(hr) {
  height: 1px;
  margin: 2em 0;
  border: 0;
  background-color: var(--md-border);
}

.markdown-body :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
}

/* 视频等第三方嵌入：iframe 默认尺寸只有 300×150，这里统一成 16:9 自适应宽度 */
.markdown-body :deep(iframe) {
  display: block;
  width: 100%;
  max-width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  margin: 1em 0;
  border: 1px solid var(--md-border);
  border-radius: 12px;
}

/* 代码 */
.markdown-body :deep(code) {
  padding: 0.15em 0.4em;
  border-radius: 6px;
  background-color: var(--md-surface);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 0.88em;
}

.markdown-body :deep(pre) {
  margin: 1em 0;
  padding: 14px 16px;
  overflow-x: auto;
  border: 1px solid var(--md-border);
  border-radius: 12px;
  background-color: var(--md-surface);
  line-height: 1.6;
}

.markdown-body :deep(pre code) {
  padding: 0;
  border-radius: 0;
  background-color: transparent;
  font-size: 0.86rem;
}

/* 引用：左侧色条 + 淡底色，文字用比正文略弱的颜色但保证暗色下可读 */
.markdown-body :deep(blockquote) {
  margin: 1em 0;
  padding: 0.7em 1.1em;
  border-left: 4px solid var(--md-quote-border);
  border-radius: 0 8px 8px 0;
  background-color: var(--md-quote-surface);
  color: var(--md-quote-text);
}

/* 嵌套引用弱化：换成中性色条、去掉底色，避免与父级同色难以区分 */
.markdown-body :deep(blockquote blockquote) {
  border-left-color: var(--md-border);
  background-color: transparent;
}

.markdown-body :deep(blockquote > :first-child) {
  margin-top: 0;
}

.markdown-body :deep(blockquote > :last-child) {
  margin-bottom: 0;
}

/* 列表 */
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 0.9em 0;
  padding-left: 1.6em;
}

.markdown-body :deep(li) {
  margin: 0.3em 0;
}

.markdown-body :deep(li > ul),
.markdown-body :deep(li > ol) {
  margin: 0.3em 0;
}

/* 任务列表：去掉项目符号并对齐复选框 */
.markdown-body :deep(li:has(> input[type='checkbox'])) {
  margin-left: -1.4em;
  list-style: none;
}

.markdown-body :deep(li > input[type='checkbox']) {
  margin-right: 0.45em;
  vertical-align: middle;
}

/* 表格：横向可滚动，避免窄屏撑破容器 */
.markdown-body :deep(table) {
  display: block;
  width: max-content;
  max-width: 100%;
  margin: 1em 0;
  overflow-x: auto;
  border-collapse: collapse;
  font-size: 0.94rem;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  padding: 8px 14px;
  border: 1px solid var(--md-border);
}

.markdown-body :deep(th) {
  background-color: var(--md-surface);
  color: var(--md-heading);
  font-weight: 700;
  text-align: left;
}
</style>
