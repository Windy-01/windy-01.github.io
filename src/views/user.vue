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
            v-if="profile.avatar !== '' && !avatarFailed"
            :src="profile.avatar"
            :alt="`${profile.name} 的头像`"
            decoding="async"
            @error="avatarFailed = true"
          >
          <!-- 没有头像 / 图片加载失败时用内置占位图，与顶栏用户区保持一致 -->
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

          <!-- 编辑态才出现的换头像入口：选图 → 裁剪 → 立即上传 -->
          <button
            v-if="isEditing && isOwnProfile"
            class="user-page__avatar-action"
            type="button"
            :disabled="avatarUploading"
            @click="pickAvatar"
          >
            {{ avatarUploading ? '上传中…' : '更换头像' }}
          </button>
        </div>
        <p v-if="avatarError !== ''" class="user-page__edit-error" role="alert">
          {{ avatarError }}
        </p>

        <!-- 选图用的隐藏输入；`accept` 只影响系统选择框的默认筛选 -->
        <input
          ref="fileInputRef"
          class="user-page__file-input"
          type="file"
          accept="image/*"
          @change="onFilePicked"
        >

        <!-- 用户名：编辑态是输入框，平时是标题。它走独立接口保存，不随资料体提交。 -->
        <label v-if="isEditing" class="user-page__edit-field user-page__edit-field--name">
          <span class="user-page__edit-label">用户名</span>
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
          <button
            class="user-page__edit-save"
            type="button"
            :disabled="isSaving"
            @click="saveEditing"
          >
            {{ isSaving ? '保存中…' : '保存' }}
          </button>
          <button class="user-page__edit-cancel" type="button" @click="cancelEditing">
            取消
          </button>
        </div>
        <button
          v-else-if="isOwnProfile"
          class="user-page__edit"
          type="button"
          title="编辑主页"
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

        <!-- 保存结果：失败时红字常驻，成功时只留一行淡提示 -->
        <p v-if="isOwnProfile && saveError !== ''" class="user-page__edit-error" role="alert">
          {{ saveError }}
        </p>
        <p
          v-else-if="isOwnProfile && saveNotice !== ''"
          class="user-page__edit-note"
        >
          {{ saveNotice }}
        </p>

        <p class="user-page__counts">
          <span><strong>{{ profile.followers }}</strong> 关注者</span>
          <span aria-hidden="true">·</span>
          <span><strong>{{ profile.following }}</strong> 正在关注</span>
        </p>

        <!-- 可改资料：编辑态换成输入框，平时是有图标的信息行。
             ⚠️ 邮箱与 userid 是只读的，不在这里 —— 它们只出现在信息行里。 -->
        <div v-if="isEditing" class="user-page__edit-fields">
          <label class="user-page__edit-field">
            <span class="user-page__edit-label">电话</span>
            <input
              v-model="form.phone"
              name="phone"
              class="user-page__edit-input"
              type="tel"
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
            <span class="user-page__edit-label">生日</span>
            <input
              v-model="form.birthday"
              name="birthday"
              class="user-page__edit-input"
              type="date"
            >
          </label>

          <label class="user-page__edit-field">
            <span class="user-page__edit-label">年龄</span>
            <input
              v-model="form.age"
              name="age"
              class="user-page__edit-input"
              type="number"
              min="0"
              max="150"
              inputmode="numeric"
              placeholder="留空表示不展示"
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

          <!-- 正文是独立资源：这两个按钮只作用于 README，不碰左边的资料 -->
          <div class="user-page__readme-actions">
            <button
              class="user-page__readme-upload"
              type="button"
              :disabled="readmeSaving"
              @click="pickReadme"
            >
              上传 .md
            </button>
            <button
              class="user-page__readme-save"
              type="button"
              :disabled="readmeSaving"
              @click="saveReadme"
            >
              {{ readmeSaving ? '保存中…' : '保存正文' }}
            </button>
          </div>

          <p v-if="readmeError !== ''" class="user-page__edit-error" role="alert">
            {{ readmeError }}
          </p>
          <p v-else-if="readmeNotice !== ''" class="user-page__edit-note user-page__readme-note">
            {{ readmeNotice }}
          </p>
          <p v-else class="user-page__edit-hint">
            正文改动要点「保存正文」才会生效；留空时 README.md 会标注为「空」。
          </p>

          <!-- 选 .md 文件用的隐藏输入；读出来填进上面的文本框，不直接上传 -->
          <input
            ref="readmeInputRef"
            class="user-page__file-input"
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            @change="onReadmePicked"
          >
        </div>
      </section>
    </div>

    <!-- 头像裁剪：选完图片后弹出，确认即上传（组件内部 Teleport 到布局外壳） -->
    <AvatarCropper
      :open="isCropperOpen"
      :src="cropSource"
      @close="closeCropper"
      @confirm="onCropConfirm"
    />
  </DocumentMain>
