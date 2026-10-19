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

    <div v-else-if="profile" class="user-page" @keydown.esc="cancelEditing">
      <!-- 左栏：GitHub 风格的资料区。编辑态下静态文字就地换成输入框。 -->
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

        <!-- 显示名：编辑态是输入框，平时是标题 -->
        <label v-if="isEditing" class="user-page__edit-field user-page__edit-field--name">
          <span class="user-page__edit-label">显示名</span>
          <input
            ref="nameInputRef"
            v-model="form.name"
            name="name"
            class="user-page__edit-input"
            type="text"
            autocomplete="off"
            :aria-invalid="nameError !== ''"
          >
        </label>
        <h1 v-else class="user-page__name">{{ profile.name }}</h1>
        <p v-if="nameError !== ''" class="user-page__edit-error" role="alert">{{ nameError }}</p>

        <p class="user-page__login">@{{ profile.login }}</p>

        <!-- 头像地址：只在编辑态出现，保存后才会换头像（避免边打字边发图片请求） -->
        <label v-if="isEditing" class="user-page__edit-field">
          <span class="user-page__edit-label">头像地址</span>
          <input
            v-model="form.avatar"
            name="avatar"
            class="user-page__edit-input"
            type="text"
            spellcheck="false"
            autocomplete="off"
            placeholder="留空使用内置占位头像"
          >
        </label>

        <label v-if="isEditing" class="user-page__edit-field">
          <span class="user-page__edit-label">一句话简介</span>
          <textarea
            v-model="form.bio"
            name="bio"
            class="user-page__edit-input user-page__edit-textarea"
            rows="2"
            maxlength="160"
          />
        </label>
        <p v-else-if="profile.bio" class="user-page__bio">{{ profile.bio }}</p>

        <!-- 自己的主页：平时「编辑主页」，编辑态换成「保存 / 取消」；
             别人的主页显示「关注」（与 GitHub 一致）。 -->
        <div v-if="isOwnProfile && isEditing" class="user-page__edit-actions">
          <button class="user-page__edit-save" type="button" @click="saveEditing">
            保存
          </button>
          <button class="user-page__edit-cancel" type="button" @click="cancelEditing">
            取消
          </button>
        </div>
        <button
          v-else-if="isOwnProfile"
          class="user-page__edit"
          type="button"
          title="编辑主页（改动不会保存）"
          @click="startEditing"
        >
          编辑主页
        </button>
        <button
          v-else
          class="user-page__follow"
          type="button"
          disabled
          title="关注功能尚未接入"
        >
          关注
        </button>

        <!-- 编辑过但没保存：明确告诉用户刷新就没了 -->
        <p v-if="isOwnProfile && isEdited && !isEditing" class="user-page__edit-note">
          改动未保存，刷新后会丢失。
        </p>

        <p class="user-page__counts">
          <span><strong>{{ profile.followers }}</strong> 关注者</span>
          <span aria-hidden="true">·</span>
          <span><strong>{{ profile.following }}</strong> 正在关注</span>
        </p>

        <!-- 资料行：编辑态换成四个输入框，平时是有图标的信息行 -->
        <div v-if="isEditing" class="user-page__edit-fields">
          <label class="user-page__edit-field">
            <span class="user-page__edit-label">公司</span>
            <input
              v-model="form.company"
              name="company"
              class="user-page__edit-input"
              type="text"
              autocomplete="off"
            >
          </label>

          <label class="user-page__edit-field">
            <span class="user-page__edit-label">所在地</span>
            <input
              v-model="form.location"
              name="location"
              class="user-page__edit-input"
              type="text"
              autocomplete="off"
            >
          </label>

          <label class="user-page__edit-field">
            <span class="user-page__edit-label">个人站点</span>
            <input
              v-model="form.website"
              name="website"
              class="user-page__edit-input"
              type="text"
              spellcheck="false"
              autocomplete="off"
              placeholder="https://example.com"
            >
          </label>

          <label class="user-page__edit-field">
            <span class="user-page__edit-label">加入日期</span>
            <input
              v-model="form.joinedAt"
              name="joinedAt"
              class="user-page__edit-input"
              type="date"
            >
          </label>
        </div>

        <ul v-else-if="metaItems.length > 0" class="user-page__meta">
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
          <span>{{ displayName }} / README.md</span>
          <!-- 没有 markdown 文件（正文为空）时明确标注「空」 -->
          <span v-if="!hasReadme" class="user-page__readme-badge" title="没有 README.md 文件">
            空
          </span>
        </header>

        <MarkdownView
          v-if="!isEditing && hasReadme"
          class="user-page__readme"
          :source="profile.detail"
          :aria-label="`${profile.name} 的主页正文`"
        />
        <!-- 没有 md 文件：给一句说明，别留一块空白 -->
        <p v-else-if="!isEditing" class="user-page__readme-empty">
          这个用户还没有主页内容（没有 README.md）。
        </p>

        <!-- 编辑态：正文就地换成 Markdown 文本框 -->
        <div v-else class="user-page__readme-editor">
          <label class="user-page__edit-field">
            <span class="user-page__edit-label">主页正文（Markdown）</span>
            <textarea
              v-model="form.detail"
              name="detail"
              class="user-page__edit-input user-page__edit-textarea user-page__edit-input--code"
              rows="14"
              spellcheck="false"
            />
          </label>
          <p class="user-page__edit-hint">
            留空时 README.md 会标注为「空」；点「保存」后按 Markdown 渲染。
          </p>
        </div>
      </section>
    </div>
  </DocumentMain>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import MarkdownView from '../components/common/MarkdownView.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import { loggedIn } from '../api/session'
