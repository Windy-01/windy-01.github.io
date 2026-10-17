<template>
  <header class="layout-header">
    <div class="layout-header__content">
      <button
        class="layout-header__menu-toggle"
        type="button"
        :aria-expanded="isMenuOpen"
        aria-controls="header-mobile-menu"
        :aria-label="isMenuOpen ? '关闭菜单' : '打开菜单'"
        @click="toggleMenu"
      >
        <span aria-hidden="true">{{ isMenuOpen ? '×' : '☰' }}</span>
      </button>

      <a
        class="header-brand"
        href="https://github.com/Windy-01"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Windy 的 GitHub 主页"
        title="GitHub"
      >
        <svg class="header-brand__icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        </svg>
        <span class="header-brand__name">Windy</span>
      </a>

      <nav class="layout-header__buttons" aria-label="页面按钮">
        <template v-for="action in headerActions" :key="action.label">
          <RouterLink
            v-if="action.to"
            class="header-action"
            :to="action.to"
            @click="closeMenu"
          >
            {{ action.label }}
          </RouterLink>
          <button
            v-else
            class="header-action"
            type="button"
          >
            {{ action.label }}
          </button>
        </template>
      </nav>

      <!-- 用户区：登录状态由会话层（`src/api/session.ts`）里的令牌决定。
           菜单项跟着登录态切换，但「个人主页」在登录前后都保留。 -->
      <div ref="userAreaRef" class="layout-header__user">
        <button
          class="header-user"
          type="button"
          aria-haspopup="menu"
          :aria-expanded="isUserMenuOpen"
          aria-controls="header-user-menu"
          :title="userTitle"
          @click="toggleUserMenu"
        >
          <span class="header-user__avatar" :style="avatarStyle" aria-hidden="true">
            <img
              v-if="currentUser?.avatar"
              :src="currentUser.avatar"
              alt=""
              decoding="async"
            >
            <!-- 资料接口没接入时，用账号首字母 + 派生色做临时头像，不同账号一眼能分开 -->
            <span v-else-if="avatarInitial" class="header-user__initial">{{ avatarInitial }}</span>
            <svg v-else viewBox="0 0 40 40" focusable="false">
              <circle cx="20" cy="20" r="20" fill="#cbd5e1" />
              <circle cx="20" cy="16" r="6.5" fill="#f8fafc" />
              <path d="M20 24c-6.63 0-12 5.37-12 12v4h24v-4c0-6.63-5.37-12-12-12z" fill="#f8fafc" />
            </svg>
          </span>
          <span class="header-user__name">{{ userDisplayName }}</span>
        </button>

        <Transition name="header-user-menu">
          <ul
            v-if="isUserMenuOpen"
            id="header-user-menu"
            class="header-user-menu"
            role="menu"
            aria-label="用户菜单"
          >
            <!-- 临时账号信息：资料接口接入后换成服务端的名字 / 头像 -->
            <li
              v-if="loggedIn && accountLabel !== ''"
              class="header-user-menu__account"
              role="none"
            >
              <span class="header-user-menu__account-name">{{ accountLabel }}</span>
              <span class="header-user-menu__account-note">本地记录 · 资料接口未接入</span>
            </li>
            <li v-for="item in userMenuItems" :key="item.to" role="none">
              <RouterLink
                class="header-user-menu__item"
                role="menuitem"
                :to="item.to"
                @click="closeUserMenu"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </Transition>
      </div>
    </div>
  </header>

  <Teleport to="body">
    <Transition name="header-menu">
      <div
        v-if="isMenuOpen"
        class="layout-header__menu-layer"
        @click.self="closeMenu"
      >
        <aside
          id="header-mobile-menu"
          class="layout-header__mobile-menu"
          aria-label="移动端二级菜单"
        >
          <nav class="layout-header__mobile-actions" aria-label="移动端页面按钮">
            <template v-for="action in headerActions" :key="`${action.label}-mobile`">
              <RouterLink
                v-if="action.to"
                class="header-action"
                :to="action.to"
                @click="closeMenu"
              >
                {{ action.label }}
              </RouterLink>
              <button
                v-else
                class="header-action"
                type="button"
              >
                {{ action.label }}
              </button>
            </template>
          </nav>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

