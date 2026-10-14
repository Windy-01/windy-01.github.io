<template>
  <article class="post-card">
    <RouterLink class="post-card__link" :to="to">
      <div class="post-card__body">
        <div class="post-card__head">
          <h2 class="post-card__title">{{ title }}</h2>
          <span class="post-card__arrow" aria-hidden="true">→</span>
        </div>

        <p v-if="summary" class="post-card__summary">{{ summary }}</p>

        <div class="post-card__footer">
          <!-- 统计三项：浏览量 / 点赞 / 评论，位于标签左侧，用 | 分隔。 -->
          <div class="post-card__stats">
            <span class="post-card__stat" title="浏览量">
              <svg
                class="post-card__stat-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <span class="post-card__stat-value">{{ stats.views }}</span>
            </span>

            <span class="post-card__divider" aria-hidden="true">|</span>

            <span class="post-card__stat" title="点赞数">
              <svg
                class="post-card__stat-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" />
                <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
              </svg>
              <span class="post-card__stat-value">{{ stats.likes }}</span>
            </span>

            <span class="post-card__divider" aria-hidden="true">|</span>

            <span class="post-card__stat" title="评论数">
              <svg
                class="post-card__stat-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
              </svg>
              <span class="post-card__stat-value">{{ stats.comments }}</span>
            </span>
          </div>

          <ul v-if="tags.length > 0" class="post-card__tags">
            <li v-for="tag in tags" :key="tag" class="post-card__tag">
              {{ tag }}
            </li>
          </ul>

          <div v-if="author || date" class="post-card__meta">
            <span v-if="author">{{ author }}</span>
            <span v-if="author && date" class="post-card__divider" aria-hidden="true">·</span>
            <time v-if="date" :datetime="date">{{ date }}</time>
          </div>
        </div>
      </div>

      <!-- 方形封面位：暂时复用站点背景图，接入真实封面时替换 cover 的取值即可。 -->
      <div v-if="cover" class="post-card__cover" aria-hidden="true">
        <img
          class="post-card__cover-image"
          :src="cover"
          alt=""
          loading="lazy"
          decoding="async"
        >
      </div>
    </RouterLink>
  </article>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { emptyPostStats, fetchPostStats, type PostStats } from '../../api/postStats'

const props = withDefaults(defineProps<{
  /** 帖子标题。 */
  title: string
  /** 点击后跳转的目标路由。 */
  to: RouteLocationRaw
  /** 摘要，过长时最多显示两行。 */
  summary?: string
  author?: string
  /** 展示用日期文本，同时作为 <time> 的 datetime 值。 */
  date?: string
  tags?: string[]
  /** 方形封面图地址，缺省时不渲染封面位。 */
  cover?: string
  /** 帖子标识，用于拉取统计数据；缺省时统计保持为 0。 */
  postId?: string
}>(), {
  summary: '',
  author: '',
  date: '',
  tags: () => [],
  cover: '',
  postId: '',
})

/** 统计三项，先给零值，挂载后再走接口刷新。 */
const stats = ref<PostStats>(emptyPostStats())

onMounted(async () => {
  if (!props.postId) {
    return
  }

  stats.value = await fetchPostStats(props.postId)
})
</script>

<style scoped>
.post-card {
  --post-border: rgb(15 23 42 / 10%);
  --post-surface: rgb(255 255 255 / 42%);
  --post-title: #0f172a;
  --post-text: #475569;
  --post-muted: #64748b;
  --post-tag-bg: rgb(37 99 235 / 10%);
  --post-tag-text: #1d4ed8;
  --post-hover-border: rgb(37 99 235 / 35%);
  --post-cover-size: 120px;
  --post-cover-bg: rgb(15 23 42 / 6%);

  border: 1px solid var(--post-border);
  border-radius: 16px;
  background-color: var(--post-surface);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease;
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .post-card {
    background-color: rgb(255 255 255 / 72%);
  }
}