import { createDefaultProfile, currentUserId, fetchCurrentUser, fetchUserProfile } from '../api/users'
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

/**
 * 正在编辑的那份资料 —— `profile` 的一份副本。
 *
 * 点「保存」才写回 `profile`，点「取消」直接丢掉；不碰任何存储。
 */
const form = reactive({
  name: '',
  avatar: '',
  bio: '',
  company: '',
  location: '',
  website: '',
  joinedAt: '',
  detail: '',
})

/** 是否处于行内编辑态：页面上的静态文字就地换成输入框。 */
const isEditing = ref(false)

/** 显示名不能为空：它是左栏标题与 README 标题里唯一的标识。 */
const nameError = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

/** 本次访问里改过资料（只在内存里，没有任何持久化）。 */
const isEdited = ref(false)

/** 正文来源：编辑态看表单，平时看已保存的资料。 */
const readmeSource = computed(() => (isEditing.value ? form.detail : (profile.value?.detail ?? '')))

/** 主页正文有没有内容（即有没有 README.md）。没有时 README 标题右侧标注「空」。 */
const hasReadme = computed(() => readmeSource.value.trim() !== '')

/** README 标题里的名字：编辑时跟着输入框实时变；空值回落到原名字，免得标题忽然空掉。 */
const displayName = computed(() => {
  const typed = form.name.trim()

  if (isEditing.value && typed !== '') {
    return typed
  }

  return profile.value?.name ?? ''
})

/** 补全协议：只填 `example.com` 时也能点开，而不是变成站内相对路径。 */
function withScheme(value: string): string {
  const trimmed = value.trim()

  if (trimmed === '' || /^https?:\/\//i.test(trimmed)) {
    return trimmed
  }

  return `https://${trimmed}`
}

/** 进入编辑态：把当前资料拷进表单，并聚焦显示名。 */
async function startEditing() {
  const current = profile.value

  if (current === null) {
    return
  }

  form.name = current.name
  form.avatar = current.avatar
  form.bio = current.bio
  form.company = current.company
  form.location = current.location
  form.website = current.website
  form.joinedAt = current.joinedAt
  form.detail = current.detail
  nameError.value = ''
  isEditing.value = true

  await nextTick()
  nameInputRef.value?.focus()
}

