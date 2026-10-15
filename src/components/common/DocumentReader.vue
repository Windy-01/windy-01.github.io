<template>
  <DocumentMain class="document-reader">
    <p v-if="loading" class="document-reader__status" role="status">正在加载文档…</p>

    <p
      v-else-if="error"
      class="document-reader__status document-reader__status--error"
      role="alert"
    >
      {{ error }}
    </p>

    <MarkdownView v-else :source="source" :aria-label="ariaLabel" />
  </DocumentMain>
</template>

<script setup lang="ts">
import MarkdownView from './MarkdownView.vue'
import DocumentMain from '../layout/DocumentMain.vue'

/**
 * 毛玻璃文档卡片 + Markdown 渲染，并处理「加载中 / 出错」两种状态。
 *
 * 只负责展示，数据由调用方决定从哪来：`document` 来自后端接口（`src/api/documents.ts`），
 * `about` 来自仓库里的 README 静态文件。
 */
withDefaults(
  defineProps<{
    /** Markdown 正文。加载中或出错时可以不传。 */
    source?: string
    /** 是否正在加载。 */
    loading?: boolean
    /** 错误信息；空串表示没有错误。 */
    error?: string
    /** 无障碍标签，同时用于区分不同文档。 */
    ariaLabel?: string
  }>(),
  {
    source: '',
    loading: false,
    error: '',
    ariaLabel: '文档内容',
  },
)
</script>

<style scoped>
.document-reader {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin: 0;
}

.document-reader__status {
  margin: 0;
  color: #475569;
  font-size: 0.95rem;
  line-height: 1.7;
}

.document-reader__status--error {
  color: #dc2626;
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .document-reader__status) {
  color: #cbd5e1;
}

:global(.dark-mode .document-reader__status--error) {
  color: #fca5a5;
}

@media (max-width: 768px) {
  .document-reader {
    width: 100%;
    margin: 0;
  }
}
</style>