import { loggedIn, session } from '../../api/session'
import { currentUserId, fetchCurrentUser } from '../../api/users'
import type { CurrentUser } from '../../api/users'

const headerActions = [
  { label: 'Home', to: '/' },
  { label: 'Community', to: '/community' },
  { label: 'Document', to: '/document' },
  { label: 'Chat', to: '/chat' },
  { label: 'About', to: '/about' },
]

/** 未登录时「个人主页」指向的本地占位用户（仓库里目前唯一的用户）。 */
const fallbackUserId = 'dev'

/** 当前登录用户的资料；`fetchCurrentUser()` 尚未接入，暂时恒为 `null`。 */
const currentUser = ref<CurrentUser | null>(null)

/** 请求序号：登录态连续变化时只认最后一次的结果。 */
let currentUserRequest = 0

async function loadCurrentUser() {
  const request = ++currentUserRequest

  if (!loggedIn.value) {
    currentUser.value = null
    return
  }

  try {
    const result = await fetchCurrentUser()

    if (request === currentUserRequest) {
      currentUser.value = result
    }
  } catch {
    // 资料接口失败不该让顶栏不可用，退化成占位文案即可。
    if (request === currentUserRequest) {
      currentUser.value = null
    }
  }
}

/**
 * 当前账号的完整值（登录时填的用户名或邮箱）。
 *
 * 资料接口 `GET /users/me` 还没接入，所以这就是眼下唯一能区分「登录的是谁」的信息。
 * 老会话（`windy-session` 里没有 `account`）读回空串，界面退回「已登录」占位。
 */
const accountLabel = computed(() => session.value?.account ?? '')

/** 顶栏空间有限：邮箱只留 `@` 前面的部分，过长再截断。完整值见菜单与 `title`。 */
function shortenAccount(account: string): string {
  const at = account.indexOf('@')
  const local = at > 0 ? account.slice(0, at) : account

  return local.length > 14 ? `${local.slice(0, 13)}…` : local
}

/**
 * 头像旁的文字。
 *
 * 优先级：服务端显示名 → 登录时填的账号 → 「已登录 / 未登录」占位。
 * 前两级都有区分度，最后一级只会在老会话或资料缺失时出现。
 */
const userDisplayName = computed(() => {
  const name = currentUser.value?.name.trim() ?? ''

  if (name !== '') {
    return name
  }

  if (accountLabel.value !== '') {
    return shortenAccount(accountLabel.value)
  }

  return loggedIn.value ? '已登录' : '未登录'
})

/** 悬停提示：把「这是临时展示」明确说出来，免得被当成真实资料。 */
const userTitle = computed(() => {
  if (!loggedIn.value) {
    return '未登录'
  }

  return accountLabel.value !== ''
    ? `当前账号：${accountLabel.value}（临时显示，资料接口未接入）`
    : '已登录（资料接口未接入）'
})

/**
 * 由账号派生一个稳定色相（0–359）。
 *
 * 同一账号每次刷新颜色一致，不同账号颜色不同 —— 这是临时头像「有区分度」的来源。
 */
function hueOf(text: string): number {
  let hash = 0

  for (const char of text) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 360
  }

  return hash
}

/** 临时头像上的首字母：邮箱取 `@` 前第一个字符，用户名直接取首个字符。 */
const avatarInitial = computed(() => {
  // 有真实头像时不用字母。
  if ((currentUser.value?.avatar ?? '') !== '') {
    return ''
  }

  const account = accountLabel.value

  if (account === '') {
    return ''
  }

  const at = account.indexOf('@')
  const local = at > 0 ? account.slice(0, at) : account

  return local.charAt(0).toUpperCase()
})

/** 临时头像的底色；有真实头像或拿不到账号时交给原有样式。 */
const avatarStyle = computed(() => {
  if ((currentUser.value?.avatar ?? '') !== '' || avatarInitial.value === '') {
    return undefined
  }

  return {
    backgroundColor: `hsl(${hueOf(accountLabel.value)}, 58%, 46%)`,
    color: '#ffffff',
  }
})