</template>

<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AvatarCropper from '../components/common/AvatarCropper.vue'
import MarkdownView from '../components/common/MarkdownView.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import { loggedIn } from '../api/session'
import {
  avatarUrlOf,
  fetchRemoteReadme,
  imageSrcOfRef,
  uploadAvatar,
  uploadProfile,
  uploadReadme,
  uploadUsername,
} from '../api/userinfo'
import { createDefaultProfile, currentUserId, fetchCurrentUser, fetchUserProfile } from '../api/users'
import type { UserProfile } from '../api/users'

/** 资料区里的小图标，用 feather 风格的描边路径。 */
const iconMail = [
  'M3.5 6.5A1.5 1.5 0 0 1 5 5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z',
  'M3.8 6.7 12 13l8.2-6.3',
]
const iconPhone = [
  'M6.6 3h3l1.4 3.9-1.9 1.5a12.5 12.5 0 0 0 5.5 5.5l1.5-1.9L20 13.4v3a2 2 0 0 1-2.2 2A16.4 16.4 0 0 1 4.1 5.2 2 2 0 0 1 6.1 3Z',
]
const iconLink = [
  'M10.5 13.5a4 4 0 0 0 5.7 0l2.8-2.8a4 4 0 0 0-5.7-5.7l-1.4 1.4',
  'M13.5 10.5a4 4 0 0 0-5.7 0l-2.8 2.8a4 4 0 0 0 5.7 5.7l1.4-1.4',
]
const iconCake = [
  'M4 20.5h16',
  'M5.5 20.5v-6a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v6',
  'M5.5 16.5c1.6 1.4 3.2 1.4 4.8 0s3.2-1.4 4.8 0 2.4 1 3.4.4',
  'M12 12.5V9.5',
  'M12 6.6c.9-1.2 0-2.6 0-2.6s-.9 1.4 0 2.6Z',
]
const iconUser = [
  'M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  'M4.5 21a7.5 7.5 0 0 1 15 0',
]
const iconCalendar = [
  'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5Z',
  'M4 10h16',
  'M8.5 3v4M15.5 3v4',
]
const iconHash = [
  'M9.5 3.5 7 20.5M17 3.5 14.5 20.5',
  'M4 9h16M3 15h16',
]

const route = useRoute()
const userId = computed(() => String(route.params.id ?? ''))

const profile = ref<UserProfile | null>(null)
const loading = ref(true)
const error = ref('')

/**
 * 正在编辑的那份资料 —— `profile` 的一份副本。
 *
 * 点「保存」才提交给后端，点「取消」直接丢掉。
 *
 * ⚠️ **只放可改字段**：简介 / 个人站点 / 年龄 / 生日 / 电话，
 * 加上单独走接口的用户名与 README 正文。头像也不在这里（选完图立刻上传）。
 * **邮箱、关注数、加入日期、userid 都是只读的**，编辑态不出现 —— 它们只在信息行里展示。
 *
 * `age` 用字符串：输入框清空时是空串（= 没填），提交时再转成数字。
 * ⚠️ 但 `type="number"` 的输入框会被 Vue 的 v-model **自动转成数字**
 * （`vModelText` 对 `type === 'number'` 会做 `looseToNumber`），所以这里的类型
 * 必须是 `string | number`，读取时统一 `String(...)` 再 `trim()` —— 否则
 * 用户一动年龄输入框，`form.age.trim()` 就会抛 `trim is not a function`。
 */
