<template>
  <section v-if="allowComment" class="post-comments" aria-label="评论">
    <header class="post-comments__head">
      <h2 class="post-comments__title">评论</h2>
      <span class="post-comments__total">{{ total }}</span>
    </header>

    <!-- 发一级评论：未登录时禁用，按钮下方给一句说明。 -->
    <div class="post-comments__compose">
      <textarea
        v-model="draft"
        class="post-comments__input"
        rows="3"
        placeholder="写下你的评论…"
        :disabled="!loggedIn || submitting"
        aria-label="评论内容"
        @keydown.enter="handleDraftEnter"
      />

      <div class="post-comments__compose-bar">
        <span class="post-comments__hint">
          {{ loggedIn ? 'Enter 发表，Shift + Enter 换行' : '登录后可以评论' }}
        </span>
        <button
          class="post-comments__submit"
          type="button"
          :disabled="!canSubmit"
          @click="submitComment"
        >
          {{ submitting ? '发表中…' : '发表' }}
        </button>
      </div>
    </div>

    <p v-if="loading" class="post-comments__status" role="status">正在加载评论…</p>
    <p v-else-if="error" class="post-comments__status is-error" role="alert">{{ error }}</p>
    <p v-else-if="comments.length === 0" class="post-comments__status">
      还没有评论，来说两句。
    </p>

    <ul v-else class="post-comments__list">
      <li v-for="item in comments" :key="item.commentId" class="comment">
        <span class="comment__avatar" aria-hidden="true">{{ initialOf(item.userId) }}</span>

        <div class="comment__body">
          <div class="comment__head">
            <span class="comment__author">{{ nameOf(item.userId) }}</span>
            <span v-if="item.isPinned" class="comment__pin">置顶</span>
            <time v-if="item.createdAt !== ''" class="comment__time">
              {{ formatTime(item.createdAt) }}
            </time>
          </div>

          <p class="comment__text">{{ item.content }}</p>

          <div class="comment__actions">
            <button
              class="comment__action"
              :class="{ 'is-active': likedComments[item.commentId] === true }"
              type="button"
              :disabled="busy.like[item.commentId] === true"
              :title="likedComments[item.commentId] === true ? '取消点赞' : '点赞'"
              @click="toggleLike(item)"
            >
              赞<span v-if="item.likeCount > 0"> {{ item.likeCount }}</span>
            </button>

            <button class="comment__action comment__action--reply" type="button" @click="startReply(item)">
              {{ replyTo === item.commentId ? '取消回复' : '回复' }}
            </button>

            <button
              v-if="isMine(item)"
              class="comment__action comment__action--danger"
              type="button"
              :disabled="busy.remove[item.commentId] === true"
              @click="remove(item)"
            >
              {{ confirmRemove === item.commentId ? '确认删除' : '删除' }}
            </button>
          </div>

          <!-- 回复某条评论：层级由后端推导，前端只发正文。 -->
          <div v-if="replyTo === item.commentId" class="comment__compose">
            <textarea
              v-model="replyDraft"
              class="post-comments__input post-comments__input--small"
              rows="2"
              :placeholder="`回复 ${nameOf(item.userId)}…`"
              :disabled="replySubmitting"
              :aria-label="`回复 ${nameOf(item.userId)}`"
              @keydown.enter="handleReplyEnter(item)"
            />
            <div class="post-comments__compose-bar">
              <span class="post-comments__hint">Enter 发送，Shift + Enter 换行</span>
              <button
                class="post-comments__submit"
                type="button"
                :disabled="replySubmitting || replyDraft.trim() === ''"
                @click="submitReply(item)"
              >
                {{ replySubmitting ? '发送中…' : '回复' }}
              </button>
            </div>
          </div>

          <!-- 二级回复：默认折叠，点一下才请求。 -->
          <div v-if="item.replyCount > 0 || repliesOf(item.commentId).length > 0" class="comment__replies">
            <button
              v-if="repliesOf(item.commentId).length === 0"
              class="comment__more"
              type="button"
              :disabled="busy.replies[item.commentId] === true"
              @click="loadReplies(item)"
            >
              {{ busy.replies[item.commentId] === true
                ? '正在加载回复…'
                : `查看 ${item.replyCount} 条回复` }}
            </button>

            <ul v-else class="comment__reply-list">
              <li v-for="reply in repliesOf(item.commentId)" :key="reply.commentId" class="comment__reply">
                <span class="comment__author">{{ nameOf(reply.userId) }}</span>
                <span v-if="reply.replyToUserId !== ''" class="comment__reply-to">
                  回复 {{ nameOf(reply.replyToUserId) }}
                </span>
                <p class="comment__text">{{ reply.content }}</p>
                <div class="comment__actions">
                  <button
                    class="comment__action"
                    :class="{ 'is-active': likedComments[reply.commentId] === true }"
                    type="button"
                    :disabled="busy.like[reply.commentId] === true"
                    @click="toggleLike(reply)"
                  >
                    赞<span v-if="reply.likeCount > 0"> {{ reply.likeCount }}</span>
                  </button>
                  <button class="comment__action comment__action--reply" type="button" @click="startReply(reply)">
                    回复
                  </button>
                  <button
                    v-if="isMine(reply)"
                    class="comment__action comment__action--danger"
                    type="button"
                    :disabled="busy.remove[reply.commentId] === true"
                    @click="remove(reply)"
                  >
                    {{ confirmRemove === reply.commentId ? '确认删除' : '删除' }}
                  </button>
                </div>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import type { PostComment } from '../../api/comments'