/**
 * 「个人主页」的目标 —— **随登录态变化**。
 *
 * - 已登录：`/user/me`（保留 id，由页面自己解析成当前用户；解析不到时
 *   那个路由渲染「还没有设置个人主页」状态）。
 * - 未登录：`/user/dev`（仓库里的本地占位用户，登录前也保留这个入口）。
 *
 * 这里不直接拼 `currentUser.id` 是刻意的：资料是异步拉的，拼 id 会让链接
 * 从 `/user/me` 抖成 `/user/xxx`；用保留 id 链接才是稳定的。
 */
const profilePath = computed(() => `/user/${loggedIn.value ? currentUserId : fallbackUserId}`)

/**
 * 用户菜单项 —— 完全由登录状态派生。
 *
 * - `个人主页`：**登录前后都保留**（未登录时指向本地占位用户）。
 * - 未登录：`登录`。
 * - 已登录：`退出登录`。
 *
 * `注册` 不再出现在菜单里，只保留在登录页底部的入口。
 */
const userMenuItems = computed(() => {
  const items = [{ label: '个人主页', to: profilePath.value }]

  items.push(
    loggedIn.value
      ? { label: '退出登录', to: '/logout' }
      : { label: '登录', to: '/login' },
  )

  return items
})

const isMenuOpen = ref(false)
const isUserMenuOpen = ref(false)
const userAreaRef = ref<HTMLElement | null>(null)

function closeMenu() {
  isMenuOpen.value = false
}

function toggleMenu() {
  isMenuOpen.value = !isMenuOpen.value
  closeUserMenu()
}

function closeUserMenu() {
  isUserMenuOpen.value = false
}

/**
 * 会话一变就收起菜单并重新拉取用户资料。
 *
 * 监听的是 `session` 本身而不是 `loggedIn`：登录 → 退出会变，但「已登录状态下
 * 换个账号」（另一标签页重新登录、令牌被替换）时 `loggedIn` 仍是 `true` 不会触发，
 * 只有盯着会话对象才能跟上。
 */
watch(() => session.value, () => {
  closeUserMenu()
  void loadCurrentUser()
}, { immediate: true })

function toggleUserMenu() {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

/** 点到用户区之外就收起菜单；点在按钮上时不收，交给 toggle 处理。 */
function closeUserMenuOnOutsideClick(event: MouseEvent) {
  if (!isUserMenuOpen.value) {
    return
  }

  const target = event.target

  if (target instanceof Node && userAreaRef.value?.contains(target)) {
    return
  }

  closeUserMenu()
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenu()
    closeUserMenu()
  }
}

watch(isMenuOpen, (isOpen) => {
  document.body.style.overflow = isOpen ? 'hidden' : ''
})

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', closeUserMenuOnOutsideClick)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', closeUserMenuOnOutsideClick)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.layout-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 10;
  width: 100%;
  margin-bottom: 24px;
  background-color: rgba(255, 255, 255, 0.312);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  animation: layout-fade-in 0.6s ease-out both;
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .layout-header {
    background-color: rgb(255 255 255 / 72%);
  }
}

.layout-header__content {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 64px;
  padding: 0 24px;
  border-bottom: 1px solid rgb(15 23 42 / 10%);
  color: #1e293b;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 8px;
  border-radius: 10px;
  color: #334155;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.header-brand__icon {
  display: block;
  flex: 0 0 22px;
  width: 22px;
  height: 22px;
}

.header-brand__name {
  line-height: 1;
}

.header-brand:hover {
  background-color: rgb(255 255 255 / 55%);
  color: #0f172a;
}

.layout-header__buttons {
  position: absolute;
  left: 50%;
  display: flex;
  height: 64px;
  transform: translateX(-50%);
}

.layout-header__buttons :deep(.header-action) {
  position: relative;
  display: grid;
  place-items: center;
  min-width: 136px;
  height: 64px;
  padding: 0 32px;
  border: 0;
  border-right: 1px solid transparent;
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
  transition:
    background 0.2s ease,
    box-shadow 0.2s ease,
    color 0.2s ease;
}

.layout-header__buttons :deep(.header-action:hover) {
  background: radial-gradient(
    ellipse at center,
    rgb(255 255 255 / 62%) 0%,
    rgb(255 255 255 / 28%) 42%,
    transparent 100%
  );
  color: #0f172a;
}

