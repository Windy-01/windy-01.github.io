<template>
  <DocumentMain class="user-page-card">
    <p v-if="loading" class="user-page__status" role="status">正在加载用户资料…</p>

    <p
      v-else-if="error"
      class="user-page__status user-page__status--error"
      role="alert"
    >
      {{ error }}
    </p>

    <div v-else-if="profile" class="user-page">
      <!-- 左栏：GitHub 风格的资料区 -->
      <aside class="user-page__sidebar" :aria-label="`${profile.name} 的资料`">
        <div class="user-page__avatar">
          <img
            v-if="profile.avatar"
            :src="profile.avatar"
            :alt="`${profile.name} 的头像`"
            decoding="async"
          >
          <!-- 没有头像时用内置占位图，与顶栏用户区保持一致 -->
          <svg
            v-else
            viewBox="0 0 40 40"
            role="img"
            :aria-label="`${profile.name} 的头像`"
            focusable="false"
          >
            <circle cx="20" cy="20" r="20" fill="#cbd5e1" />
            <circle cx="20" cy="16" r="6.5" fill="#f8fafc" />
            <path d="M20 24c-6.63 0-12 5.37-12 12v4h24v-4c0-6.63-5.37-12-12-12z" fill="#f8fafc" />
          </svg>
        </div>

        <h1 class="user-page__name">{{ profile.name }}</h1>
        <p class="user-page__login">@{{ profile.login }}</p>
        <p v-if="profile.bio" class="user-page__bio">{{ profile.bio }}</p>

        <!-- 展示用占位：关注功能尚未接入，按钮保持禁用。 -->
        <button class="user-page__follow" type="button" disabled title="关注功能尚未接入">
          关注
        </button>

        <p class="user-page__counts">
          <span><strong>{{ profile.followers }}</strong> 关注者</span>
          <span aria-hidden="true">·</span>
          <span><strong>{{ profile.following }}</strong> 正在关注</span>
        </p>

        <ul v-if="metaItems.length > 0" class="user-page__meta">
          <li v-for="item in metaItems" :key="item.key">
            <svg
              class="user-page__meta-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
              focusable="false"
            >
              <path v-for="(path, index) in item.paths" :key="index" :d="path" />
            </svg>
            <a
              v-if="item.href"
              :href="item.href"
              target="_blank"
              rel="noopener noreferrer"
            >{{ item.text }}</a>
            <span v-else>{{ item.text }}</span>
          </li>
        </ul>
      </aside>

      <!-- 右栏：主页正文（Markdown） -->
      <section class="user-page__main" :aria-label="`${profile.name} 的主页内容`">
        <nav class="user-page__tabs" aria-label="主页栏目">
          <span class="user-page__tab is-active" aria-current="page">概览</span>
          <span class="user-page__tab" aria-disabled="true">仓库</span>
          <span class="user-page__tab" aria-disabled="true">收藏</span>
        </nav>

        <header class="user-page__readme-header">
          <svg
            class="user-page__readme-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M6.5 3h7l4 4v14h-11Z" />
            <path d="M13.5 3v4h4" />
          </svg>
          <span>{{ profile.name }} / README.md</span>
        </header>

        <MarkdownView
          v-if="profile.detail.trim() !== ''"
          class="user-page__readme"
          :source="profile.detail"
          :aria-label="`${profile.name} 的主页正文`"
        />
        <!-- 用户存在但主页正文是空的：给一句占位，别留一块空白 -->
        <p v-else class="user-page__readme-empty">
          这个用户还没有设置主页内容。
        </p>
      </section>
    </div>

    <!-- 已登录但还没有个人主页（`/user/me` 解析不到资料）：给明确的空状态，而不是错误页 -->
    <div v-else-if="notSetUp" class="user-page-empty">
      <div class="user-page-empty__avatar" aria-hidden="true">
        <svg viewBox="0 0 40 40" focusable="false">
          <circle cx="20" cy="20" r="20" fill="#cbd5e1" />
          <circle cx="20" cy="16" r="6.5" fill="#f8fafc" />
          <path d="M20 24c-6.63 0-12 5.37-12 12v4h24v-4c0-6.63-5.37-12-12-12z" fill="#f8fafc" />
        </svg>
      </div>

      <h1 class="user-page-empty__title">还没有设置个人主页</h1>
      <!-- 资料接口未接入，用登录时记录的账号告诉用户「现在是谁」 -->
      <p v-if="currentAccount !== ''" class="user-page-empty__account">
        当前账号：<strong>{{ currentAccount }}</strong>
      </p>
      <p class="user-page-empty__text">
        这个账号还没有主页内容。设置功能尚未开放，之后可以在这里填写简介、链接和主页正文。
      </p>
      <RouterLink class="user-page-empty__action" :to="{ name: 'home' }">
        返回首页
      </RouterLink>
    </div>
  </DocumentMain>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import MarkdownView from '../components/common/MarkdownView.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import { session } from '../api/session'
import { currentUserId, fetchCurrentUser, fetchUserProfile } from '../api/users'
import type { UserProfile } from '../api/users'

