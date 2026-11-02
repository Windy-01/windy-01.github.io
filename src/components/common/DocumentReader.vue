<template>
  <DocumentMain class="document-reader">
    <p v-if="loading" class="document-reader__status" role="status">{{ loadingText }}</p>

    <p
      v-else-if="error"
      class="document-reader__status document-reader__status--error"
      role="alert"
    >
      {{ error }}
    </p>

    <template v-else>
      <!-- 正文上方的自定义区（帖子标题 / 作者 / 时间等）；不传就什么都不渲染。 -->
      <slot name="header" />

      <MarkdownView :source="source" :aria-label="ariaLabel" />

      <!-- 正文下方的自定义区（点赞收藏条 / 评论区等）。 -->
      <slot name="footer" />
    </template>
  </DocumentMain>
</template>

<script setup lang="ts">
import MarkdownView from './MarkdownView.vue'
import DocumentMain from '../layout/DocumentMain.vue'

/**
 * 毛玻璃文档卡片 + Markdown 渲染，并处理「加载中 / 出错」两种状态。
 *
 * 只负责展示，数据由调用方决定从哪来：`document` 来自后端接口（`src/api/documents.ts`），
 * `about` 来自仓库里的 README 静态文件，帖子详情来自 `src/api/posts.ts`。
 *
 * `header` / `footer` 两个具名插槽用于在正文前后插入内容（帖子详情用它放标题和评论区）；
 * 不传插槽时渲染结果与以前完全一致。
 */
withDefaults(
  defineProps<{
    /** Markdown 正文。加载中或出错时可以不传。 */
    source?: string
    /** 是否正在加载。 */
    loading?: boolean
    /** 加载中的提示文案；帖子详情传「正在加载帖子…」。 */
    loadingText?: string
    /** 错误信息；空串表示没有错误。 */
    error?: string
    /** 无障碍标签，同时用于区分不同文档。 */
    ariaLabel?: string
  }>(),
  {
    source: '',
    loading: false,
    loadingText: '正在加载文档…',
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