const form = reactive({
  name: '',
  bio: '',
  website: '',
  age: '' as string | number,
  birthday: '',
  phone: '',
  detail: '',
})

/** 是否处于行内编辑态：页面上的静态文字就地换成输入框。 */
const isEditing = ref(false)

/** 用户名不能为空：它是左栏标题与 README 标题里唯一的标识。 */
const nameError = ref('')
const nameInputRef = ref<HTMLInputElement | null>(null)

/* ---------- 头像上传 ---------- */

/** 选图用的隐藏 `input[type=file]`。 */
const fileInputRef = ref<HTMLInputElement | null>(null)
/** 裁剪器当前使用的图片地址（`URL.createObjectURL` 产物，用完要 revoke）。 */
const cropSource = ref('')
const isCropperOpen = ref(false)
const avatarUploading = ref(false)
const avatarError = ref('')
/** 头像图片加载失败（后端没有头像 / 地址失效）时回落到占位图。 */
const avatarFailed = ref(false)

/** 原图上限：再大的图在浏览器里解码也吃力，裁剪结果反而更糊。 */
const maxAvatarFileSize = 8 * 1024 * 1024

/* ---------- 资料保存 ---------- */

const isSaving = ref(false)
const saveError = ref('')
/** 成功提示，只在不处于编辑态时显示。 */
const saveNotice = ref('')

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

/** 进入编辑态：把当前资料拷进表单，并聚焦用户名输入框。 */
async function startEditing() {
  const current = profile.value

  if (current === null) {
    return
  }

  form.name = current.name
  form.bio = current.bio
  form.website = current.website
  // 0 表示没填过，编辑框里保持空而不是显示一个 "0"
  form.age = current.age > 0 ? String(current.age) : ''
  form.birthday = current.birthday
  form.phone = current.phone
  form.detail = current.detail
  nameError.value = ''
  avatarError.value = ''
  saveError.value = ''
  saveNotice.value = ''
  readmeError.value = ''
  readmeNotice.value = ''
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
  avatarError.value = ''
  saveError.value = ''
  readmeError.value = ''
  readmeNotice.value = ''
}

/**
 * 保存资料（左栏的「保存」）。
 *
 * 三件事分开提交，顺序固定：
 * 1. **用户名**（改过才发）走独立接口 `update/username` —— 它不随资料体一起提交；
 * 2. **README**（改过才发）走独立接口 `update/readme` —— 可能几十 KB，没必要每次重传；
 * 3. **其余资料**走 `update/profile`。
 *
 * 任何一步失败都**保留编辑态**，让用户能重试；成功才写回页面。
 */
async function saveEditing() {
  const current = profile.value

  if (current === null || !isEditing.value || isSaving.value) {
    return
  }

  if (form.name.trim() === '') {
    nameError.value = '用户名不能为空。'
    nameInputRef.value?.focus()
    return
  }

  // `age` 可能是数字（`type="number"` 的 v-model 会转），统一按字符串处理
  const ageText = String(form.age).trim()
  const age = Number.parseInt(ageText, 10)

  const next: UserProfile = {
    ...current,
    name: form.name.trim(),
    // 头像与正文都不进资料体（各有独立接口），但页面渲染要用，
    // 所以内存里这份 `next` 仍然保留它们。
    avatar: current.avatar,
    bio: form.bio.trim(),
    // 邮箱只读：表单里没有它，原样带回
    email: current.email,
    website: withScheme(form.website),
    // 空串 / 非法值一律 0 —— 界面据此不展示「年龄」那一行
    age: Number.isFinite(age) && age > 0 ? age : 0,
    birthday: form.birthday,
    phone: form.phone.trim(),
    // 正文保持原样：Markdown 对首尾空行敏感，不替用户裁剪。
    detail: form.detail,
  }

  isSaving.value = true
  saveError.value = ''
  saveNotice.value = ''

  // 记住卡在哪一步，失败时给不同的提示
  let stage: 'username' | 'readme' | 'profile' = 'username'

  try {
    if (next.name !== current.name) {
      stage = 'username'
      await uploadUsername(next.name)
    }

    if (form.detail !== current.detail) {
      stage = 'readme'
      await uploadReadme(form.detail)
    }

    stage = 'profile'
    await uploadProfile(next)

    profile.value = next
    isEditing.value = false
    nameError.value = ''
    saveNotice.value = '资料已保存。'
  } catch (cause) {
    saveError.value =
      stage === 'username'
        ? '用户名修改失败：该接口后端尚未开放，资料未保存。'
        : cause instanceof Error
          ? cause.message
          : '保存失败，请重试。'
  } finally {
    isSaving.value = false
  }
}

