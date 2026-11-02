<template>
  <DocumentMain class="home-document-main">
    <section class="page-community" aria-label="社区内容">
      <header class="page-community__header">
        <h1 class="page-community__title">Community</h1>
        <p class="page-community__hint">帖子列表</p>
      </header>

      <div class="page-community__posts">
        <PostCard
          v-for="post in posts"
          :key="post.title"
          v-bind="post"
        />
      </div>
    </section>
  </DocumentMain>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import PostCard from '../components/common/PostCard.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import { useConfig } from '../config'

// 背景图地址跟随运行时配置，改完设置无需刷新即可生效。
const { config } = useConfig()

// 帖子数据暂时硬编码，后续接入真实数据源时替换这里即可。
// ⚠️ 本地静态文档（`/document/:id`）已经取消，这条卡片改指 `/document` 说明页 ——
// 它原本指向的 `/document/markdown-test` 现在没有对应路由，点了会白屏。
const posts = computed(() => [
  {
    title: '文档栏目说明',
    summary: '这个栏目怎么用、页面有哪些区域、当前接入了哪些接口。具体某篇帖子的地址是 /document/{userid}/{postid}。',
    author: 'Windy',
    date: '2026-11-02',
    tags: ['文档'],
    to: '/document',
    // 暂时复用站点背景图作为封面。
    cover: config.backgroundImageUrl,
  },
])
</script>

<style scoped>
.home-document-main {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin: 0;
}

@media (max-width: 768px) {
  .home-document-main {
    width: 100%;
    margin: 0;
  }
}

.page-community {
  color: #1e293b;
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .page-community) {
  color: #e2e8f0;
}

.page-community__header {
  margin-bottom: 20px;
}

.page-community__title {
  margin: 0;
  font-size: 2rem;
}

.page-community__hint {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 0.9rem;
}

:global(.dark-mode .page-community__hint) {
  color: #94a3b8;
}

.page-community__posts {
  display: grid;
  gap: 16px;
}
</style>