/** 取消编辑：丢弃表单里的改动，回到只读状态。 */
function cancelEditing() {
  if (!isEditing.value) {
    return
  }

  isEditing.value = false
  nameError.value = ''
}

/**
 * 保存：**只替换当前页面内存里的 `profile`**。
 *
 * 刻意不写 localStorage / cookie，也不发请求 —— 刷新或离开页面就恢复原样，
 * 这是「编辑功能可用、但不保留数据」的约定。
 */
function saveEditing() {
  const current = profile.value

  if (current === null || !isEditing.value) {
    return
  }

  if (form.name.trim() === '') {
    nameError.value = '显示名不能为空。'
    nameInputRef.value?.focus()
    return
  }

  profile.value = {
    ...current,
    name: form.name.trim(),
    avatar: withScheme(form.avatar),
    bio: form.bio.trim(),
    company: form.company.trim(),
    location: form.location.trim(),
    website: withScheme(form.website),
    joinedAt: form.joinedAt,
    // 正文保持原样：Markdown 对首尾空行敏感，不替用户裁剪。
    detail: form.detail,
  }

  isEdited.value = true
  isEditing.value = false
  nameError.value = ''
}

// 一改动就清掉上一次的校验提示，避免显示过期错误。
watch(form, () => {
  if (nameError.value !== '') {
    nameError.value = ''
  }
}, { deep: true })

/**
 * 当前登录用户的 id（`fetchCurrentUser()` 的 `id`）；未登录 / 取不到时为空串。
 *
 * 只用来判断「这一页是不是我自己的」，与路由参数无关 —— 顶栏链接指向 `/user/me`，
 * 但用户也可能直接打开 `/user/<自己的账号>`。
 */
const myUserId = ref('')

/**
 * 这一页是不是**我自己的**主页。
 *
 * 三个条件缺一不可：已登录、资料已经加载出来（加载中 / 错误态都不显示按钮）、
 * 且这一页确实指向我 —— 保留 id `/user/me`，或资料 id 与当前账号一致。
 * 别人的主页永远不显示「编辑」。
 */