/* ---------- README：上传 .md / 单独保存正文 ---------- */

/** 选 .md 文件用的隐藏 `input[type=file]`。 */
const readmeInputRef = ref<HTMLInputElement | null>(null)
const readmeSaving = ref(false)
const readmeError = ref('')
const readmeNotice = ref('')

/** .md 文件上限：正文是纯文本，1MB 已经非常宽松。 */
const maxReadmeFileSize = 1024 * 1024

/** 打开系统文件选择框。 */
function pickReadme() {
  readmeError.value = ''
  readmeNotice.value = ''
  readmeInputRef.value?.click()
}

/**
 * 选完 .md 文件：读出文本填进编辑器。
 *
 * ⚠️ **不直接上传** —— 先让用户看到内容、必要时改一改，再点「保存正文」。
 * 直接传的话，选错文件就没有反悔余地了。
 */
async function onReadmePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  // 清空 value：同一个文件连续选两次也要能触发 change。
  input.value = ''

  if (file === null) {
    return
  }

  if (file.size > maxReadmeFileSize) {
    readmeError.value = '文件太大了，请选择 1MB 以内的 .md 文件。'
    return
  }

  try {
    form.detail = await file.text()
    readmeError.value = ''
    readmeNotice.value = `已载入 ${file.name}，点「保存正文」后生效。`
  } catch {
    readmeError.value = '读取文件失败，请重试。'
  }
}

/**
 * 单独保存正文：只发 README 接口，**不动资料字段**。
 *
 * 与左栏的「保存」互不牵连：改正文不用连带提交资料，改资料也不必重传正文
 * （`saveEditing()` 里那条「只在正文变化时才传」的判断仍然保留，两边都安全）。
 */
async function saveReadme() {
  const current = profile.value

  if (current === null || readmeSaving.value) {
    return
  }

  readmeSaving.value = true
  readmeError.value = ''
  readmeNotice.value = ''

  try {
    await uploadReadme(form.detail)

    // 保存成功才写回页面：`hasReadme` 跟着变，标题旁的「空」会自动消失。
    profile.value = { ...current, detail: form.detail }
    readmeNotice.value = '正文已保存。'
  } catch (cause) {
    readmeError.value = cause instanceof Error ? cause.message : '正文保存失败，请重试。'
  } finally {
    readmeSaving.value = false
  }
}

/* ---------- 头像：选图 → 裁剪 → 上传 ---------- */

/** 打开系统文件选择框。 */
function pickAvatar() {
  avatarError.value = ''
  fileInputRef.value?.click()
}

/** 释放上一张裁剪用的 object URL。 */
function releaseCropSource() {
  const url = cropSource.value

  cropSource.value = ''

  if (url !== '') {
    URL.revokeObjectURL(url)
  }
}

/**
 * 选完文件：校验后转成 object URL 交给裁剪器。
 *
 * 这里**不上传原图** —— 用户可能选了张 4000×3000 的照片，
 * 先让他在浏览器里裁成正方形再传，省流量也省后端存储。
 */