/** 资料区里的小图标，用 feather 风格的描边路径。 */
const iconBuilding = [
  'M3 21h18',
  'M6 21V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v16',
  'M13 9h4a1 1 0 0 1 1 1v11',
  'M9.5 8h1M9.5 12h1M9.5 16h1',
]
const iconLocation = [
  'M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z',
  'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
]
const iconLink = [
  'M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4',
  'M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4',
]
const iconCalendar = [
  'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z',
  'M4 10h16',
  'M8.5 3v4M15.5 3v4',
]

const route = useRoute()
const userId = computed(() => String(route.params.id ?? ''))

const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const error = ref('')
/** 已登录但还没有个人主页（`/user/me` 解析不到资料）时的空状态。 */
const notSetUp = ref(false)

/**
 * 当前登录账号（登录时填的用户名或邮箱）。
 *
 * 资料接口没接入，空状态里只能用它说明「现在登的是哪个账号」。
 */
const currentAccount = computed(() => session.value?.account ?? '')

/**
 * 请求序号：从 `/user/a` 切到 `/user/b` 时组件实例会复用，
 * 用它避免先发出的旧响应覆盖新内容。
 */
let requestToken = 0

async function load() {
  const id = userId.value
  const token = ++requestToken

  loading.value = true
  error.value = ''
  profile.value = null
  notSetUp.value = false

  try {
    // `/user/me` 是「当前登录用户」的保留 id：先解析成真实用户，再拉资料。
    if (id === currentUserId) {
      const me = await fetchCurrentUser()

      if (token !== requestToken) {
        return
      }

      // 解析不到当前用户（资料接口留空 / 还没建个人主页）—— 走空状态，不算错误。
      if (me === null) {
        notSetUp.value = true
        return
      }

      try {
        const result = await fetchUserProfile(me.id)

        if (token === requestToken) {
          profile.value = result
        }
      } catch {
        // 账号存在但还没有个人主页：对「我自己」来说这是空状态，不该显示报错。
        if (token === requestToken) {
          notSetUp.value = true
        }
      }

      return
    }

    const result = await fetchUserProfile(id)

    if (token !== requestToken) {
      return
    }

    profile.value = result
  } catch (cause) {
    if (token !== requestToken) {
      return
    }

    error.value = cause instanceof Error ? cause.message : '加载用户资料失败。'
  } finally {
    if (token === requestToken) {
      loading.value = false
    }
  }
}

// 必须监听 id：`/user/a` → `/user/b` 不会重建组件实例。
watch(userId, load, { immediate: true })

/** 资料区里的元信息行，空字段直接不展示。 */
const metaItems = computed(() => {
  const current = profile.value

  if (current === null) {
    return []
  }

  const items: Array<{ key: string, paths: string[], text: string, href?: string }> = []

  if (current.company !== '') {
    items.push({ key: 'company', paths: iconBuilding, text: current.company })
  }

  if (current.location !== '') {
    items.push({ key: 'location', paths: iconLocation, text: current.location })
  }

  if (current.website !== '') {
    items.push({
      key: 'website',
      paths: iconLink,
      text: current.website.replace(/^https?:\/\//, ''),
      href: current.website,
    })
  }

  if (current.joinedAt !== '') {
    items.push({ key: 'joined', paths: iconCalendar, text: `Joined ${current.joinedAt}` })
  }

  return items
})
</script>

<style scoped>
.user-page-card {
  --up-text: #1e293b;
  --up-heading: #0f172a;
  --up-muted: #64748b;
  --up-border: rgb(15 23 42 / 12%);
  --up-surface: rgb(15 23 42 / 4%);
  --up-accent: #2563eb;
  --up-button-bg: rgb(255 255 255 / 70%);
  --up-tab-active: #f97316;

  flex: 1 1 auto;
  width: auto;
  max-width: 1372px;
  margin: 0;
}

/* 注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。
   `DocumentMain` 自带的暗色覆盖目前是坏的（同样的塌缩写法），所以卡片在暗色下仍是
   亮色玻璃 —— 那个文件按约定不动，这里用更具体的选择器把本页局部兜住。 */
:global(.dark-mode .user-page-card) {
  --up-text: #e2e8f0;
  --up-heading: #f8fafc;
  --up-muted: #94a3b8;
  --up-border: rgb(255 255 255 / 12%);
  --up-surface: rgb(255 255 255 / 6%);
  --up-accent: #7dd3fc;
  --up-button-bg: rgb(255 255 255 / 8%);
  --up-tab-active: #fdba74;

  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 26.9%);
  box-shadow: 0 16px 40px rgb(0 0 0 / 28%);
}

.user-page__status {
  margin: 0;
  padding: 40px 0;
  color: var(--up-muted);
  font-size: 0.95rem;
  text-align: center;
}

.user-page__status--error {
  color: #dc2626;
}

:global(.dark-mode .user-page__status--error) {
  color: #fca5a5;
}

/* ---------- 未设置主页的空状态 ---------- */