const isOwnProfile = computed(() => {
  const current = profile.value

  if (current === null || !loggedIn.value) {
    return false
  }

  if (userId.value === currentUserId) {
    return true
  }

  return myUserId.value !== '' && current.id === myUserId.value
})

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
  myUserId.value = ''
  isEditing.value = false
  isEdited.value = false
  nameError.value = ''

  try {
    // `/user/me` 是「当前登录用户」的保留 id：先解析成真实用户，再拉资料。
    if (id === currentUserId) {
      const me = await fetchCurrentUser()

      if (token !== requestToken) {
        return
      }

      // 守卫会拦住未登录访问，这里只兜底「会话在加载途中失效」。
      if (me === null) {
        error.value = '登录状态已失效，请重新登录。'
        return
      }

      myUserId.value = me.id

      try {
        const result = await fetchUserProfile(me.id)

        if (token === requestToken) {
          profile.value = result
        }
      } catch {
        // 后端还没有这个用户的资料：给一份**默认主页**（字段为空、计数为 0），
        // 而不是错误页或空状态 —— 所有已登录用户都应该有自己的主页。
        if (token === requestToken) {
          profile.value = createDefaultProfile(me)
        }
      }

      return
    }

    // 别人的主页：也记下自己的 id，用来判断「编辑主页」按钮要不要出现。
    if (loggedIn.value) {
      const me = await fetchCurrentUser()

      if (token !== requestToken) {
        return
      }

      myUserId.value = me?.id ?? ''
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

/* ---------- 主页正文为空时的标注 ---------- */

/* 没有 md 文件时 README 标题右侧的小标签 */
.user-page__readme-badge {
  margin-left: auto;
  padding: 1px 8px;
  border: 1px solid var(--up-border);
  border-radius: 999px;
  background-color: var(--up-surface);
  color: var(--up-muted);
  font-size: 0.72rem;
  line-height: 1.6;
}

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

/* 「关注」与「编辑主页」同尺寸；关注是占位（禁用），编辑可点 */
.user-page__follow,
.user-page__edit {
  width: 100%;
  min-height: 34px;
  margin-top: 14px;
  border: 1px solid var(--up-border);
  border-radius: 8px;
  background-color: var(--up-button-bg);
  color: var(--up-text);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
}

.user-page__follow {
  cursor: not-allowed;
  opacity: 0.72;
}

.user-page__edit {
  color: var(--up-accent);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.user-page__edit:hover {
  border-color: var(--up-accent);
}

.user-page__edit:focus-visible {
  outline: 2px solid var(--up-accent);
  outline-offset: 2px;
}

/* 编辑过但没保存的提示 */
.user-page__edit-note {
  margin: 8px 0 0;
  color: var(--up-muted);
  font-size: 0.74rem;
  line-height: 1.5;
  text-align: center;
}

/* ---------- 行内编辑 ---------- */

/* 编辑态的「保存 / 取消」并排，与「编辑主页」同高 */
.user-page__edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 14px;
}

.user-page__edit-save,
.user-page__edit-cancel {
  flex: 1 1 0;
  min-height: 34px;
  border: 1px solid var(--up-border);
  border-radius: 8px;
  background-color: var(--up-button-bg);
  color: var(--up-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.user-page__edit-save {
  border-color: transparent;
  background-color: var(--up-accent);
  color: #ffffff;
}

/* 暗色下强调色是浅蓝，白字看不清 */
:global(.dark-mode .user-page__edit-save) {
  color: #0f172a;
}

.user-page__edit-save:hover {
  opacity: 0.88;
}

.user-page__edit-cancel:hover {
  border-color: var(--up-accent);
  color: var(--up-accent);
}

/* 就地替换出来的字段：标签在上、输入框在下 */
.user-page__edit-field {
  display: block;
  margin-top: 12px;
}

/* 显示名顶替标题的位置，和原来的 16px 上间距对齐 */
.user-page__edit-field--name {
  margin-top: 16px;
}

.user-page__edit-label {
  display: block;
  margin-bottom: 4px;
  color: var(--up-muted);
  font-size: 0.74rem;
  line-height: 1.4;
}

.user-page__edit-input {
  width: 100%;
  min-height: 34px;
  padding: 0 10px;
  border: 1px solid var(--up-border);
  border-radius: 8px;
  background-color: var(--up-surface);
  color: var(--up-text);
  font: inherit;
  font-size: 0.86rem;
}

.user-page__edit-input:focus {
  border-color: var(--up-accent);
  outline: none;
}

.user-page__edit-input[aria-invalid='true'] {
  border-color: #dc2626;
}

.user-page__edit-textarea {
  min-height: 0;
  padding: 8px 10px;
  line-height: 1.6;
  resize: vertical;
}

.user-page__edit-input--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.82rem;
}

.user-page__edit-error {
  margin: 6px 0 0;
  color: #dc2626;
  font-size: 0.76rem;
}

:global(.dark-mode .user-page__edit-error) {
  color: #fca5a5;
}

.user-page__edit-hint {
  margin: 10px 0 0;
  color: var(--up-muted);
  font-size: 0.76rem;
  line-height: 1.6;
}

/* 编辑态的四个资料字段（公司 / 所在地 / 站点 / 加入日期） */
.user-page__edit-fields {
  display: grid;
  gap: 10px;
  margin-top: 16px;
}

.user-page__edit-fields .user-page__edit-field {
  margin-top: 0;
}

/* 右栏正文编辑器：与 README 标题保持同样的上间距 */
.user-page__readme-editor {
  margin-top: 20px;
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
