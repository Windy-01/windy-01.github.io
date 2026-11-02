<template>
  <DocumentMain class="home-document-main">
    <section class="page-community" aria-label="社区内容">
      <header class="page-community__header">
        <div class="page-community__heading">
          <h1 class="page-community__title">Community</h1>
          <p class="page-community__hint">帖子列表</p>
        </div>

        <RouterLink class="page-community__new" :to="{ name: 'post-new' }">＋ 新建帖子</RouterLink>
      </header>

      <!-- 发帖成功后的回跳提示：`/community?published=1`。 -->
      <p v-if="justPublished" class="page-community__flash" role="status">帖子已发布。</p>

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
import { RouterLink, useRoute } from 'vue-router'

import PostCard from '../components/common/PostCard.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import { useConfig } from '../config'

const route = useRoute()

/**
 * 发帖页发布成功后 `replace` 到这里并带上 `?published=1`。
 * 只做一次性提示，不清 query —— 刷新后还在，但那是「刚发过」的合理暗示。
 */
const justPublished = computed(() => route.query.published === '1')

// 背景图地址跟随运行时配置，改完设置无需刷新即可生效。
const { config } = useConfig()

// 帖子数据暂时硬编码，后续接入真实数据源时替换这里即可。
// ⚠️ 这条卡片指向的是**本地静态文档** `/document/:id`（正文在 `tmp/markdown-test.md`），
// 不是后端帖子 —— 后端帖子是两段地址 `/document/:userid/:postid`，需要真实 userid / postid。
// 卡片刻意不带 `postId`：本地文档没有后端 id，带了会让统计栏显示三个 0 并发出无效请求。
const posts = computed(() => [
  {
    title: 'Markdown 渲染测试',
    summary: '覆盖 h1–h6 标题、加粗斜体、行内代码与代码块、引用（含嵌套）、无序与有序列表、任务列表、表格、图片等全部文字样式的渲染用例。',
    author: 'Windy',
    date: '2026-10-14',
    tags: ['Markdown', 'Vue'],
    to: '/document/markdown-test',
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
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.page-community__heading {
  min-width: 0;
}

.page-community__title {
  margin: 0;
  font-size: 2rem;
}

/* 入口按钮：和卡片同一套玻璃语言，圆形药丸、细边框、悬停微亮。 */
.page-community__new {
  flex: 0 0 auto;
  margin-top: 4px;
  padding: 8px 16px;
  border: 1px solid rgb(37 99 235 / 28%);
  border-radius: 999px;
  color: #1d4ed8;
  background-color: rgb(37 99 235 / 10%);
  font-size: 0.88rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

.page-community__new:hover {
  border-color: rgb(37 99 235 / 45%);
  background-color: rgb(37 99 235 / 16%);
  transform: translateY(-1px);
}

.page-community__new:focus-visible {
  outline: 2px solid rgb(37 99 235 / 55%);
  outline-offset: 2px;
}

:global(.dark-mode .page-community__new) {
  border-color: rgb(125 211 252 / 32%);
  color: #7dd3fc;
  background-color: rgb(125 211 252 / 14%);
}

:global(.dark-mode .page-community__new:hover) {
  border-color: rgb(125 211 252 / 55%);
  background-color: rgb(125 211 252 / 22%);
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

.page-community__flash {
  margin: 0 0 16px;
  padding: 9px 13px;
  border: 1px solid rgb(16 185 129 / 30%);
  border-radius: 10px;
  color: #047857;
  background-color: rgb(16 185 129 / 10%);
  font-size: 0.86rem;
}

:global(.dark-mode .page-community__flash) {
  border-color: rgb(52 211 153 / 32%);
  color: #6ee7b7;
  background-color: rgb(52 211 153 / 12%);
}
</style>