/* 同样注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .post-card) {
  --post-border: rgb(255 255 255 / 12%);
  --post-surface: rgb(15 23 42 / 28%);
  --post-title: #f8fafc;
  --post-text: #cbd5e1;
  --post-muted: #94a3b8;
  --post-tag-bg: rgb(125 211 252 / 14%);
  --post-tag-text: #7dd3fc;
  --post-hover-border: rgb(125 211 252 / 45%);
  --post-cover-bg: rgb(255 255 255 / 8%);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  :global(.dark-mode .post-card) {
    background-color: rgb(15 23 42 / 88%);
  }
}

.post-card:hover {
  border-color: var(--post-hover-border);
  transform: translateY(-2px);
}

.post-card__link {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 18px 20px;
  color: inherit;
  text-decoration: none;
}

.post-card__body {
  flex: 1 1 auto;
  min-width: 0;
}

/* 方形封面位：宽高相等保证正方形，图片按 cover 裁切填满 */
.post-card__cover {
  flex: 0 0 auto;
  width: var(--post-cover-size);
  height: var(--post-cover-size);
  overflow: hidden;
  border-radius: 12px;
  background-color: var(--post-cover-bg);
}

.post-card__cover-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.25s ease;
}

.post-card:hover .post-card__cover-image {
  transform: scale(1.05);
}

.post-card__head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.post-card__title {
  flex: 1 1 auto;
  min-width: 0;
  margin: 0;
  color: var(--post-title);
  font-size: 1.15rem;
  font-weight: 700;
  line-height: 1.4;
}

.post-card__arrow {
  flex: 0 0 auto;
  color: var(--post-muted);
  font-size: 1.1rem;
  line-height: 1.4;
  transition:
    color 0.2s ease,
    transform 0.2s ease;
}

.post-card:hover .post-card__arrow {
  color: var(--post-tag-text);
  transform: translateX(3px);
}

/* 摘要固定两行。只保留 -webkit-box 这套旧方案：
   标准的 line-clamp 与 -webkit-box 混用时可能让截断失效，故不写。 */
.post-card__summary {
  display: -webkit-box;
  margin: 10px 0 0;
  overflow: hidden;
  color: var(--post-text);
  font-size: 0.94rem;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

/* 底部合并为一行：左侧统计三项，中间标签，右侧作者与日期。
   flex-wrap 是必需的：三个分组都不可压缩时，nowrap 会把卡片的最小宽度撑大，
   在窄容器里把封面挤出可视区。允许换行后最小宽度只取决于最宽的那一项。 */
.post-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
}

/* 统计三项固定不压缩，窄屏时优先让标签换行 */
.post-card__stats {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  color: var(--post-muted);
  font-size: 0.82rem;
  line-height: 1.6;
  white-space: nowrap;
}

.post-card__stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.post-card__stat-icon {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
}

.post-card__stat-value {
  font-variant-numeric: tabular-nums;
}

.post-card__tags {
  display: flex;
  flex: 1 1 auto;
  flex-wrap: wrap;
  gap: 8px;
  min-width: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.post-card__tag {
  padding: 3px 10px;
  border-radius: 999px;
  background-color: var(--post-tag-bg);
  color: var(--post-tag-text);
  font-size: 0.8rem;
  line-height: 1.6;
}

.post-card__meta {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  color: var(--post-muted);
  font-size: 0.82rem;
  white-space: nowrap;
}

.post-card__divider {
  opacity: 0.6;
}

@media (prefers-reduced-motion: reduce) {
  .post-card,
  .post-card__arrow,
  .post-card__cover-image {
    transition: none;
  }

  .post-card:hover {
    transform: none;
  }

  .post-card:hover .post-card__arrow {
    transform: none;
  }

  .post-card:hover .post-card__cover-image {
    transform: none;
  }
}

@media (max-width: 640px) {
  .post-card {
    --post-cover-size: 88px;
  }

  /* 窄屏一行放不下统计 + 标签 + 作者日期，让统计独占一行，
     第二行仍是左侧标签、右侧作者日期。 */
  .post-card__stats {
    flex: 1 0 100%;
  }
}
</style>
