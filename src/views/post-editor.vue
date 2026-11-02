<template>
  <DocumentMain class="post-editor-main">
    <section class="post-editor" aria-label="新建帖子">
      <header class="post-editor__header">
        <h1 class="post-editor__title">新建帖子</h1>
        <p class="post-editor__hint">
          正文支持 Markdown，也可以直接导入本地 <code class="post-editor__code">.md</code> 文件。
        </p>

        <!-- 未登录时提前说清楚，别等点了「发布」才拦。 -->
        <p v-if="!loggedIn" class="post-editor__login">
          当前未登录，发布前请先
          <RouterLink class="post-editor__login-link" :to="{ name: 'login' }">登录</RouterLink>。
        </p>
      </header>

      <form class="post-editor__form" novalidate @submit.prevent="submit">
        <label class="post-editor__field">
          <span class="post-editor__label">标题</span>
          <input
            v-model="title"
            class="post-editor__input"
            type="text"
            maxlength="120"
            placeholder="给帖子起个标题"
            autocomplete="off"
          >
        </label>

        <div class="post-editor__field">
          <div class="post-editor__label-row">
            <label class="post-editor__label" for="post-editor-body">正文</label>

            <div class="post-editor__tools">
              <button type="button" class="post-editor__tool" @click="pickFile">导入 .md</button>

              <!--
                预览开关：眼睛 = 「看渲染结果」，再点一次回到编辑。
                用 `aria-pressed` 表达开关态，图标本身 aria-hidden（文字由 title / aria-label 提供）。
              -->
              <button
                type="button"
                class="post-editor__icon"
                :class="{ 'post-editor__icon--active': previewing }"
                :aria-label="previewing ? '返回编辑' : '预览 Markdown'"
                :aria-pressed="previewing"
                :title="previewing ? '返回编辑' : '预览 Markdown'"
                @click="togglePreview"
              >
                <svg
                  v-if="!previewing"
                  class="post-editor__icon-svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                <svg
                  v-else
                  class="post-editor__icon-svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
                  <circle cx="12" cy="12" r="3" />
                  <path d="M4 4 20 20" />
                </svg>
              </button>

              <span class="post-editor__count">{{ charCount }} 字</span>
            </div>
          </div>

          <textarea
            v-if="!previewing"
            id="post-editor-body"
            v-model="body"
            class="post-editor__textarea"
            rows="16"
            placeholder="在这里写正文，支持 Markdown 语法…"
            spellcheck="false"
          />

          <!-- 预览：复用 `MarkdownView`（marked + dompurify），样式与文档页完全一致。 -->
          <div v-else class="post-editor__preview" role="region" aria-label="Markdown 预览">
            <MarkdownView v-if="body.trim() !== ''" :source="body" />
            <p v-else class="post-editor__preview-empty">还没有内容可预览。</p>
          </div>

          <!-- 真正的文件选择器藏起来，由「导入 .md」按钮代点。 -->
          <input
            ref="fileInput"
            class="post-editor__file"
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            tabindex="-1"
            aria-hidden="true"
            @change="onFileChange"
          >

          <p v-if="importedName !== ''" class="post-editor__file-note">
            已导入 <strong>{{ importedName }}</strong>（{{ importedSize }}），可以继续在上面编辑。
          </p>
        </div>

        <p
          v-if="note !== ''"
          class="post-editor__note"
          :class="{ 'post-editor__note--error': noteIsError }"
          role="status"
        >
          {{ note }}
        </p>

        <div class="post-editor__actions">
          <button type="submit" class="post-editor__submit" :disabled="submitting">
            {{ submitting ? '发布中…' : '发布' }}
          </button>
          <button type="button" class="post-editor__cancel" :disabled="submitting" @click="cancel">
            {{ confirmingCancel ? '确认放弃' : '取消' }}
          </button>
        </div>
      </form>
    </section>
  </DocumentMain>
</template>

