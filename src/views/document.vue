<template>
  <DocumentReader
    :source="post?.mainText ?? ''"
    :loading="loading"
    :loading-text="'正在加载帖子…'"
    :error="error"
    :aria-label="ariaLabel"
  >
    <!-- 正文上方：标题 / 作者 / 时间（+ 可选封面）。 -->
    <template v-if="post !== null" #header>
      <header class="post-head">
        <h1 class="post-head__title">{{ displayTitle }}</h1>

        <div class="post-head__meta">
          <span class="post-head__author">{{ displayAuthor }}</span>
          <template v-if="postDate !== ''">
            <span class="post-head__dot" aria-hidden="true">·</span>
            <time :datetime="post.updatedAt || post.createdAt">{{ postDate }}</time>
          </template>
        </div>
      </header>

      <figure v-if="coverUrl !== ''" class="post-cover">
        <img class="post-cover__image" :src="coverUrl" alt="" loading="lazy" decoding="async">
      </figure>
    </template>

    <!-- 正文下方：空正文提示 + 点赞收藏 + 评论区。 -->
    <template v-if="post !== null" #footer>
      <p v-if="post.mainText.trim() === ''" class="post-empty">这篇帖子还没有正文。</p>

      <PostActions
        :user-id="post.userId"
        :post-id="post.postId"
        :like-count="post.likeCount"
        :favorite-count="post.favoriteCount"
      />

      <PostComments :post-id="post.postId" :allow-comment="post.allowComment" />
    </template>
  </DocumentReader>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import DocumentReader from '../components/common/DocumentReader.vue'
import PostActions from '../components/common/PostActions.vue'
import PostComments from '../components/common/PostComments.vue'
import { ApiError } from '../api/http'
import type { PostDetail } from '../api/posts'
import { fetchPost } from '../api/posts'
import { formatDate } from '../utils/chatTime'

const route = useRoute()

/** 帖子 id 与作者 userid 都来自路由 `/document/:userid/:postid`。 */
const routeUserId = computed(() => String(route.params.userid ?? '').trim())
const routePostId = computed(() => String(route.params.postid ?? '').trim())

const post = ref<PostDetail | null>(null)
const loading = ref(false)
const error = ref('')

/** 请求序号：只认最后一次发起的请求，避免快速切换帖子时旧响应覆盖新内容。 */
let requestToken = 0

const displayTitle = computed(() => {
  const title = post.value?.title ?? ''

  return title !== '' ? title : '未命名帖子'
})

const displayAuthor = computed(() => {
  const value = post.value

  if (value === null) {
    return ''
  }

  return value.author !== '' ? value.author : `用户 ${value.userId}`
})

const ariaLabel = computed(() => (post.value?.title !== undefined && post.value.title !== '' ? post.value.title : '帖子内容'))

/** 帖子时间优先用更新时间，没有再用创建时间。 */
const postDate = computed(() => {
  const value = post.value

  if (value === null) {
    return ''
  }

  return formatDate(value.updatedAt !== '' ? value.updatedAt : value.createdAt)
})

/**
 * 封面地址。
 *
 * ⚠️ 只有「已经是可直接访问的地址」（`http(s)://` 或站内 `/` 开头）才展示：
 * 后端存的是对象存储引用（`cover_image_ref`），换成可访问地址需要签名链接，
 * 前端拿不到，硬拼只会渲染成一张破图。
 */
const coverUrl = computed(() => {
  const value = post.value?.coverImageRef ?? ''

  if (value === '') {
    return ''
  }

  return /^(https?:)?\/\//.test(value) || value.startsWith('/') ? value : ''
})

/** 把接口错误翻成一句人话；404 单独说清楚。 */
function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 404) {
      return '没有找到这篇帖子。'
    }

    if (cause.status === 0) {
      return '无法连接到服务器，请检查网络或设置里的 API 地址。'
    }
  }

  return cause instanceof Error && cause.message !== '' ? cause.message : '帖子加载失败。'
}

async function loadPost(userId: string, postId: string) {
  const token = ++requestToken

  loading.value = true
  error.value = ''
  post.value = null

  try {
    const detail = await fetchPost(userId, postId)

    if (token !== requestToken) {
      return
    }

    post.value = detail
  } catch (cause) {
    if (token !== requestToken) {
      return
    }

    error.value = describeError(cause)
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

// 从一个帖子切到另一个时组件实例会被复用，必须监听参数变化。
watch(
  () => [routeUserId.value, routePostId.value] as const,
  () => {
    if (routeUserId.value === '' || routePostId.value === '') {
      error.value = '帖子地址不完整。'
      post.value = null
      return
    }

    void loadPost(routeUserId.value, routePostId.value)
  },
  { immediate: true },
)
</script>

<style scoped>
.post-head {
  --ph-text: #0f172a;
  --ph-muted: #64748b;

  margin-bottom: 20px;
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .post-head) {
  --ph-text: #f8fafc;
  --ph-muted: #94a3b8;
}

.post-head__title {
  margin: 0;
  color: var(--ph-text);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.post-head__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-top: 10px;
  color: var(--ph-muted);
  font-size: 0.86rem;
}

.post-head__author {
  font-weight: 600;
}

.post-head__dot {
  opacity: 0.6;
}

/* 封面：整宽、16:9 上限，圆角与卡片一致。 */
.post-cover {
  margin: 0 0 22px;
  overflow: hidden;
  border-radius: 14px;
  background-color: rgb(15 23 42 / 6%);
}

:global(.dark-mode .post-cover) {
  background-color: rgb(255 255 255 / 8%);
}

.post-cover__image {
  display: block;
  width: 100%;
  max-height: 380px;
  object-fit: cover;
}

.post-empty {
  margin: 18px 0 0;
  color: #64748b;
  font-size: 0.92rem;
}

:global(.dark-mode .post-empty) {
  color: #94a3b8;
}

/* 正文与标题之间留出呼吸，避免第一行紧贴 meta 行。 */
@media (max-width: 768px) {
  .post-head__title {
    font-size: 1.4rem;
  }
}
</style>