/* 栏目增至 5 个后，按 136px 的最小宽度在中等视口会顶到品牌与用户区，这里收窄内边距。 */
@media (max-width: 1060px) {
  .layout-header__buttons :deep(.header-action) {
    min-width: 0;
    padding: 0 18px;
  }
}

.layout-header__user {
  position: relative;
  display: flex;
  align-items: center;
  margin-left: auto;
}

.header-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px 6px 6px;
  border: 0;
  border-radius: 999px;
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

/* 下拉菜单：与顶栏同一套毛玻璃质感 */
.header-user-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  display: grid;
  min-width: 180px;
  max-width: 260px;
  margin: 0;
  padding: 6px;
  border: 1px solid rgb(15 23 42 / 10%);
  border-radius: 12px;
  background-color: rgb(255 255 255 / 92%);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  box-shadow: 0 16px 32px rgb(15 23 42 / 18%);
  list-style: none;
}

/* 临时账号信息：菜单顶部的说明区，不是可点的菜单项 */
.header-user-menu__account {
  display: grid;
  gap: 2px;
  margin-bottom: 4px;
  padding: 6px 12px 10px;
  border-bottom: 1px solid rgb(15 23 42 / 10%);
}

.header-user-menu__account-name {
  overflow: hidden;
  color: #0f172a;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-user-menu__account-note {
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.4;
}

.header-user-menu__item {
  display: block;
  padding: 8px 12px;
  border-radius: 8px;
  color: #334155;
  font-size: 0.86rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease;
}

.header-user-menu__item:hover {
  background-color: rgb(15 23 42 / 8%);
  color: #0f172a;
}

.header-user-menu__item:focus-visible {
  outline: 2px solid #2563eb;
  outline-offset: 1px;
}

.header-user:hover {
  background-color: rgb(255 255 255 / 55%);
  color: #0f172a;
}

.header-user__avatar {
  display: grid;
  flex: 0 0 32px;
  place-items: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  border-radius: 50%;
  background-color: rgb(203 213 225 / 60%);
  box-shadow: inset 0 0 0 1px rgb(15 23 42 / 10%);
}

.header-user__avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.header-user__avatar svg {
  display: block;
  width: 100%;
  height: 100%;
}

/* 临时头像上的首字母：底色由账号派生，见脚本里的 avatarStyle */
.header-user__initial {
  font-size: 0.92rem;
  font-weight: 700;
  line-height: 1;
  text-transform: uppercase;
  user-select: none;
}

.header-user__name {
  line-height: 1;
}

.layout-header__menu-toggle {
  border: 0;
  cursor: pointer;
  font: inherit;
}

.layout-header__menu-toggle {
  display: none;
}

.layout-header__menu-layer {
  position: fixed;
  inset: 0;
  z-index: 100;
  background-color: rgb(15 23 42 / 38%);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  .layout-header__menu-layer {
    background-color: rgb(15 23 42 / 68%);
  }
}

.layout-header__mobile-menu {
  width: min(280px, 82vw);
  height: 100vh;
  height: 100dvh;
  overflow-y: auto;
  background-color: rgba(255, 255, 255, 0.600);
  box-shadow: 12px 0 32px rgb(15 23 42 / 22%);
}

.layout-header__mobile-actions {
  display: flex;
  flex-direction: column;
  padding: 0 20px;
}

.layout-header__mobile-actions :deep(.header-action) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 52px;
  border: 0;
  border-radius: 12px;
  background-color: transparent;
  color: #334155;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  text-align: center;
  text-decoration: none;
}

.layout-header__mobile-actions :deep(.header-action:hover) {
  background-color: rgb(15 23 42 / 8%);
}

:global(.dark-mode) .header-brand {
  color: #cbd5e1;
}

:global(.dark-mode) .header-brand:hover {
  background-color: rgb(255 255 255 / 10%);
  color: #f8fafc;
}

:global(.dark-mode) .header-user {
  color: #cbd5e1;
}

:global(.dark-mode) .header-user:hover {
  background-color: rgb(255 255 255 / 10%);
  color: #f8fafc;
}