<script setup lang="ts">
/**
 * 新建帖子页（`/community/new`）—— 文本编辑 + 导入本地 Markdown + 预览。
 *
 * **发布已接真实后端**：`POST /post/upload`，body 只有 `{ author, title, mainText }`
 * （作者 userid 由后端从令牌取，前端不传）。见 `src/api/posts.ts` 的 `createPost()`。
 * - 未登录时不发请求，提示先去登录（登录页暂时不记 redirect，回来重发一次即可）；
 * - 发布成功：后端若回了帖子 id 就直接跳详情页，否则跳社区页并带 `?published=1` 提示；
 * - 失败按 `ApiError.status` 翻成人话（401 / 0 / 其它）。
 *
 * 「导入 .md」走 `File.text()`，纯本地读取，不经过网络层，也不占进度条。
 * 眼睛按钮切换预览：切过去用 `MarkdownView` 渲染正文（和文档页同一套样式），
 * 所以打开编辑页会连带下载 `markdown` chunk（75 kB），但它不在首屏。
 */
import { computed, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import MarkdownView from '../components/common/MarkdownView.vue'
import DocumentMain from '../components/layout/DocumentMain.vue'
import { ApiError } from '../api/http'
import { createPost } from '../api/posts'
import { currentAccount, currentUsername, currentUserid } from '../api/identity'
import { loggedIn } from '../api/session'

/** 正文体积上限：Markdown 是纯文本，超过这个数基本是选错文件了。 */
const maxFileBytes = 512 * 1024

const router = useRouter()

const title = ref('')
const body = ref('')

/** 底部提示条；空串表示不显示。 */
const note = ref('')
const noteIsError = ref(false)

/** 导入过的文件名与大小，用来给用户一个「确实读到了」的反馈。 */
const importedName = ref('')
const importedSize = ref('')

/** 「取消」需要点两次：第一次只是把按钮换成「确认放弃」。 */
const confirmingCancel = ref(false)

/** 预览态：眼睛按钮切换，切过去时用 `MarkdownView` 渲染正文。 */
const previewing = ref(false)

/** 发布中：按钮禁用 + 文案换成「发布中…」，防重复提交。 */
const submitting = ref(false)

const fileInput = ref<HTMLInputElement | null>(null)

const charCount = computed(() => body.value.length)

const hasContent = computed(() => title.value.trim() !== '' || body.value.trim() !== '')

function togglePreview(): void {
  previewing.value = !previewing.value
}

/** 有人开始输入就撤销「确认放弃」态，避免误触时按钮还停在危险文案上。 */
watch([title, body], () => {
  confirmingCancel.value = false
})

/** 把字节数说成人话。 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  return `${(bytes / 1024).toFixed(1)} KB`
}

function showNote(message: string, isError = false): void {
  note.value = message
  noteIsError.value = isError
}

function pickFile(): void {
  fileInput.value?.click()
}

/** 从文件名推一个标题：去掉目录与扩展名，下划线/连字符换成空格。 */
function titleFromFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name

  return base.replace(/\.(md|markdown|txt)$/i, '').replace(/[_-]+/g, ' ').trim()
}

async function onFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null

  // 选完就清空，否则再选同一个文件不会触发 change。
  input.value = ''

  if (file === null) {
    return
  }

  if (file.size > maxFileBytes) {
    showNote(`「${file.name}」有 ${formatBytes(file.size)}，超过 ${formatBytes(maxFileBytes)} 上限。`, true)
    return
  }

  try {
    const text = await file.text()

    if (text.trim() === '') {
      showNote(`「${file.name}」是空文件。`, true)
      return
    }

    body.value = text
    importedName.value = file.name
    importedSize.value = formatBytes(file.size)

    // 标题只在空着的时候才自动填，别覆盖用户已经写好的。
    if (title.value.trim() === '') {
      title.value = titleFromFileName(file.name)
    }

    showNote(`已导入「${file.name}」。`)
  } catch {
    showNote(`读不了「${file.name}」，换一个文件试试。`, true)
  }
}

/** 作者显示名：优先用户名，其次登录账号；都没有就交空串（后端会按令牌补）。 */
function authorName(): string {
  return currentUsername() || currentAccount() || ''
}

/** 把发布失败翻成一句人话。 */
function describeError(cause: unknown): string {
  if (cause instanceof ApiError) {
    if (cause.status === 401 || cause.status === 403) {
      return '登录状态已失效，请重新登录后再发布。'
    }

    if (cause.status === 0) {
      return '无法连接到服务器，请检查网络或设置里的 API 地址。'
    }

    if (cause.status >= 500) {
      return '服务器出错了，稍后再试一次。'
    }
  }

  return cause instanceof Error && cause.message !== '' ? cause.message : '发布失败，稍后再试一次。'
}