import {
  deleteComment,
  fetchComments,
  fetchReplies,
  likeComment,
  replyToComment,
  replyToPost,
  unlikeComment,
} from '../../api/comments'
import { currentUserid } from '../../api/identity'
import { session } from '../../api/session'
import { fetchRemoteUsername } from '../../api/userinfo'
import { formatConversationTime } from '../../utils/chatTime'

const props = defineProps<{
  /** 帖子 id，所有评论接口的第一段路径。 */
  postId: string
  /** 是否允许评论；`false` 时整个评论区不渲染。 */
  allowComment: boolean
}>()

const loggedIn = computed(() => session.value !== null)

const comments = ref<PostComment[]>([])
const loading = ref(false)
const error = ref('')

/** 一级评论总数：接口没单独给 total，就用已加载的条数。 */
const total = computed(() => comments.value.length)

/** 二级回复按父评论 id 缓存；没请求过的键不存在。 */
const replies = ref<Record<string, PostComment[]>>({})

const busy = ref({
  like: {} as Record<string, boolean>,
  remove: {} as Record<string, boolean>,
  replies: {} as Record<string, boolean>,
})

/** 本地点赞状态：后端没有「我是否赞过」的查询，刷新即归零。 */
const likedComments = ref<Record<string, boolean>>({})

const draft = ref('')
const submitting = ref(false)

const replyTo = ref('')
const replyDraft = ref('')
const replySubmitting = ref(false)

/** 两段式删除：第一次点击变成「确认删除」，3 秒后自动复原。 */
const confirmRemove = ref('')
let confirmTimer = 0

const canSubmit = computed(() => loggedIn.value && !submitting.value && draft.value.trim() !== '')

/* -------------------------------------------------------------------------- */
/* 作者名：后端只给 userid，显示名要另外查 username（带缓存与去重）              */
/* -------------------------------------------------------------------------- */

const names = ref<Record<string, string>>({})
const namePending = new Set<string>()

async function ensureName(userId: string) {
  if (userId === '' || names.value[userId] !== undefined || namePending.has(userId)) {
    return
  }

  namePending.add(userId)

  try {
    const name = await fetchRemoteUsername(userId)

    if (name !== '') {
      names.value = { ...names.value, [userId]: name }
    }
  } catch {
    // 查不到就回落成「用户 {userid}」，不影响评论本身。
  } finally {
    namePending.delete(userId)
  }
}

function ensureNames(list: PostComment[]) {
  for (const item of list) {
    void ensureName(item.userId)
    void ensureName(item.replyToUserId)
  }
}

function nameOf(userId: string): string {
  if (userId === '') {
    return '匿名'
  }

  return names.value[userId] ?? `用户 ${userId}`
}

function initialOf(userId: string): string {
  return nameOf(userId).slice(0, 1)
}

function formatTime(iso: string): string {
  return formatConversationTime(iso)
}

/* -------------------------------------------------------------------------- */
/* 读取                                                                        */
/* -------------------------------------------------------------------------- */

function repliesOf(commentId: string): PostComment[] {
  return replies.value[commentId] ?? []
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    const list = await fetchComments(props.postId)

    comments.value = list
    ensureNames(list)
  } catch (cause) {
    comments.value = []
    error.value = cause instanceof Error ? cause.message : '评论加载失败。'
  } finally {
    loading.value = false
  }
}