function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  // 清空 value：同一个文件连续选两次也要能触发 change。
  input.value = ''

  if (file === null) {
    return
  }

  if (!file.type.startsWith('image/')) {
    avatarError.value = '请选择图片文件（jpg / png / webp 等）。'
    return
  }

  if (file.size > maxAvatarFileSize) {
    avatarError.value = '图片太大了，请选择 8MB 以内的图片。'
    return
  }

  avatarError.value = ''
  releaseCropSource()
  cropSource.value = URL.createObjectURL(file)
  isCropperOpen.value = true
}

/** 关闭裁剪器并释放图片。 */
function closeCropper() {
  isCropperOpen.value = false

  const url = cropSource.value

  cropSource.value = ''

  if (url !== '') {
    // 等退出动画跑完再释放，否则 `<img>` 会在淡出时闪成空白。
    window.setTimeout(() => URL.revokeObjectURL(url), 300)
  }
}

/** 裁剪确认：立刻上传，成功后换掉页面上的头像地址。 */
async function onCropConfirm(blob: Blob) {
  closeCropper()

  const current = profile.value

  if (current === null) {
    return
  }

  avatarUploading.value = true
  avatarError.value = ''
  saveNotice.value = ''

  try {
    const uploaded = await uploadAvatar(blob)

    // 后端若回了文件引用（图片地址 / 签名链接），直接用它；只回状态码时按约定拼接口地址。
    const remoteSrc = imageSrcOfRef(uploaded)

    // 地址没变但内容变了，浏览器会拿旧缓存 —— 加时间戳强制重新请求。
    profile.value = {
      ...current,
      avatar: remoteSrc !== '' ? remoteSrc : `${avatarUrlOf(current.id)}?v=${Date.now()}`,
    }
    avatarFailed.value = false
    saveNotice.value = '头像已更新。'
  } catch (cause) {
    avatarError.value = cause instanceof Error ? cause.message : '头像上传失败，请重试。'
  } finally {
    avatarUploading.value = false
  }
}

// 一改动就清掉上一次的校验提示，避免显示过期错误。
watch(form, () => {
  if (nameError.value !== '') {
    nameError.value = ''
  }

  if (readmeError.value !== '') {
    readmeError.value = ''
  }
}, { deep: true })

/**
 * 当前登录用户的 id（`fetchCurrentUser()` 的 `id`，即令牌里的 `sub`）；未登录 / 取不到时为空串。
 *
 * 只用来判断「这一页是不是我自己的」，与路由参数无关 —— 顶栏链接指向 `/user/me`，
 * 但用户也可能直接打开 `/user/<自己的 id>`。
 */
const myUserId = ref('')

/**
 * 这一页是不是**我自己的**主页。
 *
 * 三个条件缺一不可：已登录、资料已经加载出来（加载中 / 错误态都不显示按钮）、
 * 且这一页确实指向我 —— 保留 id `/user/me`，或资料 id 与令牌里的 subject 一致。
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
  nameError.value = ''
  avatarError.value = ''
  avatarFailed.value = false
  saveError.value = ''
  saveNotice.value = ''

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
        const fallback = createDefaultProfile(me)

        // ⚠️ 资料 404 不代表没有正文：README 是独立资源，这里单独再取一次。
        // 不取的话，用户明明传过 README，主页上却一直标着「空」。
        try {
          fallback.detail = await fetchRemoteReadme(me.id)
        } catch {
          // 没有正文（404 / 网络不通）就保持空串。
        }

        if (token === requestToken) {
          profile.value = fallback
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

/**
 * 资料区里的元信息行，空字段直接不展示。
 *
 * 顺序按「联系方式 → 个人信息 → 只读信息」排，最后三项（加入日期、ID）
 * 和上面的关注数一样是**只读**的，编辑态不会出现在表单里。
 */