async function submit(): Promise<void> {
  if (submitting.value) {
    return
  }

  if (title.value.trim() === '') {
    showNote('先给帖子写个标题。', true)
    return
  }

  if (body.value.trim() === '') {
    showNote('正文还是空的，写点东西或者导入一个 .md 文件。', true)
    return
  }

  if (!loggedIn.value) {
    showNote('发布需要先登录，登录后回到本页再点一次发布。', true)
    return
  }

  submitting.value = true
  showNote('正在发布…')

  try {
    const created = await createPost({
      author: authorName(),
      title: title.value.trim(),
      // 正文原样提交：Markdown 的前后空白由后端决定怎么处理，前端不做裁剪。
      mainText: body.value,
    })

    // 后端在响应里带回了帖子 id → 直接去看详情页（最直接的「发成功了」证据）。
    if (created !== null) {
      await router.replace({
        name: 'post',
        params: {
          userid: created.userId !== '' ? created.userId : currentUserid(),
          postid: created.postId,
        },
      })
      return
    }

    // 只回了状态码 → 回社区页，带上一次性提示。
    await router.replace({ name: 'community', query: { published: '1' } })
  } catch (cause) {
    showNote(describeError(cause), true)
  } finally {
    submitting.value = false
  }
}

async function cancel(): Promise<void> {
  if (submitting.value) {
    return
  }

  if (hasContent.value && !confirmingCancel.value) {
    confirmingCancel.value = true
    showNote('内容还没发布，再点一次「确认放弃」会全部丢弃。')
    return
  }

  await router.push({ name: 'community' })
}
</script>

<style scoped>
.post-editor-main {
  flex: 0 0 auto;
  flex-shrink: 0;
  margin: 0;
}

.post-editor {
  --pe-title: #0f172a;
  --pe-text: #1e293b;
  --pe-muted: #64748b;
  --pe-border: rgb(15 23 42 / 12%);
  --pe-surface: rgb(255 255 255 / 62%);
  --pe-surface-hover: rgb(37 99 235 / 6%);
  --pe-accent: #2563eb;
  --pe-accent-text: #ffffff;
  --pe-focus: rgb(37 99 235 / 45%);
  --pe-error: #dc2626;
  --pe-code-bg: rgb(37 99 235 / 10%);

  color: var(--pe-text);
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .post-editor) {
  --pe-title: #f8fafc;
  --pe-text: #e2e8f0;
  --pe-muted: #94a3b8;
  --pe-border: rgb(255 255 255 / 14%);
  --pe-surface: rgb(15 23 42 / 45%);
  --pe-surface-hover: rgb(125 211 252 / 12%);
  --pe-accent: #3b82f6;
  --pe-accent-text: #ffffff;
  --pe-focus: rgb(125 211 252 / 55%);
  --pe-error: #fca5a5;
  --pe-code-bg: rgb(125 211 252 / 16%);
}

.post-editor__header {
  margin-bottom: 20px;
}

.post-editor__title {
  margin: 0;
  color: var(--pe-title);
  font-size: 1.75rem;
  font-weight: 700;
  line-height: 1.35;
}

.post-editor__hint {
  margin: 6px 0 0;
  color: var(--pe-muted);
  font-size: 0.9rem;
}

.post-editor__code {
  padding: 1px 5px;
  border-radius: 5px;
  background-color: var(--pe-code-bg);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.86em;
}

/* 未登录提示：低调一条，不抢标题的注意力。 */
.post-editor__login {
  margin: 10px 0 0;
  padding: 8px 12px;
  border-radius: 10px;
  color: var(--pe-muted);
  background-color: var(--pe-surface-hover);
  font-size: 0.84rem;
}

.post-editor__login-link {
  color: var(--pe-accent);
  font-weight: 600;
  text-decoration: none;
}

.post-editor__login-link:hover {
  text-decoration: underline;
}

.post-editor__form {
  display: grid;
  gap: 18px;
}

