<template>
  <article class="post-card">
    <RouterLink class="post-card__link" :to="to">
      <div class="post-card__body">
        <div class="post-card__head">
          <h2 class="post-card__title">{{ title }}</h2>
          <span class="post-card__arrow" aria-hidden="true">→</span>
        </div>

        <p v-if="summary" class="post-card__summary">{{ summary }}</p>

        <div v-if="tags.length > 0 || author || date" class="post-card__footer">
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
import type { RouteLocationRaw } from 'vue-router'

withDefaults(defineProps<{
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
}>(), {
  summary: '',
  author: '',
  date: '',
  tags: () => [],
  cover: '',
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

/* 底部合并为一行：左侧标签，右侧作者与日期 */
.post-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 14px;
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
}
</style>
