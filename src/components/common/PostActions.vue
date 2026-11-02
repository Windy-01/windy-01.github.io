<template>
  <div class="post-actions">
    <button
      class="post-actions__button"
      :class="{ 'is-active': liked }"
      type="button"
      :aria-pressed="liked"
      :disabled="pending.like"
      :title="liked ? '取消点赞' : '点赞'"
      @click="toggleLike"
    >
      <svg class="post-actions__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14Z" />
        <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
      </svg>
      <span class="post-actions__label">点赞</span>
      <span class="post-actions__count">{{ likes }}</span>
    </button>

    <button
      class="post-actions__button"
      :class="{ 'is-active': favorited }"
      type="button"
      :aria-pressed="favorited"
      :disabled="pending.favorite"
      :title="favorited ? '取消收藏' : '收藏'"
      @click="toggleFavorite"
    >
      <svg class="post-actions__icon" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M19 21 12 16l-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
      </svg>
      <span class="post-actions__label">收藏</span>
      <span class="post-actions__count">{{ favorites }}</span>
    </button>

    <p v-if="note !== ''" class="post-actions__note" role="status">{{ note }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

import { favoritePost, likePost, unfavoritePost, unlikePost } from '../../api/posts'
import { session } from '../../api/session'

const props = defineProps<{
  /** 帖子作者 userid，路径参数。 */
  userId: string
  /** 帖子 id，路径参数。 */
  postId: string
  /** 初始点赞数。 */
  likeCount: number
  /** 初始收藏数。 */
  favoriteCount: number
}>()

/** 是否已登录：未登录时点赞/收藏只给提示，不发请求（后端也一定会拒）。 */
const loggedIn = computed(() => session.value !== null)

/** 计数先取父组件传来的初始值，之后由本组件的点击操作就地增减。 */
const likes = ref(props.likeCount)
const favorites = ref(props.favoriteCount)

/**
 * 是否已点赞 / 已收藏。
 *
 * ⚠️ 后端**没有**「我是否点过赞」的查询接口，所以这里只是本次会话内的本地状态，
 * 刷新页面就会归零。等后端补了 `is_liked` / `is_favorited` 字段，改成读接口即可。
 */
const liked = ref(false)
const favorited = ref(false)

const pending = ref({ like: false, favorite: false })
const note = ref('')

let noteTimer = 0

/** 一句临时提示，2.4 秒后自动消失。 */
function showNote(text: string) {
  note.value = text
  window.clearTimeout(noteTimer)
  noteTimer = window.setTimeout(() => {
    note.value = ''
  }, 2400)
}

function describeError(cause: unknown): string {
  return cause instanceof Error && cause.message !== '' ? cause.message : '操作失败，请稍后重试。'
}

async function toggleLike() {
  if (pending.value.like) {
    return
  }

  if (!loggedIn.value) {
    showNote('登录后可以点赞。')
    return
  }

  pending.value.like = true

  try {
    if (liked.value) {
      await unlikePost(props.userId, props.postId)
      liked.value = false
      likes.value = Math.max(0, likes.value - 1)
    } else {
      await likePost(props.userId, props.postId)
      liked.value = true
      likes.value += 1
    }
  } catch (cause) {
    showNote(describeError(cause))
  } finally {
    pending.value.like = false
  }
}

async function toggleFavorite() {
  if (pending.value.favorite) {
    return
  }

  if (!loggedIn.value) {
    showNote('登录后可以收藏。')
    return
  }

  pending.value.favorite = true

  try {
    if (favorited.value) {
      await unfavoritePost(props.userId, props.postId)
      favorited.value = false
      favorites.value = Math.max(0, favorites.value - 1)
    } else {
      await favoritePost(props.userId, props.postId)
      favorited.value = true
      favorites.value += 1
    }
  } catch (cause) {
    showNote(describeError(cause))
  } finally {
    pending.value.favorite = false
  }
}
</script>

<style scoped>
.post-actions {
  --pa-border: rgb(15 23 42 / 10%);
  --pa-text: #475569;
  --pa-muted: #64748b;
  --pa-hover-bg: rgb(37 99 235 / 8%);
  --pa-active: #2563eb;
  --pa-active-bg: rgb(37 99 235 / 12%);
  --pa-favorite: #b45309;
  --pa-favorite-bg: rgb(180 83 9 / 12%);
  --pa-note: #b91c1c;

  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 28px;
  padding-top: 16px;
  border-top: 1px solid var(--pa-border);
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .post-actions) {
  --pa-border: rgb(255 255 255 / 12%);
  --pa-text: #cbd5e1;
  --pa-muted: #94a3b8;
  --pa-hover-bg: rgb(96 165 250 / 12%);
  --pa-active: #7dd3fc;
  --pa-active-bg: rgb(125 211 252 / 16%);
  --pa-favorite: #fbbf24;
  --pa-favorite-bg: rgb(251 191 36 / 16%);
  --pa-note: #fca5a5;
}

.post-actions__button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background-color: transparent;
  color: var(--pa-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  line-height: 1.6;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.post-actions__button:hover:not(:disabled) {
  background-color: var(--pa-hover-bg);
}

.post-actions__button:disabled {
  cursor: progress;
  opacity: 0.6;
}

.post-actions__button.is-active {
  border-color: currentcolor;
  background-color: var(--pa-active-bg);
  color: var(--pa-active);
}

/* 收藏用琥珀色区分，避免和点赞的蓝色混在一起。 */
.post-actions__button.is-active:nth-of-type(2) {
  background-color: var(--pa-favorite-bg);
  color: var(--pa-favorite);
}

.post-actions__icon {
  flex: 0 0 auto;
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentcolor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.post-actions__count {
  color: var(--pa-muted);
  font-variant-numeric: tabular-nums;
}

.post-actions__button.is-active .post-actions__count {
  color: inherit;
}

.post-actions__note {
  margin: 0 0 0 auto;
  color: var(--pa-note);
  font-size: 0.8rem;
}

@media (max-width: 640px) {
  .post-actions__note {
    flex: 1 0 100%;
    margin-left: 0;
  }
}
</style>