async function loadReplies(comment: PostComment) {
  if (busy.value.replies[comment.commentId] === true) {
    return
  }

  busy.value.replies = { ...busy.value.replies, [comment.commentId]: true }

  try {
    const list = await fetchReplies(comment.commentId)

    replies.value = { ...replies.value, [comment.commentId]: list }
    ensureNames(list)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '回复加载失败。'
  } finally {
    busy.value.replies = { ...busy.value.replies, [comment.commentId]: false }
  }
}

watch(() => props.postId, () => {
  replies.value = {}
  replyTo.value = ''
  confirmRemove.value = ''
  void load()
}, { immediate: true })

/* -------------------------------------------------------------------------- */
/* 写入                                                                        */
/* -------------------------------------------------------------------------- */

function handleDraftEnter(event: KeyboardEvent) {
  // 中文输入法选词时的回车不能当成发送（`ChatComposer` 踩过同一个坑）。
  if (event.shiftKey || event.isComposing) {
    return
  }

  event.preventDefault()
  void submitComment()
}

function handleReplyEnter(comment: PostComment) {
  void submitReply(comment)
}

async function submitComment() {
  if (!canSubmit.value) {
    return
  }

  submitting.value = true

  try {
    await replyToPost(props.postId, draft.value.trim())
    draft.value = ''
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '评论发表失败。'
  } finally {
    submitting.value = false
  }
}

async function submitReply(comment: PostComment) {
  if (replySubmitting.value || replyDraft.value.trim() === '') {
    return
  }

  replySubmitting.value = true

  try {
    await replyToComment(props.postId, comment.commentId, replyDraft.value.trim())
    replyDraft.value = ''
    replyTo.value = ''

    // 回复完立刻重新拉一次该条的二级回复，让新内容马上可见。
    const list = await fetchReplies(comment.commentId)

    replies.value = { ...replies.value, [comment.commentId]: list }
    ensureNames(list)

    // 一级评论上的 replyCount 由后端维护，本地先 +1 让「查看 N 条回复」不显得没反应。
    comment.replyCount += 1
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '回复发送失败。'
  } finally {
    replySubmitting.value = false
  }
}

function startReply(comment: PostComment) {
  if (!loggedIn.value) {
    error.value = '登录后可以回复。'
    return
  }

  if (replyTo.value === comment.commentId) {
    replyTo.value = ''
    replyDraft.value = ''
    return
  }

  replyTo.value = comment.commentId
  replyDraft.value = ''
}

async function toggleLike(comment: PostComment) {
  if (!loggedIn.value) {
    error.value = '登录后可以点赞。'
    return
  }

  if (busy.value.like[comment.commentId] === true) {
    return
  }

  busy.value.like = { ...busy.value.like, [comment.commentId]: true }

  const active = likedComments.value[comment.commentId] === true

  try {
    if (active) {
      await unlikeComment(props.postId, comment.commentId)
      likedComments.value = { ...likedComments.value, [comment.commentId]: false }
      comment.likeCount = Math.max(0, comment.likeCount - 1)
    } else {
      await likeComment(props.postId, comment.commentId)
      likedComments.value = { ...likedComments.value, [comment.commentId]: true }
      comment.likeCount += 1
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '点赞失败。'
  } finally {
    busy.value.like = { ...busy.value.like, [comment.commentId]: false }
  }
}

function isMine(comment: PostComment): boolean {
  const me = currentUserid()

  return me !== '' && comment.userId === me
}

async function remove(comment: PostComment) {
  if (busy.value.remove[comment.commentId] === true) {
    return
  }

  // 第一下只是「上膛」，第二下才真删；3 秒内不再点就复原。
  if (confirmRemove.value !== comment.commentId) {
    confirmRemove.value = comment.commentId
    window.clearTimeout(confirmTimer)
    confirmTimer = window.setTimeout(() => {
      confirmRemove.value = ''
    }, 3000)
    return
  }

  confirmRemove.value = ''
  busy.value.remove = { ...busy.value.remove, [comment.commentId]: true }

  try {
    await deleteComment(props.postId, comment.commentId)
    await load()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '删除失败。'
  } finally {
    busy.value.remove = { ...busy.value.remove, [comment.commentId]: false }
  }
}
</script>

<style scoped>
.post-comments {
  --pc-border: rgb(15 23 42 / 10%);
  --pc-text: #1e293b;
  --pc-muted: #64748b;
  --pc-soft: rgb(15 23 42 / 4%);
  --pc-input-bg: rgb(255 255 255 / 78%);
  --pc-input-border: rgb(15 23 42 / 14%);
  --pc-accent: #2563eb;
  --pc-accent-soft: rgb(37 99 235 / 10%);
  --pc-danger: #b91c1c;
  --pc-error: #b91c1c;

  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--pc-border);
  color: var(--pc-text);
}