:global(.dark-mode) .header-user__avatar {
  background-color: rgb(51 65 85 / 70%);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 12%);
}

:global(.dark-mode) .layout-header {
  background-color: rgb(15 23 42 / 31.2%);
}

@supports not ((backdrop-filter: blur(14px)) or (-webkit-backdrop-filter: blur(14px))) {
  :global(.dark-mode) .layout-header {
    background-color: rgb(15 23 42 / 88%);
  }

  :global(.dark-mode) .layout-header__menu-layer {
    background-color: rgb(2 6 23 / 82%);
  }
}

:global(.dark-mode) .layout-header__content {
  border-bottom-color: rgb(255 255 255 / 12%);
  color: #e2e8f0;
}

:global(.dark-mode) .layout-header__buttons :deep(.header-action) {
  color: #cbd5e1;
}

:global(.dark-mode) .layout-header__buttons :deep(.header-action:hover) {
  background: radial-gradient(
    ellipse at center,
    rgb(15 23 42 / 62%) 0%,
    rgb(15 23 42 / 28%) 42%,
    transparent 100%
  );
  color: #f8fafc;
}

:global(.dark-mode) .layout-header__mobile-menu {
  background-color: rgb(15 23 42 / 94%);
  box-shadow: 12px 0 32px rgb(0 0 0 / 35%);
}

:global(.dark-mode) .layout-header__mobile-actions :deep(.header-action) {
  color: #cbd5e1;
}

:global(.dark-mode) .layout-header__mobile-actions :deep(.header-action:hover) {
  background-color: rgb(255 255 255 / 10%);
}

/* 用户下拉菜单的暗色覆盖（注意完整选择器要写在括号里） */
:global(.dark-mode .header-user-menu) {
  border-color: rgb(255 255 255 / 12%);
  background-color: rgb(15 23 42 / 94%);
  box-shadow: 0 16px 32px rgb(0 0 0 / 38%);
}

:global(.dark-mode .header-user-menu__item) {
  color: #cbd5e1;
}

:global(.dark-mode .header-user-menu__account) {
  border-bottom-color: rgb(255 255 255 / 12%);
}

:global(.dark-mode .header-user-menu__account-name) {
  color: #f8fafc;
}

:global(.dark-mode .header-user-menu__account-note) {
  color: #94a3b8;
}

:global(.dark-mode .header-user-menu__item:hover) {
  background-color: rgb(255 255 255 / 10%);
  color: #f8fafc;
}

.header-user-menu-enter-active,
.header-user-menu-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.header-user-menu-enter-from,
.header-user-menu-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.header-menu-enter-active,
.header-menu-leave-active {
  transition: opacity 0.25s ease;
}

.header-menu-enter-from,
.header-menu-leave-to {
  opacity: 0;
}

.header-menu-enter-active .layout-header__mobile-menu,
.header-menu-leave-active .layout-header__mobile-menu {
  transition: transform 0.3s ease;
}

.header-menu-enter-from .layout-header__mobile-menu,
.header-menu-leave-to .layout-header__mobile-menu {
  transform: translateX(-100%);
}

@keyframes layout-fade-in {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .layout-header,
  .header-menu-enter-active,
  .header-menu-leave-active,
  .header-menu-enter-active .layout-header__mobile-menu,
  .header-menu-leave-active .layout-header__mobile-menu,
  .header-user-menu-enter-active,
  .header-user-menu-leave-active {
    animation: none;
    transition: none;
  }
}

@media (max-width: 768px) {
  .layout-header__content {
    min-height: 56px;
    padding: 0 16px;
  }

  .layout-header__menu-toggle {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    margin-right: 12px;
    border-radius: 10px;
    background-color: rgb(255 255 255 / 48%);
    color: #334155;
    font-size: 1.25rem;
    line-height: 1;
  }

  .header-brand {
    flex: 1;
  }

  .layout-header__buttons {
    display: none;
  }

  .header-user {
    padding: 4px;
  }

  .header-user__name {
    display: none;
  }

  :global(.dark-mode) .layout-header__menu-toggle {
    background-color: rgb(15 23 42 / 55%);
    color: #e2e8f0;
  }

}
</style>