const metaItems = computed(() => {
  const current = profile.value

  if (current === null) {
    return []
  }

  const items: Array<{ key: string, paths: string[], text: string, href?: string }> = []

  if (current.email !== '') {
    items.push({
      key: 'email',
      paths: iconMail,
      text: current.email,
      href: `mailto:${current.email}`,
    })
  }

  if (current.phone !== '') {
    items.push({
      key: 'phone',
      paths: iconPhone,
      text: current.phone,
      href: `tel:${current.phone}`,
    })
  }

  if (current.website !== '') {
    items.push({
      key: 'website',
      paths: iconLink,
      text: current.website.replace(/^https?:\/\//, ''),
      href: current.website,
    })
  }

  if (current.birthday !== '') {
    items.push({ key: 'birthday', paths: iconCake, text: `生日 ${current.birthday}` })
  }

  // 0 表示没填过，不展示（而不是显示「0 岁」）
  if (current.age > 0) {
    items.push({ key: 'age', paths: iconUser, text: `${current.age} 岁` })
  }

  if (current.joinedAt !== '') {
    items.push({ key: 'joined', paths: iconCalendar, text: `加入于 ${current.joinedAt}` })
  }

  if (current.id !== '') {
    items.push({ key: 'id', paths: iconHash, text: `ID ${current.id}` })
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

/* 暗色下只补本页自己的 `--up-*` 变量：卡片的底色 / 边框 / 阴影由 `DocumentMain` 统一提供
   （它的暗色规则已改成正确写法，值就是这里的 26.9% / 12% / 40px 阴影），不在这里重复声明。
   注意：Vue 的 :global() 会用括号内内容整体替换选择器，完整选择器必须写在括号里。 */
:global(.dark-mode .user-page-card) {
  --up-text: #e2e8f0;
  --up-heading: #f8fafc;
  --up-muted: #94a3b8;
  --up-border: rgb(255 255 255 / 12%);
  --up-surface: rgb(255 255 255 / 6%);
  --up-accent: #7dd3fc;
  --up-button-bg: rgb(255 255 255 / 8%);
  --up-tab-active: #fdba74;
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
  position: relative;
  width: 100%;
  max-width: 264px;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  border: 1px solid var(--up-border);
  border-radius: 50%;
  background-color: var(--up-surface);
}

/* 编辑态盖在头像上的「更换头像」：深色药丸，任何头像上都看得清 */
.user-page__avatar-action {
  position: absolute;
  bottom: 12%;
  left: 50%;
  padding: 6px 14px;
  border: 1px solid rgb(255 255 255 / 42%);
  border-radius: 999px;
  background-color: rgb(15 23 42 / 74%);
  color: #f8fafc;
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
  white-space: nowrap;
  transform: translateX(-50%);
  backdrop-filter: blur(4px);
  transition:
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.user-page__avatar-action:hover:not(:disabled) {
  background-color: rgb(15 23 42 / 88%);
}

.user-page__avatar-action:disabled {
  cursor: progress;
  opacity: 0.75;
}

/* 选图用的隐藏输入：只用它的 click()，不参与布局 */
.user-page__file-input {
  display: none;
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

.user-page__edit-save:disabled,
.user-page__edit-cancel:disabled {
  cursor: progress;
  opacity: 0.6;
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

/* 用户名输入框顶替标题的位置，和原来的 16px 上间距对齐 */
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

/* 正文的两个按钮：左「上传 .md」右「保存正文」 */
.user-page__readme-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.user-page__readme-upload,
.user-page__readme-save {
  min-height: 32px;
  padding: 0 14px;
  border: 1px solid var(--up-border);
  border-radius: 8px;
  background-color: var(--up-button-bg);
  color: var(--up-text);
  cursor: pointer;
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease,
    opacity 0.2s ease;
}

.user-page__readme-upload:hover:not(:disabled) {
  border-color: var(--up-accent);
  color: var(--up-accent);
}

.user-page__readme-save {
  border-color: transparent;
  background-color: var(--up-accent);
  color: #ffffff;
}

/* 暗色下强调色是浅蓝，白字看不清 */
:global(.dark-mode .user-page__readme-save) {
  color: #0f172a;
}

.user-page__readme-save:hover:not(:disabled) {
  opacity: 0.88;
}

.user-page__readme-upload:disabled,
.user-page__readme-save:disabled {
  cursor: progress;
  opacity: 0.6;
}

/* 提示默认居中（左栏用），正文区改成左对齐 */
.user-page__readme-note {
  text-align: left;
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