.post-editor__field {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.post-editor__label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.post-editor__label {
  color: var(--pe-title);
  font-size: 0.9rem;
  font-weight: 600;
}

.post-editor__tools {
  display: flex;
  align-items: center;
  gap: 12px;
}

.post-editor__count {
  color: var(--pe-muted);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

/*
 * 表单控件必须**显式**给 color / background-color：
 * `.dark-mode` 只挂在 `.layout-background` 上，不下发全局文字色，
 * 写 `color: inherit` 在暗色下会继承到 body 的黑色。
 */
.post-editor__input,
.post-editor__textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 11px 13px;
  border: 1px solid var(--pe-border);
  border-radius: 10px;
  color: var(--pe-text);
  background-color: var(--pe-surface);
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.6;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.post-editor__textarea {
  min-height: 320px;
  resize: vertical;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9rem;
  tab-size: 2;
}

.post-editor__input::placeholder,
.post-editor__textarea::placeholder {
  color: var(--pe-muted);
  opacity: 0.8;
}

.post-editor__input:focus,
.post-editor__textarea:focus {
  border-color: var(--pe-focus);
  outline: none;
  box-shadow: 0 0 0 3px var(--pe-focus);
}

.post-editor__tool {
  padding: 4px 11px;
  border: 1px solid var(--pe-border);
  border-radius: 999px;
  color: var(--pe-text);
  background-color: transparent;
  font-size: 0.82rem;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.post-editor__tool:hover {
  border-color: var(--pe-focus);
  background-color: var(--pe-surface-hover);
}

.post-editor__tool:focus-visible {
  outline: 2px solid var(--pe-focus);
  outline-offset: 2px;
}

/* 图标按钮：方形、和「导入 .md」同高，靠 border + 背景表达开关态。 */
.post-editor__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--pe-border);
  border-radius: 999px;
  color: var(--pe-muted);
  background-color: transparent;
  cursor: pointer;
  transition:
    color 0.18s ease,
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.post-editor__icon:hover {
  border-color: var(--pe-focus);
  color: var(--pe-text);
  background-color: var(--pe-surface-hover);
}

.post-editor__icon--active {
  border-color: var(--pe-focus);
  color: var(--pe-accent);
  background-color: var(--pe-surface-hover);
}

.post-editor__icon:focus-visible {
  outline: 2px solid var(--pe-focus);
  outline-offset: 2px;
}

.post-editor__icon-svg {
  display: block;
  width: 16px;
  height: 16px;
}

/* 预览区：和 textarea 同框同高，切换时不会「跳一下」。 */
.post-editor__preview {
  box-sizing: border-box;
  min-height: 320px;
  max-height: 640px;
  padding: 11px 13px;
  border: 1px solid var(--pe-border);
  border-radius: 10px;
  background-color: var(--pe-surface);
  overflow: auto;
}

.post-editor__preview-empty {
  margin: 0;
  color: var(--pe-muted);
  font-size: 0.9rem;
}

/* 文件选择器只要「能点」就行，不占布局。 */
.post-editor__file {
  display: none;
}

.post-editor__file-note {
  margin: 0;
  color: var(--pe-muted);
  font-size: 0.82rem;
  overflow-wrap: anywhere;
}

.post-editor__file-note strong {
  color: var(--pe-text);
  font-weight: 600;
}

.post-editor__note {
  margin: 0;
  padding: 9px 12px;
  border-radius: 10px;
  color: var(--pe-text);
  background-color: var(--pe-surface-hover);
  font-size: 0.86rem;
  line-height: 1.6;
}

.post-editor__note--error {
  color: var(--pe-error);
  background-color: rgb(220 38 38 / 10%);
}

:global(.dark-mode .post-editor__note--error) {
  background-color: rgb(248 113 113 / 14%);
}

.post-editor__actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.post-editor__submit,
.post-editor__cancel {
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    transform 0.18s ease;
}

.post-editor__submit {
  border: 1px solid transparent;
  color: var(--pe-accent-text);
  background-color: var(--pe-accent);
}

.post-editor__submit:hover {
  transform: translateY(-1px);
}

.post-editor__cancel {
  border: 1px solid var(--pe-border);
  color: var(--pe-text);
  background-color: transparent;
}

.post-editor__cancel:hover {
  border-color: var(--pe-focus);
  background-color: var(--pe-surface-hover);
}

.post-editor__submit:focus-visible,
.post-editor__cancel:focus-visible {
  outline: 2px solid var(--pe-focus);
  outline-offset: 2px;
}

/* 发布中：两个按钮都锁住，避免重复提交 / 半路跑掉。 */
.post-editor__submit:disabled,
.post-editor__cancel:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

@media (max-width: 768px) {
  .post-editor-main {
    width: 100%;
    margin: 0;
  }

  .post-editor__title {
    font-size: 1.4rem;
  }

  .post-editor__textarea {
    min-height: 240px;
  }

  .post-editor__preview {
    min-height: 240px;
  }
}
</style>