.user-page-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 56px 24px;
  text-align: center;
}

.user-page-empty__avatar {
  display: grid;
  place-items: center;
  width: 96px;
  height: 96px;
  overflow: hidden;
  border-radius: 50%;
  background-color: var(--up-surface);
  box-shadow: inset 0 0 0 1px var(--up-border);
}

.user-page-empty__avatar svg {
  display: block;
  width: 100%;
  height: 100%;
}

.user-page-empty__title {
  margin: 4px 0 0;
  color: var(--up-heading);
  font-size: 1.3rem;
  line-height: 1.3;
}

.user-page-empty__text {
  max-width: 420px;
  margin: 0;
  color: var(--up-muted);
  font-size: 0.88rem;
  line-height: 1.7;
}

/* 临时账号标识：药丸形状，和「返回首页」按钮区分开 */
.user-page-empty__account {
  max-width: 100%;
  margin: 0;
  padding: 4px 14px;
  border: 1px solid var(--up-border);
  border-radius: 999px;
  background-color: var(--up-surface);
  color: var(--up-muted);
  font-size: 0.8rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}

.user-page-empty__account strong {
  color: var(--up-heading);
  font-weight: 700;
}

.user-page-empty__action {
  margin-top: 4px;
  padding: 8px 18px;
  border: 1px solid var(--up-border);
  border-radius: 999px;
  background-color: var(--up-button-bg);
  color: var(--up-accent);
  font-size: 0.86rem;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.user-page-empty__action:hover {
  border-color: var(--up-accent);
}

/* 主页正文为空时的占位 */
.user-page__readme-empty {
  margin: 0;
  padding: 32px 0;
  color: var(--up-muted);
  font-size: 0.9rem;
  text-align: center;
}

/* ---------- 两栏布局 ---------- */

.user-page {
  display: grid;
  grid-template-columns: 264px minmax(0, 1fr);
  gap: 32px;
  color: var(--up-text);
}

/* ---------- 左栏：资料 ---------- */

.user-page__avatar {
  width: 100%;
  max-width: 264px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--up-border);
  border-radius: 50%;
  background-color: var(--up-surface);
}

.user-page__avatar img,
.user-page__avatar svg {
  display: block;
  width: 100%;
  height: 100%;
}

.user-page__name {
  margin: 16px 0 0;
  color: var(--up-heading);
  font-size: 1.5rem;
  font-weight: 600;
  line-height: 1.25;
}

.user-page__login {
  margin: 2px 0 0;
  color: var(--up-muted);
  font-size: 1.15rem;
  font-weight: 300;
  line-height: 1.4;
}

.user-page__bio {
  margin: 12px 0 0;
  font-size: 0.95rem;
  line-height: 1.6;
}

.user-page__follow {
  width: 100%;
  min-height: 34px;
  margin-top: 14px;
  border: 1px solid var(--up-border);
  border-radius: 8px;
  background-color: var(--up-button-bg);
  color: var(--up-text);
  cursor: not-allowed;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  opacity: 0.72;
}

.user-page__counts {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 14px 0 0;
  color: var(--up-muted);
  font-size: 0.86rem;
}

.user-page__counts strong {
  color: var(--up-heading);
  font-weight: 700;
}

.user-page__meta {
  display: grid;
  gap: 8px;
  margin: 16px 0 0;
  padding: 0;
  color: var(--up-muted);
  font-size: 0.86rem;
  list-style: none;
}

.user-page__meta li {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.user-page__meta-icon {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.user-page__meta a {
  color: var(--up-accent);
  overflow-wrap: anywhere;
  text-decoration: none;
}

.user-page__meta a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ---------- 右栏：正文 ---------- */

.user-page__main {
  min-width: 0;
}

.user-page__tabs {
  display: flex;
  gap: 4px;
  border-bottom: 1px solid var(--up-border);
}

.user-page__tab {
  margin-bottom: -1px;
  padding: 8px 14px;
  border-bottom: 2px solid transparent;
  color: var(--up-muted);
  font-size: 0.9rem;
  line-height: 1.4;
}

.user-page__tab.is-active {
  border-bottom-color: var(--up-tab-active);
  color: var(--up-heading);
  font-weight: 600;
}

.user-page__tab[aria-disabled='true'] {
  opacity: 0.55;
}

.user-page__readme-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--up-border);
  color: var(--up-muted);
  font-size: 0.86rem;
}

.user-page__readme-icon {
  flex: 0 0 16px;
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 正文首个标题紧贴上方分隔线，避免多出一段空白 */
.user-page__readme :deep(h1:first-child),
.user-page__readme :deep(h2:first-child),
.user-page__readme :deep(h3:first-child) {
  margin-top: 0.7em;
}

@media (max-width: 900px) {
  .user-page {
    grid-template-columns: minmax(0, 1fr);
    gap: 24px;
  }

  .user-page__avatar {
    max-width: 200px;
  }

  .user-page__tabs {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .user-page-card {
    width: 100%;
    max-width: 100%;
    margin: 0;
  }
}
</style>