/* 注意 :global() 是整体替换，完整选择器必须写在括号内。 */
:global(.dark-mode .post-comments) {
  --pc-border: rgb(255 255 255 / 12%);
  --pc-text: #e2e8f0;
  --pc-muted: #94a3b8;
  --pc-soft: rgb(255 255 255 / 6%);
  --pc-input-bg: rgb(15 23 42 / 78%);
  --pc-input-border: rgb(255 255 255 / 20%);
  --pc-accent: #7dd3fc;
  --pc-accent-soft: rgb(125 211 252 / 14%);
  --pc-danger: #fca5a5;
  --pc-error: #fca5a5;
}

.post-comments__head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.post-comments__title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
}

.post-comments__total {
  color: var(--pc-muted);
  font-size: 0.86rem;
  font-variant-numeric: tabular-nums;
}

.post-comments__compose {
  margin-top: 14px;
}

/* 输入框必须显式给色：`.dark-mode` 不下发全局文字色，`inherit` 会拿到 body 的黑色。 */
.post-comments__input {
  display: block;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--pc-input-border);
  border-radius: 12px;
  background-color: var(--pc-input-bg);
  color: var(--pc-text);
  font: inherit;
  font-size: 0.92rem;
  line-height: 1.65;
  outline: none;
  resize: vertical;
  transition: border-color 0.18s ease;
}

.post-comments__input:focus {
  border-color: var(--pc-accent);
}

/* placeholder 显式给色：默认的灰在暗色深底上几乎看不见。 */
.post-comments__input::placeholder {
  color: var(--pc-muted);
  opacity: 1;
}

.post-comments__input:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.post-comments__input--small {
  font-size: 0.88rem;
}

.post-comments__compose-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
}

.post-comments__hint {
  color: var(--pc-muted);
  font-size: 0.78rem;
}

.post-comments__submit {
  flex: 0 0 auto;
  padding: 6px 16px;
  border: 0;
  border-radius: 999px;
  background-color: var(--pc-accent);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 0.86rem;
  transition: opacity 0.18s ease;
}

.post-comments__submit:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.post-comments__status {
  margin: 18px 0 0;
  color: var(--pc-muted);
  font-size: 0.9rem;
}

.post-comments__status.is-error {
  color: var(--pc-error);
}

.post-comments__list {
  display: grid;
  gap: 18px;
  margin: 20px 0 0;
  padding: 0;
  list-style: none;
}

.comment {
  display: flex;
  gap: 12px;
}

.comment__avatar {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background-color: var(--pc-accent-soft);
  color: var(--pc-accent);
  font-size: 0.9rem;
  font-weight: 700;
}

.comment__body {
  flex: 1 1 auto;
  min-width: 0;
}

.comment__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.comment__author {
  color: var(--pc-text);
  font-size: 0.88rem;
  font-weight: 600;
}

.comment__pin {
  padding: 1px 7px;
  border-radius: 999px;
  background-color: var(--pc-accent-soft);
  color: var(--pc-accent);
  font-size: 0.72rem;
}

.comment__time {
  color: var(--pc-muted);
  font-size: 0.76rem;
}

.comment__text {
  margin: 6px 0 0;
  font-size: 0.92rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.comment__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}

.comment__action {
  padding: 0;
  border: 0;
  background: none;
  color: var(--pc-muted);
  cursor: pointer;
  font: inherit;
  font-size: 0.78rem;
  transition: color 0.18s ease;
}

.comment__action:hover:not(:disabled) {
  color: var(--pc-accent);
}

.comment__action.is-active {
  color: var(--pc-accent);
  font-weight: 600;
}

.comment__action--danger:hover:not(:disabled) {
  color: var(--pc-danger);
}

.comment__action:disabled {
  cursor: progress;
  opacity: 0.6;
}

.comment__compose {
  margin-top: 10px;
}

.comment__replies {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  background-color: var(--pc-soft);
}

.comment__more {
  padding: 0;
  border: 0;
  background: none;
  color: var(--pc-accent);
  cursor: pointer;
  font: inherit;
  font-size: 0.8rem;
}

.comment__more:disabled {
  cursor: progress;
  opacity: 0.6;
}

.comment__reply-list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.comment__reply {
  padding-left: 10px;
  border-left: 2px solid var(--pc-border);
}

.comment__reply-to {
  margin-left: 6px;
  color: var(--pc-muted);
  font-size: 0.76rem;
}
</style>
